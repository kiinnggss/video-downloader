import json
import os
import tempfile
from unittest.mock import patch
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.models import InspectResponse, FormatOption, MediaFile
from app.db import save_media_file, init_db
from app.services.vault import generate_vault_token

pytestmark = pytest.mark.anyio


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture(autouse=True)
def setup_test_environment(tmp_path, monkeypatch):
    test_db = tmp_path / "test_api.db"
    monkeypatch.setattr("app.config.DB_PATH", test_db)
    monkeypatch.setattr("app.db.DB_PATH", test_db)
    init_db(str(test_db))
    yield


async def test_inspect_endpoint():
    mock_resp = InspectResponse(
        url="https://vimeo.com/12345",
        title="Nature Beauty",
        author="John Den",
        duration=180,
        thumbnail="https://example.com/thumb.jpg",
        formats=[
            FormatOption(format_id="22", resolution="720p", ext="mp4", note="HD")
        ]
    )
    with patch("app.main.extract_video_info", return_value=mock_resp):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post("/api/inspect", json={"url": "https://vimeo.com/12345"})
            assert res.status_code == 200
            data = res.json()
            assert data["title"] == "Nature Beauty"
            assert data["author"] == "John Den"
            assert len(data["formats"]) == 1


async def test_inspect_endpoint_error():
    with patch("app.main.extract_video_info", side_effect=RuntimeError("Extraction failed")):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post("/api/inspect", json={"url": "https://invalid-video.com"})
            assert res.status_code == 422
            data = res.json()
            assert "Extraction failed" in data["detail"]


async def test_create_download_endpoint():
    with patch("app.main.start_download", return_value="test-task-123"):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            payload = {
                "url": "https://vimeo.com/12345",
                "format_id": "22",
                "is_audio": False,
                "in_vault": False,
            }
            res = await ac.post("/api/downloads", json=payload)
            assert res.status_code == 200
            data = res.json()
            assert data["task_id"] == "test-task-123"
            assert data["status"] == "queued"


async def test_create_download_endpoint_error():
    with patch("app.main.start_download", side_effect=RuntimeError("Queue failed")):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            payload = {
                "url": "https://vimeo.com/12345",
                "format_id": "22",
                "is_audio": False,
                "in_vault": False,
            }
            res = await ac.post("/api/downloads", json=payload)
            assert res.status_code == 500
            data = res.json()
            assert "Queue failed" in data["detail"]


async def test_stream_telemetry_endpoint():
    async def mock_telemetry():
        yield {"task_id": "t1", "progress": 55.5, "status": "downloading"}

    with patch("app.main.subscribe_telemetry", side_effect=mock_telemetry):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            async with ac.stream("GET", "/api/downloads/stream") as res:
                assert res.status_code == 200
                found_event = False
                found_data = False
                async for line in res.aiter_lines():
                    if "event: progress" in line:
                        found_event = True
                    if "55.5" in line:
                        found_data = True
                        break
                assert found_event
                assert found_data


async def test_get_files_endpoint():
    media1 = MediaFile(
        file_id="f1",
        title="Video 1",
        filename="v1.mp4",
        filepath="/tmp/v1.mp4",
        category="video",
        filesize=1024,
        duration=60,
        thumbnail=None,
        in_vault=False,
    )
    media2 = MediaFile(
        file_id="f2",
        title="Audio 1",
        filename="a1.mp3",
        filepath="/tmp/a1.mp3",
        category="music",
        filesize=512,
        duration=30,
        thumbnail=None,
        in_vault=False,
    )
    media_vault = MediaFile(
        file_id="f3",
        title="Vault Video",
        filename="vault.mp4",
        filepath="/tmp/vault.mp4",
        category="video",
        filesize=2048,
        duration=90,
        thumbnail=None,
        in_vault=True,
    )
    save_media_file(media1)
    save_media_file(media2)
    save_media_file(media_vault)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/files")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 2
        file_ids = [item["file_id"] for item in data]
        assert "f1" in file_ids
        assert "f2" in file_ids
        assert "f3" not in file_ids

        res_filtered = await ac.get("/api/files?category=music")
        assert res_filtered.status_code == 200
        data_filtered = res_filtered.json()
        assert len(data_filtered) == 1
        assert data_filtered[0]["file_id"] == "f2"


async def test_stream_media_endpoint(tmp_path):
    sample_file = tmp_path / "sample.mp4"
    sample_file.write_bytes(b"0123456789abcdef" * 100)

    media = MediaFile(
        file_id="stream-test-1",
        title="Sample Video",
        filename="sample.mp4",
        filepath=str(sample_file),
        category="video",
        filesize=sample_file.stat().st_size,
        duration=10,
        in_vault=False,
    )
    save_media_file(media)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get(f"/api/files/{media.file_id}/stream")
        assert res.status_code == 200
        assert len(res.content) == sample_file.stat().st_size

        range_res = await ac.get(
            f"/api/files/{media.file_id}/stream",
            headers={"Range": "bytes=0-15"},
        )
        assert range_res.status_code == 206
        assert len(range_res.content) == 16


async def test_stream_media_not_found():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/files/nonexistent-id/stream")
        assert res.status_code == 404
        assert res.json()["detail"] == "Media not found"


async def test_download_media_endpoint(tmp_path):
    sample_file = tmp_path / "download_me.mp4"
    sample_file.write_bytes(b"content-to-download")

    media = MediaFile(
        file_id="download-test-1",
        title="Download Video",
        filename="download_me.mp4",
        filepath=str(sample_file),
        category="video",
        filesize=len(b"content-to-download"),
        duration=5,
        in_vault=False,
    )
    save_media_file(media)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get(f"/api/files/{media.file_id}/download")
        assert res.status_code == 200
        assert res.content == b"content-to-download"


async def test_download_media_not_found():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/files/nonexistent-download/download")
        assert res.status_code == 404
        assert res.json()["detail"] == "File not found"


async def test_vault_unlock_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/vault/unlock", json={"pin": "1234"})
        assert res.status_code == 200
        data = res.json()
        assert "token" in data
        assert data["expires_in"] == 1800


async def test_vault_unlock_invalid_pin():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/vault/unlock", json={"pin": "wrong-pin"})
        assert res.status_code == 401
        assert res.json()["detail"] == "Invalid PIN"


async def test_vault_files_endpoint():
    token = generate_vault_token()
    vault_media = MediaFile(
        file_id="vault-file-1",
        title="Secret Video",
        filename="secret.mp4",
        filepath="/tmp/secret.mp4",
        category="video",
        filesize=1024,
        duration=45,
        in_vault=True,
    )
    save_media_file(vault_media)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res_unauthorized = await ac.get("/api/vault/files")
        assert res_unauthorized.status_code == 401
        assert res_unauthorized.json()["detail"] == "Vault locked"

        res_invalid = await ac.get("/api/vault/files", headers={"Authorization": "Bearer bad-token"})
        assert res_invalid.status_code == 401
        assert res_invalid.json()["detail"] == "Vault locked"

        res_authorized = await ac.get("/api/vault/files", headers={"Authorization": f"Bearer {token}"})
        assert res_authorized.status_code == 200
        data = res_authorized.json()
        assert len(data) == 1
        assert data[0]["file_id"] == "vault-file-1"

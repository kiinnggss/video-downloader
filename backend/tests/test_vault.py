import os
import io
import tempfile
import time
import uuid
import pytest
from fastapi.testclient import TestClient
from app.db import init_db
from app.services.vault import (
    set_pin,
    has_pin,
    verify_pin,
    generate_vault_token,
    verify_vault_token,
    vault_sessions,
)
from app.main import app

@pytest.fixture
def vault_db():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    init_db(path)
    yield path
    if os.path.exists(path):
        os.remove(path)

def test_pin_verification(vault_db):
    set_pin("4321", db_path=vault_db)
    assert verify_pin("4321", db_path=vault_db) is True
    assert verify_pin("0000", db_path=vault_db) is False

def test_default_pin(vault_db):
    assert verify_pin("1234", db_path=vault_db) is True
    assert verify_pin("9999", db_path=vault_db) is False

def test_device_specific_pin(vault_db):
    dev_a = f"device_a_{uuid.uuid4()}"
    dev_b = f"device_b_{uuid.uuid4()}"
    assert has_pin(dev_a, db_path=vault_db) is False
    assert has_pin(dev_b, db_path=vault_db) is False

    set_pin("9876", device_id=dev_a, db_path=vault_db)
    assert has_pin(dev_a, db_path=vault_db) is True
    assert has_pin(dev_b, db_path=vault_db) is False

    assert verify_pin("9876", device_id=dev_a, db_path=vault_db) is True
    assert verify_pin("1234", device_id=dev_a, db_path=vault_db) is False
    # dev_b has no pin set yet, so default 1234 applies
    assert verify_pin("1234", device_id=dev_b, db_path=vault_db) is True

def test_vault_token():
    token = generate_vault_token()
    assert verify_vault_token(token) is True
    assert verify_vault_token("invalid-token") is False
    assert verify_vault_token("") is False
    assert verify_vault_token(None) is False

def test_vault_token_expiration():
    token = generate_vault_token()
    vault_sessions[token] = time.time() - 1
    assert verify_vault_token(token) is False
    assert token not in vault_sessions

def test_vault_api_device_pin_endpoints():
    client = TestClient(app)
    dev_id = f"test_dev_phone_{uuid.uuid4()}"

    # 1. Check pin status when none is explicitly set
    res = client.get("/api/vault/pin-status", headers={"X-Device-Id": dev_id})
    assert res.status_code == 200
    assert res.json()["has_pin"] is False

    # 2. Set new device pin
    res = client.post("/api/vault/set-pin", json={"device_id": dev_id, "pin": "5555"})
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    # 3. Check pin status now reports True
    res = client.get("/api/vault/pin-status", headers={"X-Device-Id": dev_id})
    assert res.status_code == 200
    assert res.json()["has_pin"] is True

    # 4. Unlock with correct pin
    res = client.post("/api/vault/unlock", json={"device_id": dev_id, "pin": "5555"})
    assert res.status_code == 200
    assert "token" in res.json()

    # 5. Unlock with incorrect pin fails
    res = client.post("/api/vault/unlock", json={"device_id": dev_id, "pin": "0000"})
    assert res.status_code == 401

    # 6. Change pin requires valid current pin
    res = client.post("/api/vault/set-pin", json={
        "device_id": dev_id,
        "pin": "7777",
        "current_pin": "wrong"
    })
    assert res.status_code == 401

    res = client.post("/api/vault/set-pin", json={
        "device_id": dev_id,
        "pin": "7777",
        "current_pin": "5555"
    })
    assert res.status_code == 200

    # 7. Unlock with new pin succeeds
    res = client.post("/api/vault/unlock", json={"device_id": dev_id, "pin": "7777"})
    assert res.status_code == 200

def test_vault_upload_and_vlc_streaming():
    client = TestClient(app)
    dev_id = f"test_upload_dev_{uuid.uuid4()}"

    # Unlock vault to get token
    client.post("/api/vault/set-pin", json={"device_id": dev_id, "pin": "1111"})
    token = client.post("/api/vault/unlock", json={"device_id": dev_id, "pin": "1111"}).json()["token"]

    # Upload video file to vault using raw stream
    dummy_video_content = b"FAKE_MP4_CONTENT_FOR_VAULT_TESTING"
    res = client.post(
        "/api/vault/upload?filename=my_phone_video.mp4",
        content=dummy_video_content,
        headers={
            "Authorization": f"Bearer {token}",
            "X-Device-Id": dev_id,
            "Content-Type": "video/mp4"
        }
    )
    assert res.status_code == 200
    file_id = res.json()["file_id"]
    assert res.json()["in_vault"] == 1
    assert res.json()["title"] == "my_phone_video"

    # Query vault files
    res = client.get("/api/vault/files", headers={"Authorization": f"Bearer {token}", "X-Device-Id": dev_id})
    assert res.status_code == 200
    files = res.json()
    assert any(f["file_id"] == file_id for f in files)

    # Stream with token in query param (for VLC compatibility)
    res = client.get(f"/api/files/{file_id}/stream?token={token}")
    assert res.status_code in (200, 206)
    assert res.content == dummy_video_content

    # Stream without token should fail with 401
    res = client.get(f"/api/files/{file_id}/stream")
    assert res.status_code == 401

    # Request M3U playlist for external players
    res = client.get(f"/api/vault/playlist.m3u?token={token}&file_ids={file_id}")
    assert res.status_code == 200
    assert "audio/x-mpegurl" in res.headers.get("content-type", "") or "text" in res.headers.get("content-type", "")
    assert f"/api/files/{file_id}/stream?token={token}" in res.text

    # Delete vault file
    res = client.delete(f"/api/files/{file_id}", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200

    # Verify deleted
    res = client.get("/api/vault/files", headers={"Authorization": f"Bearer {token}", "X-Device-Id": dev_id})
    assert not any(f["file_id"] == file_id for f in res.json())

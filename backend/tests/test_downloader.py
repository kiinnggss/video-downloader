import os
import tempfile
import asyncio
from unittest.mock import patch, MagicMock
import pytest

from app.db import init_db, get_task, list_media_files
from app.models import DownloadRequest, DownloadTask
from app.services.downloader import (
    format_speed,
    calculate_progress,
    broadcast_telemetry,
    subscribe_telemetry,
    get_telemetry_stream,
    start_download,
    run_download_thread,
    active_subscribers,
    lock,
)

@pytest.fixture
def test_db():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    init_db(path)
    yield path
    if os.path.exists(path):
        os.remove(path)

def test_format_speed():
    assert format_speed(2500000) == "20.00 Mb/s"
    assert format_speed(125000) == "1.00 Mb/s"
    assert format_speed(0) == "0 Mb/s"
    assert format_speed(-100) == "0 Mb/s"
    assert format_speed(None) == "0 Mb/s"

def test_calculate_progress():
    progress = calculate_progress(downloaded=5000, total=10000)
    assert progress == 50.0
    progress_zero = calculate_progress(downloaded=0, total=0)
    assert progress_zero == 0.0
    assert calculate_progress(downloaded=100, total=-1) == 0.0
    assert calculate_progress(downloaded=100, total=None) == 0.0

def test_subscribe_and_broadcast_telemetry():
    async def run_telemetry():
        gen = subscribe_telemetry()
        task = asyncio.create_task(gen.__anext__())
        await asyncio.sleep(0.01)

        payload = {"task_id": "test-task", "status": "downloading", "progress": 42.5}
        broadcast_telemetry(payload)

        received = await task
        assert received == payload
        await gen.aclose()

        with lock:
            assert len(active_subscribers) == 0

    asyncio.run(run_telemetry())

def test_get_telemetry_stream_alias():
    assert get_telemetry_stream is subscribe_telemetry

def test_start_download_queues_task(test_db):
    req = DownloadRequest(
        url="https://example.com/watch?v=abc",
        format_id="22",
        is_audio=False,
        in_vault=False
    )
    with patch("threading.Thread") as mock_thread_cls:
        mock_thread = MagicMock()
        mock_thread_cls.return_value = mock_thread

        task_id = start_download(req, db_path=test_db)
        assert task_id is not None
        assert len(task_id) > 0

        mock_thread.start.assert_called_once()
        task = get_task(task_id, db_path=test_db)
        assert task is not None
        assert task.status == "queued"
        assert task.url == req.url
        assert task.progress == 0.0

def test_run_download_thread_success(test_db):
    req = DownloadRequest(
        url="https://example.com/watch?v=123",
        format_id="22",
        is_audio=False,
        in_vault=False
    )
    task_id = "task-uuid-12345"
    initial_task = DownloadTask(
        task_id=task_id,
        url=req.url,
        title="Starting download...",
        status="queued",
        progress=0.0,
        in_vault=False
    )
    from app.db import save_task
    save_task(initial_task, db_path=test_db)

    captured_opts = {}

    class MockYoutubeDL:
        def __init__(self, opts):
            captured_opts.update(opts)

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_val, exc_tb):
            pass

        def extract_info(self, url, download=True):
            hooks = captured_opts.get("progress_hooks", [])
            for hook in hooks:
                hook({
                    "status": "downloading",
                    "downloaded_bytes": 5000000,
                    "total_bytes": 10000000,
                    "speed": 1250000,
                    "eta": 4,
                    "info_dict": {"title": "Test Video Clip"}
                })
            return {
                "title": "Test Video Clip",
                "filesize": 10000000,
                "duration": 60,
                "thumbnail": "https://example.com/thumb.jpg"
            }

        def prepare_filename(self, info):
            return "/tmp/storage/public/videos/Test Video Clip-task-uui.mp4"

    with patch("yt_dlp.YoutubeDL", side_effect=MockYoutubeDL):
        run_download_thread(task_id, req, db_path=test_db)

    completed = get_task(task_id, db_path=test_db)
    assert completed is not None
    assert completed.status == "finished"
    assert completed.progress == 100.0
    assert completed.total_bytes == 10000000

    media_files = list_media_files(category="video", in_vault=False, db_path=test_db)
    assert len(media_files) == 1
    assert media_files[0].title == "Test Video Clip"
    assert media_files[0].filename == "Test Video Clip-task-uui.mp4"
    assert media_files[0].category == "video"
    assert media_files[0].duration == 60

def test_run_download_thread_audio(test_db):
    req = DownloadRequest(
        url="https://example.com/audio",
        format_id="bestaudio",
        is_audio=True,
        in_vault=False
    )
    task_id = "task-audio-12345"
    captured_opts = {}

    class MockAudioYoutubeDL:
        def __init__(self, opts):
            captured_opts.update(opts)

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_val, exc_tb):
            pass

        def extract_info(self, url, download=True):
            return {
                "title": "Audio Track",
                "filesize": 3500000,
                "duration": 210,
                "thumbnail": None
            }

        def prepare_filename(self, info):
            return "/tmp/storage/public/music/Audio Track-task-aud.webm"

    with patch("yt_dlp.YoutubeDL", side_effect=MockAudioYoutubeDL):
        run_download_thread(task_id, req, db_path=test_db)

    assert captured_opts.get("format") == "bestaudio/best"
    assert any(p.get("key") == "FFmpegExtractAudio" for p in captured_opts.get("postprocessors", []))

    media_files = list_media_files(category="music", in_vault=False, db_path=test_db)
    assert len(media_files) == 1
    assert media_files[0].filename.endswith(".mp3")
    assert media_files[0].category == "music"

def test_run_download_thread_vault(test_db):
    req = DownloadRequest(
        url="https://example.com/private",
        format_id="best",
        is_audio=False,
        in_vault=True
    )
    task_id = "task-vault-12345"
    captured_opts = {}

    class MockVaultYoutubeDL:
        def __init__(self, opts):
            captured_opts.update(opts)

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_val, exc_tb):
            pass

        def extract_info(self, url, download=True):
            return {
                "title": "Secret Video",
                "filesize": 8000000,
                "duration": 45,
                "thumbnail": None
            }

        def prepare_filename(self, info):
            return "/tmp/storage/vault/Secret Video-task-vau.mp4"

    with patch("yt_dlp.YoutubeDL", side_effect=MockVaultYoutubeDL):
        run_download_thread(task_id, req, db_path=test_db)

    assert "vault" in captured_opts.get("outtmpl", "")
    media_files = list_media_files(category=None, in_vault=True, db_path=test_db)
    assert len(media_files) == 1
    assert media_files[0].in_vault is True

    task = get_task(task_id, db_path=test_db)
    assert task.in_vault is True
    assert task.status == "finished"

def test_run_download_thread_error(test_db):
    req = DownloadRequest(
        url="https://invalid-url.com/broken",
        format_id="22",
        is_audio=False,
        in_vault=False
    )
    task_id = "task-err-12345"

    class FailingYoutubeDL:
        def __init__(self, opts):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_val, exc_tb):
            pass

        def extract_info(self, url, download=True):
            raise RuntimeError("Extraction failed")

    with patch("yt_dlp.YoutubeDL", side_effect=FailingYoutubeDL):
        run_download_thread(task_id, req, db_path=test_db)

    failed_task = get_task(task_id, db_path=test_db)
    assert failed_task is not None
    assert failed_task.status == "error"
    assert failed_task.title == "Download Failed"
    assert failed_task.progress == 0.0

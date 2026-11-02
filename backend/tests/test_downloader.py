import os
import tempfile
import asyncio
from pathlib import Path
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

def test_progress_hook_throttles_db_writes(test_db):
    req = DownloadRequest(
        url="https://example.com/stream",
        format_id="22",
        is_audio=False,
        in_vault=False
    )
    task_id = "task-throttle-test"
    simulated_time = 1000.0

    class MockThrottledYoutubeDL:
        def __init__(self, opts):
            self.opts = opts

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_val, exc_tb):
            pass

        def extract_info(self, url, download=True):
            nonlocal simulated_time
            hook = self.opts["progress_hooks"][0]
            # Event 1: first downloading event (status transition from None to downloading) -> saves to DB
            hook({"status": "downloading", "downloaded_bytes": 1000, "total_bytes": 10000})

            # Event 2: rapid event 0.1s later (status still downloading) -> throttles DB write
            simulated_time += 0.1
            hook({"status": "downloading", "downloaded_bytes": 2000, "total_bytes": 10000})

            # Event 3: rapid event 0.2s later -> throttles DB write
            simulated_time += 0.2
            hook({"status": "downloading", "downloaded_bytes": 3000, "total_bytes": 10000})

            # Event 4: event after 1.1s -> saves to DB
            simulated_time += 1.1
            hook({"status": "downloading", "downloaded_bytes": 5000, "total_bytes": 10000})

            # Event 5: status transition to finished within hook -> saves to DB immediately
            simulated_time += 0.1
            hook({"status": "finished", "downloaded_bytes": 10000, "total_bytes": 10000})

            return {"title": "Stream Clip", "filesize": 10000}

        def prepare_filename(self, info):
            return "/tmp/storage/public/videos/clip.mp4"

    with patch("time.time", side_effect=lambda: simulated_time), \
         patch("yt_dlp.YoutubeDL", side_effect=MockThrottledYoutubeDL), \
         patch("app.services.downloader.save_task") as mock_save, \
         patch("app.services.downloader.broadcast_telemetry") as mock_broadcast:

        run_download_thread(task_id, req, db_path=test_db)

        # Broadcast is called on all 5 hook events + 1 completion event = 6 times
        assert mock_broadcast.call_count == 6
        # save_task should be called for:
        # 1. Event 1 (transition to downloading)
        # 2. Event 4 (>1.0s elapsed)
        # 3. Event 5 (transition to finished in hook)
        # 4. Final completion save
        # It must not be called for Events 2 and 3.
        assert mock_save.call_count == 4

def test_run_download_thread_filesize_fallback_and_path_name(test_db):
    req = DownloadRequest(
        url="https://example.com/fallback-size",
        format_id="best",
        is_audio=False,
        in_vault=False
    )
    task_id = "task-fallback-size"

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tf:
        tf.write(b"0" * 45678)
        disk_file_path = tf.name

    try:
        class MockSizeFallbackYoutubeDL:
            def __init__(self, opts):
                pass

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc_val, exc_tb):
                pass

            def extract_info(self, url, download=True):
                return {
                    "title": "Fallback Video",
                    "filesize": 0,
                    "duration": 12,
                    "thumbnail": None
                }

            def prepare_filename(self, info):
                return disk_file_path

        with patch("yt_dlp.YoutubeDL", side_effect=MockSizeFallbackYoutubeDL):
            run_download_thread(task_id, req, db_path=test_db)

        completed = get_task(task_id, db_path=test_db)
        assert completed is not None
        assert completed.status == "finished"
        assert completed.total_bytes == 45678
        assert completed.downloaded_bytes == 45678

        files = list_media_files(category="video", in_vault=False, db_path=test_db)
        assert len(files) == 1
        assert files[0].filesize == 45678
        assert files[0].filename == Path(disk_file_path).name
        assert files[0].filepath == disk_file_path
    finally:
        if os.path.exists(disk_file_path):
            os.remove(disk_file_path)

def test_pause_resume_cancel_controls(test_db):
    from app.services.downloader import (
        register_controller,
        pause_download,
        resume_download,
        cancel_download,
        get_controller,
        remove_controller,
    )
    req = DownloadRequest(url="https://example.com/test", format_id="best")
    task_id = "task-control-1"
    ctrl = register_controller(task_id, req)
    assert ctrl is not None
    assert ctrl.pause_event.is_set()
    assert not ctrl.cancelled

    # Test pause
    assert pause_download(task_id, db_path=test_db) is True
    assert not ctrl.pause_event.is_set()

    # Test resume
    assert resume_download(task_id, db_path=test_db) is True
    assert ctrl.pause_event.is_set()

    # Test cancel
    assert cancel_download(task_id, db_path=test_db) is True
    assert ctrl.cancelled is True

    remove_controller(task_id)
    assert get_controller(task_id) is None



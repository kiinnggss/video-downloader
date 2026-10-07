import os
import tempfile
import pytest
from app.db import init_db, save_task, get_task, save_media_file, list_media_files
from app.models import DownloadTask, MediaFile

@pytest.fixture
def test_db():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    init_db(path)
    yield path
    if os.path.exists(path):
        os.remove(path)

def test_save_and_retrieve_task(test_db):
    task = DownloadTask(
        task_id="task-123",
        url="https://example.com/video",
        title="Test Video",
        status="queued",
        progress=0.0,
        speed="0 Mb/s",
        downloaded_bytes=0,
        total_bytes=1000,
        in_vault=False
    )
    save_task(task, db_path=test_db)
    retrieved = get_task("task-123", db_path=test_db)
    assert retrieved is not None
    assert retrieved.title == "Test Video"
    assert retrieved.status == "queued"

def test_save_and_list_media_files(test_db):
    media = MediaFile(
        file_id="file-1",
        title="Wild Animals",
        filename="wild.mp4",
        filepath="/storage/public/videos/wild.mp4",
        category="video",
        filesize=15000000,
        duration=120,
        thumbnail="https://example.com/thumb.jpg",
        in_vault=False
    )
    save_media_file(media, db_path=test_db)
    files = list_media_files(category="video", in_vault=False, db_path=test_db)
    assert len(files) == 1
    assert files[0].title == "Wild Animals"

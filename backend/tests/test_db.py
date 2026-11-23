import os
import tempfile
import pytest
from app.db import init_db, save_task, get_task, list_tasks, save_media_file, list_media_files
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


def test_legacy_tasks_migration_and_error_message_roundtrip(tmp_path):
    import sqlite3

    legacy_db = tmp_path / "legacy.db"
    conn = sqlite3.connect(str(legacy_db))
    with conn:
        conn.execute("""
            CREATE TABLE tasks (
                task_id TEXT PRIMARY KEY,
                url TEXT NOT NULL,
                title TEXT NOT NULL,
                status TEXT NOT NULL,
                progress REAL DEFAULT 0.0,
                speed TEXT DEFAULT '0 Mb/s',
                downloaded_bytes INTEGER DEFAULT 0,
                total_bytes INTEGER DEFAULT 0,
                eta_seconds INTEGER,
                in_vault INTEGER DEFAULT 0
            )
        """)
    conn.close()

    init_db(str(legacy_db))

    conn_check = sqlite3.connect(str(legacy_db))
    cols = [row[1] for row in conn_check.execute("PRAGMA table_info(tasks)").fetchall()]
    conn_check.close()
    assert "error_message" in cols

    failed = DownloadTask(
        task_id="err-roundtrip-1",
        url="https://example.com/blocked",
        title="Download Failed",
        status="error",
        device_id="dev-err-1",
        error_message="Geo-restricted in the server region.",
    )
    save_task(failed, db_path=str(legacy_db))

    fetched = get_task("err-roundtrip-1", db_path=str(legacy_db))
    assert fetched is not None
    assert fetched.error_message == "Geo-restricted in the server region."

    listed = list_tasks(device_id="dev-err-1", db_path=str(legacy_db))
    assert len(listed) == 1
    assert listed[0].error_message == "Geo-restricted in the server region."


import sqlite3
from typing import Optional, List
from app.models import DownloadTask, MediaFile
from app.config import DB_PATH

def get_connection(db_path: str = None):
    path = db_path or str(DB_PATH)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(db_path: str = None):
    conn = get_connection(db_path)
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                task_id TEXT PRIMARY KEY,
                url TEXT NOT NULL,
                title TEXT NOT NULL,
                status TEXT NOT NULL,
                progress REAL DEFAULT 0.0,
                speed TEXT DEFAULT '0 Mb/s',
                downloaded_bytes INTEGER DEFAULT 0,
                total_bytes INTEGER DEFAULT 0,
                eta_seconds INTEGER,
                in_vault INTEGER DEFAULT 0,
                file_id TEXT,
                filename TEXT
            )
        """)
        try:
            conn.execute("ALTER TABLE tasks ADD COLUMN file_id TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE tasks ADD COLUMN filename TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE tasks ADD COLUMN device_id TEXT")
        except sqlite3.OperationalError:
            pass
        conn.execute("""
            CREATE TABLE IF NOT EXISTS media_files (
                file_id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                filename TEXT NOT NULL,
                filepath TEXT NOT NULL,
                category TEXT NOT NULL,
                filesize INTEGER NOT NULL,
                duration INTEGER NOT NULL,
                thumbnail TEXT,
                in_vault INTEGER DEFAULT 0,
                device_id TEXT
            )
        """)
        try:
            conn.execute("ALTER TABLE media_files ADD COLUMN device_id TEXT")
        except sqlite3.OperationalError:
            pass

        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(vault_auth)")
        cols = [r[1] for r in cursor.fetchall()]
        if not cols:
            conn.execute("""
                CREATE TABLE vault_auth (
                    device_id TEXT PRIMARY KEY,
                    pin_hash TEXT NOT NULL
                )
            """)
        elif "device_id" not in cols:
            conn.execute("DROP TABLE IF EXISTS vault_auth")
            conn.execute("""
                CREATE TABLE vault_auth (
                    device_id TEXT PRIMARY KEY,
                    pin_hash TEXT NOT NULL
                )
            """)
    conn.close()

init_db()

def save_task(task: DownloadTask, db_path: str = None):
    conn = get_connection(db_path)
    with conn:
        conn.execute("""
            INSERT OR REPLACE INTO tasks 
            (task_id, url, title, status, progress, speed, downloaded_bytes, total_bytes, eta_seconds, in_vault, file_id, filename, device_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            task.task_id, task.url, task.title, task.status, task.progress, task.speed,
            task.downloaded_bytes, task.total_bytes, task.eta_seconds, 1 if task.in_vault else 0,
            task.file_id, task.filename, task.device_id
        ))
    conn.close()

def get_task(task_id: str, db_path: str = None) -> Optional[DownloadTask]:
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tasks WHERE task_id = ?", (task_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    keys = row.keys()
    return DownloadTask(
        task_id=row["task_id"],
        url=row["url"],
        title=row["title"],
        status=row["status"],
        progress=row["progress"],
        speed=row["speed"],
        downloaded_bytes=row["downloaded_bytes"],
        total_bytes=row["total_bytes"],
        eta_seconds=row["eta_seconds"],
        in_vault=bool(row["in_vault"]),
        file_id=row["file_id"] if "file_id" in keys else None,
        filename=row["filename"] if "filename" in keys else None,
        device_id=row["device_id"] if "device_id" in keys else None,
    )

def save_media_file(media: MediaFile, db_path: str = None):
    conn = get_connection(db_path)
    with conn:
        conn.execute("""
            INSERT OR REPLACE INTO media_files 
            (file_id, title, filename, filepath, category, filesize, duration, thumbnail, in_vault, device_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            media.file_id, media.title, media.filename, media.filepath, media.category,
            media.filesize, media.duration, media.thumbnail, 1 if media.in_vault else 0,
            media.device_id
        ))
    conn.close()

def list_media_files(category: Optional[str] = None, in_vault: bool = False, device_id: Optional[str] = None, db_path: str = None) -> List[MediaFile]:
    conn = get_connection(db_path)
    cursor = conn.cursor()
    query = "SELECT * FROM media_files WHERE in_vault = ?"
    params = [1 if in_vault else 0]
    if category and category not in ("all", "download"):
        query += " AND category = ?"
        params.append(category)
    if device_id:
        query += " AND device_id = ?"
        params.append(device_id)
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [
        MediaFile(
            file_id=r["file_id"],
            title=r["title"],
            filename=r["filename"],
            filepath=r["filepath"],
            category=r["category"],
            filesize=r["filesize"],
            duration=r["duration"],
            thumbnail=r["thumbnail"],
            in_vault=bool(r["in_vault"]),
            device_id=r["device_id"] if "device_id" in r.keys() else None,
        ) for r in rows
    ]

def get_media_file(file_id: str, db_path: str = None) -> Optional[MediaFile]:
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM media_files WHERE file_id = ?", (file_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    keys = row.keys()
    return MediaFile(
        file_id=row["file_id"],
        title=row["title"],
        filename=row["filename"],
        filepath=row["filepath"],
        category=row["category"],
        filesize=row["filesize"],
        duration=row["duration"],
        thumbnail=row["thumbnail"],
        in_vault=bool(row["in_vault"]),
        device_id=row["device_id"] if "device_id" in keys else None,
    )

def delete_media_file(file_id: str, db_path: str = None) -> bool:
    conn = get_connection(db_path)
    with conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM media_files WHERE file_id = ?", (file_id,))
        deleted = cursor.rowcount > 0
    conn.close()
    return deleted

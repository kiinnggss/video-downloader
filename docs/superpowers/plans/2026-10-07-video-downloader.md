# Mobile Video Downloader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first web application for inspecting, downloading, streaming, and storing online videos with real-time transfer telemetry and a crystal shadow aesthetic inspired by Dribbble concept 23157777.

**Architecture:** A Python FastAPI backend orchestrates `yt-dlp` extraction and download workers, publishing progress events via Server-Sent Events and serving byte-range streams over HTTP 206. A mobile-optimized React client renders translucent glass panels, diffused shadows, an active download card, and a PIN-protected private vault.

**Tech Stack:** Python 3.11+, FastAPI, Uvicorn, yt-dlp, SQLite, pytest, React 19, Vite, Tailwind CSS, Lucide Icons.

**Spec:** `docs/superpowers/specs/2026-10-07-video-downloader-design.md`

## Global Constraints
* Confine all runtimes to project-scoped virtual environment `.venv` and local `node_modules`.
* Avoid hard rectangular borders. Style components with `backdrop-blur-xl`, `border border-white/20`, and `shadow-2xl shadow-black/10`.
* Maintain mobile viewport responsiveness (375px to 430px primary, responsive desktop centering).
* Do not use em dashes in text, code, or documentation.

---

### Task 1: Backend Foundation, Models, and SQLite Store

**Files:**
* Create: `backend/requirements.txt`
* Create: `backend/app/config.py`
* Create: `backend/app/models.py`
* Create: `backend/app/db.py`
* Test: `backend/tests/test_db.py`

**Interfaces:**
* Produces:
  * `app.models.InspectRequest`, `app.models.InspectResponse`, `app.models.FormatOption`
  * `app.models.DownloadRequest`, `app.models.DownloadTask`, `app.models.MediaFile`
  * `app.db.init_db(db_path: str = None)`
  * `app.db.save_task(task: DownloadTask)`
  * `app.db.get_task(task_id: str) -> Optional[DownloadTask]`
  * `app.db.save_media_file(file: MediaFile)`
  * `app.db.list_media_files(category: Optional[str], in_vault: bool) -> List[MediaFile]`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_db.py
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_db.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app'`

- [ ] **Step 3: Write minimal implementation**

```txt
# backend/requirements.txt
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
yt-dlp>=2024.08.06
pydantic>=2.8.0
sse-starlette>=2.1.0
pytest>=8.3.0
httpx>=0.27.0
```

```python
# backend/app/config.py
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
PUBLIC_STORAGE = STORAGE_DIR / "public"
VAULT_STORAGE = STORAGE_DIR / "vault"
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "downloads.db"

PUBLIC_STORAGE.mkdir(parents=True, exist_ok=True)
VAULT_STORAGE.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)
```

```python
# backend/app/models.py
from typing import Optional, List
from pydantic import BaseModel

class FormatOption(BaseModel):
    format_id: str
    resolution: str
    ext: str
    filesize_approx: Optional[int] = None
    note: str

class InspectRequest(BaseModel):
    url: str

class InspectResponse(BaseModel):
    url: str
    title: str
    author: str
    duration: int
    thumbnail: str
    formats: List[FormatOption]

class DownloadRequest(BaseModel):
    url: str
    format_id: str
    is_audio: bool = False
    in_vault: bool = False

class DownloadTask(BaseModel):
    task_id: str
    url: str
    title: str
    status: str
    progress: float = 0.0
    speed: str = "0 Mb/s"
    downloaded_bytes: int = 0
    total_bytes: int = 0
    eta_seconds: Optional[int] = None
    in_vault: bool = False

class MediaFile(BaseModel):
    file_id: str
    title: str
    filename: str
    filepath: str
    category: str
    filesize: int
    duration: int
    thumbnail: Optional[str] = None
    in_vault: bool = False
```

```python
# backend/app/db.py
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
                in_vault INTEGER DEFAULT 0
            )
        """)
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
                in_vault INTEGER DEFAULT 0
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS vault_auth (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                pin_hash TEXT NOT NULL
            )
        """)
    conn.close()

def save_task(task: DownloadTask, db_path: str = None):
    conn = get_connection(db_path)
    with conn:
        conn.execute("""
            INSERT OR REPLACE INTO tasks 
            (task_id, url, title, status, progress, speed, downloaded_bytes, total_bytes, eta_seconds, in_vault)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            task.task_id, task.url, task.title, task.status, task.progress, task.speed,
            task.downloaded_bytes, task.total_bytes, task.eta_seconds, 1 if task.in_vault else 0
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
        in_vault=bool(row["in_vault"])
    )

def save_media_file(media: MediaFile, db_path: str = None):
    conn = get_connection(db_path)
    with conn:
        conn.execute("""
            INSERT OR REPLACE INTO media_files 
            (file_id, title, filename, filepath, category, filesize, duration, thumbnail, in_vault)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            media.file_id, media.title, media.filename, media.filepath, media.category,
            media.filesize, media.duration, media.thumbnail, 1 if media.in_vault else 0
        ))
    conn.close()

def list_media_files(category: Optional[str] = None, in_vault: bool = False, db_path: str = None) -> List[MediaFile]:
    conn = get_connection(db_path)
    cursor = conn.cursor()
    query = "SELECT * FROM media_files WHERE in_vault = ?"
    params = [1 if in_vault else 0]
    if category and category != "all":
        query += " AND category = ?"
        params.append(category)
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
            in_vault=bool(r["in_vault"])
        ) for r in rows
    ]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_db.py -v`
Expected: PASS with 2 tests passed

- [ ] **Step 5: Commit**

```bash
git -C video-downloader add backend/
git -C video-downloader commit -m "feat(backend): add models, configuration, and SQLite store"
```

---

### Task 2: Video Extraction Engine

**Files:**
* Create: `backend/app/services/extractor.py`
* Test: `backend/tests/test_extractor.py`

**Interfaces:**
* Consumes: `app.models.FormatOption`, `app.models.InspectResponse`
* Produces: `app.services.extractor.extract_video_info(url: str) -> InspectResponse`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_extractor.py
from unittest.mock import patch
from app.services.extractor import parse_raw_info, extract_video_info

def test_parse_raw_info():
    mock_payload = {
        "webpage_url": "https://example.com/watch?v=123",
        "title": "Ocean Life",
        "uploader": "Nature Channel",
        "duration": 300,
        "thumbnail": "https://example.com/thumb.jpg",
        "formats": [
            {
                "format_id": "18",
                "vcodec": "avc1",
                "acodec": "mp4a",
                "ext": "mp4",
                "height": 360,
                "filesize": 12000000,
                "format_note": "360p"
            },
            {
                "format_id": "22",
                "vcodec": "avc1",
                "acodec": "mp4a",
                "ext": "mp4",
                "height": 720,
                "filesize": 45000000,
                "format_note": "720p HD"
            },
            {
                "format_id": "140",
                "vcodec": "none",
                "acodec": "mp4a",
                "ext": "m4a",
                "filesize": 5000000,
                "format_note": "audio only"
            }
        ]
    }
    result = parse_raw_info(mock_payload)
    assert result.title == "Ocean Life"
    assert result.author == "Nature Channel"
    assert result.duration == 300
    assert len(result.formats) >= 2
    formats_res = [f.resolution for f in result.formats]
    assert "720p" in formats_res
    assert "Audio" in formats_res
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_extractor.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.extractor'`

- [ ] **Step 3: Write minimal implementation**

```python
# backend/app/services/extractor.py
import yt_dlp
from typing import Dict, Any, List
from app.models import InspectResponse, FormatOption

def parse_raw_info(info: Dict[str, Any]) -> InspectResponse:
    url = info.get("webpage_url") or info.get("url", "")
    title = info.get("title") or "Untitled Media"
    author = info.get("uploader") or info.get("channel") or "Unknown"
    duration = int(info.get("duration") or 0)
    thumbnail = info.get("thumbnail") or ""
    
    raw_formats = info.get("formats", [])
    formats: List[FormatOption] = []
    seen_resolutions = set()

    # Prioritize popular video formats
    video_formats = [
        f for f in raw_formats 
        if f.get("vcodec") != "none" and f.get("height")
    ]
    video_formats.sort(key=lambda x: x.get("height", 0), reverse=True)

    for vf in video_formats:
        h = vf.get("height")
        res_label = f"{h}p"
        if res_label not in seen_resolutions:
            seen_resolutions.add(res_label)
            formats.append(FormatOption(
                format_id=str(vf.get("format_id")),
                resolution=res_label,
                ext=vf.get("ext", "mp4"),
                filesize_approx=vf.get("filesize") or vf.get("filesize_approx"),
                note=vf.get("format_note") or f"{res_label} video"
            ))

    # Add audio option
    audio_formats = [
        f for f in raw_formats 
        if f.get("vcodec") == "none" and f.get("acodec") != "none"
    ]
    if audio_formats:
        best_audio = audio_formats[-1]
        formats.append(FormatOption(
            format_id=str(best_audio.get("format_id")),
            resolution="Audio",
            ext="mp3",
            filesize_approx=best_audio.get("filesize") or best_audio.get("filesize_approx"),
            note="Audio only (MP3)"
        ))

    # Fallback format if list empty
    if not formats:
        formats.append(FormatOption(
            format_id="best",
            resolution="Best Available",
            ext="mp4",
            filesize_approx=None,
            note="Default stream"
        ))

    return InspectResponse(
        url=url,
        title=title,
        author=author,
        duration=duration,
        thumbnail=thumbnail,
        formats=formats
    )

def extract_video_info(url: str) -> InspectResponse:
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        return parse_raw_info(info)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_extractor.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C video-downloader add backend/app/services/extractor.py backend/tests/test_extractor.py
git -C video-downloader commit -m "feat(backend): add video info extractor service"
```

---

### Task 3: Download Worker and Telemetry Broadcaster

**Files:**
* Create: `backend/app/services/downloader.py`
* Test: `backend/tests/test_downloader.py`

**Interfaces:**
* Consumes: `app.models.DownloadRequest`, `app.models.DownloadTask`, `app.db.save_task`
* Produces:
  * `app.services.downloader.start_download(req: DownloadRequest, db_path: str = None) -> str`
  * `app.services.downloader.get_telemetry_stream()`
  * `app.services.downloader.format_speed(bytes_per_sec: float) -> str`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_downloader.py
import pytest
from app.services.downloader import format_speed, calculate_progress

def test_format_speed():
    assert format_speed(2500000) == "20.00 Mb/s"
    assert format_speed(125000) == "1.00 Mb/s"
    assert format_speed(0) == "0 Mb/s"

def test_calculate_progress():
    progress = calculate_progress(downloaded=5000, total=10000)
    assert progress == 50.0
    progress_zero = calculate_progress(downloaded=0, total=0)
    assert progress_zero == 0.0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_downloader.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.downloader'`

- [ ] **Step 3: Write minimal implementation**

```python
# backend/app/services/downloader.py
import uuid
import threading
import asyncio
from typing import Dict, Any, AsyncGenerator
import yt_dlp
from app.models import DownloadRequest, DownloadTask, MediaFile
from app.db import save_task, save_media_file, get_task
from app.config import PUBLIC_STORAGE, VAULT_STORAGE, DB_PATH

active_subscribers = []
lock = threading.Lock()

def format_speed(bytes_per_sec: float) -> str:
    if not bytes_per_sec or bytes_per_sec <= 0:
        return "0 Mb/s"
    mbps = (bytes_per_sec * 8) / 1_000_000
    return f"{mbps:.2f} Mb/s"

def calculate_progress(downloaded: int, total: int) -> float:
    if not total or total <= 0:
        return 0.0
    return round((downloaded / total) * 100, 1)

def broadcast_telemetry(payload: Dict[str, Any]):
    with lock:
        subs = list(active_subscribers)
    for q in subs:
        try:
            q.put_nowait(payload)
        except Exception:
            pass

def run_download_thread(task_id: str, req: DownloadRequest, db_path: str = None):
    target_dir = VAULT_STORAGE if req.in_vault else (
        PUBLIC_STORAGE / "music" if req.is_audio else PUBLIC_STORAGE / "videos"
    )
    target_dir.mkdir(parents=True, exist_ok=True)
    outtmpl = str(target_dir / f"%(title)s-{task_id[:8]}.%(ext)s")

    def progress_hook(d: Dict[str, Any]):
        status = d.get("status")
        downloaded = d.get("downloaded_bytes", 0)
        total = d.get("total_bytes") or d.get("total_bytes_estimate", 0)
        speed_raw = d.get("speed", 0) or 0
        speed_str = format_speed(speed_raw)
        eta = d.get("eta")
        progress = calculate_progress(downloaded, total)

        task = DownloadTask(
            task_id=task_id,
            url=req.url,
            title=d.get("info_dict", {}).get("title", "Downloading..."),
            status=status or "downloading",
            progress=progress,
            speed=speed_str,
            downloaded_bytes=downloaded,
            total_bytes=total,
            eta_seconds=eta,
            in_vault=req.in_vault
        )
        save_task(task, db_path=db_path)
        broadcast_telemetry(task.model_dump())

    ydl_opts = {
        "outtmpl": outtmpl,
        "progress_hooks": [progress_hook],
        "quiet": True,
        "no_warnings": True,
    }
    if req.is_audio:
        ydl_opts["format"] = "bestaudio/best"
        ydl_opts["postprocessors"] = [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "192",
        }]
    else:
        ydl_opts["format"] = f"{req.format_id}+bestaudio/best" if req.format_id != "best" else "best"

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(req.url, download=True)
            filename = ydl.prepare_filename(info)
            if req.is_audio:
                filename = str(filename).rsplit(".", 1)[0] + ".mp3"
            
            media = MediaFile(
                file_id=str(uuid.uuid4()),
                title=info.get("title", "Downloaded Video"),
                filename=str(filename).split("/")[-1],
                filepath=str(filename),
                category="music" if req.is_audio else "video",
                filesize=info.get("filesize", 0) or 0,
                duration=int(info.get("duration", 0) or 0),
                thumbnail=info.get("thumbnail"),
                in_vault=req.in_vault
            )
            save_media_file(media, db_path=db_path)
            
            completed_task = DownloadTask(
                task_id=task_id,
                url=req.url,
                title=info.get("title", "Completed"),
                status="finished",
                progress=100.0,
                speed="0 Mb/s",
                downloaded_bytes=media.filesize,
                total_bytes=media.filesize,
                in_vault=req.in_vault
            )
            save_task(completed_task, db_path=db_path)
            broadcast_telemetry(completed_task.model_dump())
    except Exception as e:
        failed_task = DownloadTask(
            task_id=task_id,
            url=req.url,
            title="Download Failed",
            status="error",
            progress=0.0,
            speed="0 Mb/s",
            downloaded_bytes=0,
            total_bytes=0,
            in_vault=req.in_vault
        )
        save_task(failed_task, db_path=db_path)
        broadcast_telemetry(failed_task.model_dump())

def start_download(req: DownloadRequest, db_path: str = None) -> str:
    task_id = str(uuid.uuid4())
    task = DownloadTask(
        task_id=task_id,
        url=req.url,
        title="Starting download...",
        status="queued",
        progress=0.0,
        speed="0 Mb/s",
        downloaded_bytes=0,
        total_bytes=0,
        in_vault=req.in_vault
    )
    save_task(task, db_path=db_path)
    t = threading.Thread(target=run_download_thread, args=(task_id, req, db_path), daemon=True)
    t.start()
    return task_id

async def subscribe_telemetry() -> AsyncGenerator[Dict[str, Any], None]:
    q = asyncio.Queue()
    with lock:
        active_subscribers.append(q)
    try:
        while True:
            item = await q.get()
            yield item
    finally:
        with lock:
            if q in active_subscribers:
                active_subscribers.remove(q)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_downloader.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C video-downloader add backend/app/services/downloader.py backend/tests/test_downloader.py
git -C video-downloader commit -m "feat(backend): add download worker and telemetry broadcasting"
```

---

### Task 4: Storage Manager and Byte-Range Video Streaming

**Files:**
* Create: `backend/app/services/storage.py`
* Test: `backend/tests/test_storage.py`

**Interfaces:**
* Consumes: `app.models.MediaFile`
* Produces:
  * `app.services.storage.stream_file_range(file_path: str, range_header: Optional[str])`
  * `app.services.storage.parse_range_header(header: str, file_size: int)`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_storage.py
import pytest
from app.services.storage import parse_range_header

def test_parse_range_header():
    start, end = parse_range_header("bytes=0-499", 1000)
    assert start == 0
    assert end == 499

    start, end = parse_range_header("bytes=500-", 1000)
    assert start == 500
    assert end == 999

    start, end = parse_range_header(None, 1000)
    assert start == 0
    assert end == 999
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_storage.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.storage'`

- [ ] **Step 3: Write minimal implementation**

```python
# backend/app/services/storage.py
import os
import mimetypes
from typing import Optional, Tuple
from fastapi import HTTPException
from fastapi.responses import StreamingResponse

def parse_range_header(range_header: Optional[str], file_size: int) -> Tuple[int, int]:
    if not range_header or not range_header.startswith("bytes="):
        return 0, file_size - 1
    
    parts = range_header.replace("bytes=", "").split("-")
    start = int(parts[0]) if parts[0] else 0
    end = int(parts[1]) if parts[1] else file_size - 1

    if start >= file_size:
        raise HTTPException(status_code=416, detail="Requested range not satisfiable")
    if end >= file_size:
        end = file_size - 1
        
    return start, end

def stream_file_range(file_path: str, range_header: Optional[str] = None):
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    file_size = os.path.getsize(file_path)
    start, end = parse_range_header(range_header, file_size)
    content_length = (end - start) + 1
    content_type, _ = mimetypes.guess_type(file_path)
    content_type = content_type or "application/octet-stream"

    def iter_file():
        with open(file_path, "rb") as f:
            f.seek(start)
            remaining = content_length
            chunk_size = 1024 * 1024  # 1MB chunks
            while remaining > 0:
                read_bytes = min(chunk_size, remaining)
                data = f.read(read_bytes)
                if not data:
                    break
                remaining -= len(data)
                yield data

    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(content_length),
        "Content-Type": content_type,
    }
    status_code = 206 if range_header else 200
    return StreamingResponse(iter_file(), status_code=status_code, headers=headers)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_storage.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C video-downloader add backend/app/services/storage.py backend/tests/test_storage.py
git -C video-downloader commit -m "feat(backend): add storage service and byte-range streaming"
```

---

### Task 5: Private Vault and PIN Security

**Files:**
* Create: `backend/app/services/vault.py`
* Test: `backend/tests/test_vault.py`

**Interfaces:**
* Consumes: `app.db.get_connection`
* Produces:
  * `app.services.vault.verify_pin(pin: str, db_path: str = None) -> bool`
  * `app.services.vault.set_pin(pin: str, db_path: str = None)`
  * `app.services.vault.generate_vault_token() -> str`
  * `app.services.vault.verify_vault_token(token: str) -> bool`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_vault.py
import os
import tempfile
import pytest
from app.db import init_db
from app.services.vault import set_pin, verify_pin, generate_vault_token, verify_vault_token

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

def test_vault_token():
    token = generate_vault_token()
    assert verify_vault_token(token) is True
    assert verify_vault_token("invalid-token") is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_vault.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.vault'`

- [ ] **Step 3: Write minimal implementation**

```python
# backend/app/services/vault.py
import hashlib
import secrets
import time
from typing import Dict
from app.db import get_connection

vault_sessions: Dict[str, float] = {}
DEFAULT_PIN = "1234"

def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode("utf-8")).hexdigest()

def set_pin(pin: str, db_path: str = None):
    conn = get_connection(db_path)
    pin_h = hash_pin(pin)
    with conn:
        conn.execute("INSERT OR REPLACE INTO vault_auth (id, pin_hash) VALUES (1, ?)", (pin_h,))
    conn.close()

def verify_pin(pin: str, db_path: str = None) -> bool:
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT pin_hash FROM vault_auth WHERE id = 1")
    row = cursor.fetchone()
    conn.close()
    if not row:
        # Default pin 1234
        return pin == DEFAULT_PIN
    return row["pin_hash"] == hash_pin(pin)

def generate_vault_token() -> str:
    token = secrets.token_hex(24)
    vault_sessions[token] = time.time() + 1800  # 30 minutes
    return token

def verify_vault_token(token: str) -> bool:
    if not token or token not in vault_sessions:
        return False
    expiry = vault_sessions[token]
    if time.time() > expiry:
        del vault_sessions[token]
        return False
    return True
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_vault.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C video-downloader add backend/app/services/vault.py backend/tests/test_vault.py
git -C video-downloader commit -m "feat(backend): add private vault security service"
```

---

### Task 6: FastAPI Application Endpoints Integration

**Files:**
* Create: `backend/app/main.py`
* Test: `backend/tests/test_api.py`

**Interfaces:**
* Produces:
  * `POST /api/inspect`
  * `POST /api/downloads`
  * `GET /api/downloads/stream`
  * `GET /api/files`
  * `GET /api/files/{id}/stream`
  * `GET /api/files/{id}/download`
  * `POST /api/vault/unlock`
  * `GET /api/vault/files`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_api.py
from unittest.mock import patch
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.models import InspectResponse, FormatOption

@pytest.mark.asyncio
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

@pytest.mark.asyncio
async def test_vault_unlock_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/vault/unlock", json={"pin": "1234"})
        assert res.status_code == 200
        assert "token" in res.json()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_api.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.main'`

- [ ] **Step 3: Write minimal implementation**

```python
# backend/app/main.py
import json
import os
from typing import Optional
from fastapi import FastAPI, HTTPException, Header, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sse_starlette.sse import EventSourceResponse

from app.models import InspectRequest, InspectResponse, DownloadRequest, DownloadTask
from app.services.extractor import extract_video_info
from app.services.downloader import start_download, subscribe_telemetry
from app.services.storage import stream_file_range
from app.services.vault import verify_pin, generate_vault_token, verify_vault_token
from app.db import init_db, list_media_files, get_connection

app = FastAPI(title="Crystal Video Downloader API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_db()

@app.post("/api/inspect", response_model=InspectResponse)
def inspect_url(req: InspectRequest):
    try:
        return extract_video_info(req.url)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to inspect URL: {str(e)}")

@app.post("/api/downloads")
def create_download(req: DownloadRequest):
    try:
        task_id = start_download(req)
        return {"task_id": task_id, "status": "queued"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start download: {str(e)}")

@app.get("/api/downloads/stream")
async def stream_telemetry():
    async def event_generator():
        async for data in subscribe_telemetry():
            yield {"event": "progress", "data": json.dumps(data)}
    return EventSourceResponse(event_generator())

@app.get("/api/files")
def get_files(category: Optional[str] = Query(None)):
    return list_media_files(category=category, in_vault=False)

@app.get("/api/files/{file_id}/stream")
def stream_media(file_id: str, request: Request):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT filepath FROM media_files WHERE file_id = ?", (file_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Media not found")
    range_header = request.headers.get("Range")
    return stream_file_range(row["filepath"], range_header)

@app.get("/api/files/{file_id}/download")
def download_media(file_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT filepath, filename FROM media_files WHERE file_id = ?", (file_id,))
    row = cursor.fetchone()
    conn.close()
    if not row or not os.path.exists(row["filepath"]):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(row["filepath"], filename=row["filename"])

@app.post("/api/vault/unlock")
def unlock_vault(payload: dict):
    pin = payload.get("pin", "")
    if verify_pin(pin):
        token = generate_vault_token()
        return {"token": token, "expires_in": 1800}
    raise HTTPException(status_code=401, detail="Invalid PIN")

@app.get("/api/vault/files")
def get_vault_files(authorization: Optional[str] = Header(None)):
    token = authorization.replace("Bearer ", "") if authorization else ""
    if not verify_vault_token(token):
        raise HTTPException(status_code=401, detail="Vault locked")
    return list_media_files(category=None, in_vault=True)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_api.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C video-downloader add backend/app/main.py backend/tests/test_api.py
git -C video-downloader commit -m "feat(backend): add FastAPI endpoints integration"
```

---

### Task 7: Frontend Scaffolding, Crystal Styling, and API Client

**Files:**
* Create: `frontend/package.json`
* Create: `frontend/vite.config.js`
* Create: `frontend/tailwind.config.js`
* Create: `frontend/src/index.css`
* Create: `frontend/src/api/client.js`
* Create: `frontend/src/api/telemetry.js`

**Interfaces:**
* Produces:
  * `apiClient.inspect(url: string)`
  * `apiClient.startDownload(options: object)`
  * `apiClient.getFiles(category: string)`
  * `apiClient.unlockVault(pin: string)`
  * `useTelemetry(): { activeTask, lastUpdate }`

- [ ] **Step 1: Create package.json and configuration**

```json
{
  "name": "crystal-video-downloader",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.475.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "vite": "^6.1.0"
  }
}
```

```javascript
// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
```

```javascript
// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        crystal: {
          light: "rgba(255, 255, 255, 0.65)",
          dark: "rgba(15, 23, 42, 0.75)",
          accent: "#22d3ee",
          amber: "#fbbf24",
        }
      },
      boxShadow: {
        'crystal': '0 20px 40px -15px rgba(0, 0, 0, 0.15)',
        'crystal-glow': '0 0 35px -5px rgba(34, 211, 238, 0.3)',
        'fab-glow': '0 10px 25px -3px rgba(251, 191, 36, 0.45)',
      }
    },
  },
  plugins: [],
}
```

```css
/* frontend/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer utilities {
  .crystal-card {
    background: rgba(255, 255, 255, 0.65);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.4);
    box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.08);
  }
  
  .crystal-card-dark {
    background: rgba(15, 23, 42, 0.7);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.4);
  }
}
```

- [ ] **Step 2: Write API and telemetry clients**

```javascript
// frontend/src/api/client.js
export const apiClient = {
  async inspect(url) {
    const res = await fetch('/api/inspect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Inspection failed');
    }
    return res.json();
  },

  async startDownload({ url, format_id, is_audio, in_vault }) {
    const res = await fetch('/api/downloads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, format_id, is_audio, in_vault }),
    });
    if (!res.ok) throw new Error('Download failed to start');
    return res.json();
  },

  async getFiles(category) {
    const q = category ? `?category=${category}` : '';
    const res = await fetch(`/api/files${q}`);
    return res.json();
  },

  async unlockVault(pin) {
    const res = await fetch('/api/vault/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) throw new Error('Invalid PIN');
    return res.json();
  },

  async getVaultFiles(token) {
    const res = await fetch('/api/vault/files', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Vault locked');
    return res.json();
  }
};
```

```javascript
// frontend/src/api/telemetry.js
import { useState, useEffect } from 'react';

export function useTelemetry() {
  const [activeTask, setActiveTask] = useState(null);

  useEffect(() => {
    const sse = new EventSource('/api/downloads/stream');
    sse.addEventListener('progress', (e) => {
      try {
        const data = JSON.parse(e.data);
        setActiveTask(data);
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    });

    return () => sse.close();
  }, []);

  return { activeTask };
}
```

- [ ] **Step 3: Commit**

```bash
git -C video-downloader add frontend/
git -C video-downloader commit -m "feat(frontend): add scaffolding, crystal styling tokens, and API client"
```

---

### Task 8: In-App Inspector View and Format Picker Modal

**Files:**
* Create: `frontend/src/components/InspectorView.jsx`
* Create: `frontend/src/components/FormatPickerModal.jsx`

**Interfaces:**
* Consumes: `apiClient.inspect`, `apiClient.startDownload`
* Produces:
  * `InspectorView({ onDownloadStarted })`
  * `FormatPickerModal({ inspectData, isOpen, onClose, onConfirm })`

- [ ] **Step 1: Write FormatPickerModal component**

```jsx
// frontend/src/components/FormatPickerModal.jsx
import React, { useState } from 'react';
import { Film, Music, Shield, Check, X } from 'lucide-react';

export function FormatPickerModal({ inspectData, isOpen, onClose, onConfirm }) {
  if (!isOpen || !inspectData) return null;

  const [selectedFormat, setSelectedFormat] = useState(inspectData.formats[0]?.format_id || 'best');
  const [isAudio, setIsAudio] = useState(false);
  const [inVault, setInVault] = useState(false);

  const handleSubmit = () => {
    onConfirm({
      url: inspectData.url,
      format_id: selectedFormat,
      is_audio: isAudio,
      in_vault: inVault,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md crystal-card rounded-t-3xl sm:rounded-3xl p-6 shadow-crystal flex flex-col gap-5 text-slate-800">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/50">
          <div>
            <h3 className="font-semibold text-lg text-slate-900">Select Quality</h3>
            <p className="text-xs text-slate-500 truncate max-w-[260px]">{inspectData.title}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200/50 text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Formats list */}
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
          {inspectData.formats.map((fmt) => {
            const isFmtAudio = fmt.resolution === 'Audio';
            const isSelected = selectedFormat === fmt.format_id;
            return (
              <button
                key={fmt.format_id}
                onClick={() => {
                  setSelectedFormat(fmt.format_id);
                  setIsAudio(isFmtAudio);
                }}
                className={`flex items-center justify-between p-3.5 rounded-2xl transition-all ${
                  isSelected 
                    ? 'bg-amber-400/20 border border-amber-400/50 shadow-sm' 
                    : 'bg-white/40 hover:bg-white/70 border border-white/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isSelected ? 'bg-amber-400 text-slate-900' : 'bg-slate-100 text-slate-500'}`}>
                    {isFmtAudio ? <Music size={18} /> : <Film size={18} />}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm text-slate-900">{fmt.resolution}</p>
                    <p className="text-xs text-slate-500">{fmt.note}</p>
                  </div>
                </div>
                {isSelected && <Check size={18} className="text-amber-600 mr-2" />}
              </button>
            );
          })}
        </div>

        {/* Vault Destination Toggle */}
        <div 
          onClick={() => setInVault(!inVault)}
          className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/5 hover:bg-slate-900/10 cursor-pointer transition-all border border-slate-900/5"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${inVault ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'}`}>
              <Shield size={18} />
            </div>
            <div>
              <p className="font-medium text-sm text-slate-900">Save to Private Vault</p>
              <p className="text-xs text-slate-500">PIN-protected space</p>
            </div>
          </div>
          <input 
            type="checkbox" 
            checked={inVault} 
            onChange={(e) => setInVault(e.target.checked)} 
            className="w-5 h-5 rounded-md accent-slate-900" 
          />
        </div>

        {/* Download action button */}
        <button
          onClick={handleSubmit}
          className="w-full py-4 rounded-full bg-amber-400 hover:bg-amber-500 active:scale-[0.98] text-slate-950 font-semibold shadow-fab-glow transition-all"
        >
          Start Download
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write InspectorView component**

```jsx
// frontend/src/components/InspectorView.jsx
import React, { useState } from 'react';
import { Search, X, Download, Compass, Loader2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { FormatPickerModal } from './FormatPickerModal';

export function InspectorView({ onDownloadStarted }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [inspectData, setInspectData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleInspect = async (e) => {
    e?.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await apiClient.inspect(url.trim());
      setInspectData(data);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to detect video stream');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDownload = async (options) => {
    try {
      await apiClient.startDownload(options);
      if (onDownloadStarted) onDownloadStarted();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to start download');
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto px-4 pt-4 pb-28">
      {/* Search / Address Pill */}
      <form onSubmit={handleInspect} className="relative w-full">
        <div className="flex items-center w-full crystal-card rounded-full px-4 py-2.5 shadow-sm">
          <Search size={18} className="text-slate-400 mr-2 flex-shrink-0" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste video link here..."
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          {url && (
            <button type="button" onClick={() => setUrl('')} className="p-1 text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !url}
            className="ml-2 px-4 py-1.5 rounded-full bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-1.5"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Inspect'}
          </button>
        </div>
      </form>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs text-center">
          {errorMsg}
        </div>
      )}

      {/* Video Preview Card */}
      {inspectData ? (
        <div className="crystal-card rounded-3xl overflow-hidden shadow-crystal flex flex-col gap-4 p-4 animate-fade-in">
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 shadow-inner">
            <img 
              src={inspectData.thumbnail} 
              alt={inspectData.title} 
              className="w-full h-full object-cover" 
            />
            <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-white text-[11px] font-mono">
              {Math.floor(inspectData.duration / 60)}:{String(inspectData.duration % 60).padStart(2, '0')}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <h2 className="font-semibold text-base text-slate-900 line-clamp-2 leading-tight">
              {inspectData.title}
            </h2>
            <p className="text-xs text-slate-500">
              from <span className="font-medium text-slate-700">{inspectData.author}</span>
            </p>
          </div>
        </div>
      ) : (
        /* Empty state helper */
        <div className="flex flex-col items-center justify-center p-12 text-center crystal-card rounded-3xl gap-3">
          <div className="p-4 rounded-full bg-amber-400/10 text-amber-500">
            <Compass size={32} />
          </div>
          <h3 className="font-medium text-slate-800 text-sm">Paste any link to begin</h3>
          <p className="text-xs text-slate-400 max-w-xs">
            Supports YouTube, Vimeo, TikTok, Instagram, Twitter, and direct MP4 streams.
          </p>
        </div>
      )}

      {/* Floating Action Button */}
      {inspectData && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-24 right-6 p-4 rounded-full bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-950 shadow-fab-glow transition-all z-40 flex items-center justify-center"
          title="Download Video"
        >
          <Download size={26} strokeWidth={2.5} />
        </button>
      )}

      {/* Format Modal */}
      <FormatPickerModal
        inspectData={inspectData}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmDownload}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git -C video-downloader add frontend/src/components/InspectorView.jsx frontend/src/components/FormatPickerModal.jsx
git -C video-downloader commit -m "feat(frontend): add inspector view and format picker modal"
```

---

### Task 9: Active Download Card and Telemetry Display

**Files:**
* Create: `frontend/src/components/ActiveDownloadCard.jsx`
* Test: `frontend/src/components/ActiveDownloadCard.test.jsx`

**Interfaces:**
* Consumes: `useTelemetry`
* Produces: `ActiveDownloadCard({ task })`

- [ ] **Step 1: Write ActiveDownloadCard component**

```jsx
// frontend/src/components/ActiveDownloadCard.jsx
import React from 'react';
import { Pause, Play, X, Zap } from 'lucide-react';

export function ActiveDownloadCard({ task }) {
  if (!task || task.status === 'finished') return null;

  const isDownloading = task.status === 'downloading';
  const downloadedMb = (task.downloaded_bytes / (1024 * 1024)).toFixed(2);
  const totalMb = (task.total_bytes / (1024 * 1024)).toFixed(2);

  return (
    <div className="crystal-card rounded-3xl p-4 shadow-crystal-glow border border-cyan-300/40 animate-fade-in flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 truncate pr-2">
          <div className="p-2 rounded-xl bg-cyan-400/20 text-cyan-600 flex-shrink-0">
            <Zap size={18} />
          </div>
          <div className="truncate">
            <h4 className="font-semibold text-sm text-slate-900 truncate">{task.title}</h4>
            <span className="text-[11px] font-mono font-medium text-cyan-600">{task.speed}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-slate-700 mr-2">{task.progress}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 rounded-full bg-slate-200/60 overflow-hidden p-0.5">
        <div 
          className="h-full rounded-full bg-cyan-400 transition-all duration-300 shadow-sm"
          style={{ width: `${task.progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span>{downloadedMb} MB / {totalMb} MB</span>
        {task.eta_seconds ? <span>ETA: {task.eta_seconds}s</span> : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git -C video-downloader add frontend/src/components/ActiveDownloadCard.jsx
git -C video-downloader commit -m "feat(frontend): add active download telemetry card"
```

---

### Task 10: "My Files" Media Library View and Media Player

**Files:**
* Create: `frontend/src/components/FilesView.jsx`
* Create: `frontend/src/components/MediaPlayerModal.jsx`

**Interfaces:**
* Consumes: `apiClient.getFiles`, `ActiveDownloadCard`
* Produces:
  * `FilesView({ activeTask })`
  * `MediaPlayerModal({ media, isOpen, onClose })`

- [ ] **Step 1: Write MediaPlayerModal component**

```jsx
// frontend/src/components/MediaPlayerModal.jsx
import React from 'react';
import { X, Download } from 'lucide-react';

export function MediaPlayerModal({ media, isOpen, onClose }) {
  if (!isOpen || !media) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg crystal-card-dark rounded-3xl overflow-hidden shadow-2xl flex flex-col text-white">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="font-medium text-sm truncate max-w-[280px]">{media.title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-white/70">
            <X size={18} />
          </button>
        </div>

        <div className="w-full aspect-video bg-black flex items-center justify-center">
          {media.category === 'music' ? (
            <audio controls autoPlay className="w-full px-6">
              <source src={`/api/files/${media.file_id}/stream`} type="audio/mp3" />
            </audio>
          ) : (
            <video controls autoPlay playsInline className="w-full h-full object-contain">
              <source src={`/api/files/${media.file_id}/stream`} type="video/mp4" />
            </video>
          )}
        </div>

        <div className="flex items-center justify-end p-4 border-t border-white/10">
          <a
            href={`/api/files/${media.file_id}/download`}
            download={media.filename}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400 text-slate-950 font-medium text-xs hover:bg-amber-300 transition-all shadow-sm"
          >
            <Download size={14} /> Save to Phone
          </a>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write FilesView component**

```jsx
// frontend/src/components/FilesView.jsx
import React, { useState, useEffect } from 'react';
import { Play, Download, MoreVertical, Film, Music } from 'lucide-react';
import { apiClient } from '../api/client';
import { ActiveDownloadCard } from './ActiveDownloadCard';
import { MediaPlayerModal } from './MediaPlayerModal';

export function FilesView({ activeTask }) {
  const [tab, setTab] = useState('all');
  const [files, setFiles] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(null);

  const loadFiles = async () => {
    try {
      const data = await apiClient.getFiles(tab);
      setFiles(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [tab, activeTask?.status]);

  return (
    <div className="flex flex-col gap-5 w-full max-w-md mx-auto px-4 pt-4 pb-28">
      <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Files</h1>

      {/* Segmented Pill Tabs */}
      <div className="flex items-center p-1 rounded-full crystal-card shadow-sm">
        {['all', 'video', 'music'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
              tab === t 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t === 'all' ? 'Download' : t === 'video' ? 'Local Video' : 'Music'}
          </button>
        ))}
      </div>

      {/* Active Download Progress Card */}
      {activeTask && <ActiveDownloadCard task={activeTask} />}

      {/* Files List */}
      <div className="flex flex-col gap-2.5">
        {files.length === 0 ? (
          <div className="crystal-card rounded-3xl p-10 text-center text-slate-400 text-xs">
            No completed files found in this category.
          </div>
        ) : (
          files.map((file) => (
            <div
              key={file.file_id}
              className="flex items-center justify-between p-3 crystal-card rounded-2xl hover:bg-white/80 transition-all shadow-sm group"
            >
              <div 
                onClick={() => setSelectedMedia(file)}
                className="flex items-center gap-3 truncate cursor-pointer flex-1"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden flex-shrink-0 relative flex items-center justify-center text-white">
                  {file.thumbnail ? (
                    <img src={file.thumbnail} alt={file.title} className="w-full h-full object-cover" />
                  ) : file.category === 'music' ? (
                    <Music size={20} className="text-amber-400" />
                  ) : (
                    <Film size={20} className="text-cyan-400" />
                  )}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={16} fill="white" className="text-white" />
                  </div>
                </div>

                <div className="truncate pr-2">
                  <h4 className="font-medium text-sm text-slate-900 truncate">{file.title}</h4>
                  <span className="text-xs text-slate-400 font-mono">
                    {(file.filesize / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedMedia(file)}
                  className="p-2 rounded-full hover:bg-slate-200/50 text-slate-600"
                  title="Play"
                >
                  <Play size={16} />
                </button>
                <a
                  href={`/api/files/${file.file_id}/download`}
                  download={file.filename}
                  className="p-2 rounded-full hover:bg-slate-200/50 text-slate-600"
                  title="Save to Phone"
                >
                  <Download size={16} />
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      <MediaPlayerModal
        media={selectedMedia}
        isOpen={!!selectedMedia}
        onClose={() => setSelectedMedia(null)}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git -C video-downloader add frontend/src/components/FilesView.jsx frontend/src/components/MediaPlayerModal.jsx
git -C video-downloader commit -m "feat(frontend): add files library and media player modal"
```

---

### Task 11: Private Vault UI and Bottom Navigation Integration

**Files:**
* Create: `frontend/src/components/VaultView.jsx`
* Create: `frontend/src/components/BottomNav.jsx`
* Modify: `frontend/src/App.jsx`

**Interfaces:**
* Produces:
  * `VaultView()`
  * `BottomNav({ currentTab, onChangeTab })`
  * Main `App` component running all views with the persistent shell

- [ ] **Step 1: Write VaultView component**

```jsx
// frontend/src/components/VaultView.jsx
import React, { useState } from 'react';
import { Lock, Unlock, ShieldAlert, Play, Download } from 'lucide-react';
import { apiClient } from '../api/client';
import { MediaPlayerModal } from './MediaPlayerModal';

export function VaultView() {
  const [pin, setPin] = useState('');
  const [token, setToken] = useState(null);
  const [vaultFiles, setVaultFiles] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);

  const handleUnlock = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    try {
      const res = await apiClient.unlockVault(pin);
      setToken(res.token);
      const files = await apiClient.getVaultFiles(res.token);
      setVaultFiles(files);
    } catch (err) {
      setErrorMsg('Incorrect PIN. Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto px-4 pt-4 pb-28 min-h-[80vh]">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white tracking-tight">Private Folder</h1>
        <div className="p-2 rounded-full bg-white/10 text-white/70">
          {token ? <Unlock size={18} /> : <Lock size={18} />}
        </div>
      </div>

      {!token ? (
        <form onSubmit={handleUnlock} className="flex flex-col items-center justify-center my-auto crystal-card-dark rounded-3xl p-8 gap-5 text-center">
          <div className="p-4 rounded-full bg-white/5 text-amber-400">
            <Lock size={32} />
          </div>
          <div>
            <h3 className="font-semibold text-white text-base">Enter PIN to Unlock</h3>
            <p className="text-xs text-slate-400 mt-1">Default PIN is 1234</p>
          </div>

          <input
            type="password"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            className="w-36 text-center tracking-widest text-2xl font-mono py-2 rounded-2xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-amber-400"
          />

          {errorMsg && <p className="text-xs text-rose-400">{errorMsg}</p>}

          <button
            type="submit"
            disabled={!pin}
            className="w-full py-3.5 rounded-full bg-amber-400 hover:bg-amber-500 font-semibold text-slate-950 text-sm transition-all disabled:opacity-50"
          >
            Unlock Vault
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          {vaultFiles.length === 0 ? (
            <div className="crystal-card-dark rounded-3xl p-10 text-center text-slate-400 text-xs">
              No private media files stored in your vault.
            </div>
          ) : (
            vaultFiles.map((file) => (
              <div
                key={file.file_id}
                className="flex items-center justify-between p-3 crystal-card-dark rounded-2xl shadow-sm"
              >
                <div onClick={() => setSelectedMedia(file)} className="flex items-center gap-3 truncate cursor-pointer flex-1">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-white flex-shrink-0">
                    <Play size={18} />
                  </div>
                  <div className="truncate">
                    <h4 className="font-medium text-sm text-white truncate">{file.title}</h4>
                    <span className="text-xs text-slate-400 font-mono">
                      {(file.filesize / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                </div>

                <a
                  href={`/api/files/${file.file_id}/download`}
                  download={file.filename}
                  className="p-2 rounded-full hover:bg-white/10 text-white/70"
                  title="Save to Phone"
                >
                  <Download size={16} />
                </a>
              </div>
            ))
          )}
        </div>
      )}

      <MediaPlayerModal
        media={selectedMedia}
        isOpen={!!selectedMedia}
        onClose={() => setSelectedMedia(null)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Write BottomNav component**

```jsx
// frontend/src/components/BottomNav.jsx
import React from 'react';
import { Home, Folder, Shield, ArrowLeft, ArrowRight } from 'lucide-react';

export function BottomNav({ currentTab, onChangeTab }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center p-3 pointer-events-none">
      <nav className="flex items-center justify-around w-full max-w-sm crystal-card rounded-full px-4 py-2.5 shadow-2xl pointer-events-auto border border-white/30">
        <button
          onClick={() => window.history.back()}
          className="p-2 rounded-full text-slate-400 hover:text-slate-800 transition-colors"
          title="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <button
          onClick={() => onChangeTab('home')}
          className={`flex flex-col items-center gap-0.5 p-2 rounded-full transition-all ${
            currentTab === 'home' ? 'text-amber-500 font-bold scale-110' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <Home size={20} />
        </button>

        <button
          onClick={() => onChangeTab('files')}
          className={`flex flex-col items-center gap-0.5 p-2 rounded-full transition-all ${
            currentTab === 'files' ? 'text-cyan-500 font-bold scale-110' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <Folder size={20} />
        </button>

        <button
          onClick={() => onChangeTab('vault')}
          className={`flex flex-col items-center gap-0.5 p-2 rounded-full transition-all ${
            currentTab === 'vault' ? 'text-amber-500 font-bold scale-110' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <Shield size={20} />
        </button>

        <button
          onClick={() => window.history.forward()}
          className="p-2 rounded-full text-slate-400 hover:text-slate-800 transition-colors"
          title="Forward"
        >
          <ArrowRight size={18} />
        </button>
      </nav>
    </div>
  );
}
```

- [ ] **Step 3: Connect Main App Component**

```jsx
// frontend/src/App.jsx
import React, { useState } from 'react';
import { InspectorView } from './components/InspectorView';
import { FilesView } from './components/FilesView';
import { VaultView } from './components/VaultView';
import { BottomNav } from './components/BottomNav';
import { useTelemetry } from './api/telemetry';

export default function App() {
  const [tab, setTab] = useState('home');
  const { activeTask } = useTelemetry();

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      tab === 'vault' ? 'bg-slate-950 text-white' : 'bg-gradient-to-b from-slate-100 via-slate-50 to-amber-50/20 text-slate-900'
    }`}>
      <main className="w-full min-h-screen flex flex-col">
        {tab === 'home' && <InspectorView onDownloadStarted={() => setTab('files')} />}
        {tab === 'files' && <FilesView activeTask={activeTask} />}
        {tab === 'vault' && <VaultView />}
      </main>

      <BottomNav currentTab={tab} onChangeTab={setTab} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git -C video-downloader add frontend/src/components/VaultView.jsx frontend/src/components/BottomNav.jsx frontend/src/App.jsx
git -C video-downloader commit -m "feat(frontend): integrate vault view and bottom navigation shell"
```

---

### Task 12: End-to-End Verification and Device Save Testing

**Files:**
* Test: `backend/tests/test_e2e_flow.py`

**Interfaces:**
* Consumes: Full stack endpoints
* Produces: Verified end-to-end download flow test suite

- [ ] **Step 1: Write E2E flow test**

```python
# backend/tests/test_e2e_flow.py
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db import init_db

@pytest.mark.asyncio
async def test_full_application_lifecycle():
    init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Health/files check
        files_res = await ac.get("/api/files")
        assert files_res.status_code == 200
        assert isinstance(files_res.json(), list)

        # 2. Vault authentication
        unlock_res = await ac.post("/api/vault/unlock", json={"pin": "1234"})
        assert unlock_res.status_code == 200
        token = unlock_res.json()["token"]

        # 3. Access private files with token
        vault_res = await ac.get("/api/vault/files", headers={"Authorization": f"Bearer {token}"})
        assert vault_res.status_code == 200
```

- [ ] **Step 2: Run test to verify it passes**

Run: `pytest backend/tests/test_e2e_flow.py -v`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git -C video-downloader add backend/tests/test_e2e_flow.py
git -C video-downloader commit -m "test: add end-to-end application lifecycle verification"
```

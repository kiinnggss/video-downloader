import os
import uuid
import time
import threading
import asyncio
from pathlib import Path
from typing import Dict, Any, AsyncGenerator, Optional
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
            loop = getattr(q, "_loop", None)
            if loop and loop.is_running():
                loop.call_soon_threadsafe(q.put_nowait, payload)
            else:
                q.put_nowait(payload)
        except Exception:
            pass

def run_download_thread(task_id: str, req: DownloadRequest, db_path: str = None):
    target_dir = VAULT_STORAGE if req.in_vault else (
        PUBLIC_STORAGE / "music" if req.is_audio else PUBLIC_STORAGE / "videos"
    )
    target_dir.mkdir(parents=True, exist_ok=True)
    outtmpl = str(target_dir / f"%(title)s-{task_id[:8]}.%(ext)s")

    last_db_save_time = 0.0
    last_saved_status = None

    def progress_hook(d: Dict[str, Any]):
        nonlocal last_db_save_time, last_saved_status
        status = d.get("status") or "downloading"
        downloaded = int(d.get("downloaded_bytes") or 0)
        total = int(d.get("total_bytes") or d.get("total_bytes_estimate") or 0)
        speed_raw = d.get("speed", 0) or 0
        speed_str = format_speed(speed_raw)
        eta = d.get("eta")
        progress = calculate_progress(downloaded, total)

        info_dict = d.get("info_dict") or {}
        task = DownloadTask(
            task_id=task_id,
            url=req.url,
            title=info_dict.get("title", "Downloading..."),
            status=status,
            progress=progress,
            speed=speed_str,
            downloaded_bytes=downloaded,
            total_bytes=total,
            eta_seconds=int(eta) if eta is not None else None,
            in_vault=req.in_vault
        )

        now = time.time()
        if status != last_saved_status or (now - last_db_save_time >= 1.0):
            save_task(task, db_path=db_path)
            last_db_save_time = now
            last_saved_status = status

        broadcast_telemetry(task.model_dump())

    ydl_opts = {
        "outtmpl": outtmpl,
        "progress_hooks": [progress_hook],
        "quiet": True,
        "no_warnings": True,
        "extractor_args": {
            "youtube": {
                "player_client": ["ios", "android", "mweb"]
            }
        },
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
            info = ydl.extract_info(req.url, download=True) or {}
            filename = ydl.prepare_filename(info)
            if req.is_audio:
                filename = str(filename).rsplit(".", 1)[0] + ".mp3"
            
            filepath_str = str(filename)
            filesize = int(info.get("filesize") or 0)
            if not filesize and os.path.exists(filepath_str):
                try:
                    filesize = os.path.getsize(filepath_str)
                except OSError:
                    filesize = 0

            media = MediaFile(
                file_id=str(uuid.uuid4()),
                title=info.get("title", "Downloaded Video"),
                filename=Path(filename).name,
                filepath=filepath_str,
                category="music" if req.is_audio else "video",
                filesize=filesize,
                duration=int(info.get("duration") or 0),
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
    loop = asyncio.get_running_loop()
    q = asyncio.Queue()
    q._loop = loop
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

get_telemetry_stream = subscribe_telemetry

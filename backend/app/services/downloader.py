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

class DownloadCancelledException(Exception):
    pass

class DownloadController:
    def __init__(self, task_id: str, req: DownloadRequest):
        self.task_id = task_id
        self.req = req
        self.pause_event = threading.Event()
        self.pause_event.set()
        self.cancelled = False

controllers: Dict[str, DownloadController] = {}
controllers_lock = threading.Lock()

def get_controller(task_id: str) -> Optional[DownloadController]:
    with controllers_lock:
        return controllers.get(task_id)

def register_controller(task_id: str, req: DownloadRequest) -> DownloadController:
    ctrl = DownloadController(task_id, req)
    with controllers_lock:
        controllers[task_id] = ctrl
    return ctrl

def remove_controller(task_id: str):
    with controllers_lock:
        controllers.pop(task_id, None)

def pause_download(task_id: str, db_path: str = None) -> bool:
    ctrl = get_controller(task_id)
    if not ctrl:
        return False
    ctrl.pause_event.clear()
    task = get_task(task_id, db_path=db_path)
    if task:
        task.status = "paused"
        task.speed = "0 Mb/s"
        save_task(task, db_path=db_path)
        broadcast_telemetry(task.model_dump())
    return True

def resume_download(task_id: str, db_path: str = None) -> bool:
    ctrl = get_controller(task_id)
    if not ctrl:
        return False
    ctrl.pause_event.set()
    task = get_task(task_id, db_path=db_path)
    if task:
        task.status = "downloading"
        save_task(task, db_path=db_path)
        broadcast_telemetry(task.model_dump())
    return True

def cancel_download(task_id: str, db_path: str = None) -> bool:
    ctrl = get_controller(task_id)
    if not ctrl:
        task = get_task(task_id, db_path=db_path)
        if task and task.status not in ("finished", "cancelled", "error"):
            task.status = "cancelled"
            task.speed = "0 Mb/s"
            save_task(task, db_path=db_path)
            broadcast_telemetry(task.model_dump())
            return True
        return False
    ctrl.cancelled = True
    ctrl.pause_event.set()
    task = get_task(task_id, db_path=db_path)
    if task:
        task.status = "cancelled"
        task.speed = "0 Mb/s"
        save_task(task, db_path=db_path)
        broadcast_telemetry(task.model_dump())
    return True

def cleanup_partial_files(target_dir: Path, task_id: str):
    try:
        short_id = task_id[:8]
        if target_dir.exists():
            for p in target_dir.glob(f"*{short_id}*"):
                try:
                    if p.is_file():
                        p.unlink()
                except OSError:
                    pass
    except Exception:
        pass

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
    ctrl = get_controller(task_id)
    if not ctrl:
        ctrl = register_controller(task_id, req)

    target_dir = VAULT_STORAGE if req.in_vault else (
        PUBLIC_STORAGE / "music" if req.is_audio else PUBLIC_STORAGE / "videos"
    )
    target_dir.mkdir(parents=True, exist_ok=True)
    outtmpl = str(target_dir / f"%(title)s-{task_id[:8]}.%(ext)s")

    last_db_save_time = 0.0
    last_saved_status = None

    def progress_hook(d: Dict[str, Any]):
        nonlocal last_db_save_time, last_saved_status
        if ctrl.cancelled:
            raise DownloadCancelledException("Download cancelled by user")

        while not ctrl.pause_event.is_set():
            if last_saved_status != "paused":
                task_paused = DownloadTask(
                    task_id=task_id,
                    url=req.url,
                    title="Paused",
                    status="paused",
                    progress=calculate_progress(int(d.get("downloaded_bytes") or 0), int(d.get("total_bytes") or d.get("total_bytes_estimate") or 0)),
                    speed="0 Mb/s",
                    downloaded_bytes=int(d.get("downloaded_bytes") or 0),
                    total_bytes=int(d.get("total_bytes") or d.get("total_bytes_estimate") or 0),
                    eta_seconds=None,
                    in_vault=req.in_vault,
                    device_id=req.device_id,
                )
                save_task(task_paused, db_path=db_path)
                broadcast_telemetry(task_paused.model_dump())
                last_saved_status = "paused"
            time.sleep(0.3)
            if ctrl.cancelled:
                raise DownloadCancelledException("Download cancelled by user")

        status = d.get("status") or "downloading"
        downloaded = int(d.get("downloaded_bytes") or 0)
        total = int(d.get("total_bytes") or d.get("total_bytes_estimate") or 0)
        info_dict = d.get("info_dict") or {}
        if total <= 0 and info_dict:
            dur = int(info_dict.get("duration") or 0)
            tbr = info_dict.get("tbr") or (info_dict.get("vbr") or 0) + (info_dict.get("abr") or 0)
            if tbr and dur > 0:
                total = int((tbr * 1000 / 8) * dur)
            elif dur > 0:
                total = int((2000 * 1000 / 8) * dur)

        speed_raw = d.get("speed", 0) or 0
        speed_str = format_speed(speed_raw)
        eta = d.get("eta")
        progress = calculate_progress(downloaded, total)

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
            in_vault=req.in_vault,
            device_id=req.device_id,
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
        "js_runtimes": {"node": {}},
        "http_headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-us,en;q=0.5",
        },
        "extractor_args": {
            "youtube": {
                "player_client": ["ios", "android", "mweb", "web"]
            },
            "twitter": {
                "api": ["syndication", "graphql"]
            },
            "tiktok": {
                "api": ["app", "web"]
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
                in_vault=req.in_vault,
                device_id=req.device_id,
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
                in_vault=req.in_vault,
                file_id=media.file_id,
                filename=media.filename,
                device_id=req.device_id,
            )
            save_task(completed_task, db_path=db_path)
            broadcast_telemetry(completed_task.model_dump())
    except DownloadCancelledException:
        cancelled_task = DownloadTask(
            task_id=task_id,
            url=req.url,
            title="Download Cancelled",
            status="cancelled",
            progress=0.0,
            speed="0 Mb/s",
            downloaded_bytes=0,
            total_bytes=0,
            in_vault=req.in_vault,
            device_id=req.device_id,
        )
        save_task(cancelled_task, db_path=db_path)
        broadcast_telemetry(cancelled_task.model_dump())
        cleanup_partial_files(target_dir, task_id)
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
            in_vault=req.in_vault,
            device_id=req.device_id,
        )
        save_task(failed_task, db_path=db_path)
        broadcast_telemetry(failed_task.model_dump())
    finally:
        remove_controller(task_id)

def start_download(req: DownloadRequest, db_path: str = None) -> str:
    task_id = str(uuid.uuid4())
    register_controller(task_id, req)
    task = DownloadTask(
        task_id=task_id,
        url=req.url,
        title="Starting download...",
        status="queued",
        progress=0.0,
        speed="0 Mb/s",
        downloaded_bytes=0,
        total_bytes=0,
        in_vault=req.in_vault,
        device_id=req.device_id,
    )
    save_task(task, db_path=db_path)
    t = threading.Thread(target=run_download_thread, args=(task_id, req, db_path), daemon=True)
    t.start()
    return task_id

async def subscribe_telemetry(device_id: Optional[str] = None) -> AsyncGenerator[Dict[str, Any], None]:
    loop = asyncio.get_running_loop()
    q = asyncio.Queue()
    q._loop = loop
    with lock:
        active_subscribers.append(q)
    try:
        while True:
            item = await q.get()
            if not device_id or not item.get("device_id") or item.get("device_id") == device_id:
                yield item
    finally:
        with lock:
            if q in active_subscribers:
                active_subscribers.remove(q)

async def pipe_media_stream(url: str, format_id: str = "best", is_audio: bool = False) -> AsyncGenerator[bytes, None]:
    """Yields binary chunks of the media stream directly without storing on disk."""
    import sys
    import httpx

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "extractor_args": {"youtube": {"player_client": ["ios", "android", "mweb"]}},
        "js_runtimes": {"node": {}},
    }
    direct_url = None
    http_headers = None

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False) or {}
            formats = info.get("formats") or []
            target = None
            if format_id and format_id != "best":
                for f in formats:
                    if str(f.get("format_id")) == str(format_id):
                        target = f
                        break
            if not target and not is_audio:
                for f in reversed(formats):
                    if f.get("vcodec") != "none" and f.get("acodec") != "none" and f.get("url"):
                        target = f
                        break
                if not target and info.get("url"):
                    direct_url = info.get("url")
                    http_headers = info.get("http_headers")
            if target and not is_audio:
                proto = target.get("protocol") or ""
                if proto in ("http", "https") and target.get("vcodec") != "none" and target.get("acodec") != "none":
                    direct_url = target.get("url")
                    http_headers = target.get("http_headers")
    except Exception:
        pass

    if direct_url and not is_audio:
        headers = http_headers or {"User-Agent": "Mozilla/5.0"}
        async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=60.0) as client:
            async with client.stream("GET", direct_url) as resp:
                async for chunk in resp.aiter_bytes(chunk_size=65536):
                    yield chunk
    else:
        cmd = [
            sys.executable, "-m", "yt_dlp",
            "--quiet", "--no-warnings",
            "--extractor-args", "youtube:player_client=ios,android,mweb",
            "-o", "-",
        ]
        if is_audio:
            cmd.extend(["-f", "bestaudio/best", "-x", "--audio-format", "mp3"])
        elif format_id and format_id != "best":
            cmd.extend(["-f", f"{format_id}+bestaudio/best/{format_id}/b/best"])
        else:
            cmd.extend(["-f", "b/best"])
        cmd.append(url)

        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, bufsize=65536)
        try:
            while True:
                chunk = await asyncio.to_thread(proc.stdout.read, 65536)
                if not chunk:
                    break
                yield chunk
        finally:
            try:
                proc.kill()
            except Exception:
                pass


get_telemetry_stream = subscribe_telemetry

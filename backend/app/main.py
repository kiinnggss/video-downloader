import json
import os
import uuid
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, HTTPException, Header, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from sse_starlette.sse import EventSourceResponse

from app.models import InspectRequest, InspectResponse, DownloadRequest, DownloadTask, MediaFile
from app.services.extractor import extract_video_info
from app.services.downloader import (
    start_download,
    subscribe_telemetry,
    pause_download,
    resume_download,
    cancel_download,
    pipe_media_stream,
)
from app.services.storage import stream_file_range
from app.services.vault import (
    set_pin,
    has_pin,
    verify_pin,
    generate_vault_token,
    verify_vault_token,
)
from app.services.cookies import save_cookie_content, clear_cookies, has_cookies
from app.services.patches import apply_extractor_patches
from app.db import (
    init_db,
    list_media_files,
    get_media_file,
    save_media_file,
    delete_media_file,
)
from app.config import VAULT_STORAGE, PUBLIC_STORAGE

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    apply_extractor_patches()
    yield


app = FastAPI(title="Crystal Video Downloader API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
def healthz():
    return {"status": "ok", "build": "v4-bento-telemetry-vault"}


@app.get("/api/keepalive")
def keep_alive():
    import time
    return {"status": "alive", "timestamp": int(time.time())}


@app.post("/api/inspect", response_model=InspectResponse)
def inspect_url(req: InspectRequest, x_device_id: Optional[str] = Header(None, alias="X-Device-Id")):
    try:
        device_id = req.device_id or x_device_id
        return extract_video_info(req.url, device_id=device_id)
    except Exception as e:
        err_msg = str(e)
        if "drm" in err_msg.lower() or "widevine" in err_msg.lower() or "encrypted" in err_msg.lower():
            raise HTTPException(status_code=403, detail="Stream is DRM-protected and cannot be extracted")
        raise HTTPException(status_code=422, detail=f"Failed to inspect URL: {err_msg}")


@app.post("/api/downloads")
def create_download(req: DownloadRequest, x_device_id: Optional[str] = Header(None, alias="X-Device-Id")):
    try:
        if not req.device_id and x_device_id:
            req.device_id = x_device_id
        task_id = start_download(req)
        return {"task_id": task_id, "status": "queued"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start download: {str(e)}")


@app.post("/api/downloads/{task_id}/pause")
def pause_task(task_id: str):
    success = pause_download(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found or cannot be paused")
    return {"status": "paused", "task_id": task_id}


@app.post("/api/downloads/{task_id}/resume")
def resume_task(task_id: str):
    success = resume_download(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found or cannot be resumed")
    return {"status": "downloading", "task_id": task_id}


@app.post("/api/downloads/{task_id}/cancel")
def cancel_task(task_id: str):
    success = cancel_download(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found or cannot be cancelled")
    return {"status": "cancelled", "task_id": task_id}


@app.get("/api/downloads/stream-direct")
async def stream_direct_download(
    url: str,
    format_id: str = "best",
    is_audio: bool = False,
    title: Optional[str] = None,
    device_id: Optional[str] = Query(None),
    x_device_id: Optional[str] = Header(None, alias="X-Device-Id"),
):
    target_device = device_id or x_device_id
    clean_title = "".join(c for c in (title or "media") if c.isalnum() or c in (" ", "-", "_")).strip() or "media"
    ext = "mp3" if is_audio else "mp4"
    filename = f"{clean_title}.{ext}"

    async def stream_chunks():
        async for chunk in pipe_media_stream(url, format_id=format_id, is_audio=is_audio, device_id=target_device):
            yield chunk

    media_type = "audio/mpeg" if is_audio else "video/mp4"
    return StreamingResponse(
        stream_chunks(),
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache",
        }
    )


@app.get("/api/settings/cookies")
def get_cookies_status(
    device_id: Optional[str] = Query(None),
    x_device_id: Optional[str] = Header(None, alias="X-Device-Id"),
):
    target_device = device_id or x_device_id
    return {"has_cookies": has_cookies(target_device)}


@app.post("/api/settings/cookies")
def save_cookies(
    payload: dict,
    device_id: Optional[str] = Query(None),
    x_device_id: Optional[str] = Header(None, alias="X-Device-Id"),
):
    target_device = device_id or x_device_id
    raw_cookies = payload.get("cookies", "") if isinstance(payload, dict) else ""
    if not raw_cookies.strip():
        raise HTTPException(status_code=400, detail="Cookie content cannot be empty")
    save_cookie_content(raw_cookies, device_id=target_device)
    return {"status": "saved", "has_cookies": True}


@app.delete("/api/settings/cookies")
def remove_cookies(
    device_id: Optional[str] = Query(None),
    x_device_id: Optional[str] = Header(None, alias="X-Device-Id"),
):
    target_device = device_id or x_device_id
    cleared = clear_cookies(target_device)
    return {"status": "cleared" if cleared else "not_found", "has_cookies": False}


@app.get("/api/downloads/stream")
async def stream_telemetry(device_id: Optional[str] = Query(None), x_device_id: Optional[str] = Header(None, alias="X-Device-Id")):
    target_device = device_id or x_device_id
    async def event_generator():
        async for data in subscribe_telemetry(target_device):
            yield {"event": "progress", "data": json.dumps(data)}

    return EventSourceResponse(event_generator())


@app.get("/api/files")
def get_files(category: Optional[str] = Query(None), x_device_id: Optional[str] = Header(None, alias="X-Device-Id"), device_id: Optional[str] = Query(None)):
    target_device = device_id or x_device_id
    return list_media_files(category=category, in_vault=False, device_id=target_device)


@app.get("/api/files/{file_id}/stream")
def stream_media(
    file_id: str,
    request: Request,
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None)
):
    media = get_media_file(file_id)
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    if media.in_vault:
        auth_token = token or (authorization.replace("Bearer ", "").strip() if authorization else "")
        if not verify_vault_token(auth_token):
            raise HTTPException(status_code=401, detail="Vault locked")
    range_header = request.headers.get("Range")
    return stream_file_range(media.filepath, range_header)


@app.get("/api/files/{file_id}/download")
def download_media(
    file_id: str,
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None)
):
    media = get_media_file(file_id)
    if not media or not os.path.exists(media.filepath):
        raise HTTPException(status_code=404, detail="File not found")
    if media.in_vault:
        auth_token = token or (authorization.replace("Bearer ", "").strip() if authorization else "")
        if not verify_vault_token(auth_token):
            raise HTTPException(status_code=401, detail="Vault locked")
    return FileResponse(media.filepath, filename=media.filename)


@app.delete("/api/files/{file_id}")
def delete_file(
    file_id: str,
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None)
):
    media = get_media_file(file_id)
    if not media:
        raise HTTPException(status_code=404, detail="File not found")
    if media.in_vault:
        auth_token = token or (authorization.replace("Bearer ", "").strip() if authorization else "")
        if not verify_vault_token(auth_token):
            raise HTTPException(status_code=401, detail="Vault locked")
    if os.path.exists(media.filepath):
        try:
            os.remove(media.filepath)
        except OSError:
            pass
    delete_media_file(file_id)
    return {"status": "ok", "deleted_file_id": file_id}


@app.get("/api/vault/pin-status")
def get_vault_pin_status(
    x_device_id: Optional[str] = Header(None, alias="X-Device-Id"),
    device_id: Optional[str] = Query(None)
):
    target_device = device_id or x_device_id or "default"
    return {"has_pin": has_pin(target_device)}


@app.post("/api/vault/set-pin")
def configure_vault_pin(
    payload: dict,
    x_device_id: Optional[str] = Header(None, alias="X-Device-Id")
):
    dev = payload.get("device_id") or x_device_id or "default"
    new_pin = str(payload.get("new_pin") or payload.get("pin") or "").strip()
    current_pin = payload.get("current_pin")
    if not new_pin or len(new_pin) < 4:
        raise HTTPException(status_code=400, detail="PIN must be at least 4 digits")

    if has_pin(dev):
        if not current_pin or not verify_pin(str(current_pin), device_id=dev):
            raise HTTPException(status_code=401, detail="Incorrect current PIN")
    set_pin(new_pin, device_id=dev)
    return {"status": "ok"}


@app.post("/api/vault/unlock")
def unlock_vault(
    payload: dict,
    x_device_id: Optional[str] = Header(None, alias="X-Device-Id")
):
    pin = str(payload.get("pin", "")) if isinstance(payload, dict) else ""
    dev = payload.get("device_id") or x_device_id or "default"
    if verify_pin(pin, device_id=dev):
        token = generate_vault_token()
        return {"token": token, "expires_in": 1800}
    raise HTTPException(status_code=401, detail="Invalid PIN")


@app.post("/api/vault/upload")
async def upload_vault_file(
    request: Request,
    authorization: Optional[str] = Header(None),
    x_device_id: Optional[str] = Header(None, alias="X-Device-Id"),
    x_filename: Optional[str] = Header(None, alias="X-Filename"),
    filename: Optional[str] = Query(None),
    device_id: Optional[str] = Query(None),
):
    token = authorization.replace("Bearer ", "").strip() if authorization else ""
    if not verify_vault_token(token):
        raise HTTPException(status_code=401, detail="Vault locked")

    target_device = device_id or x_device_id or "default"
    file_id = str(uuid.uuid4())
    raw_name = filename or x_filename or f"upload_{file_id}.mp4"
    safe_filename = "".join(c for c in raw_name if c.isalnum() or c in (".", "-", "_", " ")).strip() or f"upload_{file_id}.mp4"
    dest_path = str(VAULT_STORAGE / f"{file_id}_{safe_filename}")

    total_bytes = 0
    with open(dest_path, "wb") as buffer:
        async for chunk in request.stream():
            buffer.write(chunk)
            total_bytes += len(chunk)

    content_type = request.headers.get("content-type", "")
    title = os.path.splitext(safe_filename)[0]
    category = "audio" if "audio" in content_type or safe_filename.endswith((".mp3", ".m4a", ".wav", ".aac")) else "video"

    media = MediaFile(
        file_id=file_id,
        title=title,
        filename=safe_filename,
        filepath=dest_path,
        category=category,
        filesize=total_bytes,
        duration=0,
        thumbnail="",
        in_vault=True,
        device_id=target_device
    )
    save_media_file(media)
    return {
        "file_id": media.file_id,
        "title": media.title,
        "filename": media.filename,
        "filesize": media.filesize,
        "category": media.category,
        "in_vault": 1,
        "device_id": media.device_id
    }


@app.get("/api/vault/files")
def get_vault_files(
    authorization: Optional[str] = Header(None),
    x_device_id: Optional[str] = Header(None, alias="X-Device-Id"),
    device_id: Optional[str] = Query(None)
):
    token = authorization.replace("Bearer ", "").strip() if authorization else ""
    if not verify_vault_token(token):
        raise HTTPException(status_code=401, detail="Vault locked")
    target_device = device_id or x_device_id
    return list_media_files(category=None, in_vault=True, device_id=target_device)


@app.get("/api/vault/playlist.m3u")
def get_vault_playlist(
    request: Request,
    file_ids: str = Query(...),
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None)
):
    auth_token = token or (authorization.replace("Bearer ", "").strip() if authorization else "")
    if not verify_vault_token(auth_token):
        raise HTTPException(status_code=401, detail="Vault locked")

    ids = [fid.strip() for fid in file_ids.split(",") if fid.strip()]
    lines = ["#EXTM3U"]
    base_url = str(request.base_url).rstrip("/")
    for fid in ids:
        media = get_media_file(fid)
        if media:
            duration = media.duration or -1
            lines.append(f"#EXTINF:{duration},{media.title}")
            lines.append(f"{base_url}/api/files/{fid}/stream?token={auth_token}")

    content = "\n".join(lines) + "\n"
    return Response(
        content=content,
        media_type="audio/x-mpegurl",
        headers={"Content-Disposition": "attachment; filename=vault_playlist.m3u"}
    )


# Mount compiled frontend assets in production if present
from pathlib import Path
from fastapi.staticfiles import StaticFiles

candidates = [
    Path(__file__).resolve().parent.parent.parent / "frontend" / "dist",
    Path("/app/frontend/dist"),
    Path("/app/dist"),
    Path("frontend/dist").resolve(),
    Path("dist").resolve(),
]

frontend_dist = next((p for p in candidates if p.exists() and (p / "index.html").exists()), None)

if frontend_dist:
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Endpoint not found")
        target_file = frontend_dist / full_path
        if target_file.is_file():
            return FileResponse(str(target_file))
        return FileResponse(str(frontend_dist / "index.html"))

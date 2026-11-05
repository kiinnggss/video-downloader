import json
import os
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, HTTPException, Header, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from sse_starlette.sse import EventSourceResponse

from app.models import InspectRequest, InspectResponse, DownloadRequest, DownloadTask
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
from app.services.vault import verify_pin, generate_vault_token, verify_vault_token
from app.services.cookies import save_cookie_content, clear_cookies, has_cookies
from app.services.patches import apply_extractor_patches
from app.db import init_db, list_media_files, get_media_file

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
    return {"status": "ok", "build": "v2-bot-fix"}


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
def stream_media(file_id: str, request: Request, authorization: Optional[str] = Header(None)):
    media = get_media_file(file_id)
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    if media.in_vault:
        token = authorization.replace("Bearer ", "").strip() if authorization else ""
        if not verify_vault_token(token):
            raise HTTPException(status_code=401, detail="Vault locked")
    range_header = request.headers.get("Range")
    return stream_file_range(media.filepath, range_header)


@app.get("/api/files/{file_id}/download")
def download_media(file_id: str, authorization: Optional[str] = Header(None)):
    media = get_media_file(file_id)
    if not media or not os.path.exists(media.filepath):
        raise HTTPException(status_code=404, detail="File not found")
    if media.in_vault:
        token = authorization.replace("Bearer ", "").strip() if authorization else ""
        if not verify_vault_token(token):
            raise HTTPException(status_code=401, detail="Vault locked")
    return FileResponse(media.filepath, filename=media.filename)



@app.post("/api/vault/unlock")
def unlock_vault(payload: dict):
    pin = str(payload.get("pin", "")) if isinstance(payload, dict) else ""
    if verify_pin(pin):
        token = generate_vault_token()
        return {"token": token, "expires_in": 1800}
    raise HTTPException(status_code=401, detail="Invalid PIN")


@app.get("/api/vault/files")
def get_vault_files(authorization: Optional[str] = Header(None), x_device_id: Optional[str] = Header(None, alias="X-Device-Id"), device_id: Optional[str] = Query(None)):
    token = authorization.replace("Bearer ", "").strip() if authorization else ""
    if not verify_vault_token(token):
        raise HTTPException(status_code=401, detail="Vault locked")
    target_device = device_id or x_device_id
    return list_media_files(category=None, in_vault=True, device_id=target_device)


# Mount compiled frontend assets in production if present
from pathlib import Path
from fastapi.staticfiles import StaticFiles

frontend_dir = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if not frontend_dir.exists():
    frontend_dir = Path("/app/frontend/dist")

if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")


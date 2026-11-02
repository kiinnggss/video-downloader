import json
import os
from contextlib import asynccontextmanager
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
from app.db import init_db, list_media_files, get_media_file

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
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
    return {"status": "ok"}


@app.post("/api/inspect", response_model=InspectResponse)
def inspect_url(req: InspectRequest):
    try:
        return extract_video_info(req.url)
    except Exception as e:
        err_msg = str(e)
        if "drm" in err_msg.lower() or "widevine" in err_msg.lower() or "encrypted" in err_msg.lower():
            raise HTTPException(status_code=403, detail="Stream is DRM-protected and cannot be extracted")
        raise HTTPException(status_code=422, detail=f"Failed to inspect URL: {err_msg}")


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
def get_vault_files(authorization: Optional[str] = Header(None)):
    token = authorization.replace("Bearer ", "").strip() if authorization else ""
    if not verify_vault_token(token):
        raise HTTPException(status_code=401, detail="Vault locked")
    return list_media_files(category=None, in_vault=True)


# Mount compiled frontend assets in production if present
from pathlib import Path
from fastapi.staticfiles import StaticFiles

frontend_dir = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if not frontend_dir.exists():
    frontend_dir = Path("/app/frontend/dist")

if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")


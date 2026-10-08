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
from app.db import init_db, list_media_files, get_connection

init_db()


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

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
    file_id: Optional[str] = None
    filename: Optional[str] = None

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

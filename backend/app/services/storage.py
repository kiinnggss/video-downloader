import os
import mimetypes
from pathlib import Path
from typing import Optional, Tuple, Union
from fastapi import HTTPException
from fastapi.responses import StreamingResponse

from app.models import MediaFile


def parse_range_header(range_header: Optional[str], file_size: int) -> Tuple[int, int]:
    if not range_header or not range_header.startswith("bytes="):
        return 0, file_size - 1

    parts = range_header.replace("bytes=", "").split("-")
    if len(parts) < 2:
        return 0, file_size - 1

    try:
        start = int(parts[0]) if parts[0] else 0
        end = int(parts[1]) if parts[1] else file_size - 1
    except ValueError:
        return 0, file_size - 1

    if start >= file_size or start > end:
        raise HTTPException(status_code=416, detail="Requested range not satisfiable")
    if end >= file_size:
        end = file_size - 1

    return start, end


def stream_file_range(
    file_path: Union[str, Path, MediaFile],
    range_header: Optional[str] = None,
) -> StreamingResponse:
    if hasattr(file_path, "filepath"):
        file_path = file_path.filepath

    resolved_path = Path(file_path)
    if not resolved_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    file_size = resolved_path.stat().st_size
    start, end = parse_range_header(range_header, file_size)
    content_length = (end - start) + 1
    content_type, _ = mimetypes.guess_type(str(resolved_path))
    content_type = content_type or "application/octet-stream"

    def iter_file():
        with open(resolved_path, "rb") as f:
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

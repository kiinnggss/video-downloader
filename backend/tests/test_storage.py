import os
from pathlib import Path
import pytest
from fastapi import HTTPException
from fastapi.responses import StreamingResponse

from app.models import MediaFile
from app.services.storage import parse_range_header, stream_file_range


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


def test_parse_range_header_edge_cases():
    # Non-bytes or invalid format defaults to full range
    start, end = parse_range_header("invalid", 1000)
    assert start == 0
    assert end == 999

    # Suffix range like bytes=-400 yields last 400 bytes (600-999)
    start, end = parse_range_header("bytes=-400", 1000)
    assert start == 600
    assert end == 999

    # Suffix range larger than file size clamps start to 0
    start, end = parse_range_header("bytes=-1500", 1000)
    assert start == 0
    assert end == 999

    # End exceeding file size clamps to file_size - 1
    start, end = parse_range_header("bytes=500-2000", 1000)
    assert start == 500
    assert end == 999


def test_parse_range_header_unsatisfiable():
    with pytest.raises(HTTPException) as exc_info:
        parse_range_header("bytes=1000-1500", 1000)
    assert exc_info.value.status_code == 416


@pytest.mark.anyio
async def test_stream_file_range_full(tmp_path: Path):
    test_file = tmp_path / "sample.mp4"
    content = b"A" * 2048
    test_file.write_bytes(content)

    response = stream_file_range(str(test_file), range_header=None)
    assert isinstance(response, StreamingResponse)
    assert response.status_code == 200
    assert response.headers["Content-Length"] == "2048"
    assert "Content-Range" not in response.headers
    assert response.headers["Accept-Ranges"] == "bytes"
    assert response.headers["Content-Type"] == "video/mp4"

    chunks = [chunk async for chunk in response.body_iterator]
    body = b"".join(chunks)
    assert body == content


@pytest.mark.anyio
async def test_stream_file_range_partial(tmp_path: Path):
    test_file = tmp_path / "sample.mp4"
    content = bytes(range(256)) * 4  # 1024 bytes
    test_file.write_bytes(content)

    response = stream_file_range(str(test_file), range_header="bytes=100-199")
    assert isinstance(response, StreamingResponse)
    assert response.status_code == 206
    assert response.headers["Content-Length"] == "100"
    assert response.headers["Content-Range"] == "bytes 100-199/1024"
    assert response.headers["Accept-Ranges"] == "bytes"

    chunks = [chunk async for chunk in response.body_iterator]
    body = b"".join(chunks)
    assert body == content[100:200]


@pytest.mark.anyio
async def test_stream_file_range_suffix(tmp_path: Path):
    test_file = tmp_path / "sample.mp4"
    content = bytes(range(256)) * 4  # 1024 bytes
    test_file.write_bytes(content)

    response = stream_file_range(str(test_file), range_header="bytes=-200")
    assert isinstance(response, StreamingResponse)
    assert response.status_code == 206
    assert response.headers["Content-Length"] == "200"
    assert response.headers["Content-Range"] == "bytes 824-1023/1024"
    assert response.headers["Accept-Ranges"] == "bytes"

    chunks = [chunk async for chunk in response.body_iterator]
    body = b"".join(chunks)
    assert body == content[-200:]


@pytest.mark.anyio
async def test_stream_file_range_supports_media_file_model(tmp_path: Path):
    test_file = tmp_path / "media.mp4"
    content = b"Media content stream"
    test_file.write_bytes(content)

    media = MediaFile(
        file_id="mf-123",
        title="Test Media",
        filename="media.mp4",
        filepath=str(test_file),
        category="videos",
        filesize=len(content),
        duration=10,
    )

    response = stream_file_range(media, range_header=None)
    assert response.status_code == 200
    chunks = [chunk async for chunk in response.body_iterator]
    assert b"".join(chunks) == content


@pytest.mark.anyio
async def test_stream_file_range_large_file_chunks(tmp_path: Path):
    test_file = tmp_path / "large.bin"
    chunk_size = 1024 * 1024  # 1MB
    total_size = int(2.5 * chunk_size)
    content = b"X" * total_size
    test_file.write_bytes(content)

    response = stream_file_range(str(test_file), range_header=None)
    assert response.status_code == 200
    chunks = [chunk async for chunk in response.body_iterator]
    assert len(chunks) == 3
    assert len(chunks[0]) == chunk_size
    assert len(chunks[1]) == chunk_size
    assert len(chunks[2]) == total_size - (2 * chunk_size)
    assert b"".join(chunks) == content


def test_stream_file_range_not_found():
    with pytest.raises(HTTPException) as exc_info:
        stream_file_range("/path/to/nonexistent/file.mp4")
    assert exc_info.value.status_code == 404


def test_stream_file_range_unsatisfiable_range(tmp_path: Path):
    test_file = tmp_path / "sample.mp4"
    test_file.write_bytes(b"small file")

    with pytest.raises(HTTPException) as exc_info:
        stream_file_range(str(test_file), range_header="bytes=50-100")
    assert exc_info.value.status_code == 416

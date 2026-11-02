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

def test_parse_raw_info_empty_formats_fallback():
    mock_payload = {
        "url": "https://example.com/video",
        "title": "Stream Video",
        "channel": "Streamer",
        "duration": 60,
        "formats": []
    }
    result = parse_raw_info(mock_payload)
    assert result.title == "Stream Video"
    assert result.author == "Streamer"
    assert len(result.formats) == 1
    assert result.formats[0].format_id == "best"
    assert result.formats[0].resolution == "Best Available"

def test_parse_raw_info_none_formats():
    mock_payload = {
        "url": "https://example.com/video",
        "title": "Stream Video",
        "formats": None,
    }
    result = parse_raw_info(mock_payload)
    assert result.title == "Stream Video"
    assert len(result.formats) == 1
    assert result.formats[0].format_id == "best"

def test_extract_video_info():
    mock_payload = {
        "webpage_url": "https://example.com/watch?v=123",
        "title": "Ocean Life",
        "uploader": "Nature Channel",
        "duration": 300,
        "thumbnail": "https://example.com/thumb.jpg",
        "formats": []
    }
    with patch("yt_dlp.YoutubeDL") as mock_ydl_cls:
        mock_ydl = mock_ydl_cls.return_value.__enter__.return_value
        mock_ydl.extract_info.return_value = mock_payload
        res = extract_video_info("https://example.com/watch?v=123")
        assert res.title == "Ocean Life"
        mock_ydl_cls.assert_called_once_with({
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "noplaylist": True,
            "extractor_args": {
                "youtube": {
                    "player_client": ["ios", "android", "mweb"]
                }
            },
        })
        mock_ydl.extract_info.assert_called_once_with("https://example.com/watch?v=123", download=False)

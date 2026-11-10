from unittest.mock import patch, MagicMock
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
        call_opts = mock_ydl_cls.call_args[0][0]
        assert call_opts["quiet"] is True
        assert call_opts["skip_download"] is True
        assert call_opts["format"] == "all"
        assert "youtube" in call_opts["extractor_args"]
        mock_ydl.extract_info.assert_called_once_with("https://example.com/watch?v=123", download=False)


def test_probe_format_size_estimation():
    from app.services.extractor import probe_format_size
    vf = {"format_id": "18", "vcodec": "avc1", "acodec": "mp4a", "height": 720, "tbr": 2000}
    size = probe_format_size(vf, duration=60)
    assert size is not None
    assert size == int((2000 * 1000 / 8) * 60)


def test_is_ad_or_tracker_url():
    from app.services.patches import is_ad_or_tracker_url
    assert is_ad_or_tracker_url("https://a.adtng.com/get/10016846") is True
    assert is_ad_or_tracker_url("https://googleads.g.doubleclick.net/pagead/ads") is True
    assert is_ad_or_tracker_url("https://example.com/subtitles.vtt") is True
    assert is_ad_or_tracker_url("https://example.com/banner.jpg") is True
    assert is_ad_or_tracker_url("https://cdn.example.com/video/master.m3u8") is False
    assert is_ad_or_tracker_url("https://vs19.userscontent.net/video.mp4") is False


def test_discover_media_from_page():
    from app.services.patches import discover_media_from_page
    from unittest.mock import MagicMock

    mock_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Ad-Heavy Video Page - Watch Free</title>
        <meta property="og:image" content="https://example.com/thumb.jpg" />
        <meta property="video:duration" content="120" />
    </head>
    <body>
        <script src="https://a.adtng.com/ads.js"></script>
        <video id="player">
            <source src="https://a.adtng.com/vast.xml" type="video/mp4" />
            <source src="https://stream.example.com/media/playlist.m3u8" type="application/x-mpegURL" />
        </video>
    </body>
    </html>
    """
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = mock_html
    mock_resp.url = "https://example.com/video/123"

    with patch("httpx.Client.get", return_value=mock_resp):
        res = discover_media_from_page("https://example.com/video/123")
        assert res is not None
        assert res["stream_url"] == "https://stream.example.com/media/playlist.m3u8"
        assert res["title"] == "Ad-Heavy Video Page"
        assert res["thumbnail"] == "https://example.com/thumb.jpg"
        assert res["duration"] == 120
        assert res["headers"]["Referer"] == "https://example.com/video/123"


def test_extract_video_info_fallback_on_ad_page():
    with patch("yt_dlp.YoutubeDL") as mock_ydl_cls, \
         patch("app.services.patches.discover_media_from_page") as mock_discover:
        
        # Primary call fails with an extraction error
        mock_instance = MagicMock()
        mock_instance.extract_info.side_effect = [
            Exception("ERROR: [PlayVids] f8HpS2VVD73: Unable to extract short video ID"),
            {
                "title": "Discovered Stream",
                "duration": 180,
                "thumbnail": "https://example.com/thumb.jpg",
                "formats": [
                    {"format_id": "720", "height": 720, "vcodec": "h264", "acodec": "aac", "ext": "mp4"}
                ]
            }
        ]
        mock_ydl_cls.return_value.__enter__.return_value = mock_instance

        mock_discover.return_value = {
            "stream_url": "https://stream.example.com/master.m3u8",
            "title": "Discovered Fallback Video",
            "thumbnail": "https://example.com/thumb.jpg",
            "duration": 180,
            "headers": {"Referer": "https://example.com/watch"}
        }

        res = extract_video_info("https://example.com/watch")
        assert res is not None
        assert res.title == "Discovered Stream"
        assert len(res.formats) == 1
        assert res.formats[0].resolution == "720p"


def test_discover_escaped_js_and_dash_streams():
    from app.services.patches import discover_media_from_page

    mock_html = r"""
    <html>
    <head>
        <meta content="https://example.com/poster.jpg" property="og:image" />
        <meta content="Escaped Stream Video" property="og:title" />
    </head>
    <body>
        <script>
            window.__PLAYER_CONFIG__ = {
                "dashUrl": "https:\/\/cdn.example.com\/dash\/manifest.mpd\u003ftoken\u003dxyz\u0026exp\u003d999",
                "backup": "\/media\/fallback.webm"
            };
        </script>
    </body>
    </html>
    """
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = mock_html
    mock_resp.url = "https://example.com/watch/escaped"

    with patch("httpx.Client.get", return_value=mock_resp):
        res = discover_media_from_page("https://example.com/watch/escaped")
        assert res is not None
        assert res["title"] == "Escaped Stream Video"
        assert res["thumbnail"] == "https://example.com/poster.jpg"
        assert res["stream_url"] == "https://cdn.example.com/dash/manifest.mpd?token=xyz&exp=999"
        assert "https://example.com/media/fallback.webm" in res["candidate_streams"]


def test_discover_base64_and_lazy_data_attributes():
    import base64
    from app.services.patches import discover_media_from_page

    b64_stream = base64.b64encode(b"https://cdn.example.com/secret/master.m3u8").decode("utf-8")
    mock_html = f"""
    <html>
    <head><title>Base64 Video</title></head>
    <body>
        <div class="player" data-video-src="/local/clip.mov"></div>
        <script>
            const src = atob("{b64_stream}");
        </script>
    </body>
    </html>
    """
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = mock_html
    mock_resp.url = "https://example.com/b64"

    with patch("httpx.Client.get", return_value=mock_resp):
        res = discover_media_from_page("https://example.com/b64")
        assert res is not None
        assert res["stream_url"] == "https://cdn.example.com/secret/master.m3u8"
        assert "https://example.com/local/clip.mov" in res["candidate_streams"]


def test_discover_nested_iframe_embed():
    from app.services.patches import discover_media_from_page

    parent_html = """
    <html>
    <head>
        <title>Parent Page Title</title>
        <meta property="og:image" content="/images/parent-thumb.jpg" />
    </head>
    <body>
        <iframe src="https://googleads.g.doubleclick.net/pagead/ads"></iframe>
        <iframe data-src="/embed/player-42"></iframe>
    </body>
    </html>
    """
    iframe_html = """
    <html>
    <body>
        <script>
            jwplayer("v").setup({ file: "https://edge.example.com/live/index.m3u8" });
        </script>
    </body>
    </html>
    """
    resp_parent = MagicMock()
    resp_parent.status_code = 200
    resp_parent.text = parent_html
    resp_parent.url = "https://example.com/article/video"

    resp_iframe = MagicMock()
    resp_iframe.status_code = 200
    resp_iframe.text = iframe_html
    resp_iframe.url = "https://example.com/embed/player-42"

    with patch("httpx.Client.get", side_effect=[resp_parent, resp_iframe]):
        res = discover_media_from_page("https://example.com/article/video")
        assert res is not None
        assert res["stream_url"] == "https://edge.example.com/live/index.m3u8"
        assert res["title"] == "Parent Page Title"
        assert res["thumbnail"] == "https://example.com/images/parent-thumb.jpg"
        assert res["headers"]["Referer"] == "https://example.com/embed/player-42"




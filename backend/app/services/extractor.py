import yt_dlp
import httpx
from typing import Dict, Any, List, Optional
from app.models import InspectResponse, FormatOption

def probe_format_size(vf: Dict[str, Any], duration: int = 0) -> Optional[int]:
    """Probes the exact or estimated byte size of a format option."""
    size = vf.get("filesize") or vf.get("filesize_approx")
    if size and int(size) > 0:
        return int(size)

    stream_url = vf.get("url")
    if stream_url and str(stream_url).startswith("http"):
        headers = vf.get("http_headers") or {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
        }
        try:
            with httpx.Client(timeout=2.0, follow_redirects=True, headers=headers) as client:
                resp = client.head(stream_url)
                cl = resp.headers.get("content-length")
                if cl and cl.isdigit() and int(cl) > 0:
                    return int(cl)
                range_resp = client.get(stream_url, headers={"Range": "bytes=0-0"})
                cr = range_resp.headers.get("content-range")
                if cr and "/" in cr:
                    total_str = cr.split("/")[-1].strip()
                    if total_str.isdigit() and int(total_str) > 0:
                        return int(total_str)
        except Exception:
            pass

    tbr = vf.get("tbr") or (vf.get("vbr") or 0) + (vf.get("abr") or 0)
    if tbr and duration and duration > 0:
        calculated = int((tbr * 1000 / 8) * duration)
        if calculated > 0:
            return calculated

    height = vf.get("height") or 720
    if duration and duration > 0:
        bitrate_kbps = 3500 if height >= 1080 else (2000 if height >= 720 else (1000 if height >= 480 else 600))
        return int((bitrate_kbps * 1000 / 8) * duration)

    return None

def resolve_redirects(url: str) -> str:
    """Follows initial redirects for mobile share links."""
    if any(domain in url.lower() for domain in ("vm.tiktok.com", "vt.tiktok.com", "t.co", "youtu.be")):
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
            }
            with httpx.Client(timeout=3.5, follow_redirects=True, headers=headers) as client:
                resp = client.head(url)
                return str(resp.url)
        except Exception:
            pass
    return url

def parse_raw_info(info: Dict[str, Any]) -> InspectResponse:
    url = info.get("webpage_url") or info.get("url", "")
    title = info.get("title") or "Untitled Media"
    author = info.get("uploader") or info.get("channel") or "Unknown"
    duration = int(info.get("duration") or 0)
    thumbnail = info.get("thumbnail") or ""
    
    raw_formats = info.get("formats") or []
    formats: List[FormatOption] = []
    seen_resolutions = set()

    # Prioritize video formats
    video_formats = [
        f for f in raw_formats 
        if (f.get("vcodec") != "none" and f.get("height")) or (f.get("vcodec") != "none" and f.get("acodec") != "none")
    ]
    if not video_formats and raw_formats:
        video_formats = [f for f in raw_formats if f.get("vcodec") != "none"]

    video_formats.sort(key=lambda x: x.get("height", 0) or 0, reverse=True)

    for vf in video_formats:
        h = vf.get("height")
        res_label = f"{h}p" if h else "Video"
        if res_label not in seen_resolutions:
            seen_resolutions.add(res_label)
            probed_size = probe_format_size(vf, duration)
            formats.append(FormatOption(
                format_id=str(vf.get("format_id")),
                resolution=res_label,
                ext=vf.get("ext", "mp4"),
                filesize_approx=probed_size,
                note=vf.get("format_note") or f"{res_label} video"
            ))

    # Add audio option
    audio_formats = [
        f for f in raw_formats 
        if f.get("vcodec") == "none" and f.get("acodec") != "none"
    ]
    if audio_formats:
        best_audio = audio_formats[-1]
        raw_size = probe_format_size(best_audio, duration)
        if not raw_size and duration > 0:
            raw_size = int((192 * 1000 / 8) * duration)
        formats.append(FormatOption(
            format_id=str(best_audio.get("format_id")),
            resolution="Audio",
            ext="mp3",
            filesize_approx=raw_size,
            note="Audio only (MP3)"
        ))

    # Fallback format if list empty
    if not formats:
        fallback_size = int((2000 * 1000 / 8) * duration) if duration > 0 else None
        formats.append(FormatOption(
            format_id="best",
            resolution="Best Available",
            ext="mp4",
            filesize_approx=fallback_size,
            note="Default stream"
        ))

    return InspectResponse(
        url=url,
        title=title,
        author=author,
        duration=duration,
        thumbnail=thumbnail,
        formats=formats
    )

def extract_video_info(url: str, device_id: Optional[str] = None) -> InspectResponse:
    from app.services.cookies import get_cookie_path
    from app.services.patches import apply_extractor_patches, discover_media_from_page

    apply_extractor_patches()

    target_url = resolve_redirects(url)
    cookie_file = get_cookie_path(device_id)

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "noplaylist": True,
        "format": "all",
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
            "tiktok": {
                "api": ["app", "web"]
            }
        },
    }
    if cookie_file:
        ydl_opts["cookiefile"] = cookie_file

    try:
        from yt_dlp.networking.impersonate import ImpersonateTarget
        ydl_opts["impersonate"] = ImpersonateTarget.from_str("chrome")
    except Exception:
        pass

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(target_url, download=False)
            return parse_raw_info(info)
    except Exception as primary_err:
        discovered = discover_media_from_page(target_url)
        if discovered and discovered.get("stream_url"):
            stream_url = discovered["stream_url"]
            stream_opts = dict(ydl_opts)
            stream_opts["http_headers"] = discovered.get("headers", ydl_opts["http_headers"])
            try:
                with yt_dlp.YoutubeDL(stream_opts) as ydl_stream:
                    info = ydl_stream.extract_info(stream_url, download=False)
                    if info:
                        if not info.get("title") or info.get("title") == "master":
                            info["title"] = discovered.get("title") or info.get("title")
                        if not info.get("thumbnail"):
                            info["thumbnail"] = discovered.get("thumbnail") or ""
                        if not info.get("duration") and discovered.get("duration"):
                            info["duration"] = discovered["duration"]
                        if not info.get("webpage_url"):
                            info["webpage_url"] = target_url
                        return parse_raw_info(info)
            except Exception:
                pass
        raise primary_err

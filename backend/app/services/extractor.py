import yt_dlp
from typing import Dict, Any, List
from app.models import InspectResponse, FormatOption

def parse_raw_info(info: Dict[str, Any]) -> InspectResponse:
    url = info.get("webpage_url") or info.get("url", "")
    title = info.get("title") or "Untitled Media"
    author = info.get("uploader") or info.get("channel") or "Unknown"
    duration = int(info.get("duration") or 0)
    thumbnail = info.get("thumbnail") or ""
    
    raw_formats = info.get("formats") or []
    formats: List[FormatOption] = []
    seen_resolutions = set()

    # Prioritize popular video formats
    video_formats = [
        f for f in raw_formats 
        if f.get("vcodec") != "none" and f.get("height")
    ]
    video_formats.sort(key=lambda x: x.get("height", 0), reverse=True)

    for vf in video_formats:
        h = vf.get("height")
        res_label = f"{h}p"
        if res_label not in seen_resolutions:
            seen_resolutions.add(res_label)
            formats.append(FormatOption(
                format_id=str(vf.get("format_id")),
                resolution=res_label,
                ext=vf.get("ext", "mp4"),
                filesize_approx=int(vf.get("filesize") or vf.get("filesize_approx")) if (vf.get("filesize") or vf.get("filesize_approx")) else None,
                note=vf.get("format_note") or f"{res_label} video"
            ))

    # Add audio option
    audio_formats = [
        f for f in raw_formats 
        if f.get("vcodec") == "none" and f.get("acodec") != "none"
    ]
    if audio_formats:
        best_audio = audio_formats[-1]
        raw_size = best_audio.get("filesize") or best_audio.get("filesize_approx")
        formats.append(FormatOption(
            format_id=str(best_audio.get("format_id")),
            resolution="Audio",
            ext="mp3",
            filesize_approx=int(raw_size) if raw_size else None,
            note="Audio only (MP3)"
        ))

    # Fallback format if list empty
    if not formats:
        formats.append(FormatOption(
            format_id="best",
            resolution="Best Available",
            ext="mp4",
            filesize_approx=None,
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

def extract_video_info(url: str) -> InspectResponse:
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "noplaylist": True,
        "extractor_args": {
            "youtube": {
                "player_client": ["ios", "android", "mweb"]
            }
        },
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        return parse_raw_info(info)

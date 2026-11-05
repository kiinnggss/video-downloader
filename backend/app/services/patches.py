import re
import json
from typing import Optional, Dict, Any, List
import httpx
from yt_dlp.extractor.peekvids import PlayVidsIE
from yt_dlp.extractor import lazy_extractors
from yt_dlp.utils import parse_duration, merge_dicts

AD_DOMAINS = {
    "adtng.com",
    "doubleclick.net",
    "googleads",
    "googlesyndication",
    "popads.net",
    "trafficjunky.net",
    "exoclick.com",
    "adsterra.com",
    "adx.",
    "syndication",
    "juicyads.com",
    "ero-advertising.com",
    "propellerads.com",
    "ad-delivery.net",
    "adnxs.com",
    "clickadu.com",
    "adkeeper.co.uk",
    "yllix.com",
    "adcash.com",
    "vidoomy.com",
    "zergnet.com",
    "revcontent.com",
    "outbrain.com",
    "taboola.com",
}

NON_VIDEO_EXTS = {
    ".vtt", ".srt", ".gif", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico", ".css", ".js"
}

_PATCHES_APPLIED = False


def is_ad_or_tracker_url(url: str) -> bool:
    """Checks if a URL points to an advertising or tracking network."""
    if not url:
        return True
    lower = url.lower().split("?")[0]
    if any(lower.endswith(ext) for ext in NON_VIDEO_EXTS):
        return True
    return any(ad in url.lower() for ad in AD_DOMAINS)


def apply_extractor_patches():
    """Patches yt-dlp extractors for sites with changed HTML or aggressive ads."""
    global _PATCHES_APPLIED
    if _PATCHES_APPLIED:
        return

    # 1. Patch PlayVidsIE: PlayVids moved from <video data-id="..."> to <video id="player"><source src="...m3u8...">
    orig_extract = getattr(PlayVidsIE, "_orig_real_extract", PlayVidsIE._real_extract)
    PlayVidsIE._orig_real_extract = orig_extract

    def patched_real_extract(self, url):
        domain, video_id = self._match_valid_url(url).group("domain", "id")
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }
        webpage = self._download_webpage(url, video_id, headers=headers, expected_status=429)

        # Look for modern <video id="player"><source src="..." /> or any clean video source
        source_url = self._search_regex(
            r'<video\b[^>]*>[\s\S]*?<source\b[^>]+src=[\"\']([^\"\']+)[\"\']',
            webpage,
            "video source url",
            default=None,
        ) or self._search_regex(
            r'<source\b[^>]+src=[\"\']([^\"\']+)[\"\']',
            webpage,
            "generic source url",
            default=None,
        )

        if source_url and not is_ad_or_tracker_url(source_url):
            source_url = source_url.replace("&amp;", "&")
            raw_title = self._html_search_regex(
                r"(?s)<h1\b[^>]*>(.+?)</h1>", webpage, "title", default=video_id
            )
            clean_title = re.sub(r"\s*[,-][^,-]+$", "", raw_title).strip()

            info = self._search_json_ld(webpage, video_id, expected_type="VideoObject", default={})
            thumbnail = info.get("thumbnail") or self._og_search_thumbnail(webpage)
            stream_headers = {
                "Referer": f"https://www.{domain}/",
                "User-Agent": headers["User-Agent"],
            }

            if ".m3u8" in source_url:
                formats = self._extract_m3u8_formats(
                    source_url,
                    video_id,
                    ext="mp4",
                    entry_protocol="m3u8_native",
                    headers=stream_headers,
                )
            else:
                formats = [{"url": source_url, "ext": "mp4", "http_headers": stream_headers}]

            return merge_dicts(
                {
                    "id": video_id,
                    "title": info.get("title") or clean_title,
                    "formats": formats,
                    "thumbnail": thumbnail,
                    "duration": info.get("duration")
                    or parse_duration(self._html_search_meta("duration", webpage)),
                    "age_limit": 18,
                    "uploader": self._html_search_regex(
                        r"[Uu]ploaded\s+by\s(.+?)[\"<]", webpage, "uploader", default=None
                    ),
                    "http_headers": stream_headers,
                },
                info,
            )

        # Fallback to original implementation if legacy markup is present
        return orig_extract(self, url)

    PlayVidsIE._real_extract = patched_real_extract
    if hasattr(lazy_extractors, "PlayVidsIE"):
        lazy_extractors.PlayVidsIE._real_extract = patched_real_extract

    _PATCHES_APPLIED = True


def discover_media_from_page(
    page_url: str, custom_headers: Optional[Dict[str, str]] = None
) -> Optional[Dict[str, Any]]:
    """Resiliently fetches an ad-heavy page and locates embedded video streams or manifests."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    if custom_headers:
        headers.update(custom_headers)

    try:
        with httpx.Client(timeout=6.0, follow_redirects=True, headers=headers) as client:
            resp = client.get(page_url)
            if resp.status_code != 200:
                return None
            html = resp.text
            final_url = str(resp.url)
    except Exception:
        return None

    # Title extraction
    title = None
    title_match = re.search(r"<title\b[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    if title_match:
        title = re.sub(r"\s+", " ", title_match.group(1)).strip()
        title = re.sub(r"\s+[-|–]\s+.*$", "", title).strip()

    # Thumbnail extraction
    thumbnail = None
    og_img = re.search(
        r'<meta\b[^>]+property=[\"\']og:image[\"\'][^>]+content=[\"\']([^\"\']+)[\"\']',
        html,
        re.IGNORECASE,
    )
    if og_img:
        thumbnail = og_img.group(1).replace("&amp;", "&")

    # Duration extraction
    duration = 0
    dur_match = re.search(
        r'<meta\b[^>]+property=[\"\']video:duration[\"\'][^>]+content=[\"\'](\d+)[\"\']',
        html,
        re.IGNORECASE,
    )
    if dur_match:
        try:
            duration = int(dur_match.group(1))
        except ValueError:
            duration = 0

    candidate_streams: List[str] = []

    # 1. <video> tag inner <source>
    for m in re.finditer(r"<video\b[^>]*>([\s\S]*?)</video>", html, re.IGNORECASE):
        block = m.group(1)
        for src in re.findall(r'<source\b[^>]+src=[\"\']([^\"\']+)[\"\']', block, re.IGNORECASE):
            clean = src.replace("&amp;", "&")
            if not is_ad_or_tracker_url(clean):
                candidate_streams.append(clean)

    # 2. <video src="...">
    for src in re.findall(r'<video\b[^>]+src=[\"\']([^\"\']+)[\"\']', html, re.IGNORECASE):
        clean = src.replace("&amp;", "&")
        if not is_ad_or_tracker_url(clean):
            candidate_streams.append(clean)

    # 3. OpenGraph og:video or og:video:url
    for src in re.findall(
        r'<meta\b[^>]+property=[\"\']og:video(?::url)?[\"\'][^>]+content=[\"\']([^\"\']+)[\"\']',
        html,
        re.IGNORECASE,
    ):
        clean = src.replace("&amp;", "&")
        if not is_ad_or_tracker_url(clean):
            candidate_streams.append(clean)

    # 4. JSON-LD VideoObject
    for jld in re.findall(
        r'<script[^>]*type=[\"\']application/ld\+json[\"\'][^>]*>([\s\S]*?)</script>',
        html,
        re.IGNORECASE,
    ):
        try:
            data = json.loads(jld)
            objects = data if isinstance(data, list) else [data]
            for obj in objects:
                if isinstance(obj, dict) and obj.get("@type") == "VideoObject":
                    if not title and obj.get("name"):
                        title = obj.get("name")
                    if not thumbnail and obj.get("thumbnailUrl"):
                        tn = obj.get("thumbnailUrl")
                        thumbnail = tn[0] if isinstance(tn, list) else str(tn)
                    c_url = obj.get("contentUrl") or obj.get("embedUrl")
                    if c_url and not is_ad_or_tracker_url(c_url):
                        candidate_streams.append(c_url)
        except Exception:
            pass

    # 5. Regex search for HLS master.m3u8 or video.mp4 URLs in scripts
    for src in re.findall(
        r'https?://[^\s\"\'<>]+\.(?:m3u8|mp4)(?:\?[^\s\"\'<>]*)?', html, re.IGNORECASE
    ):
        clean = src.replace("&amp;", "&")
        if not is_ad_or_tracker_url(clean):
            candidate_streams.append(clean)

    if not candidate_streams:
        return None

    # Prioritize m3u8 playlists over raw mp4s if available
    chosen_stream = candidate_streams[0]
    for cs in candidate_streams:
        if ".m3u8" in cs.lower():
            chosen_stream = cs
            break

    return {
        "stream_url": chosen_stream,
        "title": title or "Extracted Media Stream",
        "thumbnail": thumbnail or "",
        "duration": duration,
        "page_url": final_url,
        "headers": {
            "Referer": final_url,
            "User-Agent": headers["User-Agent"],
        },
    }

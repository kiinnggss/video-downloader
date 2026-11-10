import base64
import json
import re
from typing import Optional, Dict, Any, List, Set
from urllib.parse import urljoin, unquote
import httpx
from yt_dlp.extractor.peekvids import PlayVidsIE
from yt_dlp.extractor import lazy_extractors
from yt_dlp.utils import parse_duration, merge_dicts

AD_DOMAINS = {
    "adtng.com",
    "doubleclick.net",
    "googleads",
    "googlesyndication",
    "googletagmanager.com",
    "google-analytics.com",
    "recaptcha.net",
    "google.com/recaptcha",
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
    "disqus.com",
    "facebook.com/plugins",
    "platform.twitter.com",
}

NON_VIDEO_EXTS = {
    ".vtt", ".srt", ".gif", ".png", ".jpg", ".jpeg", ".webp", ".svg",
    ".ico", ".css", ".js", ".woff", ".woff2", ".ttf", ".otf", ".json", ".xml"
}

STREAM_EXT_REGEX = r"\.(?:m3u8|mpd|mp4|webm|mov|m4v)(?:[?#][^\s\"\'<>\\]*)?$"

_PATCHES_APPLIED = False


def is_ad_or_tracker_url(url: str) -> bool:
    """Checks if a URL points to an advertising, tracking, or non-media resource."""
    if not url:
        return True
    clean = url.strip()
    if clean.startswith(("javascript:", "mailto:", "tel:", "data:", "about:", "#")):
        return True
    lower = clean.lower().split("?")[0].split("#")[0]
    if any(lower.endswith(ext) for ext in NON_VIDEO_EXTS):
        return True
    return any(ad in clean.lower() for ad in AD_DOMAINS)


def is_direct_stream_url(url: str) -> bool:
    """Checks if a URL looks like a direct media file or adaptive manifest."""
    if not url or is_ad_or_tracker_url(url):
        return False
    lower = url.lower()
    if re.search(STREAM_EXT_REGEX, lower):
        return True
    if any(token in lower for token in (".m3u8", ".mpd", "/hls/", "/dash/", "mime=video", "video/mp4")):
        return True
    return False


def unescape_text_blobs(raw_html: str) -> str:
    """Unescapes JSON/JS backslash sequences and common unicode escapes for stream scanning."""
    text = raw_html.replace("&amp;", "&")
    text = text.replace(r"\/", "/")
    text = re.sub(r"\\u002[fF]", "/", text)
    text = re.sub(r"\\u0026", "&", text)
    text = re.sub(r"\\u003[dD]", "=", text)
    text = re.sub(r"\\u003[fF]", "?", text)
    text = re.sub(r"\\x2[fF]", "/", text)
    text = re.sub(r"\\x26", "&", text)
    return text


def extract_base64_streams(html: str, base_url: str) -> List[str]:
    """Finds Base64 encoded stream URLs inside atob(...) calls or JSON strings."""
    found: List[str] = []
    patterns = [
        r'atob\(\s*[\"\']([A-Za-z0-9+/=]{20,})[\"\']\s*\)',
        r'[\"\'](aHR0cHM6Ly[A-Za-z0-9+/=]{12,}|aHR0cDovL[A-Za-z0-9+/=]{12,})[\"\']',
    ]
    for pat in patterns:
        for b64_str in re.findall(pat, html):
            try:
                padded = b64_str + "=" * ((4 - len(b64_str) % 4) % 4)
                decoded = base64.b64decode(padded).decode("utf-8", errors="ignore").strip()
                if decoded.startswith(("http://", "https://", "//", "/")):
                    resolved = urljoin(base_url, decoded)
                    if is_direct_stream_url(resolved):
                        found.append(resolved)
            except Exception:
                pass
    return found


def extract_meta_values(html: str, keys: Set[str]) -> List[str]:
    """Extracts <meta> tag content regardless of attribute order."""
    results: List[str] = []
    for tag in re.findall(r"<meta\b[^>]+>", html, re.IGNORECASE):
        prop_match = re.search(
            r'\b(?:property|name|itemprop)\s*=\s*[\"\']([^\"\']+)[\"\']',
            tag,
            re.IGNORECASE,
        )
        content_match = re.search(
            r'\bcontent\s*=\s*[\"\']([^\"\']+)[\"\']',
            tag,
            re.IGNORECASE,
        )
        if prop_match and content_match:
            prop_name = prop_match.group(1).strip().lower()
            if prop_name in keys:
                val = content_match.group(1).replace("&amp;", "&").strip()
                if val:
                    results.append(val)
    return results


def normalize_candidate_url(raw_url: str, base_url: str) -> Optional[str]:
    """Resolves relative, protocol-relative, or URL-encoded stream links against base_url."""
    if not raw_url:
        return None
    cleaned = unescape_text_blobs(raw_url.strip().strip("\"'"))
    if cleaned.startswith(("http%3A%2F%2F", "https%3A%2F%2F", "http%3a%2f%2f", "https%3a%2f%2f")):
        cleaned = unquote(cleaned)
    if cleaned.startswith(("blob:", "javascript:", "data:", "mailto:", "#")):
        return None
    if cleaned.startswith(("http://", "https://", "//", "/")):
        resolved = urljoin(base_url, cleaned)
        if resolved.startswith(("http://", "https://")) and not is_ad_or_tracker_url(resolved):
            return resolved
    return None


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


def _prioritize_streams(streams: List[str]) -> List[str]:
    """Deduplicates and orders candidate streams: adaptive manifests (.m3u8, .mpd) first, then direct video files."""
    seen: Set[str] = set()
    manifests: List[str] = []
    directs: List[str] = []
    others: List[str] = []

    for s in streams:
        if not s or s in seen:
            continue
        seen.add(s)
        lower = s.lower()
        if ".m3u8" in lower or ".mpd" in lower:
            manifests.append(s)
        elif re.search(r"\.(?:mp4|webm|mov|m4v)(?:[?#]|$)", lower):
            directs.append(s)
        else:
            others.append(s)

    return manifests + directs + others


def discover_media_from_page(
    page_url: str,
    custom_headers: Optional[Dict[str, str]] = None,
    _depth: int = 0,
    _visited: Optional[Set[str]] = None,
) -> Optional[Dict[str, Any]]:
    """Resiliently fetches an ad-heavy or custom-player page and locates embedded video streams, manifests, or nested iframes."""
    if _depth > 2:
        return None
    if _visited is None:
        _visited = set()
    if page_url in _visited:
        return None
    _visited.add(page_url)

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

    # Title extraction (order-independent meta + <title>)
    title = None
    og_titles = extract_meta_values(html, {"og:title", "twitter:title"})
    if og_titles:
        title = og_titles[0]
    if not title:
        title_match = re.search(r"<title\b[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
        if title_match:
            title = re.sub(r"\s+", " ", title_match.group(1)).strip()
            title = re.sub(r"\s+[-|–]\s+.*$", "", title).strip()

    # Thumbnail extraction (order-independent meta)
    thumbnail = None
    og_imgs = extract_meta_values(html, {"og:image", "og:image:url", "twitter:image"})
    if og_imgs:
        thumbnail = urljoin(final_url, og_imgs[0])

    # Duration extraction
    duration = 0
    dur_vals = extract_meta_values(html, {"video:duration", "og:video:duration", "duration"})
    if dur_vals:
        try:
            duration = int(float(dur_vals[0]))
        except ValueError:
            duration = parse_duration(dur_vals[0]) or 0

    candidate_streams: List[str] = []
    embed_pages: List[str] = []

    attr_pattern = r'\b(?:src|data-src|data-video-src|data-hls|data-mp4|data-stream|data-url|data-file)\s*=\s*[\"\']([^\"\']+)[\"\']'

    # 1. <video> tag and inner <source> tags (including lazy data-* attributes)
    for m in re.finditer(r"<video\b([^>]*)>([\s\S]*?)</video>", html, re.IGNORECASE):
        video_attrs, inner_block = m.group(1), m.group(2)
        for raw in re.findall(attr_pattern, video_attrs, re.IGNORECASE):
            norm = normalize_candidate_url(raw, final_url)
            if norm:
                candidate_streams.append(norm)
        for source_tag in re.findall(r"<source\b[^>]+>", inner_block, re.IGNORECASE):
            for raw in re.findall(attr_pattern, source_tag, re.IGNORECASE):
                norm = normalize_candidate_url(raw, final_url)
                if norm:
                    candidate_streams.append(norm)

    # 2. Self-closing <video ...> or standalone <source ...> or [data-video-src] / [data-hls] containers
    for tag in re.findall(r"<(?:video|source)\b[^>]+>", html, re.IGNORECASE):
        for raw in re.findall(attr_pattern, tag, re.IGNORECASE):
            norm = normalize_candidate_url(raw, final_url)
            if norm:
                candidate_streams.append(norm)

    for raw in re.findall(
        r'\b(?:data-video-src|data-hls|data-mp4|data-stream)\s*=\s*[\"\']([^\"\']+)[\"\']',
        html,
        re.IGNORECASE,
    ):
        norm = normalize_candidate_url(raw, final_url)
        if norm:
            candidate_streams.append(norm)

    # 3. Order-independent OpenGraph & Twitter video meta tags
    for meta_url in extract_meta_values(
        html,
        {
            "og:video",
            "og:video:url",
            "og:video:secure_url",
            "twitter:player:stream",
            "contenturl",
        },
    ):
        norm = normalize_candidate_url(meta_url, final_url)
        if norm:
            if is_direct_stream_url(norm):
                candidate_streams.append(norm)
            else:
                embed_pages.append(norm)

    # 4. JSON-LD VideoObject blocks (supports @graph and nested structures)
    for jld in re.findall(
        r'<script[^>]*type=[\"\']application/ld\+json[\"\'][^>]*>([\s\S]*?)</script>',
        html,
        re.IGNORECASE,
    ):
        try:
            data = json.loads(jld.strip())
            queue = data if isinstance(data, list) else [data]
            while queue:
                obj = queue.pop(0)
                if not isinstance(obj, dict):
                    continue
                if "@graph" in obj and isinstance(obj["@graph"], list):
                    queue.extend(obj["@graph"])
                obj_type = str(obj.get("@type") or "")
                if "VideoObject" in obj_type or "MediaObject" in obj_type:
                    if not title and obj.get("name"):
                        title = str(obj.get("name"))
                    if not thumbnail and obj.get("thumbnailUrl"):
                        tn = obj.get("thumbnailUrl")
                        raw_tn = tn[0] if isinstance(tn, list) and tn else str(tn)
                        thumbnail = normalize_candidate_url(raw_tn, final_url) or raw_tn
                    if not duration and obj.get("duration"):
                        duration = parse_duration(str(obj.get("duration"))) or 0
                    for key in ("contentUrl", "embedUrl"):
                        val = obj.get(key)
                        if isinstance(val, str):
                            norm = normalize_candidate_url(val, final_url)
                            if norm:
                                if key == "contentUrl" or is_direct_stream_url(norm):
                                    candidate_streams.append(norm)
                                else:
                                    embed_pages.append(norm)
        except Exception:
            pass

    # 5. Unescaped JavaScript/JSON scan for .m3u8, .mpd, .mp4, .webm, .mov, .m4v
    unescaped_html = unescape_text_blobs(html)

    # Full URLs in scripts/JSON
    for raw in re.findall(
        r'https?://[^\s\"\'<>\\]+\.(?:m3u8|mpd|mp4|webm|mov|m4v)(?:\?[^\s\"\'<>\\]*)?',
        unescaped_html,
        re.IGNORECASE,
    ):
        norm = normalize_candidate_url(raw, final_url)
        if norm:
            candidate_streams.append(norm)

    # Protocol-relative or root-relative stream paths in player configs (e.g. file: "/hls/master.m3u8")
    for raw in re.findall(
        r'[\"\']((?://|/)[^\s\"\'<>\\]+\.(?:m3u8|mpd|mp4|webm|mov|m4v)(?:\?[^\s\"\'<>\\]*)?)[\"\']',
        unescaped_html,
        re.IGNORECASE,
    ):
        norm = normalize_candidate_url(raw, final_url)
        if norm:
            candidate_streams.append(norm)

    # Common JS player property keys (jwplayer, videojs, plyr, fluidplayer, next_data)
    for raw in re.findall(
        r'\b(?:file|hls|hlsUrl|dash|dashUrl|videoUrl|streamUrl|contentUrl|video_url|manifest)\s*[\"\']?\s*:\s*[\"\']([^\"\']+)[\"\']',
        unescaped_html,
        re.IGNORECASE,
    ):
        norm = normalize_candidate_url(raw, final_url)
        if norm and is_direct_stream_url(norm):
            candidate_streams.append(norm)

    # 6. Base64-encoded streams inside atob(...) or JSON blobs
    candidate_streams.extend(extract_base64_streams(html, final_url))

    prioritized = _prioritize_streams(candidate_streams)
    if prioritized:
        return {
            "stream_url": prioritized[0],
            "candidate_streams": prioritized,
            "title": title or "Extracted Media Stream",
            "thumbnail": thumbnail or "",
            "duration": duration,
            "page_url": final_url,
            "headers": {
                "Referer": final_url,
                "User-Agent": headers["User-Agent"],
            },
        }

    # 7. Nested <iframe> and <embed> fallback inspection
    for iframe_tag in re.findall(r"<(?:iframe|embed)\b[^>]+>", html, re.IGNORECASE):
        for raw_src in re.findall(
            r'\b(?:src|data-src)\s*=\s*[\"\']([^\"\']+)[\"\']', iframe_tag, re.IGNORECASE
        ):
            norm_iframe = normalize_candidate_url(raw_src, final_url)
            if norm_iframe and norm_iframe not in embed_pages:
                embed_pages.append(norm_iframe)

    for embed_url in embed_pages[:3]:
        iframe_headers = dict(headers)
        iframe_headers["Referer"] = final_url
        sub_result = discover_media_from_page(
            embed_url,
            custom_headers=iframe_headers,
            _depth=_depth + 1,
            _visited=_visited,
        )
        if sub_result and sub_result.get("stream_url"):
            if title and (
                not sub_result.get("title")
                or sub_result["title"] == "Extracted Media Stream"
            ):
                sub_result["title"] = title
            if thumbnail and not sub_result.get("thumbnail"):
                sub_result["thumbnail"] = thumbnail
            if duration and not sub_result.get("duration"):
                sub_result["duration"] = duration
            return sub_result

    return None

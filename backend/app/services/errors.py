import re
from typing import Union

ANSI_ESCAPE_RE = re.compile(r"\x1b\[[0-9;]*m")
CREDENTIAL_URL_RE = re.compile(r"(https?|socks5h?|socks4a?)://[^/\s@]+@", re.IGNORECASE)


def format_extraction_error(err: Union[Exception, str]) -> str:
    """Normalize and classify raw yt-dlp/network errors while redacting proxy credentials."""
    raw = str(err or "")
    text = ANSI_ESCAPE_RE.sub("", raw)
    text = re.sub(r"\s+", " ", text).strip()
    text = CREDENTIAL_URL_RE.sub(r"\1://***@", text)

    cleaned = text
    while re.match(r"^ERROR:\s*", cleaned, re.IGNORECASE):
        cleaned = re.sub(r"^ERROR:\s*", "", cleaned, count=1, flags=re.IGNORECASE).strip()

    low = cleaned.lower()

    if any(
        token in low
        for token in (
            "geo-restricted",
            "geoblocked",
            "geo blocked",
            "not available in your country",
            "unavailable in your country",
            "blocked it in your country",
            "not available in your location",
        )
    ) or ("redirection detected" in low and "pornhub" in low):
        return (
            "Geo-restricted in the server region. "
            "Configure YTDLP_PROXY on the server or deploy in a supported region."
        )

    if any(token in low for token in ("http error 429", "too many requests", "rate limit", "rate-limit")):
        return (
            "Rate-limited by the source site (HTTP 429). "
            "Wait a moment, add session cookies in Settings, or configure YTDLP_PROXY."
        )

    if any(
        token in low
        for token in (
            "sign in",
            "login required",
            "log in",
            "cookies",
            "age-restricted",
            "confirm your age",
            "private video",
            "members-only",
            "members only",
            "this video is private",
        )
    ):
        return "Sign-in or age confirmation required. Add session cookies in Settings and try again."

    if any(
        token in low
        for token in ("http error 403", "403 forbidden", "confirm you're not a bot", "not a bot", "captcha", "cloudflare")
    ):
        return (
            "Access blocked by the source site (HTTP 403 / bot check). "
            "Try adding session cookies in Settings or retrying later."
        )

    if any(
        token in low
        for token in (
            "http error 404",
            "video unavailable",
            "has been removed",
            "been deleted",
            "no longer available",
        )
    ):
        return "Video is unavailable or has been removed from the source site."

    if not cleaned:
        return "Unknown extraction error"

    return cleaned[:240]

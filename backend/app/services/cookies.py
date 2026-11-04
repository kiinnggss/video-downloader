import os
from pathlib import Path
from typing import Optional

COOKIES_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "cookies"

def get_cookie_path(device_id: Optional[str] = None) -> Optional[str]:
    COOKIES_DIR.mkdir(parents=True, exist_ok=True)
    safe_id = "".join(c for c in (device_id or "default") if c.isalnum() or c in ("-", "_")) or "default"
    path = COOKIES_DIR / f"{safe_id}.txt"
    if path.exists() and path.stat().st_size > 0:
        return str(path)
    # Check default fallback
    default_path = COOKIES_DIR / "default.txt"
    if default_path.exists() and default_path.stat().st_size > 0:
        return str(default_path)
    return None

def save_cookie_content(content: str, device_id: Optional[str] = None) -> str:
    COOKIES_DIR.mkdir(parents=True, exist_ok=True)
    safe_id = "".join(c for c in (device_id or "default") if c.isalnum() or c in ("-", "_")) or "default"
    path = COOKIES_DIR / f"{safe_id}.txt"
    with open(path, "w", encoding="utf-8") as f:
        f.write(content.strip())
    return str(path)

def clear_cookies(device_id: Optional[str] = None) -> bool:
    safe_id = "".join(c for c in (device_id or "default") if c.isalnum() or c in ("-", "_")) or "default"
    path = COOKIES_DIR / f"{safe_id}.txt"
    if path.exists():
        try:
            path.unlink()
            return True
        except OSError:
            return False
    return False

def has_cookies(device_id: Optional[str] = None) -> bool:
    return get_cookie_path(device_id) is not None

import os
from pathlib import Path
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
PUBLIC_STORAGE = STORAGE_DIR / "public"
VAULT_STORAGE = STORAGE_DIR / "vault"
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "downloads.db"

PUBLIC_STORAGE.mkdir(parents=True, exist_ok=True)
VAULT_STORAGE.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_ytdlp_proxy() -> Optional[str]:
    """Return an optional HTTP or SOCKS proxy URL from environment variables."""
    raw = os.environ.get("YTDLP_PROXY") or os.environ.get("CRYSTAL_PROXY") or ""
    cleaned = raw.strip()
    return cleaned or None

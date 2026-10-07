from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
PUBLIC_STORAGE = STORAGE_DIR / "public"
VAULT_STORAGE = STORAGE_DIR / "vault"
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "downloads.db"

PUBLIC_STORAGE.mkdir(parents=True, exist_ok=True)
VAULT_STORAGE.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

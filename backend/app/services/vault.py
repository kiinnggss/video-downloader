import hashlib
import secrets
import time
from typing import Dict, Optional
from app.db import get_connection

vault_sessions: Dict[str, float] = {}
DEFAULT_PIN = "1234"

def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode("utf-8")).hexdigest()

def set_pin(pin: str, device_id: str = "default", db_path: str = None):
    conn = get_connection(db_path)
    pin_h = hash_pin(pin)
    dev = device_id or "default"
    with conn:
        conn.execute("INSERT OR REPLACE INTO vault_auth (device_id, pin_hash) VALUES (?, ?)", (dev, pin_h))
    conn.close()

def has_pin(device_id: str = "default", db_path: str = None) -> bool:
    conn = get_connection(db_path)
    cursor = conn.cursor()
    dev = device_id or "default"
    row = None
    try:
        cursor.execute("SELECT pin_hash FROM vault_auth WHERE device_id = ?", (dev,))
        row = cursor.fetchone()
    except Exception:
        pass
    conn.close()
    return row is not None

def verify_pin(pin: str, device_id: str = "default", db_path: str = None) -> bool:
    conn = get_connection(db_path)
    cursor = conn.cursor()
    dev = device_id or "default"
    row = None
    try:
        cursor.execute("SELECT pin_hash FROM vault_auth WHERE device_id = ?", (dev,))
        row = cursor.fetchone()
    except Exception:
        pass

    if not row:
        # Check backwards compatibility id=1
        try:
            cursor.execute("SELECT pin_hash FROM vault_auth WHERE id = 1")
            row = cursor.fetchone()
        except Exception:
            pass

    conn.close()
    if not row:
        return pin == DEFAULT_PIN
    return row["pin_hash"] == hash_pin(pin)

def generate_vault_token() -> str:
    token = secrets.token_hex(24)
    vault_sessions[token] = time.time() + 1800  # 30 minutes
    return token

def verify_vault_token(token: str) -> bool:
    if not token or token not in vault_sessions:
        return False
    expiry = vault_sessions[token]
    if time.time() > expiry:
        del vault_sessions[token]
        return False
    return True

import hashlib
import secrets
import time
from typing import Dict
from app.db import get_connection

vault_sessions: Dict[str, float] = {}
DEFAULT_PIN = "1234"

def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode("utf-8")).hexdigest()

def set_pin(pin: str, db_path: str = None):
    conn = get_connection(db_path)
    pin_h = hash_pin(pin)
    with conn:
        conn.execute("INSERT OR REPLACE INTO vault_auth (id, pin_hash) VALUES (1, ?)", (pin_h,))
    conn.close()

def verify_pin(pin: str, db_path: str = None) -> bool:
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT pin_hash FROM vault_auth WHERE id = 1")
    row = cursor.fetchone()
    conn.close()
    if not row:
        # Default pin 1234
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

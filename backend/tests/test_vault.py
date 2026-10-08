import os
import tempfile
import time
import pytest
from app.db import init_db
from app.services.vault import (
    set_pin,
    verify_pin,
    generate_vault_token,
    verify_vault_token,
    vault_sessions,
)

@pytest.fixture
def vault_db():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    init_db(path)
    yield path
    if os.path.exists(path):
        os.remove(path)

def test_pin_verification(vault_db):
    set_pin("4321", db_path=vault_db)
    assert verify_pin("4321", db_path=vault_db) is True
    assert verify_pin("0000", db_path=vault_db) is False

def test_default_pin(vault_db):
    assert verify_pin("1234", db_path=vault_db) is True
    assert verify_pin("9999", db_path=vault_db) is False

def test_vault_token():
    token = generate_vault_token()
    assert verify_vault_token(token) is True
    assert verify_vault_token("invalid-token") is False
    assert verify_vault_token("") is False
    assert verify_vault_token(None) is False

def test_vault_token_expiration():
    token = generate_vault_token()
    vault_sessions[token] = time.time() - 1
    assert verify_vault_token(token) is False
    assert token not in vault_sessions

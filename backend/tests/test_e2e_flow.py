import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db import init_db

pytestmark = pytest.mark.anyio

@pytest.fixture
def anyio_backend():
    return "asyncio"

async def test_full_application_lifecycle():
    init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Health/files check
        files_res = await ac.get("/api/files")
        assert files_res.status_code == 200
        assert isinstance(files_res.json(), list)

        # 2. Vault authentication
        unlock_res = await ac.post("/api/vault/unlock", json={"pin": "1234"})
        assert unlock_res.status_code == 200
        token = unlock_res.json()["token"]

        # 3. Access private files with token
        vault_res = await ac.get("/api/vault/files", headers={"Authorization": f"Bearer {token}"})
        assert vault_res.status_code == 200

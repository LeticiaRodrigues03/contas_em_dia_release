import os
import uuid
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _register(api, base_url):
    email = f"TEST_{uuid.uuid4().hex[:10]}@contas.app"
    pw = "senha123"
    r = api.post(f"{base_url}/api/auth/register",
                 json={"name": "TEST User", "email": email, "password": pw})
    assert r.status_code == 201, r.text
    data = r.json()
    return {"email": email, "password": pw, "token": data["access_token"], "user": data["user"]}


@pytest.fixture()
def user_a(api, base_url):
    u = _register(api, base_url)
    yield u
    # cleanup
    api.delete(f"{base_url}/api/auth/me", headers={"Authorization": f"Bearer {u['token']}"})


@pytest.fixture()
def user_b(api, base_url):
    u = _register(api, base_url)
    yield u
    api.delete(f"{base_url}/api/auth/me", headers={"Authorization": f"Bearer {u['token']}"})


def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

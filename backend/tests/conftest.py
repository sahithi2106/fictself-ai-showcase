"""
conftest.py — FictSelf Backend Test Fixtures
Uses an in-memory SQLite database (separate from production Postgres).
Overrides the `get_db` dependency so no production data is touched.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Use SQLite in-memory with check_same_thread=False for test isolation
TEST_DB_URL = "sqlite:///:memory:"

# --- Override settings BEFORE importing app so config.py sees test env ---
import os
os.environ["DATABASE_URL"] = TEST_DB_URL
os.environ["SECRET_KEY"] = "test-secret-key-for-health-audit"
# Mock heavy ML dependencies (sentence_transformers, chromadb) to avoid network downloads / hangs in tests
import sys
from unittest.mock import MagicMock
fake_st = MagicMock()
fake_st.SentenceTransformer = lambda *a, **kw: MagicMock(
    encode=lambda texts, *a, **k: [0.0] * 384 if isinstance(texts, str) else [[0.0] * 384 for _ in texts]
)
sys.modules["sentence_transformers"] = fake_st
sys.modules["chromadb"] = MagicMock()

# SQLite needs special handling for UUID, JSON, and RETURNING
from sqlalchemy.dialects import sqlite as sqlite_dialect

# Patch PostgreSQL-specific type imports for SQLite compat
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB as PG_JSONB
from sqlalchemy import String, Text
from unittest.mock import patch

# Monkey-patch postgres dialect types used in models to SQLite-compatible equivalents
import uuid
from sqlalchemy.types import TypeDecorator, String, JSON
import sqlalchemy.dialects.postgresql as pg_module

class PatchedUUID(TypeDecorator):
    impl = String(36)
    cache_ok = True
    def __init__(self, as_uuid=True, *args, **kwargs):
        self.as_uuid = as_uuid
        super().__init__()
    def process_bind_param(self, value, dialect):
        if value is not None:
            return str(value)
        return value
    def process_result_value(self, value, dialect):
        if value is not None and self.as_uuid:
            return uuid.UUID(str(value)) if not isinstance(value, uuid.UUID) else value
        return value

class PatchedJSONB(TypeDecorator):
    impl = JSON
    cache_ok = True
    def __init__(self, *args, **kwargs):
        super().__init__()

pg_module.UUID = PatchedUUID
pg_module.JSONB = PatchedJSONB

# Patch create_engine to safely handle SQLite URL without PostgreSQL pool kwargs
import sqlalchemy
_original_create_engine = sqlalchemy.create_engine
def _sqlite_safe_create_engine(*args, **kwargs):
    if len(args) > 0 and str(args[0]).startswith("sqlite"):
        for k in ["pool_size", "max_overflow", "pool_timeout", "pool_recycle"]:
            kwargs.pop(k, None)
    return _original_create_engine(*args, **kwargs)
sqlalchemy.create_engine = _sqlite_safe_create_engine

# Now we can safely import models and app
from app.db.base_class import Base
import app.db.base  # ensures all models are registered

from app.main import app
from app.api.deps import get_db
from app.core.security import get_password_hash

# Create an in-memory SQLite engine
engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# SQLite: enable foreign key enforcement
@event.listens_for(engine, "connect")
def enable_foreign_keys(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function", autouse=True)
def setup_db():
    """Create all tables before each test, drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db():
    """Return a raw SQLAlchemy session for direct DB operations."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def client():
    """Return a TestClient with the DB override applied."""
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ---- Helper factories ----

def make_verified_user(db, email: str, username: str, password: str = "TestPass123!"):
    """Creates a user with pre-verified OTP in the DB."""
    from app.models.user import User
    from app.models.email_verification_otp import EmailVerificationOTP
    from datetime import datetime, timezone, timedelta

    # Pre-verify OTP
    otp = EmailVerificationOTP(
        email=email,
        otp="123456",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        is_verified=True,
    )
    db.add(otp)
    db.flush()

    # Create user directly in DB (bypass OTP flow)
    user = User(
        email=email,
        username=username,
        password_hash=get_password_hash(password),
        display_name=f"Test {username}",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_auth_headers(client, email: str, password: str = "TestPass123!"):
    """Log in and return Bearer auth headers."""
    response = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def user_a(db):
    return make_verified_user(db, "usera@test.com", "user_a")


@pytest.fixture
def user_b(db):
    return make_verified_user(db, "userb@test.com", "user_b")


@pytest.fixture
def auth_headers_a(client, user_a):
    return get_auth_headers(client, "usera@test.com")


@pytest.fixture
def auth_headers_b(client, user_b):
    return get_auth_headers(client, "userb@test.com")

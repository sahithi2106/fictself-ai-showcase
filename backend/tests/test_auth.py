"""
test_auth.py — Section B: Auth endpoints (register, login, /me, protected routes)
"""
import pytest


class TestAuthRegister:
    """Test /auth/register flow with OTP pre-verification."""

    def test_register_user_succeeds_with_verified_otp(self, client, db):
        from app.models.email_verification_otp import EmailVerificationOTP
        from datetime import datetime, timezone, timedelta

        email = "newuser@test.com"
        # Pre-insert verified OTP
        otp = EmailVerificationOTP(
            email=email,
            otp="000001",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
            is_verified=True,
        )
        db.add(otp)
        db.commit()

        resp = client.post("/api/v1/auth/register", json={
            "email": email,
            "username": "newuser",
            "password": "Secret123!"
        })
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["email"] == email
        assert data["username"] == "newuser"
        assert "id" in data

    def test_register_fails_without_otp_verification(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "email": "nootp@test.com",
            "username": "nootp_user",
            "password": "Secret123!"
        })
        assert resp.status_code == 400
        assert "OTP" in resp.json()["detail"] or "verified" in resp.json()["detail"].lower()

    def test_register_fails_duplicate_email(self, client, db):
        from app.models.email_verification_otp import EmailVerificationOTP
        from datetime import datetime, timezone, timedelta

        email = "dup@test.com"
        otp = EmailVerificationOTP(
            email=email, otp="111111",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
            is_verified=True,
        )
        db.add(otp)
        db.commit()

        # First registration
        client.post("/api/v1/auth/register", json={
            "email": email, "username": "dupuser1", "password": "Secret123!"
        })

        # Second registration with same email
        resp = client.post("/api/v1/auth/register", json={
            "email": email, "username": "dupuser2", "password": "Secret123!"
        })
        assert resp.status_code == 400


class TestAuthLogin:
    """Test /auth/login token generation."""

    def test_login_succeeds_with_valid_credentials(self, client, user_a):
        resp = client.post(
            "/api/v1/auth/login",
            data={"username": "usera@test.com", "password": "TestPass123!"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_fails_wrong_password(self, client, user_a):
        resp = client.post(
            "/api/v1/auth/login",
            data={"username": "usera@test.com", "password": "WrongPassword!"}
        )
        assert resp.status_code == 400
        assert "Incorrect" in resp.json()["detail"] or "incorrect" in resp.json()["detail"].lower()

    def test_login_fails_nonexistent_user(self, client):
        resp = client.post(
            "/api/v1/auth/login",
            data={"username": "ghost@test.com", "password": "anything"}
        )
        assert resp.status_code == 400


class TestAuthMe:
    """Test /auth/me protected endpoint."""

    def test_get_me_returns_current_user(self, client, user_a, auth_headers_a):
        resp = client.get("/api/v1/auth/me", headers=auth_headers_a)
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "usera@test.com"
        assert data["username"] == "user_a"

    def test_get_me_without_auth_returns_401(self, client):
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    def test_get_me_with_invalid_token_returns_401(self, client):
        resp = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer fake.token.here"})
        assert resp.status_code == 401

    def test_protected_endpoint_without_auth_rejected(self, client):
        """Any protected resource returns 401 without auth."""
        resp = client.get("/api/v1/stories/")
        assert resp.status_code == 401

    def test_protected_endpoint_with_auth_allowed(self, client, user_a, auth_headers_a):
        """Authenticated requests to protected endpoints pass auth gate."""
        resp = client.get("/api/v1/stories/", headers=auth_headers_a)
        assert resp.status_code in (200, 404)  # 200 = OK, 404 = no stories yet but auth passed

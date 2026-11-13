"""
test_personas.py — Section G: Persona CRUD + ownership
"""
import pytest


def create_persona(client, headers, name="Writer Persona"):
    resp = client.post("/api/v1/personas/", json={
        "display_name": name,
        "background_text": "A mysterious writer.",
        "is_default": False,
    }, headers=headers)
    assert resp.status_code == 200, f"Create persona failed: {resp.text}"
    return resp.json()


class TestPersonaCRUD:
    """Persona Create, Read, Update, Delete."""

    def test_create_persona(self, client, user_a, auth_headers_a):
        persona = create_persona(client, auth_headers_a)
        assert persona["display_name"] == "Writer Persona"
        assert persona["user_id"] == str(user_a.id)

    def test_first_persona_is_auto_default(self, client, user_a, auth_headers_a):
        """First persona created by a user should auto-become default."""
        persona = create_persona(client, auth_headers_a, name="First Persona")
        assert persona["is_default"] is True

    def test_list_personas(self, client, user_a, auth_headers_a):
        create_persona(client, auth_headers_a, name="P1")
        create_persona(client, auth_headers_a, name="P2")
        resp = client.get("/api/v1/personas/", headers=auth_headers_a)
        assert resp.status_code == 200
        assert len(resp.json()) >= 2

    def test_update_persona(self, client, user_a, auth_headers_a):
        persona = create_persona(client, auth_headers_a)
        resp = client.put(f"/api/v1/personas/{persona['id']}", json={
            "display_name": "Updated Name"
        }, headers=auth_headers_a)
        assert resp.status_code == 200
        assert resp.json()["display_name"] == "Updated Name"

    def test_delete_persona(self, client, user_a, auth_headers_a):
        persona = create_persona(client, auth_headers_a)
        resp = client.delete(f"/api/v1/personas/{persona['id']}", headers=auth_headers_a)
        assert resp.status_code == 200
        assert resp.json()["success"] is True

        # Should no longer appear in list
        resp2 = client.get("/api/v1/personas/", headers=auth_headers_a)
        ids = [p["id"] for p in resp2.json()]
        assert persona["id"] not in ids

    def test_empty_persona_list_for_new_user(self, client, user_b, auth_headers_b):
        resp = client.get("/api/v1/personas/", headers=auth_headers_b)
        assert resp.status_code == 200
        assert resp.json() == []


class TestPersonaOwnership:
    """User B cannot modify User A's persona."""

    def test_user_b_cannot_update_user_a_persona(
        self, client, user_a, user_b, auth_headers_a, auth_headers_b
    ):
        persona = create_persona(client, auth_headers_a)
        resp = client.put(f"/api/v1/personas/{persona['id']}", json={
            "display_name": "Hijacked"
        }, headers=auth_headers_b)
        assert resp.status_code == 403

    def test_user_b_cannot_delete_user_a_persona(
        self, client, user_a, user_b, auth_headers_a, auth_headers_b
    ):
        persona = create_persona(client, auth_headers_a)
        resp = client.delete(f"/api/v1/personas/{persona['id']}", headers=auth_headers_b)
        assert resp.status_code == 403

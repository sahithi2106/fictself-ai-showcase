"""
test_pinned_memories.py — Section I: Pinned Memory CRUD
"""
import pytest


def setup_story(client, headers):
    resp = client.post("/api/v1/stories/", json={
        "title": "Memory Test Story",
        "genre": "Mystery",
        "tags": [],
    }, headers=headers)
    assert resp.status_code == 201
    return resp.json()


def create_memory(client, headers, story_id, title="Key Event", memory_type="plot_fact"):
    resp = client.post(f"/api/v1/stories/{story_id}/pinned-memories", json={
        "title": title,
        "content": "Something important happened here.",
        "memory_type": memory_type,
        "is_active": True,
        "source_type": "manual",
    }, headers=headers)
    assert resp.status_code == 201, f"Create memory failed: {resp.text}"
    return resp.json()


class TestPinnedMemoryCRUD:
    """Pinned Memory Create, Read, Update, Delete."""

    def test_create_pinned_memory(self, client, user_a, auth_headers_a):
        story = setup_story(client, auth_headers_a)
        memory = create_memory(client, auth_headers_a, story["id"])
        assert memory["title"] == "Key Event"
        assert memory["memory_type"] == "plot_fact"
        assert memory["is_active"] is True
        assert memory["story_id"] == story["id"]

    def test_list_pinned_memories(self, client, user_a, auth_headers_a):
        story = setup_story(client, auth_headers_a)
        create_memory(client, auth_headers_a, story["id"], title="M1")
        create_memory(client, auth_headers_a, story["id"], title="M2")
        resp = client.get(f"/api/v1/stories/{story['id']}/pinned-memories", headers=auth_headers_a)
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_get_specific_pinned_memory(self, client, user_a, auth_headers_a):
        story = setup_story(client, auth_headers_a)
        memory = create_memory(client, auth_headers_a, story["id"])
        resp = client.get(f"/api/v1/pinned-memories/{memory['id']}", headers=auth_headers_a)
        assert resp.status_code == 200
        assert resp.json()["id"] == memory["id"]

    def test_update_pinned_memory(self, client, user_a, auth_headers_a):
        story = setup_story(client, auth_headers_a)
        memory = create_memory(client, auth_headers_a, story["id"])
        resp = client.put(f"/api/v1/pinned-memories/{memory['id']}", json={
            "title": "Updated Event",
            "is_active": False,
        }, headers=auth_headers_a)
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Updated Event"
        assert data["is_active"] is False

    def test_delete_pinned_memory(self, client, user_a, auth_headers_a):
        story = setup_story(client, auth_headers_a)
        memory = create_memory(client, auth_headers_a, story["id"])
        resp = client.delete(f"/api/v1/pinned-memories/{memory['id']}", headers=auth_headers_a)
        assert resp.status_code == 200

        # Confirm it's gone from list
        resp2 = client.get(f"/api/v1/stories/{story['id']}/pinned-memories", headers=auth_headers_a)
        ids = [m["id"] for m in resp2.json()]
        assert memory["id"] not in ids

    def test_deleted_memory_is_no_longer_active(self, client, db, user_a, auth_headers_a):
        from app.models.pinned_memory import PinnedMemory

        story = setup_story(client, auth_headers_a)
        memory = create_memory(client, auth_headers_a, story["id"])
        memory_id = memory["id"]

        client.delete(f"/api/v1/pinned-memories/{memory_id}", headers=auth_headers_a)

        # Verify from DB that the row is actually deleted
        db.expire_all()
        row = db.query(PinnedMemory).filter(PinnedMemory.id == memory_id).first()
        assert row is None, "Deleted PinnedMemory still exists in DB!"

    def test_pinned_memory_schema_includes_chat_fields(self, client, user_a, auth_headers_a):
        """
        chat_message_id and chat_session_id must appear in API response schema.
        """
        story = setup_story(client, auth_headers_a)
        memory = create_memory(client, auth_headers_a, story["id"])
        # Both fields should be in the response (null is fine)
        assert "chat_message_id" in memory, "chat_message_id missing from response schema"
        assert "chat_session_id" in memory, "chat_session_id missing from response schema"


class TestPinnedMemoryOwnership:
    """User B cannot access User A's pinned memories."""

    def test_user_b_cannot_read_user_a_memories(
        self, client, user_a, user_b, auth_headers_a, auth_headers_b
    ):
        story = setup_story(client, auth_headers_a)
        memory = create_memory(client, auth_headers_a, story["id"])
        resp = client.get(f"/api/v1/pinned-memories/{memory['id']}", headers=auth_headers_b)
        assert resp.status_code == 403

    def test_user_b_cannot_delete_user_a_memory(
        self, client, user_a, user_b, auth_headers_a, auth_headers_b
    ):
        story = setup_story(client, auth_headers_a)
        memory = create_memory(client, auth_headers_a, story["id"])
        resp = client.delete(f"/api/v1/pinned-memories/{memory['id']}", headers=auth_headers_b)
        assert resp.status_code == 403

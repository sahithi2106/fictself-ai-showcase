"""
test_chat_sessions.py — Section H: Chat Session CRUD + FK safety
Note: We do NOT call create_chat_message via API because it triggers LLM calls.
We directly test session create/read/delete and verify FK integrity.
"""
import pytest


def create_story_and_character(client, db, user, headers):
    from app.models.character import Character

    # Create story
    resp = client.post("/api/v1/stories/", json={
        "title": "Chat Test Story",
        "genre": "Romance",
        "tags": [],
    }, headers=headers)
    assert resp.status_code == 201
    story = resp.json()

    # Create character directly in DB (no avatar upload needed)
    char = Character(story_id=story["id"], name="Chatbot Char")
    db.add(char)
    db.commit()
    db.refresh(char)

    return story, char


class TestChatSessionCRUD:
    """Create, retrieve, update, delete chat sessions."""

    def test_create_chat_session(self, client, db, user_a, auth_headers_a):
        story, char = create_story_and_character(client, db, user_a, auth_headers_a)
        resp = client.post("/api/v1/chat/sessions/", json={
            "story_id": str(story["id"]),
            "character_id": str(char.id),
            "title": "Session Alpha",
        }, headers=auth_headers_a)
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["story_id"] == story["id"]
        assert data["character_id"] == str(char.id)

    def test_get_chat_sessions_for_story(self, client, db, user_a, auth_headers_a):
        story, char = create_story_and_character(client, db, user_a, auth_headers_a)
        client.post("/api/v1/chat/sessions/", json={
            "story_id": str(story["id"]),
            "character_id": str(char.id),
            "title": "Session 1",
        }, headers=auth_headers_a)
        resp = client.get(f"/api/v1/chat/sessions/story/{story['id']}", headers=auth_headers_a)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_get_specific_chat_session(self, client, db, user_a, auth_headers_a):
        story, char = create_story_and_character(client, db, user_a, auth_headers_a)
        create_resp = client.post("/api/v1/chat/sessions/", json={
            "story_id": str(story["id"]),
            "character_id": str(char.id),
        }, headers=auth_headers_a)
        session_id = create_resp.json()["id"]

        resp = client.get(f"/api/v1/chat/sessions/{session_id}", headers=auth_headers_a)
        assert resp.status_code == 200
        assert resp.json()["id"] == session_id

    def test_delete_chat_session(self, client, db, user_a, auth_headers_a):
        story, char = create_story_and_character(client, db, user_a, auth_headers_a)
        create_resp = client.post("/api/v1/chat/sessions/", json={
            "story_id": str(story["id"]),
            "character_id": str(char.id),
        }, headers=auth_headers_a)
        session_id = create_resp.json()["id"]

        del_resp = client.delete(f"/api/v1/chat/sessions/{session_id}", headers=auth_headers_a)
        assert del_resp.status_code == 204

        # Confirm gone
        get_resp = client.get(f"/api/v1/chat/sessions/{session_id}", headers=auth_headers_a)
        assert get_resp.status_code == 404

    def test_read_messages_empty_session(self, client, db, user_a, auth_headers_a):
        story, char = create_story_and_character(client, db, user_a, auth_headers_a)
        create_resp = client.post("/api/v1/chat/sessions/", json={
            "story_id": str(story["id"]),
            "character_id": str(char.id),
        }, headers=auth_headers_a)
        session_id = create_resp.json()["id"]

        resp = client.get(f"/api/v1/chat/sessions/{session_id}/messages", headers=auth_headers_a)
        assert resp.status_code == 200
        assert resp.json() == []


class TestChatSessionOwnership:
    """User B cannot access User A's sessions."""

    def test_user_b_cannot_read_user_a_session(
        self, client, db, user_a, user_b, auth_headers_a, auth_headers_b
    ):
        story, char = create_story_and_character(client, db, user_a, auth_headers_a)
        create_resp = client.post("/api/v1/chat/sessions/", json={
            "story_id": str(story["id"]),
            "character_id": str(char.id),
        }, headers=auth_headers_a)
        session_id = create_resp.json()["id"]

        resp = client.get(f"/api/v1/chat/sessions/{session_id}", headers=auth_headers_b)
        assert resp.status_code == 403

    def test_user_b_cannot_delete_user_a_session(
        self, client, db, user_a, user_b, auth_headers_a, auth_headers_b
    ):
        story, char = create_story_and_character(client, db, user_a, auth_headers_a)
        create_resp = client.post("/api/v1/chat/sessions/", json={
            "story_id": str(story["id"]),
            "character_id": str(char.id),
        }, headers=auth_headers_a)
        session_id = create_resp.json()["id"]

        resp = client.delete(f"/api/v1/chat/sessions/{session_id}", headers=auth_headers_b)
        assert resp.status_code == 403


class TestChatSessionDeleteCascade:
    """
    REGRESSION: Deleting a chat session with messages
    must NOT cause FK constraint violations.
    Messages should cascade-delete with the session.
    """

    def test_delete_session_with_messages_no_fk_error(
        self, client, db, user_a, auth_headers_a
    ):
        from app.models.chat_message import ChatMessage

        story, char = create_story_and_character(client, db, user_a, auth_headers_a)
        create_resp = client.post("/api/v1/chat/sessions/", json={
            "story_id": str(story["id"]),
            "character_id": str(char.id),
        }, headers=auth_headers_a)
        session = create_resp.json()
        session_id = session["id"]

        # Insert messages directly into DB
        msg1 = ChatMessage(session_id=session_id, role="user", content="Hello character")
        msg2 = ChatMessage(session_id=session_id, role="assistant", content="Hello user")
        db.add_all([msg1, msg2])
        db.commit()

        # Delete session — should cascade messages without FK error
        try:
            del_resp = client.delete(f"/api/v1/chat/sessions/{session_id}", headers=auth_headers_a)
            assert del_resp.status_code == 204, f"Delete failed: {del_resp.text}"
        except Exception as e:
            pytest.fail(f"Deleting session with messages raised: {e}")

        # Messages must be gone
        remaining = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).count()
        assert remaining == 0, f"Messages not cascade-deleted! {remaining} remain."

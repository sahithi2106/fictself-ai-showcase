"""
test_chapters.py — Section D: Chapter CRUD + ON DELETE SET NULL regression
"""
import pytest


def create_story(client, headers):
    resp = client.post("/api/v1/stories/", json={
        "title": "Chapter Test Story",
        "genre": "Drama",
        "tags": [],
        "is_published": False,
    }, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def create_chapter(client, headers, story_id, num=1, title="Chapter One", status="draft"):
    resp = client.post(f"/api/v1/stories/{story_id}/chapters", json={
        "chapter_number": num,
        "title": title,
        "content": "Some chapter content.",
        "status": status,
        "word_count": 4,
    }, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


class TestChapterCRUD:
    """Chapter Create, Read, Update, Delete."""

    def test_create_chapter(self, client, user_a, auth_headers_a):
        story = create_story(client, auth_headers_a)
        chapter = create_chapter(client, auth_headers_a, story["id"])
        assert chapter["title"] == "Chapter One"
        assert chapter["status"] == "draft"

    def test_get_chapter(self, client, user_a, auth_headers_a):
        story = create_story(client, auth_headers_a)
        chapter = create_chapter(client, auth_headers_a, story["id"])
        resp = client.get(f"/api/v1/chapters/{chapter['id']}", headers=auth_headers_a)
        assert resp.status_code == 200
        assert resp.json()["id"] == chapter["id"]

    def test_list_chapters_for_story(self, client, user_a, auth_headers_a):
        story = create_story(client, auth_headers_a)
        create_chapter(client, auth_headers_a, story["id"], num=1, title="Ch1")
        create_chapter(client, auth_headers_a, story["id"], num=2, title="Ch2")
        resp = client.get(f"/api/v1/stories/{story['id']}/chapters", headers=auth_headers_a)
        assert resp.status_code == 200
        chapters = resp.json()
        assert len(chapters) == 2

    def test_update_chapter_title_and_content(self, client, user_a, auth_headers_a):
        story = create_story(client, auth_headers_a)
        chapter = create_chapter(client, auth_headers_a, story["id"])
        resp = client.put(f"/api/v1/chapters/{chapter['id']}", json={
            "title": "Renamed Chapter",
            "content": "Updated body.",
        }, headers=auth_headers_a)
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Renamed Chapter"

    def test_publish_chapter(self, client, user_a, auth_headers_a):
        story = create_story(client, auth_headers_a)
        chapter = create_chapter(client, auth_headers_a, story["id"])
        resp = client.put(f"/api/v1/chapters/{chapter['id']}", json={
            "status": "published"
        }, headers=auth_headers_a)
        assert resp.status_code == 200
        assert resp.json()["status"] == "published"

    def test_revert_chapter_to_draft(self, client, user_a, auth_headers_a):
        story = create_story(client, auth_headers_a)
        chapter = create_chapter(client, auth_headers_a, story["id"], status="published")
        resp = client.put(f"/api/v1/chapters/{chapter['id']}", json={
            "status": "draft"
        }, headers=auth_headers_a)
        assert resp.status_code == 200
        assert resp.json()["status"] == "draft"

    def test_delete_chapter(self, client, user_a, auth_headers_a):
        story = create_story(client, auth_headers_a)
        chapter = create_chapter(client, auth_headers_a, story["id"])
        resp = client.delete(f"/api/v1/chapters/{chapter['id']}", headers=auth_headers_a)
        assert resp.status_code == 204

        # Verify gone
        resp2 = client.get(f"/api/v1/chapters/{chapter['id']}", headers=auth_headers_a)
        assert resp2.status_code == 404

    def test_nonowner_cannot_delete_chapter(
        self, client, user_a, user_b, auth_headers_a, auth_headers_b
    ):
        story = create_story(client, auth_headers_a)
        chapter = create_chapter(client, auth_headers_a, story["id"])
        resp = client.delete(f"/api/v1/chapters/{chapter['id']}", headers=auth_headers_b)
        assert resp.status_code == 403


class TestChapterDeleteChatSessionNullify:
    """
    CRITICAL REGRESSION TEST:
    Create: Story → Chapter → ChatSession (active_chapter_id = chapter.id)
    Delete: Chapter
    Expected: ChatSession.active_chapter_id becomes NULL (ON DELETE SET NULL)
              No FK violation. No orphaned reference.
    """

    def test_delete_chapter_sets_chat_session_active_chapter_to_null(
        self, client, db, user_a, auth_headers_a
    ):
        from app.models.character import Character
        from app.models.chat_session import ChatSession

        # 1. Create story via API
        story = create_story(client, auth_headers_a)
        story_id = story["id"]

        # 2. Create chapter via API
        chapter = create_chapter(client, auth_headers_a, story_id)
        chapter_id = chapter["id"]

        # 3. Create a character (needed for ChatSession FK)
        char = Character(story_id=story_id, name="TestChar")
        db.add(char)
        db.commit()
        db.refresh(char)

        # 4. Create chat session with active_chapter_id pointing to chapter
        session = ChatSession(
            user_id=user_a.id,
            story_id=story_id,
            character_id=char.id,
            active_chapter_id=chapter_id,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        session_id = session.id

        # 5. Delete chapter via API — must NOT raise FK error
        resp = client.delete(f"/api/v1/chapters/{chapter_id}", headers=auth_headers_a)
        assert resp.status_code == 204, f"Delete chapter failed: {resp.text}"

        # 6. Reload session and verify active_chapter_id is NULL
        db.expire_all()
        updated_session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        assert updated_session is not None, "ChatSession was unexpectedly deleted!"
        assert updated_session.active_chapter_id is None, \
            f"active_chapter_id was NOT set to NULL after chapter deletion! " \
            f"Got: {updated_session.active_chapter_id}"

    def test_delete_chapter_no_fk_violation(self, client, db, user_a, auth_headers_a):
        """Simpler test: chapter with no chat session should delete cleanly."""
        story = create_story(client, auth_headers_a)
        chapter = create_chapter(client, auth_headers_a, story["id"])

        # Should not throw any integrity error
        try:
            resp = client.delete(f"/api/v1/chapters/{chapter['id']}", headers=auth_headers_a)
            assert resp.status_code == 204
        except Exception as e:
            pytest.fail(f"Chapter deletion raised an exception: {e}")

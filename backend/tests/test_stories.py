"""
test_stories.py — Section C: Story CRUD + Ownership enforcement
"""
import pytest


STORY_PAYLOAD = {
    "title": "Test Story Alpha",
    "description": "A test story",
    "genre": "Fantasy",
    "tags": ["magic", "adventure"],
    "is_published": False,
    "status": "draft",
}


def create_story(client, headers, payload=None):
    p = payload or STORY_PAYLOAD
    resp = client.post("/api/v1/stories/", json=p, headers=headers)
    assert resp.status_code == 201, f"Create story failed: {resp.text}"
    return resp.json()


class TestStoryCRUD:
    """Story Create, Read, List, Update, Delete."""

    def test_create_story(self, client, user_a, auth_headers_a):
        story = create_story(client, auth_headers_a)
        assert story["title"] == "Test Story Alpha"
        assert story["is_published"] is False
        assert str(story["author_id"]) == str(user_a.id)

    def test_list_stories_returns_user_stories(self, client, user_a, auth_headers_a):
        create_story(client, auth_headers_a)
        resp = client.get("/api/v1/stories/", headers=auth_headers_a)
        assert resp.status_code == 200
        stories = resp.json()
        assert len(stories) >= 1
        assert stories[0]["title"] == "Test Story Alpha"

    def test_get_story_by_id(self, client, user_a, auth_headers_a):
        story = create_story(client, auth_headers_a)
        resp = client.get(f"/api/v1/stories/{story['id']}", headers=auth_headers_a)
        assert resp.status_code == 200
        assert resp.json()["id"] == story["id"]

    def test_get_nonexistent_story_returns_404(self, client, user_a, auth_headers_a):
        import uuid
        resp = client.get(f"/api/v1/stories/{uuid.uuid4()}", headers=auth_headers_a)
        assert resp.status_code == 404

    def test_update_story(self, client, user_a, auth_headers_a):
        story = create_story(client, auth_headers_a)
        resp = client.put(
            f"/api/v1/stories/{story['id']}",
            json={"title": "Updated Title"},
            headers=auth_headers_a,
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated Title"

    def test_delete_story(self, client, user_a, auth_headers_a):
        story = create_story(client, auth_headers_a)
        resp = client.delete(f"/api/v1/stories/{story['id']}", headers=auth_headers_a)
        assert resp.status_code == 200

        # Verify it's gone
        resp2 = client.get(f"/api/v1/stories/{story['id']}", headers=auth_headers_a)
        assert resp2.status_code == 404

    def test_tag_validation_max_10(self, client, user_a, auth_headers_a):
        resp = client.post("/api/v1/stories/", json={
            **STORY_PAYLOAD,
            "tags": ["t1","t2","t3","t4","t5","t6","t7","t8","t9","t10","t11"]
        }, headers=auth_headers_a)
        assert resp.status_code == 400

    def test_genre_length_validation(self, client, user_a, auth_headers_a):
        resp = client.post("/api/v1/stories/", json={
            **STORY_PAYLOAD,
            "genre": "A" * 101
        }, headers=auth_headers_a)
        assert resp.status_code == 400


class TestStoryOwnership:
    """Ensure non-owner cannot modify another user's story."""

    def test_user_b_cannot_update_user_a_story(
        self, client, user_a, user_b, auth_headers_a, auth_headers_b
    ):
        story = create_story(client, auth_headers_a)
        resp = client.put(
            f"/api/v1/stories/{story['id']}",
            json={"title": "Hacked Title"},
            headers=auth_headers_b,
        )
        assert resp.status_code == 403

    def test_user_b_cannot_delete_user_a_story(
        self, client, user_a, user_b, auth_headers_a, auth_headers_b
    ):
        story = create_story(client, auth_headers_a)
        resp = client.delete(f"/api/v1/stories/{story['id']}", headers=auth_headers_b)
        assert resp.status_code == 403

    def test_user_b_cannot_read_user_a_unpublished_story(
        self, client, user_a, user_b, auth_headers_a, auth_headers_b
    ):
        story = create_story(client, auth_headers_a)  # is_published=False
        resp = client.get(f"/api/v1/stories/{story['id']}", headers=auth_headers_b)
        assert resp.status_code == 403


class TestStoryStatusSafety:
    """
    REGRESSION: Changing story publish/archive state must NOT
    forcibly reset all chapter statuses to draft.
    """

    def test_archiving_story_does_not_touch_chapter_statuses(
        self, client, db, user_a, auth_headers_a
    ):
        from app.models.chapter import Chapter
        import uuid

        # Create story
        story = create_story(client, auth_headers_a)
        story_id = story["id"]

        # Create chapters directly in DB with mixed statuses
        ch1 = Chapter(story_id=story_id, chapter_number=1, title="Ch1", status="published")
        ch2 = Chapter(story_id=story_id, chapter_number=2, title="Ch2", status="draft")
        db.add_all([ch1, ch2])
        db.commit()

        # Archive the story
        resp = client.put(
            f"/api/v1/stories/{story_id}",
            json={"is_archived": True},
            headers=auth_headers_a,
        )
        assert resp.status_code == 200

        # Reload chapters and confirm statuses unchanged
        db.expire_all()
        ch1_db = db.query(Chapter).filter(Chapter.id == ch1.id).first()
        ch2_db = db.query(Chapter).filter(Chapter.id == ch2.id).first()
        assert ch1_db.status == "published", "Chapter 1 was incorrectly forced to draft!"
        assert ch2_db.status == "draft"

    def test_unpublishing_story_does_not_touch_chapter_statuses(
        self, client, db, user_a, auth_headers_a
    ):
        from app.models.chapter import Chapter

        story = create_story(client, auth_headers_a)
        story_id = story["id"]

        ch1 = Chapter(story_id=story_id, chapter_number=1, title="PubCh", status="published")
        db.add(ch1)
        db.commit()

        # Toggle is_published to False
        resp = client.put(
            f"/api/v1/stories/{story_id}",
            json={"is_published": False},
            headers=auth_headers_a,
        )
        assert resp.status_code == 200

        db.expire_all()
        ch1_db = db.query(Chapter).filter(Chapter.id == ch1.id).first()
        # Chapter status must NOT have been changed by this action
        assert ch1_db.status == "published", \
            "Story un-publish incorrectly reset chapter status to draft!"

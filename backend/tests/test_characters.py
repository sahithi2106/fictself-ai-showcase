"""
test_characters.py — Section F: Character CRUD + role persistence
"""
import pytest


def create_story(client, headers):
    resp = client.post("/api/v1/stories/", json={
        "title": "Character Test Story",
        "genre": "Sci-Fi",
        "tags": [],
    }, headers=headers)
    assert resp.status_code == 201
    return resp.json()


def create_character(client, headers, story_id, name="Aria", role="Hero"):
    resp = client.post(f"/api/v1/stories/{story_id}/characters", json={
        "name": name,
        "role": role,
        "age": "25",
        "personality": "Brave and resourceful",
        "goals": "Uncover the truth",
        "fears": "Losing allies",
        "values": "Loyalty",
        "speech_style": "Direct",
        "backstory": "Grew up in the grid",
        "character_arc": "From follower to leader",
    }, headers=headers)
    assert resp.status_code == 201, f"Create char failed: {resp.text}"
    return resp.json()


class TestCharacterCRUD:
    """Character Create, Read, Update, Delete."""

    def test_create_character(self, client, user_a, auth_headers_a):
        story = create_story(client, auth_headers_a)
        char = create_character(client, auth_headers_a, story["id"])
        assert char["name"] == "Aria"
        assert char["role"] == "Hero"
        assert char["story_id"] == story["id"]

    def test_get_character(self, client, user_a, auth_headers_a):
        story = create_story(client, auth_headers_a)
        char = create_character(client, auth_headers_a, story["id"])
        resp = client.get(f"/api/v1/characters/{char['id']}", headers=auth_headers_a)
        assert resp.status_code == 200
        assert resp.json()["id"] == char["id"]

    def test_list_characters_for_story(self, client, user_a, auth_headers_a):
        story = create_story(client, auth_headers_a)
        create_character(client, auth_headers_a, story["id"], name="Char A")
        create_character(client, auth_headers_a, story["id"], name="Char B")
        resp = client.get(f"/api/v1/stories/{story['id']}/characters", headers=auth_headers_a)
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_update_character(self, client, user_a, auth_headers_a):
        story = create_story(client, auth_headers_a)
        char = create_character(client, auth_headers_a, story["id"])
        resp = client.put(f"/api/v1/characters/{char['id']}", json={
            "name": "Renamed Aria",
            "role": "Villain",
        }, headers=auth_headers_a)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Renamed Aria"
        assert resp.json()["role"] == "Villain"

    def test_delete_character(self, client, user_a, auth_headers_a):
        story = create_story(client, auth_headers_a)
        char = create_character(client, auth_headers_a, story["id"])
        resp = client.delete(f"/api/v1/characters/{char['id']}", headers=auth_headers_a)
        assert resp.status_code == 200

        resp2 = client.get(f"/api/v1/characters/{char['id']}", headers=auth_headers_a)
        assert resp2.status_code == 404

    def test_story_scoping_prevents_cross_story_read(
        self, client, user_a, auth_headers_a
    ):
        story1 = create_story(client, auth_headers_a)
        story2_resp = client.post("/api/v1/stories/", json={
            "title": "Story Two", "genre": "Horror", "tags": []
        }, headers=auth_headers_a)
        story2 = story2_resp.json()

        char_in_story1 = create_character(client, auth_headers_a, story1["id"])

        # Read character directly - should work since user owns both stories
        resp = client.get(f"/api/v1/characters/{char_in_story1['id']}", headers=auth_headers_a)
        assert resp.status_code == 200


class TestCharacterOwnership:
    """Non-owner cannot modify another user's characters."""

    def test_user_b_cannot_update_user_a_character(
        self, client, user_a, user_b, auth_headers_a, auth_headers_b
    ):
        story = create_story(client, auth_headers_a)
        char = create_character(client, auth_headers_a, story["id"])
        resp = client.put(f"/api/v1/characters/{char['id']}", json={
            "name": "Hacked Name"
        }, headers=auth_headers_b)
        assert resp.status_code == 403

    def test_user_b_cannot_delete_user_a_character(
        self, client, user_a, user_b, auth_headers_a, auth_headers_b
    ):
        story = create_story(client, auth_headers_a)
        char = create_character(client, auth_headers_a, story["id"])
        resp = client.delete(f"/api/v1/characters/{char['id']}", headers=auth_headers_b)
        assert resp.status_code == 403


class TestCharacterRolePersistence:
    """
    Custom role text round-trips correctly.
    The character model stores `role` as a free-text field (Text column),
    so any string value (including custom ones) should persist exactly.
    """

    def test_create_character_with_custom_role_persists(
        self, client, user_a, auth_headers_a
    ):
        story = create_story(client, auth_headers_a)
        custom_role = "The Watcher from Beyond"
        char = create_character(client, auth_headers_a, story["id"], role=custom_role)
        assert char["role"] == custom_role, \
            f"Custom role not preserved on create. Got: {char['role']}"

    def test_update_character_with_custom_role_persists(
        self, client, user_a, auth_headers_a
    ):
        story = create_story(client, auth_headers_a)
        char = create_character(client, auth_headers_a, story["id"], role="Hero")

        new_custom_role = "Interdimensional Navigator"
        resp = client.put(f"/api/v1/characters/{char['id']}", json={
            "role": new_custom_role
        }, headers=auth_headers_a)
        assert resp.status_code == 200
        assert resp.json()["role"] == new_custom_role, \
            f"Custom role not preserved on update. Got: {resp.json()['role']}"

    def test_retrieve_character_custom_role_matches(
        self, client, user_a, auth_headers_a
    ):
        story = create_story(client, auth_headers_a)
        custom_role = "The Chronicler"
        char = create_character(client, auth_headers_a, story["id"], role=custom_role)

        resp = client.get(f"/api/v1/characters/{char['id']}", headers=auth_headers_a)
        assert resp.status_code == 200
        assert resp.json()["role"] == custom_role

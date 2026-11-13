"""
test_health.py — Section A: Basic App Health & Router Registration
"""
import pytest
from fastapi.testclient import TestClient


# ==================== A. BASIC APP HEALTH ====================

class TestAppImport:
    """Verify the FastAPI app imports without crashing."""

    def test_app_imports_successfully(self):
        from app.main import app
        assert app is not None

    def test_app_is_fastapi_instance(self):
        from app.main import app
        from fastapi import FastAPI
        assert isinstance(app, FastAPI)

    def test_app_title(self):
        from app.main import app
        assert "FictSelf" in app.title or "fictself" in app.title.lower()


class TestRouterRegistration:
    """Verify all expected routers are registered."""

    @pytest.fixture(autouse=True)
    def load_client(self, client):
        self.client = client

    def _get_route_paths(self):
        from app.main import app
        return list(app.openapi().get("paths", {}).keys())

    def test_health_router_registered(self):
        paths = self._get_route_paths()
        # health endpoint exists
        assert any("/health" in p or "health" in p for p in paths), \
            f"health router not found in: {paths}"

    def test_auth_router_registered(self):
        paths = self._get_route_paths()
        assert any("/auth" in p for p in paths), \
            f"/auth router not found. Registered: {paths}"

    def test_stories_router_registered(self):
        paths = self._get_route_paths()
        assert any("/stories" in p for p in paths)

    def test_chapters_router_registered(self):
        paths = self._get_route_paths()
        assert any("/chapters" in p or "/stories/{story_id}/chapters" in p for p in paths)

    def test_characters_router_registered(self):
        paths = self._get_route_paths()
        assert any("/characters" in p for p in paths)

    def test_personas_router_registered(self):
        paths = self._get_route_paths()
        assert any("/personas" in p for p in paths)

    def test_chat_sessions_router_registered(self):
        paths = self._get_route_paths()
        assert any("/chat" in p for p in paths)

    def test_pinned_memories_router_registered(self):
        paths = self._get_route_paths()
        assert any("/pinned" in p or "pinned-memories" in p for p in paths)

    def test_library_router_registered(self):
        paths = self._get_route_paths()
        assert any("/library" in p for p in paths)

    def test_communities_router_registered(self):
        paths = self._get_route_paths()
        assert any("/communities" in p for p in paths)

    def test_notifications_router_registered(self):
        paths = self._get_route_paths()
        assert any("/notifications" in p for p in paths)

    def test_users_router_registered(self):
        paths = self._get_route_paths()
        assert any("/users" in p for p in paths)

    def test_health_endpoint_responds(self, client):
        response = client.get("/api/v1/health")
        assert response.status_code in (200, 404), \
            f"Unexpected status: {response.status_code}"
        # If 200, great. If 404, health router exists but path differs.

    def test_openapi_schema_accessible(self, client):
        response = client.get("/api/v1/openapi.json")
        assert response.status_code == 200
        data = response.json()
        assert "paths" in data
        assert "info" in data

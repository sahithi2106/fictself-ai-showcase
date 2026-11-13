from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class LiveDraftContextCreate(BaseModel):
    """
    Payload for POST /chapters/{chapter_id}/live-draft-context.
    chapter_id, story_id, and user_id are injected by the endpoint — not supplied
    by the client, so they are excluded from this schema.
    """
    content_snapshot: Optional[str] = None
    last_n_paragraphs: Optional[str] = None
    active_characters: Optional[List[UUID]] = None


class LiveDraftContextUpdate(BaseModel):
    """
    Payload for PUT /chapters/{chapter_id}/live-draft-context.
    All fields are optional — only supplied fields are updated.
    Suitable for autosave: send only content_snapshot on every keystroke.
    """
    content_snapshot: Optional[str] = None
    last_n_paragraphs: Optional[str] = None
    active_characters: Optional[List[UUID]] = None


class LiveDraftContextUpsert(BaseModel):
    """
    Payload for PUT /chapters/{chapter_id}/live-draft-context/autosave.
    Identical shape to Update — kept as a named alias for Swagger clarity.
    """
    content_snapshot: Optional[str] = None
    last_n_paragraphs: Optional[str] = None
    active_characters: Optional[List[UUID]] = None


class LiveDraftContextResponse(BaseModel):
    """Full API response shape, serialised from the ORM model."""
    id: UUID
    chapter_id: UUID
    story_id: UUID
    user_id: UUID
    content_snapshot: Optional[str] = None
    last_n_paragraphs: Optional[str] = None
    active_characters: Optional[Any] = None   # JSONB — list of UUID strings at rest
    session_started_at: datetime
    last_saved_at: datetime

    model_config = ConfigDict(from_attributes=True)

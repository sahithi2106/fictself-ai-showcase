from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class ChatSessionCreate(BaseModel):
    story_id: UUID
    character_id: UUID
    active_chapter_id: Optional[UUID] = None
    persona_id: Optional[UUID] = None
    title: Optional[str] = None

class ChatSessionUpdate(BaseModel):
    active_chapter_id: Optional[UUID] = None
    status: Optional[str] = None
    summary: Optional[str] = None
    persona_id: Optional[UUID] = None
    title: Optional[str] = None

class ChatSessionResponse(BaseModel):
    id: UUID
    user_id: UUID
    story_id: UUID
    character_id: UUID
    active_chapter_id: Optional[UUID] = None
    status: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    summary: Optional[str] = None
    persona_id: Optional[UUID] = None
    title: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

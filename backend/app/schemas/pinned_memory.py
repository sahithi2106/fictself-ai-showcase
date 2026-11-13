from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

class PinnedMemoryBase(BaseModel):
    title: str
    content: str
    memory_type: str
    character_id: Optional[UUID] = None
    source_chapter_id: Optional[UUID] = None
    chat_message_id: Optional[UUID] = None
    chat_session_id: Optional[UUID] = None
    is_active: bool = True
    source_type: str = "manual"

class PinnedMemoryCreate(PinnedMemoryBase):
    pass

class PinnedMemoryUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    memory_type: Optional[str] = None
    character_id: Optional[UUID] = None
    source_chapter_id: Optional[UUID] = None
    is_active: Optional[bool] = None

class PinnedMemoryResponse(PinnedMemoryBase):
    id: UUID
    story_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

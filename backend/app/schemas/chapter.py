from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class ChapterBase(BaseModel):
    chapter_number: int
    title: str
    content: Optional[str] = None
    summary: Optional[str] = None
    status: Optional[str] = "draft"
    is_pinned: Optional[bool] = False
    word_count: Optional[int] = 0

class ChapterCreate(ChapterBase):
    pass

class ChapterUpdate(BaseModel):
    chapter_number: Optional[int] = None
    title: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    status: Optional[str] = None
    is_pinned: Optional[bool] = None
    word_count: Optional[int] = None

class ChapterResponse(ChapterBase):
    id: UUID
    story_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

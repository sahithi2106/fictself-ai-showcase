from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class StoryBase(BaseModel):
    title: str
    description: Optional[str] = None
    tagline: Optional[str] = None
    cover_url: Optional[str] = None
    genre: Optional[str] = None
    subgenre: Optional[str] = None
    status: Optional[str] = "draft"
    language: Optional[str] = "English"
    tags: Optional[List[str]] = []
    is_published: Optional[bool] = False
    is_archived: Optional[bool] = False
    word_count: Optional[int] = 0
    character_bible: Optional[str] = None

class StoryCreate(StoryBase):
    pass

class StoryUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    tagline: Optional[str] = None
    cover_url: Optional[str] = None
    genre: Optional[str] = None
    subgenre: Optional[str] = None
    status: Optional[str] = None
    language: Optional[str] = None
    tags: Optional[List[str]] = None
    is_published: Optional[bool] = None
    is_archived: Optional[bool] = None
    word_count: Optional[int] = None
    character_bible: Optional[str] = None

class StoryResponse(StoryBase):
    id: UUID
    author_id: UUID
    author_username: Optional[str] = None
    author_display_name: Optional[str] = None
    published_count: Optional[int] = 0
    draft_count: Optional[int] = 0
    views: Optional[int] = 0
    likes: Optional[int] = 0
    total_views: Optional[int] = 0
    total_votes: Optional[int] = 0
    archived_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

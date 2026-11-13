from typing import Optional, List
from pydantic import BaseModel, ConfigDict
import uuid
from datetime import datetime

class ReadingProgressBase(BaseModel):
    story_id: uuid.UUID
    chapter_id: Optional[uuid.UUID] = None
    chapter_sequence: int = 1
    total_chapters: int = 1
    progress_percent: int = 0
    scroll_y: int = 0

class ReadingProgressCreate(ReadingProgressBase):
    pass

class ReadingProgressUpdate(BaseModel):
    chapter_id: Optional[uuid.UUID] = None
    chapter_sequence: Optional[int] = None
    total_chapters: Optional[int] = None
    progress_percent: Optional[int] = None
    scroll_y: Optional[int] = None

class ReadingProgressResponse(ReadingProgressBase):
    id: uuid.UUID
    user_id: uuid.UUID
    last_read_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ReadingListBase(BaseModel):
    name: str
    description: Optional[str] = None
    cover_url: Optional[str] = None
    is_public: bool = True

class ReadingListCreate(ReadingListBase):
    pass

class ReadingListResponse(ReadingListBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    items: List[dict] = []
    model_config = ConfigDict(from_attributes=True)

class SavedStoryCreate(BaseModel):
    story_id: uuid.UUID
    list_type: str # 'saved', 'read_later', 'favorited'

class SavedStoryResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    story_id: uuid.UUID
    list_type: str
    added_at: datetime
    model_config = ConfigDict(from_attributes=True)

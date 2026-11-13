from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class CanonMemoryBase(BaseModel):
    title: str
    description: str
    importance: int = Field(ge=1, le=10, description="Importance of the memory from 1 to 10")
    chapter_id: Optional[UUID] = None
    character_ids: Optional[List[UUID]] = None  # Characters who witnessed this event

class CanonMemoryCreate(CanonMemoryBase):
    pass

class CanonMemoryUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    importance: Optional[int] = Field(None, ge=1, le=10, description="Importance of the memory from 1 to 10")
    chapter_id: Optional[UUID] = None
    character_ids: Optional[List[UUID]] = None

class CanonMemoryResponse(CanonMemoryBase):
    id: UUID
    story_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

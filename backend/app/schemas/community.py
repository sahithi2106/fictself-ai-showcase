from typing import Optional, List
from pydantic import BaseModel, ConfigDict
import uuid
from datetime import datetime

class CommunityBase(BaseModel):
    name: str
    description: Optional[str] = None
    cover_url: Optional[str] = None
    is_private: bool = False
    tags: List[str] = []

class CommunityCreate(CommunityBase):
    pass

class CommunityUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    is_private: Optional[bool] = None
    tags: Optional[List[str]] = None

class CommunityResponse(CommunityBase):
    id: uuid.UUID
    creator_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    member_count: int = 0
    is_joined: bool = False

    model_config = ConfigDict(from_attributes=True)

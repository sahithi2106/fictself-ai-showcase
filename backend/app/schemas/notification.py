from typing import Optional, List
from pydantic import BaseModel, ConfigDict
import uuid
from datetime import datetime

class NotificationBase(BaseModel):
    type: str
    title: str
    message: str
    story_id: Optional[uuid.UUID] = None
    chapter_id: Optional[uuid.UUID] = None
    actor_id: Optional[uuid.UUID] = None
    post_id: Optional[uuid.UUID] = None
    community_id: Optional[uuid.UUID] = None

class NotificationCreate(NotificationBase):
    user_id: uuid.UUID

class NotificationResponse(NotificationBase):
    id: uuid.UUID
    user_id: uuid.UUID
    is_read: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

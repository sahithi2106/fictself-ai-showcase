from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
import uuid
from datetime import datetime

class CommunityPostCommentBase(BaseModel):
    content: str

class CommunityPostCommentCreate(CommunityPostCommentBase):
    parent_comment_id: Optional[uuid.UUID] = None

class CommunityPostCommentResponse(CommunityPostCommentBase):
    id: uuid.UUID
    post_id: uuid.UUID
    author_id: uuid.UUID
    author_name: str = ""
    parent_comment_id: Optional[uuid.UUID] = None
    created_at: datetime
    replies: List["CommunityPostCommentResponse"] = []
    model_config = ConfigDict(from_attributes=True)

class CommunityPostBase(BaseModel):
    title: str
    content: str
    image_url: Optional[str] = None
    poll_data: Optional[Dict[str, Any]] = None

class CommunityPostCreate(CommunityPostBase):
    pass

class CommunityPostResponse(CommunityPostBase):
    id: uuid.UUID
    community_id: uuid.UUID
    author_id: uuid.UUID
    author_name: str = ""
    likes_count: int = 0
    is_liked: bool = False
    comments_count: int = 0
    created_at: datetime
    updated_at: datetime
    comments: List[CommunityPostCommentResponse] = []
    model_config = ConfigDict(from_attributes=True)

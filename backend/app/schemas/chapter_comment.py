import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, List

class ChapterCommentBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)

class ChapterCommentCreate(ChapterCommentBase):
    pass

class ChapterCommentReplyCreate(ChapterCommentBase):
    pass

class ChapterCommentUpdate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)

class CommentAuthor(BaseModel):
    id: uuid.UUID
    username: str
    display_name: Optional[str] = None
    profile_image: Optional[str] = None

class ChapterCommentResponse(ChapterCommentBase):
    id: uuid.UUID
    chapter_id: uuid.UUID
    user_id: uuid.UUID
    parent_comment_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime
    is_deleted: bool
    
    # We will derive this flag dynamically or rely on updated_at > created_at
    is_edited: bool = False

    user: CommentAuthor

    class Config:
        from_attributes = True

class ChapterCommentThreadResponse(ChapterCommentResponse):
    replies: List["ChapterCommentResponse"] = []

ChapterCommentThreadResponse.model_rebuild()

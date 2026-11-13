from typing import Optional, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class ChatMessageCreate(BaseModel):
    role: str   # "user" | "character" | "system"
    content: str
    is_system: Optional[bool] = False
    trigger_event: Optional[str] = None

class ChatMessageResponse(BaseModel):
    id: UUID
    session_id: UUID
    role: str
    content: str
    memory_context_snapshot: Optional[Any] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    is_system: bool
    trigger_event: Optional[str] = None
    created_at: datetime
    is_pinned: Optional[bool] = False

    model_config = ConfigDict(from_attributes=True)

class ChatMessageEdit(BaseModel):
    content: str
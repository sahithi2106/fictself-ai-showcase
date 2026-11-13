from typing import Optional, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class MemoryProcessingJobResponse(BaseModel):
    id: UUID
    chapter_id: UUID
    story_id: UUID
    status: str
    error_message: Optional[str] = None
    raw_extractions: Optional[Any] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

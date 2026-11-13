from typing import Optional, Any, Literal
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

SUGGESTION_TYPES = [
    "canon_fact", "pinned_fact", "emotional_memory",
    "relationship_update", "world_rule", "secret", "object_fact"
]

class WriterReviewQueueItemCreate(BaseModel):
    title: str
    content: str
    suggestion_type: str                            # See SUGGESTION_TYPES
    source_excerpt: Optional[str] = None
    source_chapter_id: Optional[UUID] = None
    proposed_target_label: Optional[str] = None
    proposed_target_type: Optional[str] = None      # character | object | event | location | secret | self
    character_id: Optional[UUID] = None             # Required when suggestion_type == "emotional_memory"
    importance_score: float = Field(default=0.5, ge=0.0, le=1.0)
    created_by: str = "manual_writer"               # manual_writer | ai_extraction
    # Legacy / AI pipeline fields
    memory_type: Optional[str] = None
    candidate_data: Optional[dict] = None
    job_id: Optional[UUID] = None

class WriterReviewQueueItemUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    suggestion_type: Optional[str] = None
    source_excerpt: Optional[str] = None
    source_chapter_id: Optional[UUID] = None
    proposed_target_label: Optional[str] = None
    proposed_target_type: Optional[str] = None
    character_id: Optional[UUID] = None
    importance_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    candidate_data: Optional[dict] = None

class WriterReviewQueueItemResponse(BaseModel):
    id: UUID
    story_id: UUID
    job_id: Optional[UUID] = None
    character_id: Optional[UUID] = None
    source_chapter_id: Optional[UUID] = None
    title: Optional[str] = None
    content: Optional[str] = None
    suggestion_type: Optional[str] = None
    source_excerpt: Optional[str] = None
    proposed_target_label: Optional[str] = None
    proposed_target_type: Optional[str] = None
    created_by: str = "manual_writer"
    memory_type: Optional[str] = None
    candidate_data: Optional[Any] = None
    importance_score: float
    status: str
    reviewed_at: Optional[datetime] = None
    committed_memory_id: Optional[UUID] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

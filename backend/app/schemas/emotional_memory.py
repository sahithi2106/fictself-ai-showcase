from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

VALID_TRIGGER_TYPES = [
    "abandonment", "betrayal", "loss", "conflict",
    "rejection", "pride", "love", "trauma", "other"
]

VALID_LONG_TERM_PATTERNS = [
    "avoidance", "clinginess", "rage_response", "emotional_shutdown",
    "protectiveness", "guilt_seeking", "hypervigilance", "other"
]

class EmotionalMemoryBase(BaseModel):
    primary_emotion: str
    emotional_intensity: int = Field(ge=1, le=10)
    memory_content: Optional[str] = None
    target_type: Optional[str] = None
    target_label: Optional[str] = None
    trigger_description: Optional[str] = None
    trigger_type: Optional[str] = None
    long_term_pattern: Optional[str] = None
    unresolved: bool = True
    resolution_notes: Optional[str] = None
    surface_probability: float = Field(default=0.5, ge=0.0, le=1.0)
    is_active: bool = True
    source_canon_memory_id: Optional[UUID] = None
    source_chapter_id: Optional[UUID] = None

class EmotionalMemoryCreate(EmotionalMemoryBase):
    pass

class EmotionalMemoryUpdate(BaseModel):
    primary_emotion: Optional[str] = None
    emotional_intensity: Optional[int] = Field(None, ge=1, le=10)
    memory_content: Optional[str] = None
    target_type: Optional[str] = None
    target_label: Optional[str] = None
    trigger_description: Optional[str] = None
    trigger_type: Optional[str] = None
    long_term_pattern: Optional[str] = None
    unresolved: Optional[bool] = None
    resolution_notes: Optional[str] = None
    surface_probability: Optional[float] = Field(None, ge=0.0, le=1.0)
    is_active: Optional[bool] = None
    source_canon_memory_id: Optional[UUID] = None
    source_chapter_id: Optional[UUID] = None

class EmotionalMemoryResponse(EmotionalMemoryBase):
    id: UUID
    character_id: UUID
    story_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

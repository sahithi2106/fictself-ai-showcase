from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class CharacterBase(BaseModel):
    name: str
    # Visible identity
    role: Optional[str] = None
    age: Optional[str] = None
    avatar_url: Optional[str] = None
    # Core narrative fields
    personality: Optional[str] = None
    goals: Optional[str] = None
    fears: Optional[str] = None
    values: Optional[str] = None
    speech_style: Optional[str] = None
    backstory: Optional[str] = None
    relationships: Optional[str] = None
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    character_arc: Optional[str] = None
    notes: Optional[str] = None
    # Extended Layer 1 identity fields
    motivations: Optional[str] = None
    beliefs: Optional[str] = None
    secrets: Optional[str] = None
    internal_conflicts: Optional[str] = None

class CharacterCreate(CharacterBase):
    pass

class CharacterUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    age: Optional[str] = None
    avatar_url: Optional[str] = None
    personality: Optional[str] = None
    goals: Optional[str] = None
    fears: Optional[str] = None
    values: Optional[str] = None
    speech_style: Optional[str] = None
    backstory: Optional[str] = None
    relationships: Optional[str] = None
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    character_arc: Optional[str] = None
    notes: Optional[str] = None
    motivations: Optional[str] = None
    beliefs: Optional[str] = None
    secrets: Optional[str] = None
    internal_conflicts: Optional[str] = None

class CharacterResponse(CharacterBase):
    id: UUID
    story_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

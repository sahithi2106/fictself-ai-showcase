from typing import Optional
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field

class PersonaBase(BaseModel):
    display_name: str
    avatar_url: Optional[str] = None
    background_text: Optional[str] = None
    is_default: bool = False

class PersonaCreate(PersonaBase):
    pass

class PersonaUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    background_text: Optional[str] = None
    is_default: Optional[bool] = None

class PersonaResponse(PersonaBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.emotional_memory import EmotionalMemory
from app.schemas.emotional_memory import EmotionalMemoryCreate, EmotionalMemoryUpdate

def get_emotional_memory(db: Session, memory_id: UUID) -> Optional[EmotionalMemory]:
    return db.query(EmotionalMemory).filter(EmotionalMemory.id == memory_id).first()

def get_emotional_memories_by_character(
    db: Session, character_id: UUID, skip: int = 0, limit: int = 100
) -> List[EmotionalMemory]:
    return (
        db.query(EmotionalMemory)
        .filter(EmotionalMemory.character_id == character_id)
        .order_by(EmotionalMemory.emotional_intensity.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

def create_emotional_memory(
    db: Session, memory_in: EmotionalMemoryCreate, character_id: UUID, story_id: UUID
) -> EmotionalMemory:
    db_memory = EmotionalMemory(
        **memory_in.model_dump(),
        character_id=character_id,
        story_id=story_id,
    )
    db.add(db_memory)
    db.commit()
    db.refresh(db_memory)
    return db_memory

def update_emotional_memory(
    db: Session, db_memory: EmotionalMemory, memory_in: EmotionalMemoryUpdate
) -> EmotionalMemory:
    update_data = memory_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_memory, field, value)
    db.add(db_memory)
    db.commit()
    db.refresh(db_memory)
    return db_memory

def delete_emotional_memory(db: Session, db_memory: EmotionalMemory) -> EmotionalMemory:
    db.delete(db_memory)
    db.commit()
    return db_memory

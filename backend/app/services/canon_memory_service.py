from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.canon_memory import CanonMemory
from app.schemas.canon_memory import CanonMemoryCreate, CanonMemoryUpdate

def get_canon_memory(db: Session, memory_id: UUID) -> Optional[CanonMemory]:
    return db.query(CanonMemory).filter(CanonMemory.id == memory_id).first()

def get_canon_memories_by_story(db: Session, story_id: UUID, skip: int = 0, limit: int = 100) -> List[CanonMemory]:
    return db.query(CanonMemory).filter(CanonMemory.story_id == story_id).order_by(CanonMemory.importance.desc()).offset(skip).limit(limit).all()

def create_canon_memory(db: Session, memory_in: CanonMemoryCreate, story_id: UUID) -> CanonMemory:
    db_memory = CanonMemory(
        **memory_in.model_dump(),
        story_id=story_id
    )
    db.add(db_memory)
    db.commit()
    db.refresh(db_memory)
    return db_memory

def update_canon_memory(db: Session, db_memory: CanonMemory, memory_in: CanonMemoryUpdate) -> CanonMemory:
    update_data = memory_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_memory, field, value)
    
    db.add(db_memory)
    db.commit()
    db.refresh(db_memory)
    return db_memory

def delete_canon_memory(db: Session, db_memory: CanonMemory) -> CanonMemory:
    db.delete(db_memory)
    db.commit()
    return db_memory

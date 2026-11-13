from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.pinned_memory import PinnedMemory
from app.schemas.pinned_memory import PinnedMemoryCreate, PinnedMemoryUpdate

def create_pinned_memory(db: Session, memory_in: PinnedMemoryCreate, story_id: UUID) -> PinnedMemory:
    db_memory = PinnedMemory(
        **memory_in.model_dump(),
        story_id=story_id
    )
    db.add(db_memory)
    db.commit()
    db.refresh(db_memory)
    return db_memory

def get_pinned_memory(db: Session, memory_id: UUID) -> Optional[PinnedMemory]:
    return db.query(PinnedMemory).filter(PinnedMemory.id == memory_id).first()

def get_pinned_memories_by_story(db: Session, story_id: UUID, skip: int = 0, limit: int = 100) -> List[PinnedMemory]:
    return db.query(PinnedMemory).filter(PinnedMemory.story_id == story_id).order_by(PinnedMemory.created_at.desc()).offset(skip).limit(limit).all()

def update_pinned_memory(db: Session, db_memory: PinnedMemory, memory_in: PinnedMemoryUpdate) -> PinnedMemory:
    update_data = memory_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_memory, field, value)
    
    db.add(db_memory)
    db.commit()
    db.refresh(db_memory)
    return db_memory

def delete_pinned_memory(db: Session, db_memory: PinnedMemory) -> PinnedMemory:
    db.delete(db_memory)
    db.commit()
    return db_memory

def get_active_pinned_memories(db: Session, story_id: UUID, character_id: Optional[UUID] = None) -> List[PinnedMemory]:
    """Fetch active pinned memories for story. Optionally filter by character."""
    query = db.query(PinnedMemory).filter(
        PinnedMemory.story_id == story_id,
        PinnedMemory.is_active == True
    )
    if character_id:
        # Get global memories (character_id is None) OR specific character memories
        query = query.filter((PinnedMemory.character_id == None) | (PinnedMemory.character_id == character_id))
    else:
        query = query.filter(PinnedMemory.character_id == None)
        
    return query.order_by(PinnedMemory.created_at.desc()).all()

from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.character import Character
from app.schemas.character import CharacterCreate, CharacterUpdate

def get_character(db: Session, character_id: UUID) -> Optional[Character]:
    return db.query(Character).filter(Character.id == character_id).first()

def get_characters_by_story(db: Session, story_id: UUID, skip: int = 0, limit: int = 100) -> List[Character]:
    return db.query(Character).filter(Character.story_id == story_id).order_by(Character.created_at).offset(skip).limit(limit).all()

def create_character(db: Session, character_in: CharacterCreate, story_id: UUID) -> Character:
    db_character = Character(
        **character_in.model_dump(),
        story_id=story_id
    )
    db.add(db_character)
    db.commit()
    db.refresh(db_character)
    return db_character

def update_character(db: Session, db_character: Character, character_in: CharacterUpdate) -> Character:
    update_data = character_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_character, field, value)
    
    db.add(db_character)
    db.commit()
    db.refresh(db_character)
    return db_character

from app.models.canon_memory import CanonMemory

def delete_character(db: Session, db_character: Character) -> Character:
    canon_memories = db.query(CanonMemory).filter(CanonMemory.story_id == db_character.story_id).all()
    char_id_str = str(db_character.id)
    for memory in canon_memories:
        if memory.character_ids and char_id_str in memory.character_ids:
            new_ids = [cid for cid in memory.character_ids if cid != char_id_str]
            memory.character_ids = new_ids
            db.add(memory)
            
    db.delete(db_character)
    db.commit()
    return db_character

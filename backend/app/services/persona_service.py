from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.persona import Persona
from app.schemas.persona import PersonaCreate, PersonaUpdate

def get_persona(db: Session, persona_id: UUID) -> Optional[Persona]:
    return db.query(Persona).filter(Persona.id == persona_id).first()

def get_personas_by_user(db: Session, user_id: UUID, skip: int = 0, limit: int = 100) -> List[Persona]:
    return db.query(Persona).filter(Persona.user_id == user_id).order_by(Persona.created_at.desc()).offset(skip).limit(limit).all()

def create_persona(db: Session, user_id: UUID, persona_in: PersonaCreate) -> Persona:
    # If this is the first persona, or is_default is true, handle it.
    existing = db.query(Persona).filter(Persona.user_id == user_id).count()
    is_default = persona_in.is_default or existing == 0

    if is_default:
        _unset_default_personas(db, user_id)

    db_persona = Persona(
        user_id=user_id,
        display_name=persona_in.display_name,
        avatar_url=persona_in.avatar_url,
        background_text=persona_in.background_text,
        is_default=is_default,
    )
    db.add(db_persona)
    db.commit()
    db.refresh(db_persona)
    return db_persona

def update_persona(db: Session, db_persona: Persona, persona_in: PersonaUpdate) -> Persona:
    update_data = persona_in.model_dump(exclude_unset=True)
    
    if update_data.get("is_default", False):
        _unset_default_personas(db, db_persona.user_id)
        
    for field, value in update_data.items():
        setattr(db_persona, field, value)

    db.add(db_persona)
    db.commit()
    db.refresh(db_persona)
    return db_persona

def delete_persona(db: Session, persona_id: UUID) -> bool:
    persona = get_persona(db, persona_id)
    if persona:
        user_id = persona.user_id
        is_default = persona.is_default
        db.delete(persona)
        db.commit()

        # If we deleted the default, set another one as default
        if is_default:
            next_persona = db.query(Persona).filter(Persona.user_id == user_id).first()
            if next_persona:
                next_persona.is_default = True
                db.add(next_persona)
                db.commit()
        return True
    return False

def _unset_default_personas(db: Session, user_id: UUID):
    db.query(Persona).filter(
        Persona.user_id == user_id, 
        Persona.is_default == True
    ).update({"is_default": False})
    db.commit()

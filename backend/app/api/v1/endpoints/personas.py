from typing import Any, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from app.api import deps
from app.schemas.persona import PersonaCreate, PersonaUpdate, PersonaResponse
from app.services import persona_service
import os
import shutil

router = APIRouter()

@router.get("/", response_model=List[PersonaResponse])
def read_personas(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve personas for the current user.
    """
    personas = persona_service.get_personas_by_user(db, user_id=current_user.id, skip=skip, limit=limit)
    return personas

@router.post("/", response_model=PersonaResponse)
def create_persona(
    *,
    db: Session = Depends(deps.get_db),
    persona_in: PersonaCreate,
    current_user = Depends(deps.get_current_user),
) -> Any:
    """
    Create new persona.
    """
    persona = persona_service.create_persona(db=db, user_id=current_user.id, persona_in=persona_in)
    return persona

@router.put("/{persona_id}", response_model=PersonaResponse)
def update_persona(
    *,
    db: Session = Depends(deps.get_db),
    persona_id: UUID,
    persona_in: PersonaUpdate,
    current_user = Depends(deps.get_current_user),
) -> Any:
    """
    Update a persona.
    """
    persona = persona_service.get_persona(db=db, persona_id=persona_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    if persona.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    persona = persona_service.update_persona(db=db, db_persona=persona, persona_in=persona_in)
    return persona

@router.delete("/{persona_id}")
def delete_persona(
    *,
    db: Session = Depends(deps.get_db),
    persona_id: UUID,
    current_user = Depends(deps.get_current_user),
) -> Any:
    """
    Delete a persona.
    """
    persona = persona_service.get_persona(db=db, persona_id=persona_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    if persona.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    persona_service.delete_persona(db=db, persona_id=persona_id)
    return {"success": True}

@router.post("/{persona_id}/avatar")
def upload_avatar(
    persona_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user),
) -> Any:
    """
    Upload an avatar for a persona.
    """
    persona = persona_service.get_persona(db=db, persona_id=persona_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    if persona.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    upload_dir = "uploads/avatars"
    os.makedirs(upload_dir, exist_ok=True)
    file_extension = os.path.splitext(file.filename)[1]
    file_path = os.path.join(upload_dir, f"{persona_id}{file_extension}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Assuming standard localhost setup for this MVP
    avatar_url = f"/{file_path.replace(os.sep, '/')}"
    
    update_data = PersonaUpdate(avatar_url=avatar_url)
    persona_service.update_persona(db=db, db_persona=persona, persona_in=update_data)
    
    return {"avatar_url": avatar_url}

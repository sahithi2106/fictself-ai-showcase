from typing import Any, List
import uuid
import os
import shutil
from uuid import UUID
from fastapi import APIRouter, HTTPException, status, UploadFile, File

from app.api.deps import SessionDep, CurrentUser
from app.schemas.character import CharacterCreate, CharacterUpdate, CharacterResponse
from app.services import character_service, story_service

router = APIRouter()

def _check_story_ownership(db: SessionDep, story_id: UUID, current_user: CurrentUser):
    story = story_service.get_story(db=db, story_id=story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

@router.post("/stories/{story_id}/characters", response_model=CharacterResponse, status_code=status.HTTP_201_CREATED)
def create_character(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    story_id: UUID,
    character_in: CharacterCreate,
) -> Any:
    """
    Create a new character for a story.
    """
    _check_story_ownership(db, story_id, current_user)
    character = character_service.create_character(db=db, character_in=character_in, story_id=story_id)
    return character

@router.get("/stories/{story_id}/characters", response_model=List[CharacterResponse])
def read_characters(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    story_id: UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve characters belonging to a specific story.
    """
    _check_story_ownership(db, story_id, current_user)
    characters = character_service.get_characters_by_story(db=db, story_id=story_id, skip=skip, limit=limit)
    return characters

@router.get("/characters/{character_id}", response_model=CharacterResponse)
def read_character(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    character_id: UUID,
) -> Any:
    """
    Get a specific character by id.
    """
    character = character_service.get_character(db=db, character_id=character_id)
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    _check_story_ownership(db, character.story_id, current_user)
    return character

@router.put("/characters/{character_id}", response_model=CharacterResponse)
def update_character(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    character_id: UUID,
    character_in: CharacterUpdate,
) -> Any:
    """
    Update a character.
    """
    character = character_service.get_character(db=db, character_id=character_id)
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    _check_story_ownership(db, character.story_id, current_user)
    
    character = character_service.update_character(db=db, db_character=character, character_in=character_in)
    return character

@router.delete("/characters/{character_id}", response_model=CharacterResponse)
def delete_character(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    character_id: UUID,
) -> Any:
    """
    Delete a character.
    """
    character = character_service.get_character(db=db, character_id=character_id)
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    _check_story_ownership(db, character.story_id, current_user)
    
    # Chat sessions are now cascade deleted alongside the character.
    
    character = character_service.delete_character(db=db, db_character=character)
    return character


@router.post("/stories/{story_id}/characters/{character_id}/avatar", response_model=CharacterResponse)
def upload_character_avatar(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    story_id: UUID,
    character_id: UUID,
    file: UploadFile = File(...),
) -> Any:
    """
    Upload an avatar image for a character.
    """
    _check_story_ownership(db, story_id, current_user)
    character = character_service.get_character(db=db, character_id=character_id)
    if not character or character.story_id != story_id:
        raise HTTPException(status_code=404, detail="Character not found")

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Generate unique filename
    ext = os.path.splitext(file.filename)[1] if file.filename else ".png"
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join("uploads", "character_avatars", filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    avatar_url = f"http://127.0.0.1:8000/uploads/character_avatars/{filename}"
    
    character_in = CharacterUpdate(avatar_url=avatar_url)
    character = character_service.update_character(db=db, db_character=character, character_in=character_in)
    return character


@router.delete("/stories/{story_id}/characters/{character_id}/avatar", response_model=CharacterResponse)
def remove_character_avatar(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    story_id: UUID,
    character_id: UUID,
) -> Any:
    """
    Remove avatar image from a character.
    """
    _check_story_ownership(db, story_id, current_user)
    character = character_service.get_character(db=db, character_id=character_id)
    if not character or character.story_id != story_id:
        raise HTTPException(status_code=404, detail="Character not found")

    character_in = CharacterUpdate(avatar_url="")
    character = character_service.update_character(db=db, db_character=character, character_in=character_in)
    return character

from typing import Any, List
from uuid import UUID
from fastapi import APIRouter, HTTPException, status

from app.api.deps import SessionDep, CurrentUser
from app.schemas.emotional_memory import EmotionalMemoryCreate, EmotionalMemoryUpdate, EmotionalMemoryResponse
from app.services import emotional_memory_service, character_service, story_service

router = APIRouter()

def _check_character_ownership(db, character_id: UUID, current_user) -> Any:
    character = character_service.get_character(db=db, character_id=character_id)
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    story = story_service.get_story(db=db, story_id=character.story_id)
    if not story or story.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return character

@router.post("/characters/{character_id}/emotional-memories", response_model=EmotionalMemoryResponse, status_code=status.HTTP_201_CREATED)
def create_emotional_memory(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    character_id: UUID,
    memory_in: EmotionalMemoryCreate,
) -> Any:
    """
    Create a new emotional memory for a character.
    """
    character = _check_character_ownership(db, character_id, current_user)
    memory = emotional_memory_service.create_emotional_memory(
        db=db, memory_in=memory_in, character_id=character_id, story_id=character.story_id
    )
    return memory

@router.get("/characters/{character_id}/emotional-memories", response_model=List[EmotionalMemoryResponse])
def read_emotional_memories(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    character_id: UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve all emotional memories for a character, ordered by intensity descending.
    """
    _check_character_ownership(db, character_id, current_user)
    memories = emotional_memory_service.get_emotional_memories_by_character(
        db=db, character_id=character_id, skip=skip, limit=limit
    )
    return memories

@router.get("/emotional-memories/{memory_id}", response_model=EmotionalMemoryResponse)
def read_emotional_memory(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    memory_id: UUID,
) -> Any:
    """
    Get a specific emotional memory by id.
    """
    memory = emotional_memory_service.get_emotional_memory(db=db, memory_id=memory_id)
    if not memory:
        raise HTTPException(status_code=404, detail="Emotional memory not found")
    _check_character_ownership(db, memory.character_id, current_user)
    return memory

@router.put("/emotional-memories/{memory_id}", response_model=EmotionalMemoryResponse)
def update_emotional_memory(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    memory_id: UUID,
    memory_in: EmotionalMemoryUpdate,
) -> Any:
    """
    Update an emotional memory (writer override).
    """
    memory = emotional_memory_service.get_emotional_memory(db=db, memory_id=memory_id)
    if not memory:
        raise HTTPException(status_code=404, detail="Emotional memory not found")
    _check_character_ownership(db, memory.character_id, current_user)
    return emotional_memory_service.update_emotional_memory(db=db, db_memory=memory, memory_in=memory_in)

@router.delete("/emotional-memories/{memory_id}", response_model=EmotionalMemoryResponse)
def delete_emotional_memory(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    memory_id: UUID,
) -> Any:
    """
    Delete an emotional memory.
    """
    memory = emotional_memory_service.get_emotional_memory(db=db, memory_id=memory_id)
    if not memory:
        raise HTTPException(status_code=404, detail="Emotional memory not found")
    _check_character_ownership(db, memory.character_id, current_user)
    return emotional_memory_service.delete_emotional_memory(db=db, db_memory=memory)

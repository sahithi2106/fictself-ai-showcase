from typing import Any, List
from uuid import UUID
from fastapi import APIRouter, HTTPException, status

from app.api.deps import SessionDep, CurrentUser
from app.schemas.canon_memory import CanonMemoryCreate, CanonMemoryUpdate, CanonMemoryResponse
from app.services import canon_memory_service, story_service

router = APIRouter()

def _check_story_ownership(db: SessionDep, story_id: UUID, current_user: CurrentUser):
    story = story_service.get_story(db=db, story_id=story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

@router.post("/stories/{story_id}/canon-memories", response_model=CanonMemoryResponse, status_code=status.HTTP_201_CREATED)
def create_canon_memory(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    story_id: UUID,
    memory_in: CanonMemoryCreate,
) -> Any:
    """
    Create a new canon memory for a story.
    """
    _check_story_ownership(db, story_id, current_user)
    memory = canon_memory_service.create_canon_memory(db=db, memory_in=memory_in, story_id=story_id)
    return memory

@router.get("/stories/{story_id}/canon-memories", response_model=List[CanonMemoryResponse])
def read_canon_memories(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    story_id: UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve canon memories belonging to a specific story.
    """
    _check_story_ownership(db, story_id, current_user)
    memories = canon_memory_service.get_canon_memories_by_story(db=db, story_id=story_id, skip=skip, limit=limit)
    return memories

@router.get("/canon-memories/{memory_id}", response_model=CanonMemoryResponse)
def read_canon_memory(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    memory_id: UUID,
) -> Any:
    """
    Get a specific canon memory by id.
    """
    memory = canon_memory_service.get_canon_memory(db=db, memory_id=memory_id)
    if not memory:
        raise HTTPException(status_code=404, detail="Canon Memory not found")
    _check_story_ownership(db, memory.story_id, current_user)
    return memory

@router.put("/canon-memories/{memory_id}", response_model=CanonMemoryResponse)
def update_canon_memory(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    memory_id: UUID,
    memory_in: CanonMemoryUpdate,
) -> Any:
    """
    Update a canon memory.
    """
    memory = canon_memory_service.get_canon_memory(db=db, memory_id=memory_id)
    if not memory:
        raise HTTPException(status_code=404, detail="Canon Memory not found")
    _check_story_ownership(db, memory.story_id, current_user)
    
    memory = canon_memory_service.update_canon_memory(db=db, db_memory=memory, memory_in=memory_in)
    return memory

@router.delete("/canon-memories/{memory_id}", response_model=CanonMemoryResponse)
def delete_canon_memory(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    memory_id: UUID,
) -> Any:
    """
    Delete a canon memory.
    """
    memory = canon_memory_service.get_canon_memory(db=db, memory_id=memory_id)
    if not memory:
        raise HTTPException(status_code=404, detail="Canon Memory not found")
    _check_story_ownership(db, memory.story_id, current_user)
    
    memory = canon_memory_service.delete_canon_memory(db=db, db_memory=memory)
    return memory

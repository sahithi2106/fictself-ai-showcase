from typing import Any, List
from uuid import UUID
from fastapi import APIRouter, HTTPException, status

from app.api.deps import SessionDep, CurrentUser
from app.schemas.pinned_memory import PinnedMemoryCreate, PinnedMemoryUpdate, PinnedMemoryResponse
from app.services import pinned_memory_service, story_service

router = APIRouter()

def _check_story_ownership(db: SessionDep, story_id: UUID, current_user: CurrentUser):
    story = story_service.get_story(db=db, story_id=story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

@router.post("/stories/{story_id}/pinned-memories", response_model=PinnedMemoryResponse, status_code=status.HTTP_201_CREATED)
def create_pinned_memory(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    story_id: UUID,
    memory_in: PinnedMemoryCreate,
) -> Any:
    """
    Create a new pinned memory for a story.
    """
    _check_story_ownership(db, story_id, current_user)
    memory = pinned_memory_service.create_pinned_memory(db=db, memory_in=memory_in, story_id=story_id)
    return memory

@router.get("/stories/{story_id}/pinned-memories", response_model=List[PinnedMemoryResponse])
def read_pinned_memories(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    story_id: UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve pinned memories belonging to a specific story.
    """
    _check_story_ownership(db, story_id, current_user)
    memories = pinned_memory_service.get_pinned_memories_by_story(db=db, story_id=story_id, skip=skip, limit=limit)
    return memories

@router.get("/pinned-memories/{memory_id}", response_model=PinnedMemoryResponse)
def read_pinned_memory(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    memory_id: UUID,
) -> Any:
    """
    Get a specific pinned memory by id.
    """
    memory = pinned_memory_service.get_pinned_memory(db=db, memory_id=memory_id)
    if not memory:
        raise HTTPException(status_code=404, detail="Pinned Memory not found")
    _check_story_ownership(db, memory.story_id, current_user)
    return memory

@router.put("/pinned-memories/{memory_id}", response_model=PinnedMemoryResponse)
def update_pinned_memory(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    memory_id: UUID,
    memory_in: PinnedMemoryUpdate,
) -> Any:
    """
    Update a pinned memory.
    """
    memory = pinned_memory_service.get_pinned_memory(db=db, memory_id=memory_id)
    if not memory:
        raise HTTPException(status_code=404, detail="Pinned Memory not found")
    _check_story_ownership(db, memory.story_id, current_user)
    
    memory = pinned_memory_service.update_pinned_memory(db=db, db_memory=memory, memory_in=memory_in)
    return memory

@router.delete("/pinned-memories/{memory_id}", response_model=PinnedMemoryResponse)
def delete_pinned_memory(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    memory_id: UUID,
) -> Any:
    """
    Delete a pinned memory.
    """
    memory = pinned_memory_service.get_pinned_memory(db=db, memory_id=memory_id)
    if not memory:
        raise HTTPException(status_code=404, detail="Pinned Memory not found")
    _check_story_ownership(db, memory.story_id, current_user)
    
    memory = pinned_memory_service.delete_pinned_memory(db=db, db_memory=memory)
    return memory

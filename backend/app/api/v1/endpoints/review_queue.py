from typing import Any, List, Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, status

from app.api.deps import SessionDep, CurrentUser
from app.schemas.writer_review_queue import (
    WriterReviewQueueItemCreate,
    WriterReviewQueueItemUpdate,
    WriterReviewQueueItemResponse,
)
from app.services import writer_review_queue_service, story_service

router = APIRouter()

def _check_story_ownership(db, story_id: UUID, current_user):
    story = story_service.get_story(db=db, story_id=story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return story

def _check_item_ownership(db, item_id: UUID, current_user):
    item = writer_review_queue_service.get_queue_item(db=db, item_id=item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Review queue item not found")
    _check_story_ownership(db, item.story_id, current_user)
    return item

@router.post("/stories/{story_id}/review-queue", response_model=WriterReviewQueueItemResponse, status_code=status.HTTP_201_CREATED)
def create_queue_item(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    story_id: UUID,
    item_in: WriterReviewQueueItemCreate,
) -> Any:
    """
    Manually add a candidate memory to the review queue.
    In Phase 3, this is called automatically by the LLM pipeline.
    """
    _check_story_ownership(db, story_id, current_user)
    return writer_review_queue_service.create_queue_item(db=db, item_in=item_in, story_id=story_id)

@router.get("/stories/{story_id}/review-queue", response_model=List[WriterReviewQueueItemResponse])
def read_queue_items(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    story_id: UUID,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    List all review queue items for a story.
    Optionally filter by status: pending | approved | rejected | auto_accepted.
    """
    _check_story_ownership(db, story_id, current_user)
    return writer_review_queue_service.get_queue_items_by_story(
        db=db, story_id=story_id, status=status_filter, skip=skip, limit=limit
    )

@router.get("/review-queue/{item_id}", response_model=WriterReviewQueueItemResponse)
def read_queue_item(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    item_id: UUID,
) -> Any:
    """
    Get a specific review queue item by id.
    """
    return _check_item_ownership(db, item_id, current_user)

@router.put("/review-queue/{item_id}", response_model=WriterReviewQueueItemResponse)
def update_queue_item(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    item_id: UUID,
    item_in: WriterReviewQueueItemUpdate,
) -> Any:
    """
    Edit a pending queue item's candidate data or importance score before approving.
    """
    item = _check_item_ownership(db, item_id, current_user)
    return writer_review_queue_service.update_queue_item(db=db, db_item=item, item_in=item_in)

@router.post("/review-queue/{item_id}/approve", response_model=WriterReviewQueueItemResponse)
def approve_queue_item(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    item_id: UUID,
) -> Any:
    """
    Approve a candidate memory. 
    Commits it into either canon_memories or emotional_memories based on memory_type.
    """
    item = _check_item_ownership(db, item_id, current_user)
    return writer_review_queue_service.approve_queue_item(db=db, db_item=item)

@router.post("/review-queue/{item_id}/reject", response_model=WriterReviewQueueItemResponse)
def reject_queue_item(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    item_id: UUID,
) -> Any:
    """
    Reject and dismiss a candidate memory from the review queue.
    """
    item = _check_item_ownership(db, item_id, current_user)
    return writer_review_queue_service.reject_queue_item(db=db, db_item=item)

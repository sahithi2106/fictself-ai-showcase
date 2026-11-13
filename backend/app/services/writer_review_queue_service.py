from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.writer_review_queue import WriterReviewQueueItem
from app.schemas.writer_review_queue import WriterReviewQueueItemCreate, WriterReviewQueueItemUpdate
from app.schemas.canon_memory import CanonMemoryCreate
from app.schemas.emotional_memory import EmotionalMemoryCreate
from app.schemas.pinned_memory import PinnedMemoryCreate
from app.services import canon_memory_service, emotional_memory_service, pinned_memory_service

# Suggestion types that promote to PinnedMemory and what memory_type they map to
PINNED_TYPE_MAP = {
    "pinned_fact": "plot_fact",
    "relationship_update": "relationship",
    "world_rule": "world_rule",
    "secret": "secret",
    "object_fact": "object",
}

def get_queue_item(db: Session, item_id: UUID) -> Optional[WriterReviewQueueItem]:
    return db.query(WriterReviewQueueItem).filter(WriterReviewQueueItem.id == item_id).first()

def get_queue_items_by_story(
    db: Session, story_id: UUID, status: Optional[str] = None, skip: int = 0, limit: int = 100
) -> List[WriterReviewQueueItem]:
    query = db.query(WriterReviewQueueItem).filter(WriterReviewQueueItem.story_id == story_id)
    if status:
        query = query.filter(WriterReviewQueueItem.status == status)
    return query.order_by(WriterReviewQueueItem.importance_score.desc(), WriterReviewQueueItem.created_at.desc()).offset(skip).limit(limit).all()

def create_queue_item(
    db: Session, item_in: WriterReviewQueueItemCreate, story_id: UUID
) -> WriterReviewQueueItem:
    # Validate: emotional type must have character_id
    if item_in.suggestion_type == "emotional_memory" and not item_in.character_id:
        raise HTTPException(status_code=422, detail="character_id is required when suggestion_type is 'emotional_memory'")

    db_item = WriterReviewQueueItem(
        story_id=story_id,
        job_id=item_in.job_id,
        character_id=item_in.character_id,
        source_chapter_id=item_in.source_chapter_id,
        title=item_in.title,
        content=item_in.content,
        suggestion_type=item_in.suggestion_type,
        source_excerpt=item_in.source_excerpt,
        proposed_target_label=item_in.proposed_target_label,
        proposed_target_type=item_in.proposed_target_type,
        created_by=item_in.created_by,
        memory_type=item_in.memory_type,
        candidate_data=item_in.candidate_data,
        importance_score=item_in.importance_score,
        status="pending",
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def update_queue_item(
    db: Session, db_item: WriterReviewQueueItem, item_in: WriterReviewQueueItemUpdate
) -> WriterReviewQueueItem:
    update_data = item_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_item, field, value)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def approve_queue_item(db: Session, db_item: WriterReviewQueueItem) -> WriterReviewQueueItem:
    if db_item.status != "pending":
        raise HTTPException(status_code=400, detail=f"Queue item is already '{db_item.status}'")

    committed_id = None
    stype = db_item.suggestion_type

    # ── 1. canon_fact → CanonMemory ───────────────────────────────────────────
    if stype == "canon_fact" or (db_item.memory_type == "canon" and not stype):
        data = db_item.candidate_data or {}
        memory_in = CanonMemoryCreate(
            title=db_item.title or data.get("title", "Untitled"),
            description=db_item.content or data.get("description", ""),
            importance=int(round(db_item.importance_score * 10)),
            chapter_id=db_item.source_chapter_id,
            character_ids=data.get("character_ids"),
        )
        committed = canon_memory_service.create_canon_memory(
            db=db, memory_in=memory_in, story_id=db_item.story_id
        )
        committed_id = committed.id

    # ── 2. emotional_memory → EmotionalMemory ─────────────────────────────────
    elif stype == "emotional_memory" or (db_item.memory_type == "emotional" and not stype):
        if not db_item.character_id:
            raise HTTPException(status_code=422, detail="Cannot approve emotional memory without a character_id")
        data = db_item.candidate_data or {}

        # Resolve story_id from character
        from app.services import character_service
        character = character_service.get_character(db=db, character_id=db_item.character_id)
        if not character:
            raise HTTPException(status_code=404, detail="Character not found for this queue item")

        # Safety: the character must belong to the same story as the queue item.
        # If these differ, we have a data integrity issue — abort rather than
        # silently file the memory under the wrong story.
        if character.story_id != db_item.story_id:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Character story_id {character.story_id} does not match "
                    f"queue item story_id {db_item.story_id}. Cannot promote emotional memory."
                )
            )

        memory_in = EmotionalMemoryCreate(
            primary_emotion=data.get("primary_emotion", db_item.title or ""),
            emotional_intensity=int(round(db_item.importance_score * 10)),
            memory_content=db_item.content or data.get("memory_content"),
            target_label=db_item.proposed_target_label or data.get("target_label"),
            target_type=db_item.proposed_target_type or data.get("target_type"),
            trigger_description=db_item.source_excerpt or data.get("trigger_description"),
            source_chapter_id=db_item.source_chapter_id,
            is_active=True,
        )
        committed = emotional_memory_service.create_emotional_memory(
            db=db, memory_in=memory_in,
            character_id=db_item.character_id,
            story_id=character.story_id,
        )
        committed_id = committed.id

    # ── 3. pinned_fact / relationship_update / world_rule / secret / object_fact → PinnedMemory
    elif stype in PINNED_TYPE_MAP:
        pinned_mem_type = PINNED_TYPE_MAP[stype]
        memory_in = PinnedMemoryCreate(
            title=db_item.title or "Untitled",
            content=db_item.content or "",
            memory_type=pinned_mem_type,
            character_id=db_item.character_id,
            source_chapter_id=db_item.source_chapter_id,
            is_active=True,
        )
        committed = pinned_memory_service.create_pinned_memory(
            db=db, story_id=db_item.story_id, memory_in=memory_in
        )
        committed_id = committed.id

    else:
        raise HTTPException(status_code=400, detail=f"Unknown suggestion_type: '{stype}'. Cannot promote.")

    db_item.status = "approved"
    db_item.reviewed_at = datetime.now(timezone.utc)
    db_item.committed_memory_id = committed_id
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def reject_queue_item(db: Session, db_item: WriterReviewQueueItem) -> WriterReviewQueueItem:
    if db_item.status != "pending":
        raise HTTPException(status_code=400, detail=f"Queue item is already '{db_item.status}'")
    db_item.status = "rejected"
    db_item.reviewed_at = datetime.now(timezone.utc)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

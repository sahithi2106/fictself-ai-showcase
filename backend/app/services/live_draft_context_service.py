"""
Live Draft Context Service
--------------------------
One LiveDraftContext per chapter (enforced by DB UNIQUE constraint on chapter_id).
All write operations update last_saved_at, enabling autosave support.
"""
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.live_draft_context import LiveDraftContext
from app.schemas.live_draft_context import LiveDraftContextCreate, LiveDraftContextUpdate


def get_by_chapter(db: Session, chapter_id: UUID) -> Optional[LiveDraftContext]:
    """Return the single LiveDraftContext for a chapter, or None."""
    return (
        db.query(LiveDraftContext)
        .filter(LiveDraftContext.chapter_id == chapter_id)
        .first()
    )


def get_by_id(db: Session, context_id: UUID) -> Optional[LiveDraftContext]:
    """Return a LiveDraftContext by its primary key."""
    return (
        db.query(LiveDraftContext)
        .filter(LiveDraftContext.id == context_id)
        .first()
    )


def create_context(
    db: Session,
    context_in: LiveDraftContextCreate,
    chapter_id: UUID,
    story_id: UUID,
    user_id: UUID,
) -> LiveDraftContext:
    """
    Create a LiveDraftContext for a chapter.
    Raises ValueError if one already exists (mirrors the DB UNIQUE constraint
    at the service layer so the caller gets a clean error before hitting the DB).
    """
    existing = get_by_chapter(db, chapter_id)
    if existing:
        raise ValueError(
            f"A LiveDraftContext already exists for chapter {chapter_id}. "
            "Use the update (PUT) endpoint instead."
        )

    db_context = LiveDraftContext(
        chapter_id=chapter_id,
        story_id=story_id,
        user_id=user_id,
        content_snapshot=context_in.content_snapshot,
        last_n_paragraphs=context_in.last_n_paragraphs,
        active_characters=context_in.active_characters,
        session_started_at=datetime.now(timezone.utc),
        last_saved_at=datetime.now(timezone.utc),
    )
    db.add(db_context)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError(
            f"A LiveDraftContext already exists for chapter {chapter_id}."
        )
    db.refresh(db_context)
    return db_context


def update_context(
    db: Session,
    db_context: LiveDraftContext,
    context_in: LiveDraftContextUpdate,
) -> LiveDraftContext:
    """
    Partial update — only fields explicitly set in the payload are changed.
    last_saved_at is always refreshed, making this safe for autosave calls.
    """
    update_data = context_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_context, field, value)

    # Always bump last_saved_at on every save (autosave support)
    db_context.last_saved_at = datetime.now(timezone.utc)

    db.add(db_context)
    db.commit()
    db.refresh(db_context)
    return db_context


def upsert_context(
    db: Session,
    context_in: LiveDraftContextCreate,
    chapter_id: UUID,
    story_id: UUID,
    user_id: UUID,
) -> LiveDraftContext:
    """
    Create-or-update in a single call — ideal for autosave where the client
    does not know whether a context exists yet.
    """
    existing = get_by_chapter(db, chapter_id)
    if existing:
        update_payload = LiveDraftContextUpdate(
            content_snapshot=context_in.content_snapshot,
            last_n_paragraphs=context_in.last_n_paragraphs,
            active_characters=context_in.active_characters,
        )
        return update_context(db, existing, update_payload)

    return create_context(db, context_in, chapter_id, story_id, user_id)


def delete_context(db: Session, db_context: LiveDraftContext) -> LiveDraftContext:
    """Hard-delete the context row. The chapter itself is not affected."""
    db.delete(db_context)
    db.commit()
    return db_context

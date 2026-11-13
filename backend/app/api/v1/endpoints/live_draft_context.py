"""
Live Draft Context Endpoints
-----------------------------
Every route is scoped to a chapter, which is itself scoped to a story.
Ownership is validated at the story level (story.author_id == current_user.id).

URL pattern:
    POST   /api/v1/chapters/{chapter_id}/live-draft-context
    GET    /api/v1/chapters/{chapter_id}/live-draft-context
    PUT    /api/v1/chapters/{chapter_id}/live-draft-context
    PUT    /api/v1/chapters/{chapter_id}/live-draft-context/autosave   ← upsert for autosave
    DELETE /api/v1/chapters/{chapter_id}/live-draft-context
"""
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.api.deps import SessionDep, CurrentUser
from app.schemas.live_draft_context import (
    LiveDraftContextCreate,
    LiveDraftContextUpdate,
    LiveDraftContextUpsert,
    LiveDraftContextResponse,
)
from app.services import chapter_service, story_service, live_draft_context_service

router = APIRouter()


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _resolve_chapter_with_ownership(
    db: SessionDep,
    chapter_id: UUID,
    current_user: CurrentUser,
):
    """
    Fetch the chapter and validate that the current user owns its parent story.
    Returns the chapter ORM object on success; raises HTTPException on failure.
    """
    chapter = chapter_service.get_chapter(db=db, chapter_id=chapter_id)
    if not chapter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found")

    story = story_service.get_story(db=db, story_id=chapter.story_id)
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")

    if story.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this chapter's live draft context",
        )

    return chapter


def _get_existing_context_or_404(db: SessionDep, chapter_id: UUID):
    """Return the LiveDraftContext for a chapter, or raise 404."""
    ctx = live_draft_context_service.get_by_chapter(db=db, chapter_id=chapter_id)
    if not ctx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No live draft context found for this chapter. "
                   "Use POST to create one first.",
        )
    return ctx


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post(
    "/chapters/{chapter_id}/live-draft-context",
    response_model=LiveDraftContextResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a live draft context for a chapter",
    description=(
        "Creates a new LiveDraftContext bound to the given chapter. "
        "Only one context is allowed per chapter — attempting to create a second "
        "will return **409 Conflict**. Use the PUT endpoint to update an existing context."
    ),
)
def create_live_draft_context(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    chapter_id: UUID,
    context_in: LiveDraftContextCreate,
) -> Any:
    chapter = _resolve_chapter_with_ownership(db, chapter_id, current_user)

    try:
        context = live_draft_context_service.create_context(
            db=db,
            context_in=context_in,
            chapter_id=chapter.id,
            story_id=chapter.story_id,
            user_id=current_user.id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )

    return context


@router.get(
    "/chapters/{chapter_id}/live-draft-context",
    response_model=LiveDraftContextResponse,
    summary="Get the live draft context for a chapter",
    description=(
        "Returns the single LiveDraftContext for the given chapter. "
        "Returns **404** if no context has been created yet."
    ),
)
def get_live_draft_context(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    chapter_id: UUID,
) -> Any:
    _resolve_chapter_with_ownership(db, chapter_id, current_user)
    return _get_existing_context_or_404(db, chapter_id)


@router.put(
    "/chapters/{chapter_id}/live-draft-context",
    response_model=LiveDraftContextResponse,
    summary="Update the live draft context for a chapter",
    description=(
        "Partially updates the LiveDraftContext. Only fields present in the request "
        "body are changed. `last_saved_at` is always refreshed. "
        "Returns **404** if no context exists yet."
    ),
)
def update_live_draft_context(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    chapter_id: UUID,
    context_in: LiveDraftContextUpdate,
) -> Any:
    _resolve_chapter_with_ownership(db, chapter_id, current_user)
    ctx = _get_existing_context_or_404(db, chapter_id)

    return live_draft_context_service.update_context(
        db=db,
        db_context=ctx,
        context_in=context_in,
    )


@router.put(
    "/chapters/{chapter_id}/live-draft-context/autosave",
    response_model=LiveDraftContextResponse,
    summary="Autosave — create or update the live draft context",
    description=(
        "Idempotent upsert endpoint designed for frequent autosave calls. "
        "Creates the context if it does not exist, otherwise updates it. "
        "`last_saved_at` is always updated. "
        "Preferred over the separate POST/PUT pair when the editor runs autosave."
    ),
)
def autosave_live_draft_context(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    chapter_id: UUID,
    context_in: LiveDraftContextUpsert,
) -> Any:
    chapter = _resolve_chapter_with_ownership(db, chapter_id, current_user)

    create_payload = LiveDraftContextCreate(
        content_snapshot=context_in.content_snapshot,
        last_n_paragraphs=context_in.last_n_paragraphs,
        active_characters=context_in.active_characters,
    )

    return live_draft_context_service.upsert_context(
        db=db,
        context_in=create_payload,
        chapter_id=chapter.id,
        story_id=chapter.story_id,
        user_id=current_user.id,
    )


@router.delete(
    "/chapters/{chapter_id}/live-draft-context",
    response_model=LiveDraftContextResponse,
    summary="Delete the live draft context for a chapter",
    description=(
        "Hard-deletes the LiveDraftContext for the given chapter. "
        "The chapter itself is not affected. "
        "Returns the deleted context. Returns **404** if none exists."
    ),
)
def delete_live_draft_context(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    chapter_id: UUID,
) -> Any:
    _resolve_chapter_with_ownership(db, chapter_id, current_user)
    ctx = _get_existing_context_or_404(db, chapter_id)

    return live_draft_context_service.delete_context(db=db, db_context=ctx)

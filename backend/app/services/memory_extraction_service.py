"""
memory_extraction_service.py
Phase 4B-lite: Automatically extract memory candidates from chapter content
and push them into the Writer Review Queue as pending ai_extraction items.

The writer retains full approval authority — nothing becomes canon until
they explicitly approve the suggestion in the Review Queue UI.

Design notes:
  - Runs in a background thread so chapter saves are never blocked.
  - Dedup guard: skips candidates whose title overlaps >80% (word-level)
    with any existing pending/approved item from the same story.
  - Also skips if ≥ 3 ai_extraction items already exist for this exact
    chapter in the last 24 hours (prevents repeat-save spam).
  - Extraction window: last 3000 chars of chapter content (newest writing).
  - Hard cap: max 3 new items inserted per invocation.
  - All failures are logged and swallowed — the chapter save is unaffected.
"""

import logging
import threading
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.chapter import Chapter
from app.models.character import Character
from app.models.writer_review_queue import WriterReviewQueueItem
from app.schemas.writer_review_queue import WriterReviewQueueItemCreate
from app.services import writer_review_queue_service
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)

# Valid suggestion types as defined in the schema
VALID_SUGGESTION_TYPES = {
    "canon_fact", "pinned_fact", "emotional_memory",
    "relationship_update", "world_rule", "secret", "object_fact",
}

# Maximum characters from chapter content to send to LLM
EXTRACTION_WINDOW = 3000

# Minimum chapter content length to bother extracting from
MIN_CONTENT_LENGTH = 200

# Max ai_extraction items per chapter within this window before we suppress
MAX_ITEMS_PER_CHAPTER = 3
DEDUP_WINDOW_HOURS = 24

# Title similarity threshold (word overlap ratio) above which we skip
TITLE_SIMILARITY_THRESHOLD = 0.80

# Singleton LLM service (same one used by chat)
_llm_service = LLMService()


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def trigger_extraction_async(chapter_id: UUID, story_id: UUID) -> None:
    """
    Fire-and-forget: spawn a background thread to extract memory candidates
    from the chapter. Chapter saves are never delayed.

    We accept IDs (not ORM objects) because the SQLAlchemy session that owns
    the chapter object must not be shared across threads.
    """
    thread = threading.Thread(
        target=_extraction_worker,
        args=(chapter_id, story_id),
        daemon=True,
        name=f"mem-extract-{chapter_id}",
    )
    thread.start()
    logger.info(f"[MemoryExtraction] Background extraction thread started for chapter {chapter_id}.")


# ─────────────────────────────────────────────────────────────────────────────
# Internal worker (runs in a new thread with its own DB session)
# ─────────────────────────────────────────────────────────────────────────────

def _extraction_worker(chapter_id: UUID, story_id: UUID) -> None:
    """Opens its own DB session, extracts, inserts, closes cleanly."""
    db: Session = SessionLocal()
    try:
        _run_extraction(db, chapter_id, story_id)
    except Exception:
        logger.exception(f"[MemoryExtraction] Unhandled error in extraction worker for chapter {chapter_id}.")
    finally:
        db.close()


def _run_extraction(db: Session, chapter_id: UUID, story_id: UUID) -> None:
    # ── 1. Load chapter ──────────────────────────────────────────────────────
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        logger.warning(f"[MemoryExtraction] Chapter {chapter_id} not found — skipping.")
        return

    content = (chapter.content or "").strip()
    if len(content) < MIN_CONTENT_LENGTH:
        logger.info(f"[MemoryExtraction] Chapter {chapter_id} too short ({len(content)} chars) — skipping.")
        return

    # ── Story isolation guard ─────────────────────────────────────────────────
    # Verify the chapter actually belongs to the story we were called with.
    # Mismatched IDs would cause suggestions to be filed under the wrong story.
    if chapter.story_id != story_id:
        logger.error(
            f"[MemoryExtraction] chapter.story_id {chapter.story_id} != passed story_id {story_id} "
            "— aborting to prevent cross-story contamination."
        )
        return

    # ── 2. Chapter-level dedup guard ─────────────────────────────────────────
    # Only count pending/approved items — rejected ones should not block new suggestions.
    cutoff = datetime.now(timezone.utc) - timedelta(hours=DEDUP_WINDOW_HOURS)
    recent_count = (
        db.query(WriterReviewQueueItem)
        .filter(
            WriterReviewQueueItem.source_chapter_id == chapter_id,
            WriterReviewQueueItem.created_by == "ai_extraction",
            WriterReviewQueueItem.status.in_(["pending", "approved"]),
            WriterReviewQueueItem.created_at >= cutoff,
        )
        .count()
    )
    if recent_count >= MAX_ITEMS_PER_CHAPTER:
        logger.info(
            f"[MemoryExtraction] Chapter {chapter_id} already has {recent_count} active ai_extraction "
            f"items in the last {DEDUP_WINDOW_HOURS}h — skipping."
        )
        return

    # ── 3. Load characters for the story ─────────────────────────────────────
    characters: List[Character] = (
        db.query(Character).filter(Character.story_id == story_id).all()
    )
    character_names = [c.name for c in characters]
    character_by_name = {c.name.lower(): c for c in characters}

    # ── 4. Build extraction window (last N chars = most recently written) ─────
    extraction_text = content[-EXTRACTION_WINDOW:] if len(content) > EXTRACTION_WINDOW else content

    # ── 5. Call LLM ──────────────────────────────────────────────────────────
    candidates = _llm_service.extract_memory_candidates(
        chapter_text=extraction_text,
        character_names=character_names,
    )
    if not candidates:
        logger.info(f"[MemoryExtraction] LLM returned no candidates for chapter {chapter_id}.")
        return

    # ── 6. Load existing queue items for dedup ────────────────────────────────
    # Include rejected items: writers who rejected a suggestion should not see it
    # regenerated on every subsequent chapter save.
    existing_items = (
        db.query(WriterReviewQueueItem)
        .filter(
            WriterReviewQueueItem.story_id == story_id,
            WriterReviewQueueItem.status.in_(["pending", "approved", "rejected"]),
        )
        .all()
    )
    existing_titles = [item.title or "" for item in existing_items]

    # ── 7. Validate, dedup, and insert ───────────────────────────────────────
    inserted = 0
    for candidate in candidates:
        if inserted >= MAX_ITEMS_PER_CHAPTER:
            break

        # Validate suggestion type
        stype = candidate.get("suggestion_type", "")
        if stype not in VALID_SUGGESTION_TYPES:
            logger.warning(f"[MemoryExtraction] Unknown suggestion_type '{stype}' — skipping candidate.")
            continue

        title = (candidate.get("title") or "").strip()
        content_text = (candidate.get("content") or "").strip()
        if not title or not content_text:
            logger.warning("[MemoryExtraction] Candidate missing title or content — skipping.")
            continue

        # Title-similarity dedup
        if _is_duplicate_title(title, existing_titles):
            logger.info(f"[MemoryExtraction] Skipping duplicate candidate: '{title}'")
            continue

        # Resolve character_id for emotional_memory
        character_id: Optional[UUID] = None
        if stype == "emotional_memory":
            char_name = (candidate.get("character_name") or "").strip().lower()
            matched_char = character_by_name.get(char_name)
            if not matched_char:
                # Try prefix match
                matched_char = next(
                    (c for name, c in character_by_name.items() if char_name and char_name in name),
                    None,
                )
            if not matched_char:
                logger.warning(
                    f"[MemoryExtraction] emotional_memory candidate '{title}' has no resolvable "
                    f"character_name '{candidate.get('character_name')}' — converting to canon_fact."
                )
                stype = "canon_fact"
            else:
                character_id = matched_char.id

        # Belt-and-suspenders: if still emotional_memory without a character_id, convert.
        if stype == "emotional_memory" and not character_id:
            logger.warning(
                f"[MemoryExtraction] emotional_memory candidate '{title}' still has no character_id "
                "after resolution — converting to canon_fact to avoid HTTPException in thread."
            )
            stype = "canon_fact"

        # Build the queue item
        item_in = WriterReviewQueueItemCreate(
            title=title[:255],
            content=content_text,
            suggestion_type=stype,
            source_excerpt=(candidate.get("source_excerpt") or "")[:500] or None,
            source_chapter_id=chapter_id,
            proposed_target_label=(candidate.get("proposed_target_label") or None),
            proposed_target_type=(candidate.get("proposed_target_type") or None),
            character_id=character_id,
            importance_score=candidate.get("importance_score", 0.5),
            created_by="ai_extraction",
        )

        try:
            created = writer_review_queue_service.create_queue_item(
                db=db, item_in=item_in, story_id=story_id
            )
            existing_titles.append(title)  # prevent in-batch dupes
            inserted += 1
            logger.info(
                f"[MemoryExtraction] Inserted queue item '{title}' (type={stype}) "
                f"id={created.id} for chapter {chapter_id}."
            )
        except Exception:
            logger.exception(f"[MemoryExtraction] Failed to insert candidate '{title}'.")

    logger.info(f"[MemoryExtraction] Done — inserted {inserted} item(s) for chapter {chapter_id}.")


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _title_words(title: str) -> set:
    """Return lowercase significant words from a title (strip short stop-words)."""
    stop = {"a", "an", "the", "of", "in", "is", "was", "to", "and", "or", "for", "with"}
    return {w for w in title.lower().split() if w not in stop and len(w) > 2}


def _is_duplicate_title(new_title: str, existing_titles: List[str]) -> bool:
    """
    Returns True if new_title is semantically close to any existing title.
    Uses symmetric Jaccard similarity (intersection / union) so the check is
    directionally neutral — a short new title that is a subset of a long
    existing title, and vice versa, are both caught correctly.
    Threshold: 0.60 (previously 0.80 on one-directional ratio, which was too
    permissive when the new title was longer than the existing one).
    """
    JACCARD_THRESHOLD = 0.60
    new_words = _title_words(new_title)
    if not new_words:
        return False
    for existing in existing_titles:
        existing_words = _title_words(existing)
        if not existing_words:
            continue
        union = new_words | existing_words
        if not union:
            continue
        jaccard = len(new_words & existing_words) / len(union)
        if jaccard >= JACCARD_THRESHOLD:
            return True
    return False

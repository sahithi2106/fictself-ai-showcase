from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.chapter import Chapter
from app.schemas.chapter import ChapterCreate, ChapterUpdate

from app.services.chapter_embedding_service import chapter_embedding_service
from app.services import memory_extraction_service

def get_chapter(db: Session, chapter_id: UUID) -> Optional[Chapter]:
    return db.query(Chapter).filter(Chapter.id == chapter_id).first()

def get_chapters_by_story(db: Session, story_id: UUID, skip: int = 0, limit: int = 100) -> List[Chapter]:
    return db.query(Chapter).filter(Chapter.story_id == story_id).order_by(Chapter.chapter_number).offset(skip).limit(limit).all()

def create_chapter(db: Session, chapter_in: ChapterCreate, story_id: UUID) -> Chapter:
    db_chapter = Chapter(
        **chapter_in.model_dump(),
        story_id=story_id
    )
    db.add(db_chapter)
    db.commit()
    db.refresh(db_chapter)
    
    # Re-index the chapter for story memory
    chapter_embedding_service.reindex_chapter(db, db_chapter)
    
    return db_chapter

def update_chapter(db: Session, db_chapter: Chapter, chapter_in: ChapterUpdate) -> Chapter:
    update_data = chapter_in.model_dump(exclude_unset=True)
    
    # Check if publishing chapter to cascade to parent story
    if update_data.get('status') == 'published':
        from app.models.story import Story
        story = db.query(Story).filter(Story.id == db_chapter.story_id).first()
        if story and not story.is_published:
            story.is_published = True
            story.status = 'Ongoing'
            db.add(story)

    for field, value in update_data.items():
        setattr(db_chapter, field, value)
    
    db.add(db_chapter)
    db.commit()
    db.refresh(db_chapter)
    
    # Re-index the chapter for story memory RAG
    chapter_embedding_service.reindex_chapter(db, db_chapter)

    # Phase 4B-lite: auto-extract memory candidates into the Writer Review Queue.
    # Runs in a background thread — chapter save is never blocked by this.
    memory_extraction_service.trigger_extraction_async(
        chapter_id=db_chapter.id,
        story_id=db_chapter.story_id,
    )

    return db_chapter

def delete_chapter(db: Session, db_chapter: Chapter) -> Chapter:
    # First, cleanup vectors and chunk rows
    chapter_embedding_service._delete_existing_chunks(db, db_chapter.id)
    
    db.delete(db_chapter)
    db.commit()
    return db_chapter

def get_pinned_chapters(db: Session, story_id: UUID) -> List[Chapter]:
    """
    Returns all pinned chapters for a story ordered by chapter number.
    These are writer-priority chapters that should be treated as more important
    than normal retrieved story memory.
    """
    return db.query(Chapter).filter(
        Chapter.story_id == story_id,
        Chapter.is_pinned == True
    ).order_by(Chapter.chapter_number).all()

def get_relevant_chapters_for_context(db: Session, story_id: UUID, active_chapter_id: Optional[UUID] = None) -> List[Chapter]:
    """
    Returns up to 3 chapters relevant to the current context.
    If active_chapter_id exists, returns the active chapter and up to 2 immediately preceding chapters.
    If no active_chapter_id exists, returns the 3 most recent chapters in chronological order.
    """
    if active_chapter_id:
        active_chapter = get_chapter(db, active_chapter_id)
        if active_chapter:
            # Get up to 2 preceding chapters
            preceding = db.query(Chapter).filter(
                Chapter.story_id == story_id,
                Chapter.chapter_number < active_chapter.chapter_number
            ).order_by(Chapter.chapter_number.desc()).limit(2).all()
            
            # Combine and return in chronological order
            combined = list(reversed(preceding)) + [active_chapter]
            return combined
            
    # Fallback: get the 3 most recent chapters
    recent_chapters = db.query(Chapter).filter(
        Chapter.story_id == story_id
    ).order_by(Chapter.chapter_number.desc()).limit(3).all()
    
    return list(reversed(recent_chapters))

"""
Shared ownership permission helpers.
Centralizes all FK-chain ownership checks to ensure consistency
and prevent privilege escalation from missed checks.
"""
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.services import story_service, character_service, chapter_service


def assert_story_owner(db: Session, story_id: UUID, current_user):
    """Verify story belongs to current_user. Returns the story."""
    story = story_service.get_story(db=db, story_id=story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return story


def assert_character_owner(db: Session, character_id: UUID, current_user):
    """Verify character's parent story belongs to current_user. Returns (character, story)."""
    character = character_service.get_character(db=db, character_id=character_id)
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    story = story_service.get_story(db=db, story_id=character.story_id)
    if not story or story.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return character, story


def assert_chapter_owner(db: Session, chapter_id: UUID, current_user):
    """Verify chapter's parent story belongs to current_user. Returns (chapter, story)."""
    chapter = chapter_service.get_chapter(db=db, chapter_id=chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    story = story_service.get_story(db=db, story_id=chapter.story_id)
    if not story or story.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return chapter, story

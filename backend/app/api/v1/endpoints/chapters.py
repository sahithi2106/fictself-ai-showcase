from typing import Any, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import SessionDep, CurrentUser
from app.schemas.chapter import ChapterCreate, ChapterUpdate, ChapterResponse
from app.services import chapter_service, story_service
from app.models.story import Story
from app.models.chapter_vote import ChapterVote
from app.models.notification import Notification

router = APIRouter()

def _check_story_ownership(db: SessionDep, story_id: UUID, current_user: CurrentUser):
    story = story_service.get_story(db=db, story_id=story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

@router.post("/stories/{story_id}/chapters", response_model=ChapterResponse, status_code=status.HTTP_201_CREATED)
def create_chapter(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    story_id: UUID,
    chapter_in: ChapterCreate,
) -> Any:
    """
    Create a new chapter for a story.
    """
    _check_story_ownership(db, story_id, current_user)
    chapter = chapter_service.create_chapter(db=db, chapter_in=chapter_in, story_id=story_id)
    return chapter

@router.get("/stories/{story_id}/chapters", response_model=List[ChapterResponse])
def read_chapters(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    story_id: UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    story = story_service.get_story(db=db, story_id=story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
        
    is_owner = story.author_id == current_user.id
    if not is_owner and not story.is_published:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    chapters = chapter_service.get_chapters_by_story(db=db, story_id=story_id, skip=skip, limit=limit)
    if not is_owner:
        chapters = [c for c in chapters if c.status == "published"]
    return chapters

@router.get("/chapters/{chapter_id}", response_model=ChapterResponse)
def read_chapter(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    chapter_id: UUID,
) -> Any:
    """
    Get a specific chapter by id.
    """
    chapter = chapter_service.get_chapter(db=db, chapter_id=chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
        
    story = story_service.get_story(db=db, story_id=chapter.story_id)
    is_owner = story.author_id == current_user.id
    if not is_owner:
        if not story.is_published or chapter.status != "published":
            raise HTTPException(status_code=403, detail="Not enough permissions")
            
    return chapter

@router.put("/chapters/{chapter_id}", response_model=ChapterResponse)
def update_chapter(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    chapter_id: UUID,
    chapter_in: ChapterUpdate,
) -> Any:
    """
    Update a chapter.
    """
    chapter = chapter_service.get_chapter(db=db, chapter_id=chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    _check_story_ownership(db, chapter.story_id, current_user)
    
    chapter = chapter_service.update_chapter(db=db, db_chapter=chapter, chapter_in=chapter_in)
    return chapter

@router.delete("/chapters/{chapter_id}", status_code=204)
def delete_chapter(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    chapter_id: UUID,
) -> None:
    """
    Delete a chapter.
    """
    chapter = chapter_service.get_chapter(db=db, chapter_id=chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    _check_story_ownership(db, chapter.story_id, current_user)
    
    chapter_service.delete_chapter(db=db, db_chapter=chapter)

from app.models.chapter_vote import ChapterVote

@router.get("/chapters/{chapter_id}/vote")
def get_chapter_vote(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    chapter_id: UUID,
) -> Any:
    """
    Get the current vote count and the user's vote status for a chapter.
    """
    chapter = chapter_service.get_chapter(db=db, chapter_id=chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    vote_count = db.query(ChapterVote).filter(ChapterVote.chapter_id == chapter_id).count()
    user_vote = db.query(ChapterVote).filter(
        ChapterVote.chapter_id == chapter_id,
        ChapterVote.user_id == current_user.id
    ).first()

    return {
        "chapter_id": chapter_id,
        "vote_count": vote_count,
        "user_has_voted": user_vote is not None
    }

@router.post("/chapters/{chapter_id}/vote")
def toggle_chapter_vote(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    chapter_id: UUID,
) -> Any:
    """
    Toggle the user's vote on a chapter.
    """
    chapter = chapter_service.get_chapter(db=db, chapter_id=chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    existing_vote = db.query(ChapterVote).filter(
        ChapterVote.chapter_id == chapter_id,
        ChapterVote.user_id == current_user.id
    ).first()

    if existing_vote:
        db.delete(existing_vote)
        story = db.query(Story).filter(Story.id == chapter.story_id).first()
        if story and story.likes and story.likes > 0:
            story.likes -= 1
        db.commit()
    else:
        new_vote = ChapterVote(chapter_id=chapter_id, user_id=current_user.id)
        db.add(new_vote)
        story = db.query(Story).filter(Story.id == chapter.story_id).first()
        if story:
            if story.likes is None:
                story.likes = 0
            story.likes += 1
            
            if story.author_id != current_user.id:
                notification = Notification(
                    user_id=story.author_id,
                    type="like",
                    title="New Chapter Like",
                    message=f"{current_user.username} liked Chapter {chapter.chapter_number} of {story.title}",
                    actor_id=current_user.id,
                    story_id=story.id,
                    chapter_id=chapter.id
                )
                db.add(notification)
        db.commit()

    # Return updated state
    vote_count = db.query(ChapterVote).filter(ChapterVote.chapter_id == chapter_id).count()
    
    return {
        "chapter_id": chapter_id,
        "vote_count": vote_count,
        "user_has_voted": not existing_vote
    }

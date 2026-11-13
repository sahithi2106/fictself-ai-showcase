from typing import Any, List
import uuid
import os
import shutil
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy import func

from app.api.deps import SessionDep, CurrentUser
from app.schemas.story import StoryCreate, StoryUpdate, StoryResponse
from app.services import story_service

router = APIRouter()


def _enrich_story_response(story, db) -> dict:
    """Convert Story ORM object to a dict with author details resolved."""
    from app.models.chapter import Chapter
    from app.models.user import User
    
    published_count = db.query(Chapter).filter(Chapter.story_id == story.id, Chapter.status == "published").count()
    draft_count = db.query(Chapter).filter(Chapter.story_id == story.id, Chapter.status == "draft").count()
    
    from app.models.chapter_vote import ChapterVote
    total_votes = db.query(func.count(ChapterVote.id))\
        .join(Chapter, Chapter.id == ChapterVote.chapter_id)\
        .filter(Chapter.story_id == story.id).scalar() or 0
    
    author = db.query(User).filter(User.id == story.author_id).first()
    author_username = author.username if author else None
    author_display_name = author.display_name if author else None
    
    data = {
        "id": story.id,
        "author_id": story.author_id,
        "title": story.title,
        "description": story.description,
        "tagline": story.tagline,
        "cover_url": story.cover_url,
        "genre": story.genre,
        "subgenre": story.subgenre,
        "status": story.status,
        "language": story.language,
        "tags": story.tags,
        "is_published": story.is_published,
        "is_archived": story.is_archived,
        "archived_at": story.archived_at,
        "word_count": story.word_count,
        "character_bible": story.character_bible,
        "created_at": story.created_at,
        "updated_at": story.updated_at,
        "author_username": author_username,
        "author_display_name": author_display_name,
        "published_count": published_count,
        "draft_count": draft_count,
        "views": story.views or 0,
        "likes": total_votes,
        "total_views": story.views or 0,
        "total_votes": total_votes,
    }
    return data


@router.post("/", response_model=StoryResponse, status_code=status.HTTP_201_CREATED)
def create_story(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    story_in: StoryCreate,
) -> Any:
    """
    Create new story.
    """
    if story_in.genre and len(story_in.genre) > 100:
        raise HTTPException(status_code=400, detail="Genre is too long (max 100 characters)")
    if story_in.subgenre and len(story_in.subgenre) > 100:
        raise HTTPException(status_code=400, detail="Subgenre is too long (max 100 characters)")
    if story_in.tags:
        if not isinstance(story_in.tags, list):
            raise HTTPException(status_code=400, detail="Tags must be a list of strings")
        if len(story_in.tags) > 10:
            raise HTTPException(status_code=400, detail="Maximum 10 tags allowed")
        for tag in story_in.tags:
            if len(tag) > 50:
                raise HTTPException(status_code=400, detail=f"Tag '{tag}' is too long (max 50 characters)")

    story = story_service.create_story(db=db, story_in=story_in, author_id=current_user.id)
    return _enrich_story_response(story, db)


@router.get("/", response_model=List[StoryResponse])
def read_stories(
    db: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve stories owned by the current user.
    """
    stories = story_service.get_stories_by_user(db=db, user_id=current_user.id, skip=skip, limit=limit)
    return [_enrich_story_response(s, db) for s in stories]


@router.get("/public", response_model=List[StoryResponse])
def read_public_stories(
    db: SessionDep,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve all published and non-archived stories for the platform discover feed.
    This endpoint is public and does not require authentication.
    """
    stories = story_service.get_public_stories(db=db, skip=skip, limit=limit)
    return [_enrich_story_response(s, db) for s in stories]


@router.get("/{story_id}", response_model=StoryResponse)
def read_story(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    story_id: UUID,
) -> Any:
    """
    Get a specific story by id.
    """
    story = story_service.get_story(db=db, story_id=story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.author_id != current_user.id and not story.is_published:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return _enrich_story_response(story, db)


@router.put("/{story_id}", response_model=StoryResponse)
def update_story(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    story_id: UUID,
    story_in: StoryUpdate,
) -> Any:
    """
    Update a story.
    """
    story = story_service.get_story(db=db, story_id=story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    if story_in.genre and len(story_in.genre) > 100:
        raise HTTPException(status_code=400, detail="Genre is too long (max 100 characters)")
    if story_in.subgenre and len(story_in.subgenre) > 100:
        raise HTTPException(status_code=400, detail="Subgenre is too long (max 100 characters)")
    if story_in.tags:
        if not isinstance(story_in.tags, list):
            raise HTTPException(status_code=400, detail="Tags must be a list of strings")
        if len(story_in.tags) > 10:
            raise HTTPException(status_code=400, detail="Maximum 10 tags allowed")
        for tag in story_in.tags:
            if len(tag) > 50:
                raise HTTPException(status_code=400, detail=f"Tag '{tag}' is too long (max 50 characters)")

    story = story_service.update_story(db=db, db_story=story, story_in=story_in)
    return _enrich_story_response(story, db)


@router.delete("/{story_id}", response_model=StoryResponse)
def delete_story(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    story_id: UUID,
) -> Any:
    """
    Delete a story.
    """
    story = story_service.get_story(db=db, story_id=story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    result = _enrich_story_response(story, db)
    story_service.delete_story(db=db, db_story=story)
    return result


@router.post("/{story_id}/cover", response_model=StoryResponse)
def upload_story_cover(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    story_id: UUID,
    file: UploadFile = File(...),
) -> Any:
    """
    Upload a cover image for a story.
    """
    story = story_service.get_story(db=db, story_id=story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Generate unique filename
    ext = os.path.splitext(file.filename)[1] if file.filename else ".png"
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join("uploads", "story_covers", filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    cover_url = f"/uploads/story_covers/{filename}"
    
    story_in = StoryUpdate(cover_url=cover_url)
    story = story_service.update_story(db=db, db_story=story, story_in=story_in)
    return _enrich_story_response(story, db)


@router.delete("/{story_id}/cover", response_model=StoryResponse)
def remove_story_cover(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    story_id: UUID,
) -> Any:
    """
    Remove cover image from a story.
    """
    story = story_service.get_story(db=db, story_id=story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    story_in = StoryUpdate(cover_url="")
    story = story_service.update_story(db=db, db_story=story, story_in=story_in)
    return _enrich_story_response(story, db)

@router.post("/{story_id}/read", response_model=dict)
def increment_story_read(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    story_id: UUID,
    chapter_id: UUID = None,
) -> Any:
    """
    Increment the view count of a story and update reading progress.
    """
    story = story_service.get_story(db=db, story_id=story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Track view with StoryView to avoid duplicates
    from app.models.library import StoryView, ReadingProgress
    from datetime import datetime, timezone, timedelta
    
    one_day_ago = datetime.now(timezone.utc) - timedelta(days=1)
    recent_view = db.query(StoryView).filter(
        StoryView.user_id == current_user.id,
        StoryView.story_id == story.id,
        StoryView.viewed_at >= one_day_ago
    ).first()
    
    if not recent_view:
        new_view = StoryView(
            user_id=current_user.id,
            story_id=story.id,
            chapter_id=chapter_id
        )
        db.add(new_view)
        story.views = (story.views or 0) + 1
    
    # Update reading progress
    
    p = db.query(ReadingProgress).filter(
        ReadingProgress.user_id == current_user.id, 
        ReadingProgress.story_id == story_id
    ).first()
    
    if p:
        if chapter_id:
            p.chapter_id = chapter_id
        p.last_read_at = datetime.now(timezone.utc)
    else:
        p = ReadingProgress(
            user_id=current_user.id,
            story_id=story_id,
            chapter_id=chapter_id,
            last_read_at=datetime.now(timezone.utc)
        )
        db.add(p)
        
    db.commit()
    
    return {"status": "success", "views": (story.views or 0) + 1}

@router.post("/{story_id}/like", response_model=dict)
def toggle_story_like(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    story_id: UUID,
) -> Any:
    """
    Toggle a like on a story for the current user.
    """
    story = story_service.get_story(db=db, story_id=story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
        
    is_liked = story_service.toggle_story_like(db=db, story_id=story_id, user_id=current_user.id)
    
    # Refresh story to get updated likes
    db.refresh(story)
    
    return {
        "status": "success", 
        "is_liked": is_liked, 
        "likes": story.likes or 0
    }

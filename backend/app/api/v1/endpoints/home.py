from typing import Any, List
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.api.deps import get_db, get_current_user_optional
from app.models.user import User
from app.models.story import Story
from app.models.chapter import Chapter
from app.models.library import ReadingProgress
from app.models.follow import UserFollow
from app.schemas.story import StoryResponse
from app.api.v1.endpoints.stories import _enrich_story_response

router = APIRouter()

@router.get("/trending", response_model=List[StoryResponse])
def get_trending_stories(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 20,
) -> Any:
    """
    Get trending stories ranked by views + (likes * 3).
    """
    # Create a subquery or simply order by the formula
    stories = (
        db.query(Story)
        .filter(Story.is_published == True, Story.is_archived == False)
        .order_by(desc(func.coalesce(Story.views, 0) + (func.coalesce(Story.likes, 0) * 3)))
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_enrich_story_response(s, db) for s in stories]

@router.get("/recommended", response_model=List[StoryResponse])
def get_recommended_stories(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    skip: int = 0,
    limit: int = 20,
) -> Any:
    """
    Get recommended stories based on user's reading progress genres.
    """
    if not current_user:
        return []
        
    # 1. Get user's read stories
    read_progress = db.query(ReadingProgress).filter(ReadingProgress.user_id == current_user.id).all()
    read_story_ids = [p.story_id for p in read_progress]
    
    # 2. Extract genres user likes
    genres = set()
    if read_story_ids:
        read_stories = db.query(Story).filter(Story.id.in_(read_story_ids)).all()
        for s in read_stories:
            if s.genre:
                genres.add(s.genre)
    
    query = db.query(Story).filter(
        Story.is_published == True, 
        Story.is_archived == False,
        Story.author_id != current_user.id # Don't recommend own stories
    )
    
    if read_story_ids:
        query = query.filter(~Story.id.in_(read_story_ids))
        
    if genres:
        query = query.filter(Story.genre.in_(list(genres)))
        
    # Order by popularity
    stories = query.order_by(desc(func.coalesce(Story.views, 0) + (func.coalesce(Story.likes, 0) * 3))).offset(skip).limit(limit).all()
    
    # If not enough, fallback to trending
    if len(stories) < limit:
        remaining = limit - len(stories)
        existing_ids = [s.id for s in stories] + read_story_ids + [current_user.id] # author_id != user handled below
        fallback = (
            db.query(Story)
            .filter(
                Story.is_published == True, 
                Story.is_archived == False,
                Story.author_id != current_user.id,
                ~Story.id.in_(existing_ids)
            )
            .order_by(desc(func.coalesce(Story.views, 0) + (func.coalesce(Story.likes, 0) * 3)))
            .limit(remaining)
            .all()
        )
        stories.extend(fallback)
        
    return [_enrich_story_response(s, db) for s in stories]

@router.get("/new-releases", response_model=List[StoryResponse])
def get_new_releases(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    skip: int = 0,
    limit: int = 20,
) -> Any:
    """
    Get newly published stories from authors the user follows.
    """
    if not current_user:
        return []
        
    # 1. Get followed authors
    follows = db.query(UserFollow).filter(UserFollow.follower_id == current_user.id).all()
    followed_ids = [f.followed_id for f in follows]
    
    if not followed_ids:
        return [] # Return empty array if following nobody
        
    # 2. Get stories
    stories = (
        db.query(Story)
        .filter(
            Story.is_published == True, 
            Story.is_archived == False,
            Story.author_id.in_(followed_ids)
        )
        .order_by(desc(Story.created_at))
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_enrich_story_response(s, db) for s in stories]

@router.get("/recently-viewed", response_model=List[StoryResponse])
def get_recently_viewed(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    skip: int = 0,
    limit: int = 20,
) -> Any:
    """
    Get stories the user has recently viewed.
    """
    if not current_user:
        return []
        
    progress = (
        db.query(ReadingProgress)
        .filter(ReadingProgress.user_id == current_user.id)
        .order_by(desc(ReadingProgress.last_read_at))
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    # Need to keep order
    story_ids = [p.story_id for p in progress]
    if not story_ids:
        return []
        
    # Fetch stories
    stories = db.query(Story).filter(Story.id.in_(story_ids)).all()
    
    # Map and sort by original progress order
    story_map = {s.id: _enrich_story_response(s, db) for s in stories}
    result = []
    seen = set()
    for sid in story_ids:
        if sid in story_map and sid not in seen:
            result.append(story_map[sid])
            seen.add(sid)
            
    return result

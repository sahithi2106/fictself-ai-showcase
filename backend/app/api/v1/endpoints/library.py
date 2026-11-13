from typing import Any, List
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.library import ReadingProgress, ReadingList, ReadingListItem, SavedStory
from app.schemas.library import (
    ReadingProgressCreate, ReadingProgressUpdate, ReadingProgressResponse,
    ReadingListCreate, ReadingListResponse,
    SavedStoryCreate, SavedStoryResponse
)

router = APIRouter()

# --- Reading Progress ---

@router.get("/progress", response_model=List[ReadingProgressResponse])
def get_all_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return db.query(ReadingProgress).filter(ReadingProgress.user_id == current_user.id).order_by(ReadingProgress.last_read_at.desc()).all()

@router.get("/progress/{story_id}", response_model=ReadingProgressResponse)
def get_progress(
    story_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    p = db.query(ReadingProgress).filter(ReadingProgress.user_id == current_user.id, ReadingProgress.story_id == story_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Progress not found")
    return p

@router.post("/progress", response_model=ReadingProgressResponse)
def save_progress(
    progress_in: ReadingProgressCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    p = db.query(ReadingProgress).filter(ReadingProgress.user_id == current_user.id, ReadingProgress.story_id == progress_in.story_id).first()
    if p:
        for field, value in progress_in.model_dump(exclude_unset=True).items():
            setattr(p, field, value)
        p.last_read_at = datetime.now(timezone.utc)
    else:
        p = ReadingProgress(**progress_in.model_dump(), user_id=current_user.id)
        db.add(p)
    db.commit()
    db.refresh(p)
    return p

@router.delete("/progress/{story_id}")
def delete_progress(
    story_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    p = db.query(ReadingProgress).filter(ReadingProgress.user_id == current_user.id, ReadingProgress.story_id == story_id).first()
    if p:
        db.delete(p)
        db.commit()
    return {"status": "success"}

# --- Saved Stories ---

@router.get("/saved", response_model=List[SavedStoryResponse])
def get_saved_stories(
    list_type: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    q = db.query(SavedStory).filter(SavedStory.user_id == current_user.id)
    if list_type:
        q = q.filter(SavedStory.list_type == list_type)
    return q.order_by(SavedStory.added_at.desc()).all()

@router.post("/saved", response_model=SavedStoryResponse)
def save_story(
    saved_in: SavedStoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    s = db.query(SavedStory).filter(SavedStory.user_id == current_user.id, SavedStory.story_id == saved_in.story_id, SavedStory.list_type == saved_in.list_type).first()
    if not s:
        s = SavedStory(**saved_in.model_dump(), user_id=current_user.id)
        db.add(s)
        db.commit()
        db.refresh(s)
    return s

@router.delete("/saved/{story_id}/{list_type}")
def remove_saved_story(
    story_id: uuid.UUID,
    list_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    s = db.query(SavedStory).filter(SavedStory.user_id == current_user.id, SavedStory.story_id == story_id, SavedStory.list_type == list_type).first()
    if s:
        db.delete(s)
        db.commit()
    return {"status": "success"}

# --- Reading Lists ---

def _enrich_list(lst: ReadingList, db: Session) -> dict:
    items = db.query(ReadingListItem).filter(ReadingListItem.reading_list_id == lst.id).order_by(ReadingListItem.added_at.desc()).all()
    return {
        "id": lst.id,
        "user_id": lst.user_id,
        "name": lst.name,
        "description": lst.description,
        "cover_url": lst.cover_url,
        "is_public": lst.is_public,
        "created_at": lst.created_at,
        "updated_at": lst.updated_at,
        "items": [{"id": i.id, "story_id": i.story_id, "added_at": i.added_at} for i in items]
    }

@router.get("/lists", response_model=List[ReadingListResponse])
def get_reading_lists(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    lists = db.query(ReadingList).filter(ReadingList.user_id == current_user.id).order_by(ReadingList.created_at.desc()).all()
    return [_enrich_list(l, db) for l in lists]

@router.post("/lists", response_model=ReadingListResponse)
def create_reading_list(
    list_in: ReadingListCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    l = ReadingList(**list_in.model_dump(), user_id=current_user.id)
    db.add(l)
    db.commit()
    db.refresh(l)
    return _enrich_list(l, db)

@router.delete("/lists/{list_id}")
def delete_reading_list(
    list_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    l = db.query(ReadingList).filter(ReadingList.user_id == current_user.id, ReadingList.id == list_id).first()
    if l:
        db.delete(l)
        db.commit()
    return {"status": "success"}

@router.post("/lists/{list_id}/items", response_model=dict)
def add_to_reading_list(
    list_id: uuid.UUID,
    item_in: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    l = db.query(ReadingList).filter(ReadingList.user_id == current_user.id, ReadingList.id == list_id).first()
    if not l:
        raise HTTPException(status_code=404, detail="Reading list not found")
        
    story_id_str = item_in.get("story_id")
    if not story_id_str:
        raise HTTPException(status_code=400, detail="story_id is required")
        
    story_id = uuid.UUID(story_id_str)
    
    # Check if already exists
    existing = db.query(ReadingListItem).filter(
        ReadingListItem.reading_list_id == list_id,
        ReadingListItem.story_id == story_id
    ).first()
    
    if not existing:
        item = ReadingListItem(reading_list_id=list_id, story_id=story_id)
        db.add(item)
        db.commit()
        
    return {"status": "success"}

@router.delete("/lists/{list_id}/items/{story_id}")
def remove_from_reading_list(
    list_id: uuid.UUID,
    story_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    l = db.query(ReadingList).filter(ReadingList.user_id == current_user.id, ReadingList.id == list_id).first()
    if not l:
        raise HTTPException(status_code=404, detail="Reading list not found")
        
    item = db.query(ReadingListItem).filter(
        ReadingListItem.reading_list_id == list_id,
        ReadingListItem.story_id == story_id
    ).first()
    
    if item:
        db.delete(item)
        db.commit()
        
    return {"status": "success"}

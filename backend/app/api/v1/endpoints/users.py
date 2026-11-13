import uuid
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.api.deps import get_db, CurrentUser, CurrentUserOptional, get_current_user
from app.models.user import User
from app.models.follow import UserFollow
from app.models.notification import Notification
from app.models.story import Story
from app.models.library import ReadingList
from app.api.v1.endpoints.stories import _enrich_story_response

router = APIRouter()

@router.post("/{user_id}/follow", response_model=dict)
def follow_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
        
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    existing = db.query(UserFollow).filter(
        UserFollow.follower_id == current_user.id,
        UserFollow.followed_id == user_id
    ).first()
    
    if not existing:
        follow = UserFollow(follower_id=current_user.id, followed_id=user_id)
        db.add(follow)
        
        notification = Notification(
            user_id=user_id,
            type="follow",
            title="New Follower",
            message=f"{current_user.username} started following you.",
            actor_id=current_user.id
        )
        db.add(notification)
        db.commit()
        
    followers_count = db.query(UserFollow).filter(UserFollow.followed_id == user_id).count()
    return {
        "status": "success",
        "is_following": True,
        "followers_count": followers_count
    }

@router.delete("/{user_id}/follow", response_model=dict)
def unfollow_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    existing = db.query(UserFollow).filter(
        UserFollow.follower_id == current_user.id,
        UserFollow.followed_id == user_id
    ).first()
    
    if existing:
        db.delete(existing)
        db.commit()
        
    followers_count = db.query(UserFollow).filter(UserFollow.followed_id == user_id).count()
    return {
        "status": "success",
        "is_following": False,
        "followers_count": followers_count
    }

@router.get("/{user_id}/follow-status", response_model=dict)
def get_follower_counts(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUserOptional = None
) -> Any:
    followers_count = db.query(UserFollow).filter(UserFollow.followed_id == user_id).count()
    following_count = db.query(UserFollow).filter(UserFollow.follower_id == user_id).count()
    
    is_following = False
    if current_user:
        is_following = db.query(UserFollow).filter(
            UserFollow.follower_id == current_user.id,
            UserFollow.followed_id == user_id
        ).first() is not None
        
    return {
        "followers_count": followers_count,
        "following_count": following_count,
        "is_following": is_following
    }

@router.get("/{user_id}/public-profile", response_model=dict)
def get_public_profile(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUserOptional = None
) -> Any:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    followers_count = db.query(UserFollow).filter(UserFollow.followed_id == user_id).count()
    following_count = db.query(UserFollow).filter(UserFollow.follower_id == user_id).count()
    
    public_story_count = db.query(Story).filter(
        Story.author_id == user_id,
        Story.is_published == True,
        Story.is_archived == False
    ).count()
    
    public_reading_list_count = db.query(ReadingList).filter(
        ReadingList.user_id == user_id,
        ReadingList.is_public == True
    ).count()
    
    is_following = False
    is_own_profile = False
    if current_user:
        is_own_profile = (current_user.id == user_id)
        if not is_own_profile:
            is_following = db.query(UserFollow).filter(
                UserFollow.follower_id == current_user.id,
                UserFollow.followed_id == user_id
            ).first() is not None
            
    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "profile_image": user.profile_image,
        "bio": user.bio,
        "about_me": user.about_me,
        "created_at": user.created_at,
        "followers_count": followers_count,
        "following_count": following_count,
        "public_story_count": public_story_count,
        "public_reading_list_count": public_reading_list_count,
        "is_following_viewer": is_following,
        "is_own_profile": is_own_profile
    }

@router.get("/{user_id}/public-stories", response_model=list)
def get_public_stories(
    user_id: uuid.UUID,
    db: Session = Depends(get_db)
) -> Any:
    stories = db.query(Story).filter(
        Story.author_id == user_id,
        Story.is_published == True,
        Story.is_archived == False
    ).order_by(Story.created_at.desc()).all()
    
    return [_enrich_story_response(s, db) for s in stories]

@router.get("/{user_id}/public-reading-lists", response_model=list)
def get_public_reading_lists(
    user_id: uuid.UUID,
    db: Session = Depends(get_db)
) -> Any:
    lists = db.query(ReadingList).filter(
        ReadingList.user_id == user_id,
        ReadingList.is_public == True
    ).order_by(ReadingList.created_at.desc()).all()
    
    return [{
        "id": l.id,
        "name": l.name,
        "description": l.description,
        "cover_url": l.cover_url,
        "story_ids": [str(item.story_id) for item in l.items] if hasattr(l, 'items') else [],
        "is_public": l.is_public,
        "created_at": l.created_at
    } for l in lists]

@router.get("/{user_id}/followers", response_model=list)
def get_followers_list(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUserOptional = None
) -> Any:
    follows = db.query(UserFollow).filter(UserFollow.followed_id == user_id).all()
    follower_ids = [f.follower_id for f in follows]
    users = db.query(User).filter(User.id.in_(follower_ids)).all() if follower_ids else []
    
    result = []
    for u in users:
        is_following = False
        if current_user and current_user.id != u.id:
            is_following = db.query(UserFollow).filter(
                UserFollow.follower_id == current_user.id,
                UserFollow.followed_id == u.id
            ).first() is not None
            
        result.append({
            "id": u.id,
            "username": u.username,
            "display_name": u.display_name,
            "profile_image": u.profile_image,
            "bio": u.bio,
            "is_following_viewer": is_following
        })
    return result

@router.get("/{user_id}/following", response_model=list)
def get_following_list(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUserOptional = None
) -> Any:
    follows = db.query(UserFollow).filter(UserFollow.follower_id == user_id).all()
    following_ids = [f.followed_id for f in follows]
    users = db.query(User).filter(User.id.in_(following_ids)).all() if following_ids else []
    
    result = []
    for u in users:
        is_following = False
        if current_user and current_user.id != u.id:
            is_following = db.query(UserFollow).filter(
                UserFollow.follower_id == current_user.id,
                UserFollow.followed_id == u.id
            ).first() is not None
            
        result.append({
            "id": u.id,
            "username": u.username,
            "display_name": u.display_name,
            "profile_image": u.profile_image,
            "bio": u.bio,
            "is_following_viewer": is_following
        })
    return result

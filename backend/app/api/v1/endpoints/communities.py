from typing import Any, List
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.deps import get_db, get_current_user
from app.models.community import Community, CommunityMember
from app.models.user import User
from app.schemas.community import CommunityCreate, CommunityUpdate, CommunityResponse

router = APIRouter()

def _enrich_community(c: Community, current_user_id: uuid.UUID, db: Session) -> dict:
    member_count = db.query(func.count(CommunityMember.user_id)).filter(CommunityMember.community_id == c.id).scalar() or 0
    is_joined = False
    if current_user_id:
        is_joined = db.query(CommunityMember).filter(CommunityMember.community_id == c.id, CommunityMember.user_id == current_user_id).first() is not None
    
    return {
        "id": c.id,
        "creator_id": c.creator_id,
        "name": c.name,
        "description": c.description,
        "cover_url": c.cover_url,
        "is_private": c.is_private,
        "tags": getattr(c, 'tags', []),
        "created_at": c.created_at,
        "updated_at": c.updated_at,
        "member_count": member_count,
        "is_joined": is_joined
    }

@router.get("", response_model=List[CommunityResponse])
def read_communities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    communities = db.query(Community).order_by(Community.created_at.desc()).offset(skip).limit(limit).all()
    return [_enrich_community(c, current_user.id if current_user else None, db) for c in communities]

@router.post("", response_model=CommunityResponse)
def create_community(
    *,
    db: Session = Depends(get_db),
    community_in: CommunityCreate,
    current_user: User = Depends(get_current_user)
) -> Any:
    existing = db.query(Community).filter(Community.name == community_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Community with this name already exists")
        
    if community_in.cover_url:
        if community_in.cover_url.startswith("data:image/") or len(community_in.cover_url) > 1024:
            raise HTTPException(status_code=400, detail="Invalid cover image URL. Please upload the image file instead.")

    create_data = community_in.model_dump()
    create_data.pop('tags', None)
    c = Community(
        **create_data,
        creator_id=current_user.id
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    
    # Add creator as member
    member = CommunityMember(community_id=c.id, user_id=current_user.id)
    db.add(member)
    db.commit()
    
    return _enrich_community(c, current_user.id, db)

@router.put("/{community_id}", response_model=CommunityResponse)
def update_community(
    *,
    db: Session = Depends(get_db),
    community_id: uuid.UUID,
    community_in: CommunityUpdate,
    current_user: User = Depends(get_current_user)
) -> Any:
    c = db.query(Community).filter(Community.id == community_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Community not found")
    if c.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    if community_in.cover_url:
        if community_in.cover_url.startswith("data:image/") or len(community_in.cover_url) > 1024:
            raise HTTPException(status_code=400, detail="Invalid cover image URL. Please upload the image file instead.")
        
    update_data = community_in.model_dump(exclude_unset=True)
    update_data.pop('tags', None)
    for field, value in update_data.items():
        setattr(c, field, value)
        
    db.commit()
    db.refresh(c)
    return _enrich_community(c, current_user.id, db)

@router.delete("/{community_id}")
def delete_community(
    *,
    db: Session = Depends(get_db),
    community_id: uuid.UUID,
    current_user: User = Depends(get_current_user)
) -> Any:
    c = db.query(Community).filter(Community.id == community_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Community not found")
    if c.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    db.delete(c)
    db.commit()
    return {"status": "success"}

@router.post("/{community_id}/join")
def join_community(
    *,
    db: Session = Depends(get_db),
    community_id: uuid.UUID,
    current_user: User = Depends(get_current_user)
) -> Any:
    c = db.query(Community).filter(Community.id == community_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Community not found")
        
    existing = db.query(CommunityMember).filter(CommunityMember.community_id == community_id, CommunityMember.user_id == current_user.id).first()
    if not existing:
        member = CommunityMember(community_id=community_id, user_id=current_user.id)
        db.add(member)
        db.commit()
        
    return _enrich_community(c, current_user.id, db)

@router.post("/{community_id}/leave")
def leave_community(
    *,
    db: Session = Depends(get_db),
    community_id: uuid.UUID,
    current_user: User = Depends(get_current_user)
) -> Any:
    c = db.query(Community).filter(Community.id == community_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Community not found")
        
    if c.creator_id == current_user.id:
        raise HTTPException(status_code=400, detail="Creator cannot leave community")
        
    existing = db.query(CommunityMember).filter(CommunityMember.community_id == community_id, CommunityMember.user_id == current_user.id).first()
    if not existing:
        raise HTTPException(status_code=400, detail="You are not a member of this community")
        
    db.delete(existing)
    db.commit()
        
    return _enrich_community(c, current_user.id, db)

from app.models.community_post import CommunityPost, CommunityPostComment, CommunityPostLike
from app.schemas.community_post import CommunityPostCreate, CommunityPostResponse, CommunityPostCommentCreate, CommunityPostCommentResponse

def _enrich_post(p: CommunityPost, current_user_id: uuid.UUID, db: Session) -> dict:
    is_liked = False
    if current_user_id:
        is_liked = db.query(CommunityPostLike).filter(CommunityPostLike.post_id == p.id, CommunityPostLike.user_id == current_user_id).first() is not None
    
    comments = db.query(CommunityPostComment).filter(CommunityPostComment.post_id == p.id).order_by(CommunityPostComment.created_at.asc()).all()
    
    # Build comment tree
    comment_map = {}
    top_level = []
    
    for c in comments:
        c_dict = {
            "id": c.id,
            "post_id": c.post_id,
            "author_id": c.author_id,
            "author_name": c.author.username if c.author else "Unknown",
            "content": c.content,
            "parent_comment_id": c.parent_comment_id,
            "created_at": c.created_at,
            "replies": []
        }
        comment_map[c.id] = c_dict
        
    for c in comments:
        if c.parent_comment_id and c.parent_comment_id in comment_map:
            comment_map[c.parent_comment_id]["replies"].append(comment_map[c.id])
        else:
            top_level.append(comment_map[c.id])
            
    # Sort top level newest first, replies oldest first
    top_level.sort(key=lambda x: x["created_at"], reverse=True)
    
    return {
        "id": p.id,
        "community_id": p.community_id,
        "author_id": p.author_id,
        "author_name": p.author.username if p.author else "Unknown",
        "title": p.title,
        "content": p.content,
        "image_url": p.image_url,
        "poll_data": p.poll_data,
        "likes_count": p.likes_count,
        "is_liked": is_liked,
        "comments_count": len(comments),
        "created_at": p.created_at,
        "updated_at": p.updated_at,
        "comments": top_level
    }

@router.get("/{community_id}/posts", response_model=List[CommunityPostResponse])
def get_community_posts(
    *,
    db: Session = Depends(get_db),
    community_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100
) -> Any:
    posts = db.query(CommunityPost).filter(CommunityPost.community_id == community_id).order_by(CommunityPost.created_at.desc()).offset(skip).limit(limit).all()
    return [_enrich_post(p, current_user.id if current_user else None, db) for p in posts]

@router.post("/{community_id}/posts", response_model=CommunityPostResponse)
def create_community_post(
    *,
    db: Session = Depends(get_db),
    community_id: uuid.UUID,
    post_in: CommunityPostCreate,
    current_user: User = Depends(get_current_user)
) -> Any:
    # 1. Require membership
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
        
    is_member = db.query(CommunityMember).filter(CommunityMember.community_id == community_id, CommunityMember.user_id == current_user.id).first()
    if not is_member and community.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="You must be a member to post in this community")

    # 2. Reject bad image_url or poll_data
    if post_in.image_url:
        if post_in.image_url.startswith("data:image/") or len(post_in.image_url) > 1024:
            raise HTTPException(status_code=400, detail="Image uploads are disabled for MVP. Use text posts only.")
    
    if post_in.poll_data:
        raise HTTPException(status_code=400, detail="Poll creation is disabled for MVP. Use text posts only.")

    p = CommunityPost(
        title=post_in.title,
        content=post_in.content,
        image_url=post_in.image_url,
        poll_data=None,
        community_id=community_id,
        author_id=current_user.id
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return _enrich_post(p, current_user.id, db)

@router.post("/{community_id}/posts/{post_id}/like")
def toggle_post_like(
    *,
    db: Session = Depends(get_db),
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    current_user: User = Depends(get_current_user)
) -> Any:
    p = db.query(CommunityPost).filter(CommunityPost.id == post_id, CommunityPost.community_id == community_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Post not found")
        
    existing = db.query(CommunityPostLike).filter(CommunityPostLike.post_id == post_id, CommunityPostLike.user_id == current_user.id).first()
    if existing:
        db.delete(existing)
        p.likes_count = max(0, p.likes_count - 1)
        db.commit()
    else:
        from sqlalchemy.exc import IntegrityError
        try:
            db.add(CommunityPostLike(post_id=post_id, user_id=current_user.id))
            p.likes_count += 1
            
            from app.models.notification import Notification
            if p.author_id != current_user.id:
                notification = Notification(
                    user_id=p.author_id,
                    type="like",
                    title="New Post Like",
                    message=f"{current_user.username} liked your post in a community.",
                    actor_id=current_user.id
                )
                db.add(notification)
            
            db.commit()
        except IntegrityError:
            db.rollback()
            pass
            
    db.refresh(p)
    return _enrich_post(p, current_user.id, db)

@router.post("/{community_id}/posts/{post_id}/comments", response_model=CommunityPostCommentResponse)
def create_post_comment(
    *,
    db: Session = Depends(get_db),
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    comment_in: CommunityPostCommentCreate,
    current_user: User = Depends(get_current_user)
) -> Any:
    p = db.query(CommunityPost).filter(CommunityPost.id == post_id, CommunityPost.community_id == community_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Post not found")

    # Validate parent comment if provided
    if comment_in.parent_comment_id:
        parent_comment = db.query(CommunityPostComment).filter(
            CommunityPostComment.id == comment_in.parent_comment_id,
            CommunityPostComment.post_id == post_id
        ).first()
        if not parent_comment:
            raise HTTPException(status_code=400, detail="Parent comment not found or does not belong to this post")

    c = CommunityPostComment(
        post_id=post_id,
        author_id=current_user.id,
        content=comment_in.content,
        parent_comment_id=comment_in.parent_comment_id
    )
    db.add(c)
    
    from app.models.notification import Notification
    
    # Notify post author if top level, notify parent author if reply
    notify_user_id = p.author_id
    if comment_in.parent_comment_id:
        notify_user_id = parent_comment.author_id

    if notify_user_id != current_user.id:
        notification = Notification(
            user_id=notify_user_id,
            type="comment",
            title="New Reply" if comment_in.parent_comment_id else "New Post Comment",
            message=f"{current_user.username} {'replied to your comment' if comment_in.parent_comment_id else 'commented on your post'}.",
            actor_id=current_user.id,
            community_id=community_id,
            post_id=post_id
        )
        db.add(notification)
        
    db.commit()
    db.refresh(c)
    return {
        "id": c.id,
        "post_id": c.post_id,
        "author_id": c.author_id,
        "author_name": current_user.username,
        "content": c.content,
        "parent_comment_id": c.parent_comment_id,
        "created_at": c.created_at,
        "replies": []
    }

@router.delete("/{community_id}/posts/{post_id}")
def delete_community_post(
    *,
    db: Session = Depends(get_db),
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    current_user: User = Depends(get_current_user)
) -> Any:
    p = db.query(CommunityPost).filter(CommunityPost.id == post_id, CommunityPost.community_id == community_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Post not found")
        
    if p.author_id != current_user.id and p.community.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    db.delete(p)
    db.commit()
    return {"status": "success"}

@router.delete("/{community_id}/posts/{post_id}/comments/{comment_id}")
def delete_community_post_comment(
    *,
    db: Session = Depends(get_db),
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    comment_id: uuid.UUID,
    current_user: User = Depends(get_current_user)
) -> Any:
    c = db.query(CommunityPostComment).filter(CommunityPostComment.id == comment_id, CommunityPostComment.post_id == post_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Comment not found")
        
    p = db.query(CommunityPost).filter(CommunityPost.id == post_id, CommunityPost.community_id == community_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Post not found")
        
    if c.author_id != current_user.id and p.author_id != current_user.id and p.community.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    db.delete(c)
    db.commit()
    return {"status": "success"}
    return {"status": "success"}

import uuid
from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timezone

from app.api.deps import get_db, get_current_user
from app.models.chapter import Chapter
from app.models.chapter_comment import ChapterComment
from app.models.notification import Notification
from app.models.user import User
from app.schemas.chapter_comment import (
    ChapterCommentCreate,
    ChapterCommentReplyCreate,
    ChapterCommentUpdate,
    ChapterCommentResponse,
    ChapterCommentThreadResponse
)


router = APIRouter()

def prepare_comment_response(comment: ChapterComment) -> dict:
    """Build a serializable dict for a comment. Safe even if user was deleted."""
    user_obj = comment.user
    if user_obj is None:
        author = {
            "id": comment.user_id,
            "username": "[deleted]",
            "display_name": None,
            "profile_image": None
        }
    else:
        author = {
            "id": user_obj.id,
            "username": user_obj.username,
            "display_name": user_obj.display_name,
            "profile_image": user_obj.profile_image
        }
    return {
        "id": comment.id,
        "chapter_id": comment.chapter_id,
        "user_id": comment.user_id,
        "parent_comment_id": comment.parent_comment_id,
        "content": comment.content if not comment.is_deleted else "This comment has been deleted.",
        "created_at": comment.created_at,
        "updated_at": comment.updated_at,
        "is_deleted": comment.is_deleted,
        "is_edited": comment.updated_at > comment.created_at and not comment.is_deleted,
        "user": author
    }

@router.get("/chapters/{chapter_id}/comments", response_model=List[ChapterCommentThreadResponse])
def get_chapter_comments(
    chapter_id: uuid.UUID,
    db: Session = Depends(get_db)
) -> Any:
    """
    Get all top-level comments and their replies for a chapter.
    Public endpoint — no auth required, so readers can view without logging in.
    """
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    top_level_comments = (
        db.query(ChapterComment)
        .options(
            joinedload(ChapterComment.user),
            joinedload(ChapterComment.replies).joinedload(ChapterComment.user)
        )
        .filter(
            ChapterComment.chapter_id == chapter_id,
            ChapterComment.parent_comment_id == None,
            ChapterComment.is_deleted == False
        )
        .order_by(ChapterComment.created_at.asc())
        .all()
    )

    result = []
    for c in top_level_comments:
        c_dict = prepare_comment_response(c)
        c_dict["replies"] = [
            prepare_comment_response(r)
            for r in sorted(c.replies, key=lambda x: x.created_at)
            if not r.is_deleted
        ]
        result.append(c_dict)

    return result

@router.post("/chapters/{chapter_id}/comments", response_model=ChapterCommentResponse)
def create_comment(
    chapter_id: uuid.UUID,
    comment_in: ChapterCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Create a new top-level comment for a chapter.
    """
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    comment = ChapterComment(
        chapter_id=chapter_id,
        user_id=current_user.id,
        content=comment_in.content
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    # Attach current user directly (already available, avoids extra query)
    comment.user = current_user
    
    # Notify story author if they are not the one commenting
    if chapter.story.author_id != current_user.id:
        notification = Notification(
            user_id=chapter.story.author_id,
            type="comment",
            title=f"New comment on {chapter.title}",
            message=f"{current_user.username} commented on your chapter.",
            story_id=chapter.story_id,
            chapter_id=chapter.id,
            actor_id=current_user.id
        )
        db.add(notification)
        db.commit()

    return prepare_comment_response(comment)

@router.post("/chapters/{chapter_id}/comments/{comment_id}/replies", response_model=ChapterCommentResponse)
def create_reply(
    chapter_id: uuid.UUID,
    comment_id: uuid.UUID,
    reply_in: ChapterCommentReplyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Reply to an existing comment. Enforces 1-level nesting.
    """
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    parent_comment = (
        db.query(ChapterComment)
        .filter(
            ChapterComment.id == comment_id,
            ChapterComment.chapter_id == chapter_id
        )
        .first()
    )
    if not parent_comment:
        raise HTTPException(status_code=404, detail="Parent comment not found")

    # Enforce 1-level nesting: if parent is already a reply, attach to its parent
    actual_parent_id = (
        parent_comment.parent_comment_id
        if parent_comment.parent_comment_id
        else parent_comment.id
    )

    import traceback
    try:
        reply = ChapterComment(
            chapter_id=chapter_id,
            user_id=current_user.id,
            parent_comment_id=actual_parent_id,
            content=reply_in.content
        )
        db.add(reply)
        db.commit()
        db.refresh(reply)

        reply.user = current_user

        if parent_comment.user_id != current_user.id:
            notification = Notification(
                user_id=parent_comment.user_id,
                type="reply",
                title="New Reply",
                message=f"{current_user.username} replied to your comment.",
                story_id=chapter.story_id,
                chapter_id=chapter.id,
                actor_id=current_user.id
            )
            db.add(notification)
            db.commit()

        return prepare_comment_response(reply)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=traceback.format_exc())

@router.patch("/comments/{comment_id}", response_model=ChapterCommentResponse)
def update_comment(
    comment_id: uuid.UUID,
    comment_in: ChapterCommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Update a comment (owner only).
    """
    comment = (
        db.query(ChapterComment)
        .options(joinedload(ChapterComment.user))
        .filter(ChapterComment.id == comment_id)
        .first()
    )
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this comment")
    if comment.is_deleted:
        raise HTTPException(status_code=400, detail="Cannot edit a deleted comment")

    comment.content = comment_in.content
    comment.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(comment)

    # Re-attach user after refresh so prepare_comment_response can access it
    comment.user = current_user

    return prepare_comment_response(comment)

@router.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Soft-delete a comment (owner only).
    """
    comment = db.query(ChapterComment).filter(ChapterComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    comment.is_deleted = True
    comment.updated_at = datetime.now(timezone.utc)
    db.commit()

    return {"status": "success", "message": "Comment deleted"}

from typing import Any, List
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.api.deps import get_db, get_current_user
from app.models.user import User

router = APIRouter()

# TODO: notifications paused due to schema mismatch, reimplement later.
# Currently returning safe stubs to prevent frontend/backend crashes.

@router.get("", response_model=List[Any])
def read_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve user notifications (Stubbed).
    """
    return []

@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get unread notification count (Stubbed).
    """
    return {"unread_count": 0}

@router.put("/{notification_id}/read")
def mark_read(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Mark a notification as read (Stubbed).
    """
    return {
        "id": notification_id,
        "user_id": current_user.id,
        "type": "stub",
        "title": "Stub",
        "message": "Stub",
        "is_read": True,
        "created_at": datetime.utcnow()
    }

@router.post("/mark-all-read", response_model=dict)
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Mark all notifications as read (Stubbed).
    """
    return {"status": "success"}

@router.delete("", response_model=dict)
def clear_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Clear all notifications (Stubbed).
    """
    return {"status": "success"}

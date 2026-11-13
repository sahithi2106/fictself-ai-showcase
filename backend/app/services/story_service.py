from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.story import Story
from app.models.user import User
from app.schemas.story import StoryCreate, StoryUpdate

def get_story(db: Session, story_id: UUID) -> Optional[Story]:
    return db.query(Story).filter(Story.id == story_id).first()

def get_stories_by_user(db: Session, user_id: UUID, skip: int = 0, limit: int = 100) -> List[Story]:
    return db.query(Story).filter(Story.author_id == user_id).offset(skip).limit(limit).all()

def get_public_stories(db: Session, skip: int = 0, limit: int = 100) -> List[Story]:
    from app.models.chapter import Chapter
    return (
        db.query(Story)
        .filter(Story.is_published == True)
        .filter(Story.is_archived == False)
        .order_by(Story.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

def create_story(db: Session, story_in: StoryCreate, author_id: UUID) -> Story:
    db_story = Story(
        **story_in.model_dump(),
        author_id=author_id
    )
    db.add(db_story)
    db.commit()
    db.refresh(db_story)
    return db_story

def update_story(db: Session, db_story: Story, story_in: StoryUpdate) -> Story:
    update_data = story_in.model_dump(exclude_unset=True)

    # Handle archived_at timestamp automatically
    if 'is_archived' in update_data:
        if update_data['is_archived'] is True and not db_story.is_archived:
            # Transitioning to archived — set timestamp
            update_data['archived_at'] = datetime.now(timezone.utc)
        elif update_data['is_archived'] is False:
            # Restoring — clear timestamp
            update_data['archived_at'] = None

    # Sync status with is_published
    if 'is_published' in update_data:
        if update_data['is_published']:
            update_data['status'] = 'Ongoing'
        else:
            update_data['status'] = 'draft'

    for field, value in update_data.items():
        setattr(db_story, field, value)


    db.add(db_story)
    db.commit()
    db.refresh(db_story)
    return db_story

def delete_story(db: Session, db_story: Story) -> Story:
    db.delete(db_story)
    db.commit()
    return db_story

def get_author_username(db: Session, author_id: UUID) -> Optional[str]:
    user = db.query(User).filter(User.id == author_id).first()
    return user.username if user else None

def increment_story_views(db: Session, story_id: UUID) -> None:
    story = db.query(Story).filter(Story.id == story_id).first()
    if story:
        story.views = (story.views or 0) + 1
        db.commit()

def toggle_story_like(db: Session, story_id: UUID, user_id: UUID) -> bool:
    """Toggles a like and returns True if liked, False if unliked."""
    from app.models.story_vote import StoryVote
    
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        return False
        
    vote = db.query(StoryVote).filter(StoryVote.story_id == story_id, StoryVote.user_id == user_id).first()
    is_liked = False
    
    if vote:
        db.delete(vote)
        story.likes = max(0, (story.likes or 0) - 1)
    else:
        new_vote = StoryVote(story_id=story_id, user_id=user_id)
        db.add(new_vote)
        story.likes = (story.likes or 0) + 1
        is_liked = True
        
        if story.author_id != user_id:
            # TODO: Notifications paused due to schema mismatch; reimplement later.
            try:
                from app.models.notification import Notification
                from app.models.user import User
                user = db.query(User).filter(User.id == user_id).first()
                notification = Notification(
                    recipient_id=story.author_id,
                    type="like",
                    title="New Story Like",
                    message=f"{user.username if user else 'Someone'} liked your story {story.title}.",
                    story_id=story.id,
                    actor_id=user_id
                )
                db.add(notification)
            except Exception:
                pass  # Notifications paused — skip silently
        
    db.commit()
    return is_liked

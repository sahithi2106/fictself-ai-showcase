from app.db.base_class import Base
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import relationship

class Notification(Base):
    # TODO: Notifications paused due to schema mismatch; reimplement later.
    __tablename__ = "notifications"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    recipient_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String(50), nullable=False) # e.g. "comment", "like", "system"
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Metadata for linking
    story_id = Column(UUID(as_uuid=True), ForeignKey("stories.id"), nullable=True)
    chapter_id = Column(UUID(as_uuid=True), ForeignKey("chapters.id"), nullable=True)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    post_id = Column(UUID(as_uuid=True), nullable=True)
    community_id = Column(UUID(as_uuid=True), nullable=True)

    user = relationship("User", foreign_keys=[recipient_id])


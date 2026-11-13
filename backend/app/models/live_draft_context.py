import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.db.base_class import Base

class LiveDraftContext(Base):
    __tablename__ = "live_draft_contexts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    chapter_id = Column(UUID(as_uuid=True), ForeignKey("chapters.id"), nullable=False, unique=True, index=True)
    story_id = Column(UUID(as_uuid=True), ForeignKey("stories.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    content_snapshot = Column(Text, nullable=True)          # Current draft text
    last_n_paragraphs = Column(Text, nullable=True)         # Pre-extracted last N paragraphs
    active_characters = Column(JSONB, nullable=True)        # List of character UUIDs in recent content

    session_started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    last_saved_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    chapter = relationship("Chapter", back_populates="live_draft_context")
    story = relationship("Story", back_populates="live_draft_contexts")
    user = relationship("User", back_populates="live_draft_contexts")

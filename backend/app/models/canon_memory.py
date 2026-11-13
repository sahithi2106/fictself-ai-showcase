import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.db.base_class import Base

class CanonMemory(Base):
    __tablename__ = "canon_memories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    story_id = Column(UUID(as_uuid=True), ForeignKey("stories.id"), nullable=False, index=True)
    chapter_id = Column(UUID(as_uuid=True), ForeignKey("chapters.id"), nullable=True, index=True)
    character_ids = Column(JSONB, nullable=True)   # List of character UUIDs who witnessed this event

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    importance = Column(Integer, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc), 
        nullable=False
    )

    story = relationship("Story", back_populates="canon_memories")
    chapter = relationship("Chapter", back_populates="canon_memories")
    emotional_memories = relationship("EmotionalMemory", back_populates="source_canon_memory")

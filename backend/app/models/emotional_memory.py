import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer, Float, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base_class import Base

class EmotionalMemory(Base):
    __tablename__ = "emotional_memories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    character_id = Column(UUID(as_uuid=True), ForeignKey("characters.id"), nullable=False, index=True)
    story_id = Column(UUID(as_uuid=True), ForeignKey("stories.id"), nullable=False, index=True)
    source_canon_memory_id = Column(UUID(as_uuid=True), ForeignKey("canon_memories.id"), nullable=True)

    source_chapter_id = Column(UUID(as_uuid=True), ForeignKey("chapters.id"), nullable=True)

    primary_emotion = Column(String(100), nullable=False)
    emotional_intensity = Column(Integer, nullable=False)

    memory_content = Column(Text, nullable=True)
    target_type = Column(String(50), nullable=True)
    target_label = Column(String(255), nullable=True)

    trigger_description = Column(Text, nullable=True)
    trigger_type = Column(String(50), nullable=True)
    long_term_pattern = Column(String(50), nullable=True)

    unresolved = Column(Boolean, default=True, nullable=False)
    resolution_notes = Column(Text, nullable=True)
    surface_probability = Column(Float, default=0.5, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    character = relationship("Character", back_populates="emotional_memories")
    story = relationship("Story", back_populates="emotional_memories")
    source_canon_memory = relationship("CanonMemory", back_populates="emotional_memories")
    source_chapter = relationship("Chapter")

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base_class import Base

class Character(Base):
    __tablename__ = "characters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    story_id = Column(UUID(as_uuid=True), ForeignKey("stories.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    # Visible identity
    role = Column(Text, nullable=True)
    age = Column(String(100), nullable=True)
    avatar_url = Column(Text, nullable=True)
    # Core identity
    personality = Column(Text, nullable=True)
    goals = Column(Text, nullable=True)
    fears = Column(Text, nullable=True)
    values = Column(Text, nullable=True)
    speech_style = Column(Text, nullable=True)
    backstory = Column(Text, nullable=True)
    relationships = Column(Text, nullable=True)
    strengths = Column(Text, nullable=True)
    weaknesses = Column(Text, nullable=True)
    character_arc = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    # Extended identity (Layer 1 completion)
    motivations = Column(Text, nullable=True)
    beliefs = Column(Text, nullable=True)
    secrets = Column(Text, nullable=True)
    internal_conflicts = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc), 
        nullable=False
    )

    story = relationship("Story", back_populates="characters")
    emotional_memories = relationship("EmotionalMemory", back_populates="character", cascade="all, delete-orphan")
    review_queue_items = relationship("WriterReviewQueueItem", back_populates="character", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="character", cascade="all, delete-orphan")
    pinned_memories = relationship("PinnedMemory", back_populates="character", cascade="all, delete-orphan")

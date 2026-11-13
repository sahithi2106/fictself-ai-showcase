import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.db.base_class import Base

class Story(Base):
    __tablename__ = "stories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    tagline = Column(String(300), nullable=True)
    cover_url = Column(Text, nullable=True)
    genre = Column(String(100), nullable=True)
    subgenre = Column(String(100), nullable=True)
    status = Column(String(50), default="draft", nullable=False)
    language = Column(String(50), default="English", nullable=True)
    tags = Column(JSONB, default=list, nullable=True)
    is_published = Column(Boolean, default=False, nullable=False)
    is_archived = Column(Boolean, default=False, nullable=False)
    archived_at = Column(DateTime(timezone=True), nullable=True)
    word_count = Column(Integer, default=0, nullable=False)
    views = Column(Integer, default=0, nullable=False)
    likes = Column(Integer, default=0, nullable=False)
    character_bible = Column(Text, nullable=True, default='')
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc), 
        nullable=False
    )

    author = relationship("User", back_populates="stories")
    chapters = relationship("Chapter", back_populates="story", cascade="all, delete-orphan")
    characters = relationship("Character", back_populates="story", cascade="all, delete-orphan")
    canon_memories = relationship("CanonMemory", back_populates="story", cascade="all, delete-orphan")
    emotional_memories = relationship("EmotionalMemory", back_populates="story", cascade="all, delete-orphan")
    memory_processing_jobs = relationship("MemoryProcessingJob", back_populates="story", cascade="all, delete-orphan")
    review_queue_items = relationship("WriterReviewQueueItem", back_populates="story", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="story", cascade="all, delete-orphan")
    live_draft_contexts = relationship("LiveDraftContext", back_populates="story", cascade="all, delete-orphan")
    story_memory_chunks = relationship("StoryMemoryChunk", back_populates="story", cascade="all, delete-orphan")
    pinned_memories = relationship("PinnedMemory", back_populates="story", cascade="all, delete-orphan")

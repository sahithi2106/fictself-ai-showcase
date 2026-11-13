import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base_class import Base

class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    story_id = Column(UUID(as_uuid=True), ForeignKey("stories.id"), nullable=False, index=True)
    chapter_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    status = Column(String(20), default="draft", nullable=False)
    is_pinned = Column(Boolean, default=False, nullable=False)
    word_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc), 
        nullable=False
    )

    story = relationship("Story", back_populates="chapters")
    canon_memories = relationship("CanonMemory", back_populates="chapter")
    memory_processing_jobs = relationship("MemoryProcessingJob", back_populates="chapter", cascade="all, delete-orphan")
    live_draft_context = relationship("LiveDraftContext", back_populates="chapter", uselist=False, cascade="all, delete-orphan")
    story_memory_chunks = relationship("StoryMemoryChunk", back_populates="chapter", cascade="all, delete-orphan")
    pinned_memories = relationship("PinnedMemory", back_populates="source_chapter")
    comments = relationship("ChapterComment", back_populates="chapter", cascade="all, delete-orphan")

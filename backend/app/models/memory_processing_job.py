import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.db.base_class import Base

class MemoryProcessingJob(Base):
    __tablename__ = "memory_processing_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    chapter_id = Column(UUID(as_uuid=True), ForeignKey("chapters.id"), nullable=False, index=True)
    story_id = Column(UUID(as_uuid=True), ForeignKey("stories.id"), nullable=False, index=True)

    status = Column(String(20), default="pending", nullable=False)
    error_message = Column(Text, nullable=True)
    raw_extractions = Column(JSONB, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    chapter = relationship("Chapter", back_populates="memory_processing_jobs")
    story = relationship("Story", back_populates="memory_processing_jobs")
    review_queue_items = relationship("WriterReviewQueueItem", back_populates="job")

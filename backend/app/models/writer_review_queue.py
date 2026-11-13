import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Float, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.db.base_class import Base

class WriterReviewQueueItem(Base):
    __tablename__ = "writer_review_queue"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    story_id = Column(UUID(as_uuid=True), ForeignKey("stories.id"), nullable=False, index=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("memory_processing_jobs.id"), nullable=True, index=True)
    character_id = Column(UUID(as_uuid=True), ForeignKey("characters.id"), nullable=True, index=True)
    source_chapter_id = Column(UUID(as_uuid=True), ForeignKey("chapters.id"), nullable=True, index=True)

    # Named fields (primary store for Phase 4A+)
    title = Column(String(255), nullable=True)
    content = Column(Text, nullable=True)
    suggestion_type = Column(String(50), nullable=True)  # canon_fact | pinned_fact | emotional_memory | relationship_update | world_rule | secret | object_fact
    source_excerpt = Column(Text, nullable=True)
    proposed_target_label = Column(String(255), nullable=True)
    proposed_target_type = Column(String(50), nullable=True)
    created_by = Column(String(50), default="manual_writer", nullable=False)  # manual_writer | ai_extraction

    # Legacy / AI pipeline fields (kept for backward compat)
    memory_type = Column(String(20), nullable=True)   # "canon" | "emotional"
    candidate_data = Column(JSONB, nullable=True)
    importance_score = Column(Float, default=0.5, nullable=False)

    status = Column(String(20), default="pending", nullable=False)  # pending | approved | rejected | auto_accepted
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    committed_memory_id = Column(UUID(as_uuid=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    story = relationship("Story", back_populates="review_queue_items")
    job = relationship("MemoryProcessingJob", back_populates="review_queue_items")
    character = relationship("Character", back_populates="review_queue_items")
    source_chapter = relationship("Chapter")


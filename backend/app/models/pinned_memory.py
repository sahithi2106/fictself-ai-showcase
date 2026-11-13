import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base_class import Base

class PinnedMemory(Base):
    __tablename__ = "pinned_memories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    story_id = Column(UUID(as_uuid=True), ForeignKey("stories.id"), nullable=False, index=True)
    character_id = Column(UUID(as_uuid=True), ForeignKey("characters.id"), nullable=True, index=True)
    source_chapter_id = Column(UUID(as_uuid=True), ForeignKey("chapters.id"), nullable=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    chat_session_id = Column(UUID(as_uuid=True), ForeignKey("chat_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    chat_message_id = Column(UUID(as_uuid=True), ForeignKey("chat_messages.id", ondelete="SET NULL"), nullable=True, index=True)
    
    source_type = Column(String(50), default="manual", nullable=False) # manual | chat_message
    
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    memory_type = Column(String(50), nullable=False) # plot_fact, relationship, object, world_rule, secret, emotional, other
    
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc), 
        nullable=False
    )

    story = relationship("Story", back_populates="pinned_memories")
    character = relationship("Character", back_populates="pinned_memories")
    source_chapter = relationship("Chapter", back_populates="pinned_memories")

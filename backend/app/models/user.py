import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base_class import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    display_name = Column(String, nullable=True)
    profile_image = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    about_me = Column(String, nullable=True)
    interests = Column(String, nullable=True)
    is_onboarded = Column(Boolean, default=False, nullable=False)

    stories = relationship("Story", back_populates="author", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    chapter_comments = relationship("ChapterComment", back_populates="user", cascade="all, delete-orphan")
    live_draft_contexts = relationship("LiveDraftContext", back_populates="user")
    personas = relationship("Persona", back_populates="user", cascade="all, delete-orphan")

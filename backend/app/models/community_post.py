from app.db.base_class import Base
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import relationship

class CommunityPost(Base):
    __tablename__ = "community_posts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    community_id = Column(UUID(as_uuid=True), ForeignKey("communities.id"), nullable=False)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    image_url = Column(String(1024), nullable=True)
    poll_data = Column(JSONB, nullable=True) # { question: str, options: [{text: str, votes: int}] }
    likes_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    community = relationship("Community", back_populates="posts")
    author = relationship("User")
    comments = relationship("CommunityPostComment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("CommunityPostLike", cascade="all, delete-orphan")

class CommunityPostComment(Base):
    __tablename__ = "community_post_comments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    post_id = Column(UUID(as_uuid=True), ForeignKey("community_posts.id"), nullable=False)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    parent_comment_id = Column(UUID(as_uuid=True), ForeignKey("community_post_comments.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    post = relationship("CommunityPost", back_populates="comments")
    author = relationship("User")
    replies = relationship("CommunityPostComment", backref="parent", remote_side=[id], cascade="all, delete-orphan", single_parent=True)

class CommunityPostLike(Base):
    __tablename__ = "community_post_likes"
    post_id = Column(UUID(as_uuid=True), ForeignKey("community_posts.id"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.memory_processing_job import MemoryProcessingJob

def get_job(db: Session, job_id: UUID) -> Optional[MemoryProcessingJob]:
    return db.query(MemoryProcessingJob).filter(MemoryProcessingJob.id == job_id).first()

def get_jobs_by_story(db: Session, story_id: UUID, skip: int = 0, limit: int = 100) -> List[MemoryProcessingJob]:
    return (
        db.query(MemoryProcessingJob)
        .filter(MemoryProcessingJob.story_id == story_id)
        .order_by(MemoryProcessingJob.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

def create_job(db: Session, chapter_id: UUID, story_id: UUID) -> MemoryProcessingJob:
    db_job = MemoryProcessingJob(
        chapter_id=chapter_id,
        story_id=story_id,
        status="pending",
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job

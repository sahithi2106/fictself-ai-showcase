from typing import Any, List
from uuid import UUID
from fastapi import APIRouter, HTTPException, status

from app.api.deps import SessionDep, CurrentUser
from app.schemas.memory_processing_job import MemoryProcessingJobResponse
from app.services import memory_processing_job_service, chapter_service, story_service

router = APIRouter()

def _check_chapter_ownership(db, chapter_id: UUID, current_user) -> Any:
    chapter = chapter_service.get_chapter(db=db, chapter_id=chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    story = story_service.get_story(db=db, story_id=chapter.story_id)
    if not story or story.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return chapter

@router.post("/chapters/{chapter_id}/process-memories", response_model=MemoryProcessingJobResponse, status_code=status.HTTP_201_CREATED)
def trigger_memory_processing(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    chapter_id: UUID,
) -> Any:
    """
    Trigger a memory processing job for a chapter.
    The job is created with status 'pending'. 
    Actual LLM extraction is handled in Phase 3.
    """
    chapter = _check_chapter_ownership(db, chapter_id, current_user)
    job = memory_processing_job_service.create_job(
        db=db, chapter_id=chapter_id, story_id=chapter.story_id
    )
    return job

@router.get("/stories/{story_id}/memory-jobs", response_model=List[MemoryProcessingJobResponse])
def read_memory_jobs(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    story_id: UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    List all memory processing jobs for a story.
    """
    story = story_service.get_story(db=db, story_id=story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return memory_processing_job_service.get_jobs_by_story(db=db, story_id=story_id, skip=skip, limit=limit)

@router.get("/memory-jobs/{job_id}", response_model=MemoryProcessingJobResponse)
def read_memory_job(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    job_id: UUID,
) -> Any:
    """
    Get a specific memory processing job by id.
    """
    job = memory_processing_job_service.get_job(db=db, job_id=job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Memory processing job not found")
    story = story_service.get_story(db=db, story_id=job.story_id)
    if not story or story.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return job

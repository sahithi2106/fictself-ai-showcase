from fastapi import APIRouter

from app.api.v1.endpoints import (
    health, auth, stories, chapters, characters,
    canon_memories, emotional_memories, memory_jobs, review_queue,
    live_draft_context, chat_sessions, pinned_memories, chapter_comments,
    notifications, communities, library, users, home, personas
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(stories.router, prefix="/stories", tags=["stories"])
api_router.include_router(chapters.router, tags=["chapters"])
api_router.include_router(characters.router, tags=["characters"])
api_router.include_router(canon_memories.router, tags=["canon_memories"])
api_router.include_router(emotional_memories.router, tags=["emotional_memories"])
api_router.include_router(memory_jobs.router, tags=["memory_jobs"])
api_router.include_router(review_queue.router, tags=["review_queue"])
api_router.include_router(live_draft_context.router, tags=["live_draft_context"])
api_router.include_router(chat_sessions.router, prefix="/chat/sessions", tags=["chat"])
api_router.include_router(pinned_memories.router, tags=["pinned_memories"])
api_router.include_router(chapter_comments.router, tags=["chapter_comments"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(communities.router, prefix="/communities", tags=["communities"])
api_router.include_router(home.router, prefix="/home", tags=["home"])
api_router.include_router(library.router, prefix="/library", tags=["library"])
api_router.include_router(personas.router, prefix="/personas", tags=["personas"])

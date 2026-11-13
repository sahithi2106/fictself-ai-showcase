import logging
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from app.core.config import settings
import app.db.base  # Import full model registry before API routers
from app.api.v1.api import api_router

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Production-safe global exception handler.
    Logs full exception trace to server logs while returning a sanitized response to the client.
    Prevents leaking internal stack traces, paths, or environment data.
    """
    logger.exception(f"Unhandled server error while processing request {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."}
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

# Ensure upload directories exist
os.makedirs("uploads/story_covers", exist_ok=True)
os.makedirs("uploads/character_avatars", exist_ok=True)
os.makedirs("uploads/community_covers", exist_ok=True)

# Mount uploads directory to serve static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

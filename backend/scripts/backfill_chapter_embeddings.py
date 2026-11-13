import sys
import os
import logging

# Ensure the backend directory is in the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.chapter import Chapter
from app.models.story import Story
from app.services.chapter_embedding_service import chapter_embedding_service

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def run_backfill():
    db = SessionLocal()
    try:
        chapters = db.query(Chapter).all()
        total = len(chapters)
        logger.info(f"Found {total} chapters to backfill.")
        
        for i, chapter in enumerate(chapters, 1):
            story = db.query(Story).filter(Story.id == chapter.story_id).first()
            story_title = story.title if story else "Unknown Story"
            logger.info(f"[{i}/{total}] Reindexing Chapter {chapter.chapter_number} for Story: '{story_title}'...")
            
            try:
                chapter_embedding_service.reindex_chapter(db, chapter)
                logger.info(f"[{i}/{total}] Successfully reindexed Chapter {chapter.chapter_number}")
            except Exception as e:
                logger.error(f"[{i}/{total}] Failed to reindex Chapter {chapter.chapter_number}: {e}")
                
        logger.info("Backfill complete.")
    finally:
        db.close()

if __name__ == "__main__":
    run_backfill()

import logging
from uuid import UUID
from sqlalchemy.orm import Session
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.models.chapter import Chapter
from app.models.story_memory_chunk import StoryMemoryChunk
from app.services.embedding_service import EmbeddingService
from app.services.vector_store_service import VectorStoreService

logger = logging.getLogger(__name__)

class ChapterEmbeddingService:
    def __init__(self):
        self.embedding_service = EmbeddingService()
        self.vector_store_service = VectorStoreService()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=600,
            chunk_overlap=100,
            separators=["\n\n", "\n", ".", "?", "!", " ", ""]
        )

    def reindex_chapter(self, db: Session, chapter: Chapter):
        """Re-indexes a chapter by deleting old chunks, chunking the new content, and saving."""
        if not chapter.content or not chapter.content.strip():
            self._delete_existing_chunks(db, chapter.id)
            return

        logger.info(f"Re-indexing chapter {chapter.id} for story {chapter.story_id}")
        
        # 1. Clean up old chunks from DB and Chroma
        self._delete_existing_chunks(db, chapter.id)

        # 2. Chunk text
        # Using chapter.title and content
        full_text = f"{chapter.title}\n\n{chapter.content}"
        chunks = self.text_splitter.split_text(full_text)
        
        if not chunks:
            return
            
        # 3. Create new DB rows
        db_chunks = []
        for i, chunk_text in enumerate(chunks):
            db_chunk = StoryMemoryChunk(
                story_id=chapter.story_id,
                chapter_id=chapter.id,
                chunk_index=i,
                content=chunk_text
            )
            db.add(db_chunk)
            db_chunks.append(db_chunk)
            
        db.flush() # flush to get IDs generated
        
        # 4. Embed and save to Chroma
        try:
            texts_to_embed = [c.content for c in db_chunks]
            embeddings = self.embedding_service.embed_texts(texts_to_embed)
            
            chunk_ids = [str(c.id) for c in db_chunks]
            metadatas = [{"chunk_index": c.chunk_index} for c in db_chunks]
            
            self.vector_store_service.upsert_story_chunks(
                story_id=str(chapter.story_id),
                chapter_id=str(chapter.id),
                chunk_ids=chunk_ids,
                embeddings=embeddings,
                documents=texts_to_embed,
                metadatas=metadatas
            )
            db.commit()
            logger.info(f"Successfully indexed {len(db_chunks)} chunks for chapter {chapter.id}")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to index chapter {chapter.id}: {e}")

    def _delete_existing_chunks(self, db: Session, chapter_id: UUID):
        """Deletes chunks from DB and Chroma for a specific chapter."""
        # Delete from Chroma
        self.vector_store_service.delete_chapter_chunks(str(chapter_id))
        
        # Delete from Postgres
        db.query(StoryMemoryChunk).filter(StoryMemoryChunk.chapter_id == chapter_id).delete()
        db.commit()

chapter_embedding_service = ChapterEmbeddingService()

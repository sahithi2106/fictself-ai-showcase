import logging
from typing import List
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.story_memory_chunk import StoryMemoryChunk
from app.services.embedding_service import EmbeddingService
from app.services.vector_store_service import VectorStoreService
from app.core.config import settings

logger = logging.getLogger(__name__)

class StoryRetrievalService:
    def __init__(self):
        self.embedding_service = EmbeddingService()
        self.vector_store_service = VectorStoreService()

    def retrieve_relevant_story_chunks(
        self,
        db: Session,
        story_id: UUID,
        user_message: str,
        live_draft_text: str = "",
        top_k: int = 5
    ) -> List[str]:
        """
        Retrieves relevant story chunks based on the current user message and optionally live draft.
        """
        if not user_message.strip():
            return []

        try:
            top_k = settings.RETRIEVAL_TOP_K or top_k
            all_retrieved_ids = []
            
            logger.info(f"[Retrieval Debug] Primary Query (User Message): {user_message}")
            
            # 1. Primary Retrieval (User Message alone)
            primary_embedding = self.embedding_service.embed_text(user_message.strip())
            primary_results = self.vector_store_service.query_story_chunks(
                story_id=str(story_id),
                query_embeddings=[primary_embedding],
                n_results=top_k
            )
            
            if primary_results.get("ids") and primary_results["ids"][0]:
                all_retrieved_ids.extend(primary_results["ids"][0])
                logger.info(f"[Retrieval Debug] Primary retrieved chunk IDs: {primary_results['ids'][0]}")

            # 2. Secondary Retrieval (Live Draft Text summary)
            # Only use it if it's meaningful, and we use a smaller top_k for secondary context
            trimmed_draft = live_draft_text.strip()
            if trimmed_draft and len(trimmed_draft) > 20:
                # Use only the last 300 chars of the draft for secondary semantic signal so it doesn't overwhelm
                draft_query = trimmed_draft[-300:]
                logger.info(f"[Retrieval Debug] Secondary Query (Trimmed Draft): {draft_query}")
                
                secondary_embedding = self.embedding_service.embed_text(draft_query)
                secondary_results = self.vector_store_service.query_story_chunks(
                    story_id=str(story_id),
                    query_embeddings=[secondary_embedding],
                    n_results=3 # Ask for fewer supporting chunks
                )
                
                if secondary_results.get("ids") and secondary_results["ids"][0]:
                    all_retrieved_ids.extend(secondary_results["ids"][0])
                    logger.info(f"[Retrieval Debug] Secondary retrieved chunk IDs: {secondary_results['ids'][0]}")

            # 3. Merge and Deduplicate while preserving order of relevance (Primary first, then Secondary)
            seen = set()
            unique_ids = []
            for cid in all_retrieved_ids:
                if cid not in seen:
                    unique_ids.append(cid)
                    seen.add(cid)
                    
            if not unique_ids:
                return []
                
            # Fetch content from Postgres.
            # The story_id filter is a safety net: Chroma is already story-scoped,
            # but this prevents serving chunks from a different story if Chroma
            # ever returns a stale cross-collection ID.
            db_chunks = db.query(StoryMemoryChunk).filter(
                StoryMemoryChunk.id.in_(unique_ids),
                StoryMemoryChunk.story_id == story_id,
            ).all()

            chunk_dict = {str(c.id): c.content for c in db_chunks}
            
            ordered_contents = []
            for cid in unique_ids:
                if cid in chunk_dict:
                    content = chunk_dict[cid]
                    ordered_contents.append(content)
                    preview = content[:60].replace('\n', ' ') + "..."
                    logger.info(f"[Retrieval Debug] Returning Chunk {cid}: {preview}")

            return ordered_contents

        except Exception as e:
            logger.error(f"Error retrieving story chunks: {e}")
            return []

story_retrieval_service = StoryRetrievalService()

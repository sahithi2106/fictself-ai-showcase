import logging
from typing import List, Dict, Any, Optional
import chromadb
from app.core.config import settings

logger = logging.getLogger(__name__)

class VectorStoreService:
    _instance = None
    _client = None
    _collection = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(VectorStoreService, cls).__new__(cls)
            cls._instance._initialize_chroma()
        return cls._instance

    def _initialize_chroma(self):
        try:
            logger.info(f"Initializing ChromaDB at {settings.CHROMA_PERSIST_DIR}")
            self._client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
            self._collection = self._client.get_or_create_collection(
                name="story_memory",
                metadata={"hnsw:space": "cosine"}
            )
            logger.info("ChromaDB initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {e}")
            self._client = None
            self._collection = None

    def upsert_story_chunks(
        self, 
        story_id: str, 
        chapter_id: str, 
        chunk_ids: List[str], 
        embeddings: List[List[float]], 
        documents: List[str], 
        metadatas: List[Dict[str, Any]]
    ):
        """Upsert story chunks into ChromaDB."""
        if not self._collection:
            logger.error("Chroma collection not initialized.")
            return

        # Ensure story_id and chapter_id are correctly injected into metadatas
        for meta in metadatas:
            meta["story_id"] = story_id
            meta["chapter_id"] = chapter_id

        self._collection.upsert(
            ids=chunk_ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas
        )
        logger.info(f"Upserted {len(chunk_ids)} chunks for chapter {chapter_id}")

    def delete_chapter_chunks(self, chapter_id: str):
        """Delete all chunks for a specific chapter."""
        if not self._collection:
            return
            
        try:
            # First, fetch the IDs of the chunks to delete
            result = self._collection.get(
                where={"chapter_id": chapter_id}
            )
            ids_to_delete = result.get("ids", [])
            if ids_to_delete:
                self._collection.delete(ids=ids_to_delete)
                logger.info(f"Deleted {len(ids_to_delete)} chunks for chapter {chapter_id} from vector store.")
        except Exception as e:
            logger.error(f"Error deleting chunks for chapter {chapter_id}: {e}")

    def query_story_chunks(self, story_id: str, query_embeddings: List[List[float]], n_results: int = 5) -> Dict[str, Any]:
        """Query chunks specifically for a given story."""
        if not self._collection:
            return {"ids": [], "documents": [], "metadatas": [], "distances": []}
            
        try:
            results = self._collection.query(
                query_embeddings=query_embeddings,
                n_results=n_results,
                where={"story_id": story_id}
            )
            return results
        except Exception as e:
            logger.error(f"Error querying story chunks: {e}")
            return {"ids": [], "documents": [], "metadatas": [], "distances": []}

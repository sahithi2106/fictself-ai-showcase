import logging
from typing import List
from sentence_transformers import SentenceTransformer
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmbeddingService:
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmbeddingService, cls).__new__(cls)
            cls._instance._initialize_model()
        return cls._instance

    def _initialize_model(self):
        try:
            logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL_NAME}")
            self._model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
            logger.info("Embedding model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            self._model = None

    def embed_text(self, text: str) -> List[float]:
        """Embed a single piece of text."""
        if not self._model:
            raise ValueError("Embedding model not loaded")
        # sentence-transformers returns a numpy array, convert to list of floats
        return self._model.encode(text).tolist()

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Embed a list of texts efficiently."""
        if not self._model:
            raise ValueError("Embedding model not loaded")
        embeddings = self._model.encode(texts)
        return embeddings.tolist()

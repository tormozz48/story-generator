import chromadb
from chromadb.config import Settings as ChromaSettings
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any, Optional
import logging
from config import settings

logger = logging.getLogger(__name__)


class VectorDBService:
  """Service for managing the vector database"""
  
  def __init__(self):
    self.client = None
    self.collection = None
    self.embedding_model = None
    self._initialize()
  
  def _initialize(self):
    """Initialize ChromaDB client and collection"""
    try:
      # Initialize ChromaDB client
      self.client = chromadb.HttpClient(
        host=settings.CHROMA_HOST,
        port=settings.CHROMA_PORT,
        settings=ChromaSettings(
          anonymized_telemetry=False
        )
      )
      
      # Load embedding model for Russian text
      logger.info("Loading embedding model for Russian text...")
      self.embedding_model = SentenceTransformer('intfloat/multilingual-e5-base')
      
      # Get or create collection
      try:
        self.collection = self.client.get_collection(
          name=settings.CHROMA_COLLECTION_NAME
        )
        logger.info(f"Loaded existing collection: {settings.CHROMA_COLLECTION_NAME}")
      except Exception:
        self.collection = self.client.create_collection(
          name=settings.CHROMA_COLLECTION_NAME,
          metadata={"hnsw:space": "cosine"}
        )
        logger.info(f"Created new collection: {settings.CHROMA_COLLECTION_NAME}")
      
    except Exception as e:
      logger.error(f"Failed to initialize VectorDB: {str(e)}")
      raise
  
  def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
    """Generate embeddings for a list of texts"""
    try:
      # For multilingual-e5, prepend with "query: " for queries
      # and "passage: " for documents
      embeddings = self.embedding_model.encode(
        texts,
        normalize_embeddings=True,
        show_progress_bar=False
      )
      return embeddings.tolist()
    except Exception as e:
      logger.error(f"Error generating embeddings: {str(e)}")
      raise
  
  def add_documents(
    self,
    documents: List[str],
    metadatas: List[Dict[str, Any]],
    ids: Optional[List[str]] = None
  ):
    """Add documents to the vector database"""
    try:
      if not ids:
        ids = [f"doc_{i}" for i in range(len(documents))]
      
      # Generate embeddings
      embeddings = self.generate_embeddings([f"passage: {doc}" for doc in documents])
      
      # Add to collection
      self.collection.add(
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
        ids=ids
      )
      
      logger.info(f"Added {len(documents)} documents to vector database")
      
    except Exception as e:
      logger.error(f"Error adding documents: {str(e)}")
      raise
  
  def query_similar(
    self,
    query_text: str,
    n_results: int = 5,
    where: Optional[Dict[str, Any]] = None
  ) -> Dict[str, Any]:
    """Query for similar documents"""
    try:
      # Generate query embedding
      query_embedding = self.generate_embeddings([f"query: {query_text}"])[0]
      
      # Query collection
      results = self.collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        where=where
      )
      
      return results
      
    except Exception as e:
      logger.error(f"Error querying similar documents: {str(e)}")
      raise
  
  def get_collection_count(self) -> int:
    """Get the number of documents in the collection"""
    try:
      return self.collection.count()
    except Exception as e:
      logger.error(f"Error getting collection count: {str(e)}")
      return 0
  
  def delete_collection(self):
    """Delete the current collection"""
    try:
      self.client.delete_collection(name=settings.CHROMA_COLLECTION_NAME)
      logger.info(f"Deleted collection: {settings.CHROMA_COLLECTION_NAME}")
    except Exception as e:
      logger.error(f"Error deleting collection: {str(e)}")
      raise


# Create global instance
vector_db = VectorDBService()

from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Union
import os
import logging

# Configure logging for debugging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


class Settings(BaseSettings):
  """Application settings"""
  
  # General
  PROJECT_NAME: str = "Story Generator"
  ENVIRONMENT: str = "development"
  API_PREFIX: str = "/api/v1"
  
  # Ollama Configuration
  OLLAMA_HOST: str = "ollama"
  OLLAMA_PORT: int = 11434
  OLLAMA_MODEL: str = "gemma:2b-instruct-q4_K_M"
  OLLAMA_NUM_PARALLEL: int = 2
  OLLAMA_MAX_LOADED_MODELS: int = 1
  OLLAMA_CONTEXT_LENGTH: int = 8192
  
  # ChromaDB Configuration
  CHROMA_HOST: str = "chromadb"
  CHROMA_PORT: int = 8000
  CHROMA_PERSIST_DIRECTORY: str = "/data/chroma_db"
  CHROMA_COLLECTION_NAME: str = "stories"
  
  # Backend Configuration
  BACKEND_HOST: str = "0.0.0.0"
  BACKEND_PORT: int = 8000
  # Accept CORS_ORIGINS as a string and parse it later
  CORS_ORIGINS_STR: str = "http://localhost,http://localhost:80"
  
  @property
  def CORS_ORIGINS(self) -> List[str]:
    """Parse CORS origins from comma-separated string"""
    origins = [origin.strip() for origin in self.CORS_ORIGINS_STR.split(',')]
    logger.debug(f"Parsed CORS_ORIGINS from '{self.CORS_ORIGINS_STR}' to: {origins}")
    return origins
  
  # Generation Settings
  DEFAULT_TEMPERATURE: float = 0.8
  DEFAULT_TOP_P: float = 0.95
  DEFAULT_MAX_TOKENS: int = 2000
  RAG_TOP_K: int = 5
  CHUNK_SIZE: int = 1000
  CHUNK_OVERLAP: int = 200
  
  # Storage
  DATA_DIR: str = "/data"
  RAW_STORIES_DIR: str = "/data/raw_stories"
  PROCESSED_STORIES_DIR: str = "/data/processed"
  
  # Logging
  LOG_LEVEL: str = "INFO"
  LOG_FORMAT: str = "json"
  
  @property
  def ollama_base_url(self) -> str:
    return f"http://{self.OLLAMA_HOST}:{self.OLLAMA_PORT}"
  
  @property
  def chroma_base_url(self) -> str:
    return f"http://{self.CHROMA_HOST}:{self.CHROMA_PORT}"
  
  class Config:
    env_file = ".env"
    case_sensitive = True


# Create global settings instance
try:
  logger.info("Loading settings...")
  settings = Settings()
  logger.info(f"Settings loaded successfully. CORS_ORIGINS: {settings.CORS_ORIGINS}")
except Exception as e:
  logger.error(f"Failed to load settings: {e}")
  raise

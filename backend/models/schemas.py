from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum


class StoryLength(str, Enum):
  """Story length options"""
  short = "short"
  medium = "medium"
  long = "long"


class StoryRequest(BaseModel):
  """Request model for story generation"""
  prompt: str = Field(..., description="Main story idea or theme", min_length=10)
  genre: Optional[str] = Field(None, description="Story genre")
  characters: Optional[List[str]] = Field(None, description="List of character names")
  setting: Optional[str] = Field(None, description="Story setting/location")
  length: StoryLength = Field(default=StoryLength.medium, description="Story length")
  temperature: float = Field(default=0.8, ge=0.0, le=2.0, description="Generation temperature")
  top_p: float = Field(default=0.95, ge=0.0, le=1.0, description="Top-p sampling")
  
  class Config:
    json_schema_extra = {
      "example": {
        "prompt": "История о неожиданной встрече в кафе",
        "genre": "Романтика",
        "characters": ["Анна", "Дмитрий"],
        "setting": "Уютное кафе в центре Москвы",
        "length": "medium",
        "temperature": 0.8,
        "top_p": 0.95
      }
    }


class StoryResponse(BaseModel):
  """Response model for story generation"""
  story: str = Field(..., description="Generated story text")
  metadata: Dict[str, Any] = Field(default_factory=dict, description="Generation metadata")
  
  class Config:
    json_schema_extra = {
      "example": {
        "story": "История начинается в уютном кафе...",
        "metadata": {
          "length": "medium",
          "word_count": 1200,
          "generation_time": 15.3
        }
      }
    }


class ProcessStoriesRequest(BaseModel):
  """Request model for processing stories"""
  file_path: str = Field(..., description="Path to stories JSONL file")


class ProcessStoriesResponse(BaseModel):
  """Response model for processing stories"""
  success: bool
  message: str
  stories_processed: int = 0
  chunks_created: int = 0


class HealthResponse(BaseModel):
  """Health check response"""
  status: str
  services: Dict[str, bool]
  details: Optional[Dict[str, Any]] = None


class StatisticsResponse(BaseModel):
  """Statistics response"""
  total_chunks: int
  embedding_model: str
  llm_model: str
  chunk_size: int
  chunk_overlap: int

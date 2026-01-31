from fastapi import FastAPI, HTTPException, BackgroundTasks, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import time
from typing import Dict, Any
import sys

from config import settings
from models.schemas import (
  StoryRequest, StoryResponse, ProcessStoriesRequest,
  ProcessStoriesResponse, HealthResponse, StatisticsResponse
)
from services.llm_service import llm_service
from services.vector_db import vector_db
from services.rag_service import rag_service

# Configure logging
logging.basicConfig(
  level=getattr(logging, settings.LOG_LEVEL),
  format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
  handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
  title=settings.PROJECT_NAME,
  description="Local erotic story generator with RAG using Gemma 2B LLM",
  version="1.0.0"
)

# Create API router with prefix
api_router = APIRouter(prefix=settings.API_PREFIX)

# Add debug logging for all routes
@app.middleware("http")
async def log_requests(request, call_next):
  logger.debug(f"Incoming request: {request.method} {request.url.path}")
  logger.debug(f"Full URL: {request.url}")
  response = await call_next(request)
  logger.debug(f"Response status: {response.status_code}")
  return response

# Configure CORS
app.add_middleware(
  CORSMiddleware,
  allow_origins=settings.CORS_ORIGINS,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
  """Initialize services on startup"""
  logger.info("Starting Story Generator API...")
  logger.info(f"Environment: {settings.ENVIRONMENT}")
  logger.info(f"Ollama host: {settings.ollama_base_url}")
  logger.info(f"ChromaDB host: {settings.chroma_base_url}")
  
  # Log all registered routes
  logger.info("Registered routes:")
  for route in app.routes:
    if hasattr(route, 'path'):
      logger.info(f"  - {route.path} [{', '.join(route.methods) if hasattr(route, 'methods') else 'N/A'}]")
  
  logger.info(f"API routes are mounted under: {settings.API_PREFIX}")


@app.on_event("shutdown")
async def shutdown_event():
  """Cleanup on shutdown"""
  logger.info("Shutting down Story Generator API...")


@app.get("/", tags=["Root"])
async def root():
  """Root endpoint"""
  return {
    "message": "Story Generator API",
    "version": "1.0.0",
    "docs": "/docs",
    "api": settings.API_PREFIX
  }


@api_router.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
  """Health check endpoint"""
  try:
    # Check Ollama
    ollama_healthy = llm_service.health_check()
    
    # Check ChromaDB
    chromadb_healthy = False
    try:
      count = vector_db.get_collection_count()
      chromadb_healthy = True
    except Exception:
      pass
    
    overall_status = "healthy" if (ollama_healthy and chromadb_healthy) else "degraded"
    
    return HealthResponse(
      status=overall_status,
      services={
        "ollama": ollama_healthy,
        "chromadb": chromadb_healthy
      },
      details={
        "documents_in_db": vector_db.get_collection_count() if chromadb_healthy else 0
      }
    )
  except Exception as e:
    logger.error(f"Health check failed: {str(e)}")
    return HealthResponse(
      status="unhealthy",
      services={
        "ollama": False,
        "chromadb": False
      }
    )


@api_router.post("/generate", response_model=StoryResponse, tags=["Generation"])
async def generate_story(request: StoryRequest):
  """Generate a story using RAG"""
  try:
    start_time = time.time()
    
    logger.info(f"Generating story with prompt: {request.prompt[:50]}...")
    
    # Generate story
    story = rag_service.generate_story_with_rag(
      prompt=request.prompt,
      genre=request.genre,
      characters=request.characters,
      setting=request.setting,
      length=request.length.value,
      temperature=request.temperature,
      top_p=request.top_p
    )
    
    generation_time = time.time() - start_time
    word_count = len(story.split())
    
    logger.info(f"Story generated in {generation_time:.2f}s, {word_count} words")
    
    return StoryResponse(
      story=story,
      metadata={
        "length": request.length.value,
        "word_count": word_count,
        "generation_time": round(generation_time, 2),
        "temperature": request.temperature,
        "top_p": request.top_p
      }
    )
    
  except Exception as e:
    logger.error(f"Error generating story: {str(e)}")
    raise HTTPException(status_code=500, detail=f"Error generating story: {str(e)}")


@api_router.post("/process-stories", response_model=ProcessStoriesResponse, tags=["Admin"])
async def process_stories(request: ProcessStoriesRequest, background_tasks: BackgroundTasks):
  """Process and store stories from JSONL file"""
  try:
    # Run processing in background
    background_tasks.add_task(
      rag_service.process_and_store_stories,
      request.file_path
    )
    
    return ProcessStoriesResponse(
      success=True,
      message="Story processing started in background",
      stories_processed=0,
      chunks_created=0
    )
    
  except Exception as e:
    logger.error(f"Error starting story processing: {str(e)}")
    raise HTTPException(status_code=500, detail=f"Error processing stories: {str(e)}")


@api_router.get("/statistics", response_model=StatisticsResponse, tags=["Info"])
async def get_statistics():
  """Get system statistics"""
  try:
    stats = rag_service.get_statistics()
    return StatisticsResponse(**stats)
  except Exception as e:
    logger.error(f"Error getting statistics: {str(e)}")
    raise HTTPException(status_code=500, detail=f"Error getting statistics: {str(e)}")


@api_router.get("/categories", tags=["Info"])
async def get_categories():
  """Get available story categories"""
  # Return common categories - could be made dynamic based on DB content
  return {
    "categories": [
    "Романтика",
    "Страсть",
    "Приключение",
    "Фантазия",
    "Доминирование",
    "Нежность",
    "Запретная любовь",
    "Случайная встреча"
    ]
  }


# Include the API router
app.include_router(api_router)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
  """Global exception handler"""
  logger.error(f"Global exception: {str(exc)}")
  return JSONResponse(
    status_code=500,
    content={"detail": "Internal server error"}
  )


if __name__ == "__main__":
  import uvicorn
  uvicorn.run(
    "main:app",
    host=settings.BACKEND_HOST,
    port=settings.BACKEND_PORT,
    reload=True
  )

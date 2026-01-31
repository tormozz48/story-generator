from typing import List, Dict, Any, Optional
import logging
from langchain.text_splitter import RecursiveCharacterTextSplitter
from services.vector_db import vector_db
from services.llm_service import llm_service
from config import settings
import json
import os

logger = logging.getLogger(__name__)


class RAGService:
  """Service for RAG (Retrieval Augmented Generation)"""
  
  def __init__(self):
    self.text_splitter = RecursiveCharacterTextSplitter(
      chunk_size=settings.CHUNK_SIZE,
      chunk_overlap=settings.CHUNK_OVERLAP,
      separators=["\n\n", "\n", ".", "!", "?", " ", ""],
      keep_separator=True
    )
  
  def process_and_store_stories(self, stories_file: str):
    """Process stories from JSON file and store in vector DB"""
    try:
      if not os.path.exists(stories_file):
        logger.error(f"Stories file not found: {stories_file}")
        return
      
      # Load stories
      with open(stories_file, 'r', encoding='utf-8') as f:
        stories = []
        for line in f:
          try:
            story = json.loads(line.strip())
            stories.append(story)
          except json.JSONDecodeError:
            continue
      
      logger.info(f"Loaded {len(stories)} stories from {stories_file}")
      
      # Process each story
      all_chunks = []
      all_metadatas = []
      all_ids = []
      
      for idx, story in enumerate(stories):
        # Split story content into chunks
        chunks = self.text_splitter.split_text(story.get('content', ''))
        
        # Create metadata for each chunk
        for chunk_idx, chunk in enumerate(chunks):
          all_chunks.append(chunk)
          all_metadatas.append({
            'story_id': str(idx),
            'chunk_id': chunk_idx,
            'title': story.get('title', ''),
            'author': story.get('author', 'Unknown'),
            'category': story.get('category', ''),
            'tags': ','.join(story.get('tags', [])),
            'url': story.get('url', '')
          })
          all_ids.append(f"story_{idx}_chunk_{chunk_idx}")
      
      # Add to vector database in batches
      batch_size = 100
      for i in range(0, len(all_chunks), batch_size):
        batch_chunks = all_chunks[i:i+batch_size]
        batch_metadatas = all_metadatas[i:i+batch_size]
        batch_ids = all_ids[i:i+batch_size]
        
        vector_db.add_documents(
          documents=batch_chunks,
          metadatas=batch_metadatas,
          ids=batch_ids
        )
        
        logger.info(f"Processed batch {i//batch_size + 1}, total chunks: {min(i+batch_size, len(all_chunks))}/{len(all_chunks)}")
      
      logger.info(f"Successfully processed and stored {len(stories)} stories ({len(all_chunks)} chunks)")
    
    except Exception as e:
      logger.error(f"Error processing stories: {str(e)}")
      raise
  
  def generate_story_with_rag(
    self,
    prompt: str,
    genre: Optional[str] = None,
    characters: Optional[List[str]] = None,
    setting: Optional[str] = None,
    length: str = "medium",
    temperature: float = 0.8,
    top_p: float = 0.95
  ) -> str:
    """Generate a story using RAG"""
    try:
      # Build search query
      search_query = prompt
      if genre:
        search_query += f" {genre}"
      if setting:
        search_query += f" {setting}"
      if characters:
        search_query += f" {' '.join(characters)}"
      
      # Query for similar stories
      similar_results = vector_db.query_similar(
        query_text=search_query,
        n_results=settings.RAG_TOP_K
      )
      
      # Extract retrieved documents
      retrieved_docs = []
      if similar_results and 'documents' in similar_results:
        retrieved_docs = similar_results['documents'][0] if similar_results['documents'] else []
      
      # Build context from retrieved documents
      context = "\n\n---\n\n".join(retrieved_docs[:5]) if retrieved_docs else "Нет доступного контекста."
      
      # Determine length parameters
      length_params = {
        "short": {"max_tokens": 1000, "description": "короткий рассказ (500-800 слов)"},
        "medium": {"max_tokens": 2000, "description": "средний рассказ (1000-1500 слов)"},
        "long": {"max_tokens": 3500, "description": "длинный рассказ (2000-3000 слов)"}
      }
      length_config = length_params.get(length, length_params["medium"])
      
      # Build characters description
      characters_desc = ""
      if characters:
        characters_desc = f"\nПерсонажи: {', '.join(characters)}"
      
      setting_desc = ""
      if setting:
        setting_desc = f"\nМесто действия: {setting}"
      
      genre_desc = ""
      if genre:
        genre_desc = f"\nЖанр: {genre}"
      
      # Create the prompt for LLM
      full_prompt = f"""Ты талантливый писатель эротических рассказов на русском языке.

Используй следующие фрагменты из похожих историй для вдохновения и понимания стиля:

{context}

Теперь напиши оригинальную эротическую историю на основе следующих параметров:

Запрос: {prompt}{genre_desc}{characters_desc}{setting_desc}
Длина: {length_config['description']}

Важные требования:
- История должна быть на русском языке
- Используй яркие, чувственные описания
- Развивай сюжет и персонажей
- Создай атмосферу и напряжение
- История должна быть законченной
- Пиши в литературном стиле

История:
"""
      
      # Generate story
      logger.info(f"Generating story with length: {length}, temperature: {temperature}")
      story = llm_service.generate(
        prompt=full_prompt,
        temperature=temperature,
        top_p=top_p,
        max_tokens=length_config['max_tokens']
      )
      
      return story
      
    except Exception as e:
      logger.error(f"Error generating story with RAG: {str(e)}")
      raise
  
  def get_statistics(self) -> Dict[str, Any]:
    """Get RAG system statistics"""
    try:
      doc_count = vector_db.get_collection_count()
      return {
        "total_chunks": doc_count,
        "embedding_model": "intfloat/multilingual-e5-base",
        "llm_model": settings.OLLAMA_MODEL,
        "chunk_size": settings.CHUNK_SIZE,
        "chunk_overlap": settings.CHUNK_OVERLAP
      }
    except Exception as e:
      logger.error(f"Error getting statistics: {str(e)}")
      return {}


# Create global instance
rag_service = RAGService()

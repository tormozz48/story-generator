# Technical Specifications for Story Generator

## 1. Scrapy Web Scraper Specification

### Spider Configuration

```python
# Key settings for sefan.ru spider
ROBOTSTXT_OBEY = True
DOWNLOAD_DELAY = 2  # Respectful crawling
CONCURRENT_REQUESTS = 2
USER_AGENT = 'story-generator-bot'
```

### Data Model

```python
class StoryItem:
    title: str
    content: str
    author: str
    category: str
    tags: List[str]
    rating: float
    publish_date: datetime
    url: str
```

### Scraping Strategy

- Start from category pages
- Extract story links
- Follow pagination
- Parse story content and metadata
- Save to JSON format for processing

## 2. Vector Database Setup

### ChromaDB Configuration

```python
import chromadb
from chromadb.config import Settings

settings = Settings(
    chroma_db_impl="duckdb+parquet",
    persist_directory="/data/chroma_db",
    anonymized_telemetry=False
)
```

### Embedding Pipeline

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('intfloat/multilingual-e5-base')
# Optimal for Russian text embeddings
```

### Collection Schema

```python
collection = client.create_collection(
    name="stories",
    metadata={"hnsw:space": "cosine"},
    embedding_function=embedding_function
)
```

## 3. LLM Configuration

### Ollama Setup

```yaml
# docker-compose.yml snippet
ollama:
  image: ollama/ollama
  volumes:
    - ollama_data:/root/.ollama
  environment:
    - OLLAMA_NUM_PARALLEL=2
    - OLLAMA_MAX_LOADED_MODELS=1
```

### Model Pull Command

```bash
ollama pull gemma:2b-instruct-q4_K_M
```

### LangChain Integration

```python
from langchain.llms import Ollama
from langchain.callbacks.manager import CallbackManager
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler

llm = Ollama(
    model="gemma:2b-instruct-q4_K_M",
    temperature=0.8,
    top_p=0.95,
    callback_manager=CallbackManager([StreamingStdOutCallbackHandler()]),
    num_ctx=8192  # Context window
)
```

## 4. RAG Pipeline Implementation

### Text Splitter Configuration

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", ".", "!", "?", " ", ""],
    keep_separator=True
)
```

### RAG Chain Setup

```python
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate

prompt_template = """
Ты талантливый писатель эротических рассказов. Используй следующий контекст из похожих историй для вдохновения:

{context}

На основе этого контекста и следующего запроса, напиши увлекательную эротическую историю на русском языке:

Запрос: {question}

История:
"""

PROMPT = PromptTemplate(
    template=prompt_template, 
    input_variables=["context", "question"]
)
```

## 5. FastAPI Backend

### API Endpoints

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

class StoryRequest(BaseModel):
    genre: str
    characters: List[str]
    setting: str
    length: str = "medium"  # short, medium, long
    temperature: float = 0.8

class StoryResponse(BaseModel):
    story: str
    metadata: dict

@app.post("/generate", response_model=StoryResponse)
async def generate_story(request: StoryRequest):
    # RAG pipeline execution
    pass

@app.get("/categories")
async def get_categories():
    # Return available story categories
    pass

@app.get("/health")
async def health_check():
    # System health check
    pass
```

### Background Tasks

```python
from fastapi import BackgroundTasks

@app.post("/scrape/start")
async def start_scraping(background_tasks: BackgroundTasks):
    background_tasks.add_task(run_scraper)
    return {"message": "Scraping started"}
```

## 6. Docker Configuration

### Main docker-compose.yml

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./frontend:/usr/share/nginx/html
    depends_on:
      - backend

  backend:
    build: ./backend
    environment:
      - OLLAMA_HOST=ollama:11434
      - CHROMA_HOST=chromadb
    volumes:
      - ./data:/data
    depends_on:
      - ollama
      - chromadb

  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        limits:
          memory: 12G

  chromadb:
    build: ./chromadb
    volumes:
      - ./data/chroma_db:/chroma/chroma
    environment:
      - IS_PERSISTENT=TRUE

  scraper:
    build: ./scraper
    volumes:
      - ./data:/data
    command: ["scrapy", "crawl", "sefan"]

volumes:
  ollama_data:
```

## 7. Frontend Specifications

### UI Components

- Story generation form
- Loading indicator
- Story display area
- Category selector
- Advanced options toggle

### Form Fields

```html
<form id="story-form">
  <select name="genre" required>
    <option value="">Выберите жанр</option>
    <!-- Populated from API -->
  </select>
  
  <input type="text" name="characters" 
         placeholder="Имена персонажей (через запятую)">
  
  <textarea name="setting" 
            placeholder="Опишите место действия"></textarea>
  
  <select name="length">
    <option value="short">Короткий рассказ</option>
    <option value="medium" selected>Средний рассказ</option>
    <option value="long">Длинный рассказ</option>
  </select>
  
  <button type="submit">Создать историю</button>
</form>
```

## 8. Performance Optimization

### M1-Specific Optimizations

- Use Metal Performance Shaders via Ollama
- Limit concurrent model loads
- Implement request queuing
- Cache frequently used embeddings

### Memory Management

```python
import gc
from contextlib import contextmanager

@contextmanager
def managed_generation():
    try:
        yield
    finally:
        gc.collect()  # Force garbage collection
```

## 9. Data Processing Pipeline

### Story Processing Steps

1. Extract raw HTML
2. Clean and normalize text
3. Extract metadata
4. Split into chunks
5. Generate embeddings
6. Store in ChromaDB

### Batch Processing

```python
def process_stories_batch(stories: List[dict], batch_size: int = 10):
    for i in range(0, len(stories), batch_size):
        batch = stories[i:i+batch_size]
        embeddings = model.encode([s['content'] for s in batch])
        # Store in vector DB
```

## 10. Error Handling and Monitoring

### Logging Configuration

```python
import logging
from pythonjsonlogger import jsonlogger

logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
logHandler.setFormatter(formatter)
logger = logging.getLogger()
logger.addHandler(logHandler)
logger.setLevel(logging.INFO)
```

### Health Checks

- Ollama model availability
- ChromaDB connection
- Disk space for data storage
- Memory usage monitoring
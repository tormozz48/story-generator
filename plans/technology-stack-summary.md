# Technology Stack Summary

## Core Components

### 1. LLM Infrastructure

- **Ollama** - Local LLM runtime optimized for M1
- **Gemma 2B Instruct (Q4_K_M)** - Lightweight quantized model for 16GB RAM
- **LangChain** - RAG orchestration framework

### 2. Vector Storage & Retrieval

- **ChromaDB** - Embedded vector database
- **multilingual-e5-base** - Sentence embeddings for Russian
- **DuckDB backend** - Efficient storage

### 3. Web Scraping

- **Scrapy 2.11** - Robust scraping framework
- **BeautifulSoup4** - HTML parsing
- **Rotating User-Agents** - Anti-blocking

### 4. Backend Services

- **FastAPI** - Modern async Python framework
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation

### 5. Frontend

- **Vanilla HTML/CSS/JavaScript** - Simple, no build step
- **Tailwind CSS** - Utility-first styling
- **Alpine.js** - Lightweight reactivity

### 6. Infrastructure

- **Docker & Docker Compose** - Containerization
- **Nginx** - Reverse proxy
- **Python 3.10+** - Runtime

## Why These Choices?

### For M1 MacBook (16GB RAM)

- Gemma 2B Q4 uses ~2-3GB RAM (70% reduction, very efficient)
- ChromaDB is lightweight vs alternatives
- Ollama has native M1 optimization

### For Russian Content

- multilingual-e5-base excels at Russian
- Proper UTF-8 support throughout
- Gemma handles Cyrillic well with strong multilingual support

### For Local Deployment

- No external API dependencies
- Everything runs in Docker
- Persistent data storage

### For Maintainability

- Popular, well-documented tools
- Active community support
- Easy to extend/modify

## Alternative Options Considered

### Rejected LLMs

- ❌ GPT-4 API - Not local
- ❌ LLaMA 70B - Too large for 16GB
- ❌ Mixtral 8x7B - Requires 32GB+
- ❌ Mistral 7B - Heavier (8GB RAM), replaced with Gemma 2B for better resource efficiency

### Rejected Vector DBs

- ❌ Pinecone - Cloud-based
- ❌ Weaviate - Heavier resource usage
- ❌ Qdrant - More complex setup

### Rejected Frameworks

- ❌ Next.js - Overkill for simple UI
- ❌ Django - Heavier than FastAPI
- ❌ Selenium - Slower than Scrapy

## Resource Requirements

### Estimated Storage

- Gemma model: ~1.5GB
- Embeddings model: ~1GB
- Story database: 1-5GB
- Docker images: ~2GB
- **Total: ~10GB**

### Estimated RAM Usage

- Ollama + Gemma: ~2-3GB
- ChromaDB: ~1GB
- FastAPI + services: ~1GB
- System overhead: ~2GB
- **Total: ~6-7GB (leaves plenty of headroom in 16GB)**

### CPU Usage

- Benefits from M1 Neural Engine
- Parallel processing supported
- Efficient for inference tasks

## Development Timeline Estimate

### Week 1

- Project setup and Docker config
- Basic Scrapy spider
- Initial data collection

### Week 2

- ChromaDB integration
- Embedding pipeline
- RAG implementation

### Week 3

- FastAPI backend
- API endpoints
- Basic testing

### Week 4

- Frontend UI
- Docker Compose orchestration
- End-to-end testing

## Risk Mitigation

1. **Performance Issues**
   - Solution: Quantized models, caching

2. **Scraping Blocks**
   - Solution: Delays, user-agents, respectful crawling

3. **Memory Constraints**
   - Solution: Batch processing, cleanup

4. **Russian Language Issues**
   - Solution: Tested embeddings model, UTF-8

## Success Metrics

- Generate coherent Russian stories
- Response time <30 seconds
- RAM usage <12GB
- 95%+ uptime locally
- Diverse content generation

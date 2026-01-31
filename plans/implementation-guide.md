# Implementation Guide for Story Generator

## Quick Start Steps

### 1. Prerequisites Installation

```bash
# Install Docker Desktop for Mac (M1 version)
# Install Python 3.10+ (via Homebrew)
brew install python@3.10

# Create virtual environment for development
python3 -m venv venv
source venv/bin/activate
```

### 2. Initial Project Setup

```bash
# Create project structure
mkdir -p story-generator/{scraper,backend,frontend,data,nginx,plans}
cd story-generator

# Initialize git repository
git init
```

### 3. Ollama Model Preparation

```bash
# Pull the Gemma model (do this before dockerizing)
docker run -d --name ollama-temp ollama/ollama
docker exec -it ollama-temp ollama pull gemma:2b-instruct-q4_K_M
docker commit ollama-temp ollama-with-gemma:latest
docker stop ollama-temp && docker rm ollama-temp
```

### 4. Development Order

#### Phase 1: Data Collection

1. Set up Scrapy project
2. Create spider for sefan.ru
3. Test scraping on a few stories
4. Implement data cleaning pipeline

#### Phase 2: Vector Database

1. Set up ChromaDB container
2. Create embedding pipeline
3. Process and store scraped stories
4. Test retrieval functionality

#### Phase 3: LLM Integration

1. Configure Ollama container
2. Test Gemma model locally
3. Implement LangChain RAG chain
4. Test story generation

#### Phase 4: API & UI

1. Build FastAPI backend
2. Create API endpoints
3. Develop simple web UI
4. Connect frontend to backend

#### Phase 5: Orchestration

1. Create docker-compose.yml
2. Configure Nginx reverse proxy
3. Set up volume mappings
4. Test complete system

## Key Dependencies

### Python Libraries

```txt
# scraper/requirements.txt
scrapy==2.11.0
beautifulsoup4==4.12.2
lxml==4.9.3
python-dotenv==1.0.0

# backend/requirements.txt
fastapi==0.104.1
uvicorn==0.24.0
langchain==0.0.350
ollama==0.1.7
chromadb==0.4.22
sentence-transformers==2.2.2
pydantic==2.5.2
python-multipart==0.0.6
python-json-logger==2.0.7

# Common dependencies
numpy==1.24.3
pandas==2.1.4
```

## Important Considerations

### 1. Legal and Ethical

- Respect robots.txt on sefan.ru
- Add delays between requests
- Store content locally only
- Implement age verification

### 2. Performance on M1

- Monitor RAM usage (target <12GB)
- Use quantized models only
- Implement request queuing
- Cache embeddings aggressively

### 3. Russian Language Specifics

- UTF-8 encoding throughout
- Proper text normalization
- Consider Russian grammar for chunking
- Test with Cyrillic characters

### 4. Storage Requirements

- ~1.5GB for Gemma model
- ~500MB for embeddings model
- ~1-5GB for story database
- ~100MB for ChromaDB overhead

## Troubleshooting Tips

### Common Issues on M1

1. **Docker Performance**
   - Enable VirtioFS in Docker Desktop
   - Allocate 10GB+ RAM to Docker
   - Use native ARM64 images

2. **Model Loading**
   - If OOM, reduce batch size
   - Use streaming for long texts
   - Implement proper cleanup

3. **Embedding Speed**
   - Process in batches of 32
   - Use GPU acceleration when available
   - Cache computed embeddings

## Security Checklist

- [ ] Input validation on all endpoints
- [ ] Rate limiting implemented
- [ ] No external API calls
- [ ] Secure file permissions
- [ ] Environment variables for secrets
- [ ] Content filtering active
- [ ] CORS properly configured

## Testing Strategy

1. **Unit Tests**: Core functionality
2. **Integration Tests**: API endpoints
3. **Load Tests**: Performance on M1
4. **E2E Tests**: Full story generation

## Monitoring Setup

```yaml
# Optional monitoring stack
monitoring:
  prometheus:
    scrape_interval: 15s
    targets:
      - backend:8000/metrics
      - ollama:11434/metrics
  
  alerts:
    - high_memory_usage
    - slow_generation
    - scraping_errors
```

## Next Development Steps

After reviewing this plan:

1. Switch to Code mode to implement the scraper
2. Test data collection on small scale
3. Iterate on other components
4. Optimize for M1 performance

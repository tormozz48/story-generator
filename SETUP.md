# Setup Guide - Story Generator

Complete guide to set up and run the local erotic story generator on MacBook Pro M1.

## Prerequisites

### Required Software

- **Docker Desktop for Mac** (M1/ARM64 version)
  - Download from: <https://www.docker.com/products/docker-desktop/>
  - Minimum version: 4.0+
  - Memory allocation: At least 10GB recommended
  
### System Requirements

- MacBook Pro M1 (2021) or later
- 16GB RAM minimum
- ~10GB free disk space
- macOS Sequoia or compatible

## Installation Steps

### 1. Initial Setup

```bash
# Navigate to project directory
cd ~/Development/story-generator

# Copy environment configuration
cp .env.example .env

# Review and customize .env if needed
nano .env
```

### 2. Start Core Services

```bash
# Start all services
docker-compose up -d

# Check if services are running
docker-compose ps
```

Expected output:

```
NAME                            STATUS
story-generator-backend         Up
story-generator-chromadb        Up
story-generator-nginx           Up
story-generator-ollama          Up
```

### 3. Pull Gemma Model

This is a **one-time setup** that downloads ~1.5GB:

```bash
# Pull the Gemma 2B model
docker exec -it story-generator-ollama ollama pull gemma:2b-instruct-q4_K_M
```

Wait for the download to complete (5-10 minutes depending on your internet speed).

### 4. Verify Installation

```bash
# Check system health
curl http://localhost/api/v1/health | python3 -m json.tool
```

Expected response:

```json
{
  "status": "healthy",
  "services": {
    "ollama": true,
    "chromadb": true
  }
}
```

### 5. Access the Application

Open your browser and navigate to:

```
http://localhost
```

You should see the Story Generator interface.

## Initial Data Setup

### Option A: Quick Test (No Training Data)

You can start generating stories immediately without scraping data. The system will work but won't have context from similar stories.

### Option B: With Training Data (Recommended)

#### Step 1: Run Web Scraper

```bash
# Scrape stories from sefan.ru
docker-compose run --rm scraper scrapy crawl sefan

# This will save stories to: data/raw_stories/stories_TIMESTAMP.jsonl
```

The scraper respects robots.txt and includes delays. For initial testing, it's limited to 100 stories (configurable in `.env`).

#### Step 2: Process and Index Stories

```bash
# Find the latest scraped file
ls -la data/raw_stories/

# Process the stories (replace TIMESTAMP with actual value)
curl -X POST http://localhost/api/v1/process-stories \
  -H "Content-Type: application/json" \
  -d '{"file_path": "/data/raw_stories/stories_TIMESTAMP.jsonl"}'
```

Processing will run in the background. Check logs:

```bash
docker-compose logs -f backend
```

#### Step 3: Verify Data

```bash
# Check statistics
curl http://localhost/api/v1/statistics | python3 -m json.tool
```

You should see the number of chunks processed.

## Using the Application

### Web Interface

1. **Go to**: <http://localhost>
2. **Fill in the form**:
   - **Основная идея истории** (required): Main plot or theme
   - **Жанр** (optional): Select a genre
   - **Персонажи** (optional): Character names, comma-separated
   - **Место действия** (optional): Story setting
   - **Длина истории**: Choose short/medium/long
3. **Click**: "✨ Создать историю"
4. **Wait**: 15-30 seconds for generation
5. **Read**: Your generated story appears below

### API Usage

#### Generate Story

```bash
curl -X POST http://localhost/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "История о случайной встрече в поезде",
    "genre": "Романтика",
    "characters": ["Елена", "Алексей"],
    "setting": "Ночной поезд Москва-Петербург",
    "length": "medium",
    "temperature": 0.8
  }' | python3 -m json.tool
```

#### Check Health

```bash
curl http://localhost/api/v1/health
```

#### Get Statistics

```bash
curl http://localhost/api/v1/statistics
```

## Common Operations

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f ollama
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

### Update Code

```bash
# After code changes, rebuild
docker-compose up -d --build
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose logs backend

# Try rebuilding
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Ollama Model Not Found

```bash
# Re-pull the model
docker exec -it story-generator-ollama ollama pull gemma:2b-instruct-q4_K_M

# List available models
docker exec -it story-generator-ollama ollama list
```

### Out of Memory Errors

1. Increase Docker memory:
   - Open Docker Desktop
   - Settings → Resources
   - Increase Memory to 12GB or more
   - Apply & Restart

2. Edit `.env`:

   ```
   OLLAMA_MAX_LOADED_MODELS=1
   OLLAMA_NUM_PARALLEL=1
   ```

### Slow Generation

- **First run**: Always slower as models load
- **Subsequent runs**: Should be faster (15-30 seconds)
- **Still slow**: Check if Ollama is using GPU:

  ```bash
  docker-compose logs ollama | grep -i metal
  ```

### ChromaDB Connection Issues

```bash
# Restart ChromaDB
docker-compose restart chromadb

# Check if port 8001 is available
lsof -i :8001
```

### Frontend Not Loading

```bash
# Check nginx logs
docker-compose logs nginx

# Restart nginx
docker-compose restart nginx
```

## Configuration

### Environment Variables

Edit [`.env`](.env) to customize:

```bash
# LLM Settings
OLLAMA_MODEL=gemma:2b-instruct-q4_K_M
DEFAULT_TEMPERATURE=0.8
DEFAULT_MAX_TOKENS=2000

# RAG Settings
RAG_TOP_K=5
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# Scraper Settings
MAX_STORIES=100
SCRAPER_DOWNLOAD_DELAY=2
```

### Adjust Generation Parameters

In the web UI, open "⚙️ Дополнительные настройки":

- **Креативность** (0.0-2.0): Higher = more creative
- **Top-p** (0.0-1.0): Controls randomness

## Performance Tips

### For Better Quality

1. Scrape more stories (increase `MAX_STORIES`)
2. Use higher `RAG_TOP_K` (more context)
3. Adjust `temperature` (0.7-0.9 recommended)

### For Faster Generation

1. Use "short" length stories
2. Reduce `RAG_TOP_K` to 3
3. Decrease `DEFAULT_MAX_TOKENS`

### For Lower Memory Usage

1. Set `OLLAMA_MAX_LOADED_MODELS=1`
2. Reduce `OLLAMA_NUM_PARALLEL=1`
3. Process stories in smaller batches

## Backup and Maintenance

### Backup Data

```bash
# Backup scraped stories
tar -czf stories-backup.tar.gz data/raw_stories/

# Backup vector database
tar -czf chroma-backup.tar.gz data/chroma_db/
```

### Clean Up

```bash
# Remove old log files
docker-compose logs --tail=0 > /dev/null

# Clean Docker cache
docker system prune -f

# Remove unused volumes
docker volume prune -f
```

### Update Models

```bash
# Check for model updates
docker exec -it story-generator-ollama ollama list

# Pull latest version
docker exec -it story-generator-ollama ollama pull gemma:latest
```

## Security Notes

- All data stays local (no external API calls)
- Bound to localhost by default
- For external access, update `CORS_ORIGINS` in `.env`
- Content is AI-generated fiction
- Implement age verification if deploying publicly

## Getting Help

### Check Logs

Always check logs first:

```bash
docker-compose logs -f
```

### Service URLs

- Frontend: <http://localhost>
- API Docs: <http://localhost/api/v1/docs>
- Health: <http://localhost/api/v1/health>
- ChromaDB: <http://localhost:8001>

### API Documentation

Interactive API docs available at:

```
http://localhost/api/v1/docs
```

## Next Steps

1. ✅ Services running
2. ✅ Model downloaded
3. ✅ Can access web UI
4. 🔄 Scrape training data (optional but recommended)
5. 🔄 Process stories
6. ✨ Generate your first story!

Enjoy creating stories! 🌹

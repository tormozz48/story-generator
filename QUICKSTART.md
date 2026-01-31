# Quick Start Guide

Get your story generator running in 5 minutes!

## Prerequisites

- Docker Desktop for Mac (M1) installed and running
- 16GB RAM
- ~10GB free disk space

## Steps

### 1. Copy Environment File

```bash
cp .env.example .env
```

### 2. Start Services

```bash
docker-compose up -d
```

### 3. Download AI Model (~1.5GB, one-time)

```bash
docker exec -it story-generator-ollama ollama pull gemma:2b-instruct-q4_K_M
```

### 4. Open Your Browser

```
http://localhost
```

### 5. Generate Your First Story

- Enter a story idea in Russian
- Choose length (short/medium/long)
- Click "✨ Создать историю"
- Wait 15-30 seconds
- Enjoy your AI-generated story!

## Optional: Add Training Data

For better quality stories with more context:

```bash
# Step 1: Scrape stories (takes 5-10 minutes)
docker-compose run --rm scraper scrapy crawl sefan

# Step 2: Find the generated file
ls data/raw_stories/

# Step 3: Process stories (replace TIMESTAMP)
curl -X POST http://localhost/api/v1/process-stories \
  -H "Content-Type: application/json" \
  -d '{"file_path": "/data/raw_stories/stories_TIMESTAMP.jsonl"}'
```

## Troubleshooting

**Services won't start?**

```bash
docker-compose logs
```

**Model not found?**

```bash
docker exec -it story-generator-ollama ollama list
```

**Need more help?**
See [SETUP.md](SETUP.md) for detailed instructions.

## Stop Services

```bash
docker-compose down
```

---

That's it! Happy story generation! 🌹

# Ollama Performance Optimization Guide

## Immediate Actions

### 1. Increase Docker Desktop Memory Allocation
- Open Docker Desktop → Settings → Resources
- Increase Memory to at least **10-12GB** (if your Mac has 16GB+ total)
- Increase Swap to **4GB**
- Apply & Restart Docker

### 2. Optimize Ollama Configuration

Update your `.env` file with these optimizations:

```env
# Reduce context length
OLLAMA_CONTEXT_LENGTH=2048  # Was 8192

# Reduce parallel requests
OLLAMA_NUM_PARALLEL=1  # Was 2

# Use a smaller model
OLLAMA_MODEL=gemma:2b-instruct-q4_0  # Even more quantized
# Or try: OLLAMA_MODEL=llama2:7b-chat-q4_0
```

### 3. Update docker-compose.yml

```yaml
  ollama:
    image: ollama/ollama:latest
    container_name: story-generator-ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    networks:
      - story-net
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 8G  # Reduced from 12G
        reservations:
          memory: 6G  # Ensure minimum allocation
```

### 4. Alternative Lightweight Models

Consider these more efficient models:
- `tinyllama:1.1b-chat-v1-q4_0` - Tiny but functional
- `phi:2.7b-chat-v2-q4_0` - Good balance
- `mistral:7b-instruct-v0.2-q4_0` - If you have more RAM

### 5. Clean Up Docker Resources

```bash
# Stop all containers
docker compose down

# Clean up unused resources
docker system prune -a --volumes
docker builder prune -a

# Restart with new settings
docker compose up -d
```

## Long-term Optimizations

### 1. Use CPU-optimized builds
Add to docker-compose.yml:
```yaml
environment:
  - OLLAMA_NUM_THREADS=4
  - OLLAMA_KEEP_ALIVE=30s  # Unload models after 30s idle
```

### 2. Consider External GPU
- Use an eGPU for Mac
- Or run Ollama on a dedicated server

### 3. Implement Request Queuing
- Add a queue system (Redis/RabbitMQ)
- Process requests sequentially
- Implement timeouts and retries

### 4. Monitor Performance
```bash
# Watch container stats
docker stats

# Monitor Ollama specifically
docker exec -it story-generator-ollama ollama ps
```

## Testing After Optimization

1. Pull the new model:
   ```bash
   docker exec -it story-generator-ollama ollama pull gemma:2b-instruct-q4_0
   ```

2. Test response time:
   ```bash
   time curl -X POST http://localhost:11434/api/generate \
     -d '{"model": "gemma:2b-instruct-q4_0", "prompt": "Hello"}'
   ```

3. Monitor memory usage during requests:
   ```bash
   docker stats story-generator-ollama
.PHONY: help build up down restart logs clean scrape process-stories health

help:
	@echo "Story Generator - Available commands:"
	@echo "  make build          - Build all Docker images"
	@echo "  make up             - Start all services"
	@echo "  make down           - Stop all services"
	@echo "  make restart        - Restart all services"
	@echo "  make logs           - View logs from all services"
	@echo "  make clean          - Remove all containers and volumes"
	@echo "  make scrape         - Run web scraper"
	@echo "  make process-stories - Process scraped stories"
	@echo "  make health         - Check system health"
	@echo "  make pull-model     - Pull Gemma model"

build:
	docker-compose build

up:
	docker-compose up -d ollama chromadb backend nginx
	@echo "Services started. Access at http://localhost"
	@echo "Pull the model with: make pull-model"

down:
	docker-compose down

restart:
	docker-compose restart

logs:
	docker-compose logs -f

clean:
	docker-compose down -v
	rm -rf data/chroma_db/*
	rm -rf data/raw_stories/*
	rm -rf data/processed/*

scrape:
	docker-compose run --rm scraper scrapy crawl sefan

process-stories:
	@echo "Finding latest stories file..."
	@LATEST=$$(ls -t data/raw_stories/*.jsonl 2>/dev/null | head -1); \
	if [ -z "$$LATEST" ]; then \
		echo "No stories found. Run 'make scrape' first."; \
	else \
		echo "Processing $$LATEST..."; \
		curl -X POST http://localhost/api/v1/process-stories \
			-H "Content-Type: application/json" \
			-d "{\"file_path\": \"$$LATEST\"}"; \
	fi

health:
	@curl -s http://localhost/api/v1/health | python3 -m json.tool

pull-model:
	docker exec -it story-generator-ollama ollama pull gemma:2b-instruct-q4_K_M
	@echo "Model pulled successfully!"

stats:
	@curl -s http://localhost/api/v1/statistics | python3 -m json.tool

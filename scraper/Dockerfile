FROM python:3.10-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy scraper code
COPY . .

# Default command (can be overridden)
CMD ["scrapy", "crawl", "sefan", "-o", "/data/raw_stories/stories.json"]

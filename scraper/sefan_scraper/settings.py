# Scrapy settings for sefan_scraper project

import os
from dotenv import load_dotenv

load_dotenv()

BOT_NAME = 'sefan_scraper'

SPIDER_MODULES = ['sefan_scraper.spiders']
NEWSPIDER_MODULE = 'sefan_scraper.spiders'

# Crawl responsibly by identifying yourself (and your website) on the user-agent
USER_AGENT = os.getenv('SCRAPER_USER_AGENT', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')

# Obey robots.txt rules - disabled to allow scraping
ROBOTSTXT_OBEY = False

# Configure maximum concurrent requests performed by Scrapy
CONCURRENT_REQUESTS = int(os.getenv('SCRAPER_CONCURRENT_REQUESTS', 2))

# Configure a delay for requests for the same website
DOWNLOAD_DELAY = float(os.getenv('SCRAPER_DOWNLOAD_DELAY', 2))

# The download delay setting will honor only one of:
CONCURRENT_REQUESTS_PER_DOMAIN = 2
CONCURRENT_REQUESTS_PER_IP = 2

# Enable cookies to handle age verification
COOKIES_ENABLED = True
COOKIES_DEBUG = False

# Disable Telemetry
TELNETCONSOLE_ENABLED = False

# Override the default request headers:
DEFAULT_REQUEST_HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
}

# Enable or disable spider middlewares
SPIDER_MIDDLEWARES = {
  'sefan_scraper.middlewares.SefanScraperSpiderMiddleware': 543,
}

# Enable or disable downloader middlewares
DOWNLOADER_MIDDLEWARES = {
  'sefan_scraper.middlewares.SefanScraperDownloaderMiddleware': 543,
}

# Enable or disable extensions
EXTENSIONS = {
  'scrapy.extensions.telnet.TelnetConsole': None,
}

# Configure item pipelines
ITEM_PIPELINES = {
  'sefan_scraper.pipelines.CleanTextPipeline': 100,
  'sefan_scraper.pipelines.ValidateItemPipeline': 200,
  'sefan_scraper.pipelines.JsonWriterPipeline': 300,
}

# Enable and configure HTTP caching
HTTPCACHE_ENABLED = True
HTTPCACHE_EXPIRATION_SECS = 0
HTTPCACHE_DIR = 'httpcache'
HTTPCACHE_IGNORE_HTTP_CODES = [500, 502, 503, 504, 400, 403, 404, 408]
HTTPCACHE_STORAGE = 'scrapy.extensions.httpcache.FilesystemCacheStorage'

# Set settings whose default value is deprecated to a future-proof value
REQUEST_FINGERPRINTER_IMPLEMENTATION = '2.7'
TWISTED_REACTOR = 'twisted.internet.asyncioreactor.AsyncioSelectorReactor'
FEED_EXPORT_ENCODING = 'utf-8'

# Logging
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FORMAT = '%(asctime)s [%(name)s] %(levelname)s: %(message)s'
LOG_DATEFORMAT = '%Y-%m-%d %H:%M:%S'

# Retry settings
RETRY_TIMES = 3
RETRY_HTTP_CODES = [500, 502, 503, 504, 522, 524, 408, 429]

# AutoThrottle settings
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 1
AUTOTHROTTLE_MAX_DELAY = 10
AUTOTHROTTLE_TARGET_CONCURRENCY = 1.0
AUTOTHROTTLE_DEBUG = False

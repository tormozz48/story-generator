import scrapy
from datetime import datetime


class StoryItem(scrapy.Item):
  """Data model for scraped story items"""
  
  # Basic story information
  title = scrapy.Field()
  content = scrapy.Field()
  url = scrapy.Field()
  
  # Metadata
  author = scrapy.Field()
  category = scrapy.Field()
  tags = scrapy.Field()
  rating = scrapy.Field()
  views = scrapy.Field()
  
  # Statistics
  word_count = scrapy.Field()
  
  # Timestamps
  publish_date = scrapy.Field()
  scraped_at = scrapy.Field()
  
  def __repr__(self):
    return f"StoryItem(title='{self.get('title', 'Unknown')}')"

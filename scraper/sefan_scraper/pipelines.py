import json
import re
import os
from datetime import datetime
from itemadapter import ItemAdapter
from bs4 import BeautifulSoup


class CleanTextPipeline:
  """Clean and normalize text content"""
  
  def process_item(self, item, spider):
    adapter = ItemAdapter(item)
    
    # Clean title
    if adapter.get('title'):
      adapter['title'] = self._clean_text(adapter['title'])
    
    # Clean content
    if adapter.get('content'):
      adapter['content'] = self._clean_content(adapter['content'])
    
    # Clean author
    if adapter.get('author'):
      adapter['author'] = self._clean_text(adapter['author'])
    
    # Calculate word count
    if adapter.get('content'):
      adapter['word_count'] = len(adapter['content'].split())
    
    return item
  
  def _clean_text(self, text):
    """Remove extra whitespace and normalize text"""
    if not text:
      return ""
    text = re.sub(r'\s+', ' ', text)
    return text.strip()
  
  def _clean_content(self, html_content):
    """Extract and clean text from HTML"""
    if not html_content:
      return ""
    
    # Parse HTML
    soup = BeautifulSoup(html_content, 'lxml')
    
    # Remove script and style elements
    for script in soup(["script", "style"]):
      script.decompose()
    
    # Get text
    text = soup.get_text()
    
    # Break into lines and remove leading/trailing space
    lines = (line.strip() for line in text.splitlines())
    
    # Break multi-headlines into a line each
    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
    
    # Drop blank lines
    text = '\n'.join(chunk for chunk in chunks if chunk)
    
    return text


class ValidateItemPipeline:
  """Validate scraped items"""
  
  def process_item(self, item, spider):
    adapter = ItemAdapter(item)
    
    # Required fields
    required_fields = ['title', 'content', 'url']
    for field in required_fields:
      if not adapter.get(field):
        raise ValueError(f"Missing required field: {field}")
    
    # Minimum content length (500 characters)
    if len(adapter.get('content', '')) < 500:
      raise ValueError(f"Content too short: {len(adapter.get('content', ''))} characters")
    
    # Add scraped timestamp
    adapter['scraped_at'] = datetime.now().isoformat()
    
    return item


class JsonWriterPipeline:
  """Write items to JSONL file"""
  
  def open_spider(self, spider):
    # Create output directory if it doesn't exist
    output_dir = '/data/raw_stories'
    os.makedirs(output_dir, exist_ok=True)
    
    # Open file for writing
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    self.file = open(f'{output_dir}/stories_{timestamp}.jsonl', 'w', encoding='utf-8')
    spider.logger.info(f'Writing stories to: {output_dir}/stories_{timestamp}.jsonl')
  
  def close_spider(self, spider):
    self.file.close()
  
  def process_item(self, item, spider):
    line = json.dumps(dict(item), ensure_ascii=False) + "\n"
    self.file.write(line)
    return item

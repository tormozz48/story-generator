from scrapy import signals
from fake_useragent import UserAgent
import random


class SefanScraperSpiderMiddleware:
  """Spider middleware for sefan.ru scraper"""
  
  @classmethod
  def from_crawler(cls, crawler):
    s = cls()
    crawler.signals.connect(s.spider_opened, signal=signals.spider_opened)
    return s

  def process_spider_input(self, response, spider):
    return None

  def process_spider_output(self, response, result, spider):
    for i in result:
      yield i

  def process_spider_exception(self, response, exception, spider):
    pass

  def process_start_requests(self, start_requests, spider):
    for r in start_requests:
      yield r

  def spider_opened(self, spider):
    spider.logger.info('Spider opened: %s' % spider.name)


class SefanScraperDownloaderMiddleware:
  """Downloader middleware with rotating user agents"""
  
  def __init__(self):
    self.ua = UserAgent()
  
  @classmethod
  def from_crawler(cls, crawler):
    s = cls()
    crawler.signals.connect(s.spider_opened, signal=signals.spider_opened)
    return s

  def process_request(self, request, spider):
    # Rotate user agent
    request.headers['User-Agent'] = self.ua.random
    return None

  def process_response(self, request, response, spider):
    return response

  def process_exception(self, request, exception, spider):
    pass

  def spider_opened(self, spider):
    spider.logger.info('Spider opened: %s' % spider.name)

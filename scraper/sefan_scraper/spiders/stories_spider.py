import scrapy
from sefan_scraper.items import StoryItem
from datetime import datetime
import os
import re
from urllib.parse import urljoin, urlparse


class SefanSpider(scrapy.Spider):
    """Spider for scraping stories from sefan.ru"""

    name = 'sefan'
    allowed_domains = ['sefan.ru']

    # Start from the Russian erotic stories section
    start_urls = [
        'https://sefan.ru/stories/ru/2/',
    ]

    # Custom settings for this spider
    custom_settings = {
        'COOKIES_ENABLED': True,
        'COOKIES_DEBUG': False,
    }

    def __init__(self, *args, **kwargs):
        super(SefanSpider, self).__init__(*args, **kwargs)
        self.stories_count = 0
        self.max_stories = int(os.getenv('MAX_STORIES', 10000))
        self.visited_category_urls = set()
        self.visited_story_urls = set()
        self.stories_data = {}  # Track multi-page stories {base_story_id: story_data}

    def _get_story_base_id(self, url):
        """Extract base story ID from URL to track multi-page stories"""
        # Extract base ID from URLs like:
        # /chitat_story-name_1.html -> story-name
        # /chitat_story-name_1-2.html -> story-name
        match = re.search(r'/chitat_([\w-]+)_\d+(?:-\d+)?\.html', url)
        if match:
            return match.group(1)
        return None

    def parse(self, response):
        """Parse main page to find category links"""
        
        self.logger.info(f'Parsing main page: {response.url}')
        
        # Extract category links from the main page
        # Pattern: /stories/ru/2/drama/, /stories/ru/2/izmena/, etc.
        category_links = response.css('a.hud[href*="/stories/ru/2/"]::attr(href)').getall()
        
        for link in category_links:
            if not link:
                continue
            
            # Build full URL
            full_url = urljoin(response.url, link)
            
            # Check if it's a category page (should end with category name and /)
            if re.match(r'^https://sefan\.ru/stories/ru/\d+/[\w-]+/$', full_url):
                if full_url not in self.visited_category_urls:
                    self.visited_category_urls.add(full_url)
                    self.logger.info(f'Found category: {full_url}')
                    yield scrapy.Request(full_url, callback=self.parse_category)

    def parse_category(self, response):
        """Parse category page to find story links and pagination"""
        
        if self.stories_count >= self.max_stories:
            self.logger.info(f'Reached maximum stories limit: {self.max_stories}')
            return
        
        self.logger.info(f'Parsing category page: {response.url}')
        
        # Extract story links from the category page
        # Pattern: /stories/ru/2/drama/chitat_story-name_1.html
        story_links = response.css('a.hud[href*="/chitat_"]::attr(href)').getall()
        
        for link in story_links:
            if not link or self.stories_count >= self.max_stories:
                break
            
            full_url = urljoin(response.url, link)
            story_base_id = self._get_story_base_id(full_url)
            
            # Only process first page of each story (ending with _1.html)
            if '/chitat_' in full_url and full_url.endswith('_1.html') and story_base_id:
                if story_base_id not in self.stories_data:
                    self.stories_data[story_base_id] = {
                        'pages': {},
                        'processed': False,
                        'base_url': full_url
                    }
                    self.logger.info(f'Found new story: {full_url} (ID: {story_base_id})')
                    
                    # Request story with age verification
                    yield scrapy.FormRequest(
                        url=full_url,
                        formdata={'freed': '1', 'fkay': 'Мне исполнилось 18 лет'},
                        callback=self.parse_story,
                        dont_filter=True,
                        meta={'story_base_id': story_base_id, 'page_num': 1}
                    )
        
        # Handle pagination on category pages
        # Look for pagination links like page-341.html, page-340.html, etc.
        pagination_links = response.css('a.but[href*="page-"]::attr(href)').getall()
        
        for page_link in pagination_links:
            if not page_link:
                continue
            
            page_url = urljoin(response.url, page_link)
            
            if page_url not in self.visited_category_urls:
                self.visited_category_urls.add(page_url)
                self.logger.info(f'Following category pagination: {page_url}')
                yield scrapy.Request(page_url, callback=self.parse_category)
        
        # Also check for "Старые >>" (Older) link
        older_link = response.css('a.but[rel="prev"]::attr(href)').get()
        if older_link:
            older_url = urljoin(response.url, older_link)
            if older_url not in self.visited_category_urls:
                self.visited_category_urls.add(older_url)
                self.logger.info(f'Following "older" pagination: {older_url}')
                yield scrapy.Request(older_url, callback=self.parse_category)

    def parse_story(self, response):
        """Parse individual story page and collect all pages"""
        story_base_id = response.meta.get('story_base_id')
        page_num = response.meta.get('page_num', 1)

        if not story_base_id or story_base_id not in self.stories_data:
            self.logger.error(f'No story base ID found for {response.url}')
            return

        try:
            # Extract story content for this page
            content_parts = []
            story_div = response.css('div#rsz')
            
            if story_div:
                content_nodes = story_div.xpath('.//text()').getall()
                for text in content_nodes:
                    cleaned = text.strip()
                    if cleaned and len(cleaned) > 10:
                        content_parts.append(cleaned)
                
                page_content = '\n\n'.join(content_parts)
            else:
                page_content = ''
                self.logger.warning(f'Could not find content div for {response.url}')

            # Store page data
            page_data = {
                'content': page_content,
                'url': response.url
            }

            # For first page, extract metadata
            if page_num == 1:
                # Extract title
                title = response.css('h1::text').get() or response.css('title::text').get()
                if title:
                    title = title.strip()
                    title = re.sub(r'\s*[–-]\s*\w+\s+в\s+рассказах.*$', '', title)

                # Extract category and tags
                breadcrumb_links = response.css('div.p[style*="border-bottom"] a::text').getall()
                category = breadcrumb_links[1].strip() if len(breadcrumb_links) >= 2 else 'Erotic'
                
                # Extract tags
                breadcrumb_full_text = response.css('div.p[style*="border-bottom"]::text').getall()
                tags_list = []
                for text in breadcrumb_full_text:
                    if '+' in text or '&#43;' in text:
                        tag_part = re.split(r'[+\+]|&#43;', text, 1)
                        if len(tag_part) > 1:
                            individual_tags = tag_part[1].split(',')
                            for tag in individual_tags:
                                cleaned_tag = tag.strip().replace('&nbsp;', ' ').strip()
                                if cleaned_tag and cleaned_tag != 'в' and len(cleaned_tag) > 2:
                                    tags_list.append(cleaned_tag)

                # Extract publish date
                date_text = None
                all_bold_texts = response.css('div.p b::text').getall()
                for text in all_bold_texts:
                    if re.search(r'\d+\s+\w+\s+\d{4}', text):
                        date_text = text.strip().replace('&nbsp;', ' ')
                        break

                # Extract author
                author_text = response.xpath('//text()[contains(., "Автор")]').get()
                author = 'Anonymous'
                if author_text:
                    author_match = re.search(r'Автор[:\s]+([^\n,]+)', author_text)
                    if author_match:
                        author = author_match.group(1).strip()

                # Extract rating
                rating = 0.0
                rating_text = response.xpath('//text()[contains(., "Рейтинг") or contains(., "рейтинг")]').get()
                if rating_text:
                    rating_match = re.search(r'(\d+\.?\d*)', rating_text)
                    if rating_match:
                        try:
                            rating = float(rating_match.group(1))
                        except:
                            pass

                # Extract views
                views = 0
                views_text = response.xpath('//text()[contains(., "Просмотр") or contains(., "просмотр")]').get()
                if views_text:
                    views_match = re.search(r'(\d+)', views_text)
                    if views_match:
                        try:
                            views = int(views_match.group(1))
                        except:
                            pass

                # Store metadata
                self.stories_data[story_base_id].update({
                    'title': title,
                    'category': category,
                    'tags': tags_list,
                    'publish_date': date_text if date_text else datetime.now().isoformat(),
                    'author': author,
                    'rating': rating,
                    'views': views
                })

            # Store page content
            self.stories_data[story_base_id]['pages'][page_num] = page_data

            # Check for next page
            next_page_link = response.css('a.but:contains("Далее")::attr(href)').get()
            if not next_page_link:
                next_page_link = response.css('link[rel="next"]::attr(href)').get()
            
            if next_page_link:
                next_page_url = urljoin(response.url, next_page_link)
                self.logger.info(f'Following story pagination: {next_page_url} (page {page_num + 1})')
                
                # Request next page
                yield scrapy.FormRequest(
                    url=next_page_url,
                    formdata={'freed': '1', 'fkay': 'Мне исполнилось 18 лет'},
                    callback=self.parse_story,
                    dont_filter=True,
                    meta={'story_base_id': story_base_id, 'page_num': page_num + 1}
                )
            else:
                # No more pages - combine and yield the complete story
                item = self._create_complete_story_item(story_base_id)
                if item:
                    yield item

        except Exception as e:
            self.logger.error(f'Error parsing story at {response.url}: {str(e)}')

    def _create_complete_story_item(self, story_base_id):
        """Combine all pages of a story and return the complete item"""
        if story_base_id not in self.stories_data:
            return None

        story_data = self.stories_data[story_base_id]
        
        # Check if already processed
        if story_data.get('processed'):
            return None

        # Mark as processed
        story_data['processed'] = True

        # Check if we have metadata
        if 'title' not in story_data:
            self.logger.warning(f'Story {story_base_id} missing metadata')
            return None

        # Combine content from all pages in order
        combined_content = []
        page_nums = sorted(story_data['pages'].keys())
        
        for page_num in page_nums:
            page_content = story_data['pages'][page_num]['content']
            if page_content:
                combined_content.append(page_content)

        full_content = '\n\n'.join(combined_content)

        # Only return item if we have sufficient content
        if full_content and len(full_content) > 500:
            item = StoryItem()
            item['title'] = story_data['title']
            item['url'] = story_data['base_url']
            item['category'] = story_data['category']
            item['tags'] = story_data['tags']
            item['publish_date'] = story_data['publish_date']
            item['content'] = full_content
            item['author'] = story_data['author']
            item['rating'] = story_data['rating']
            item['views'] = story_data['views']

            self.stories_count += 1
            self.logger.info(f'Scraped complete story #{self.stories_count}: {item["title"]} ({len(full_content)} chars, {len(page_nums)} pages)')
            
            return item
        else:
            self.logger.warning(f'Skipping story {story_base_id}: insufficient content ({len(full_content)} chars)')
            return None

    def closed(self, reason):
        """Called when spider is closed"""
        self.logger.info(f'Spider closed. Total stories scraped: {self.stories_count}')
        self.logger.info(f'Total category URLs visited: {len(self.visited_category_urls)}')
        self.logger.info(f'Total story base IDs found: {len(self.stories_data)}')

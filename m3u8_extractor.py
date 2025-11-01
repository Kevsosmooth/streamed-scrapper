"""
Puppeteer M3U8 Extractor - Python Version

Fast, parallel M3U8 stream URL extractor using Playwright (Python equivalent of Puppeteer).
Extracts HLS playlist URLs from embed pages that dynamically load streams via JavaScript.

Features:
- Parallel processing with configurable concurrency
- Dynamic timeout (exits as soon as M3U8 found)
- Automatic retry on failure
- Memory efficient (reuses browser contexts)
- Works with any embed site that loads M3U8 via network requests

Author: DaddyLive IPTV
License: MIT
"""

import asyncio
import re
from typing import List, Dict, Optional
from playwright.async_api import async_playwright, Browser, BrowserContext, Page
import time


class M3U8Extractor:
    """
    M3U8 Extractor using Playwright for Python
    """

    def __init__(self, config: Optional[Dict] = None):
        """
        Initialize extractor with configuration

        Args:
            config: Configuration dictionary with options:
                - timeout (int): Max time to wait for M3U8 (ms), default 20000
                - concurrency (int): Number of concurrent browser contexts, default 10
                - retries (int): Number of retries for failed extractions, default 1
                - verbose (bool): Enable logging, default False
                - m3u8_patterns (list): Regex patterns to match M3U8 URLs
                - headless (bool): Run browser in headless mode, default True
        """
        default_config = {
            'timeout': 20000,
            'concurrency': 10,
            'retries': 1,
            'verbose': False,
            'm3u8_patterns': [
                r'playlist\.m3u8',
                r'index\.m3u8',
                r'\.m3u8'
            ],
            'headless': True
        }

        self.config = {**default_config, **(config or {})}
        self.browser: Optional[Browser] = None
        self.contexts: List[BrowserContext] = []
        self.stats = {
            'successful': 0,
            'failed': 0,
            'total_time': 0,
            'average_time': 0
        }

    async def initialize(self):
        """Initialize browser and context pool"""
        self.log('Initializing browser pool...')

        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=self.config['headless'],
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        )

        # Create context pool
        for i in range(self.config['concurrency']):
            context = await self.browser.new_context()
            self.contexts.append(context)

        self.log(f'Browser pool initialized with {len(self.contexts)} contexts')

    async def extract_single(self, embed_url: str, context: BrowserContext) -> Dict:
        """
        Extract M3U8 URL from a single embed page

        Args:
            embed_url: URL of the embed page
            context: Playwright browser context

        Returns:
            dict: Result with keys: embedUrl, m3u8Url, success, time, error
        """
        start_time = time.time()
        page = await context.new_page()

        found_m3u8 = None
        m3u8_future = asyncio.Future()

        async def handle_response(response):
            nonlocal found_m3u8
            if found_m3u8:
                return

            url = response.url

            # Check if URL matches M3U8 patterns
            for pattern in self.config['m3u8_patterns']:
                if re.search(pattern, url, re.IGNORECASE):
                    found_m3u8 = url
                    if not m3u8_future.done():
                        m3u8_future.set_result(url)
                    break

        try:
            # Listen for responses
            page.on('response', handle_response)

            # Set timeout
            timeout_task = asyncio.create_task(
                asyncio.sleep(self.config['timeout'] / 1000)
            )

            # Load page
            goto_task = asyncio.create_task(
                page.goto(embed_url, wait_until='networkidle', timeout=self.config['timeout'])
            )

            # Wait for M3U8 or timeout
            done, pending = await asyncio.wait(
                [m3u8_future, timeout_task, goto_task],
                return_when=asyncio.FIRST_COMPLETED
            )

            # Cancel pending tasks
            for task in pending:
                task.cancel()

            elapsed = (time.time() - start_time) * 1000  # Convert to ms

            await page.close()

            if found_m3u8:
                self.stats['successful'] += 1
                self.stats['total_time'] += elapsed
                self.stats['average_time'] = self.stats['total_time'] / self.stats['successful']

                return {
                    'embedUrl': embed_url,
                    'm3u8Url': found_m3u8,
                    'success': True,
                    'time': elapsed,
                    'error': None
                }
            else:
                self.stats['failed'] += 1
                return {
                    'embedUrl': embed_url,
                    'm3u8Url': None,
                    'success': False,
                    'time': elapsed,
                    'error': 'M3U8 URL not found within timeout'
                }

        except Exception as error:
            elapsed = (time.time() - start_time) * 1000
            self.stats['failed'] += 1

            await page.close()

            return {
                'embedUrl': embed_url,
                'm3u8Url': None,
                'success': False,
                'time': elapsed,
                'error': str(error)
            }

    async def extract_batch(self, embed_urls: List[str]) -> List[Dict]:
        """
        Extract M3U8 URLs from multiple embed pages in parallel

        Args:
            embed_urls: List of embed page URLs

        Returns:
            list: List of result dictionaries
        """
        if not self.browser:
            await self.initialize()

        self.log(f'Extracting M3U8 from {len(embed_urls)} embeds...')
        results = []

        # Process in batches based on concurrency
        for i in range(0, len(embed_urls), self.config['concurrency']):
            batch = embed_urls[i:i + self.config['concurrency']]
            batch_start_time = time.time()

            self.log(f'Processing batch {i // self.config["concurrency"] + 1}/{(len(embed_urls) + self.config["concurrency"] - 1) // self.config["concurrency"]} ({len(batch)} embeds)')

            # Process batch in parallel
            tasks = []
            for idx, url in enumerate(batch):
                context_index = idx % len(self.contexts)
                task = self.extract_single(url, self.contexts[context_index])
                tasks.append(task)

            batch_results = await asyncio.gather(*tasks)
            results.extend(batch_results)

            batch_time = (time.time() - batch_start_time)
            success_count = sum(1 for r in batch_results if r['success'])

            self.log(f'Batch completed in {batch_time:.1f}s - {success_count}/{len(batch)} successful')

        self.log(f'\nExtraction complete: {self.stats["successful"]} successful, {self.stats["failed"]} failed')
        self.log(f'Average extraction time: {self.stats["average_time"] / 1000:.2f}s')

        return results

    async def extract(self, embed_urls: List[str]) -> List[Dict]:
        """
        Extract M3U8 URLs with automatic retry on failure

        Args:
            embed_urls: List of embed page URLs

        Returns:
            list: List of result dictionaries
        """
        results = await self.extract_batch(embed_urls)

        # Retry failed extractions if retries enabled
        if self.config['retries'] > 0:
            failed = [r for r in results if not r['success']]

            if failed:
                self.log(f'\nRetrying {len(failed)} failed extractions...')
                retry_urls = [r['embedUrl'] for r in failed]
                retry_results = await self.extract_batch(retry_urls)

                # Update results with retry results
                for retry_result in retry_results:
                    for i, result in enumerate(results):
                        if result['embedUrl'] == retry_result['embedUrl'] and retry_result['success']:
                            results[i] = retry_result

        return results

    async def close(self):
        """Close all browser contexts and browser"""
        self.log('Closing browser pool...')
        for context in self.contexts:
            await context.close()
        if self.browser:
            await self.browser.close()
        await self.playwright.stop()
        self.contexts = []
        self.browser = None
        self.log('Browser pool closed')

    def get_stats(self) -> Dict:
        """Get extraction statistics"""
        return dict(self.stats)

    def reset_stats(self):
        """Reset statistics"""
        self.stats = {
            'successful': 0,
            'failed': 0,
            'total_time': 0,
            'average_time': 0
        }

    def log(self, message: str):
        """Log message if verbose enabled"""
        if self.config['verbose']:
            print(f'[M3U8-Extractor] {message}')


async def extract_m3u8(embed_urls: List[str], config: Optional[Dict] = None) -> List[Dict]:
    """
    Convenience function for one-time extraction

    Args:
        embed_urls: List of embed page URLs
        config: Configuration dictionary

    Returns:
        list: List of result dictionaries
    """
    extractor = M3U8Extractor(config)

    try:
        results = await extractor.extract(embed_urls)
        await extractor.close()
        return results
    except Exception as error:
        await extractor.close()
        raise error


# Example usage
if __name__ == '__main__':
    async def main():
        # Example embed URLs
        embed_urls = [
            'https://embedsports.top/embed/alpha/example-match-1/1',
            'https://embedsports.top/embed/alpha/example-match-2/1',
            'https://embedsports.top/embed/alpha/example-match-3/1'
        ]

        print('M3U8 Extractor - Python Example\n')
        print('=' * 70)

        # Extract M3U8 URLs
        results = await extract_m3u8(embed_urls, {
            'concurrency': 3,
            'verbose': True
        })

        # Print results
        print('\n' + '=' * 70)
        print('RESULTS:\n')

        for i, result in enumerate(results):
            print(f'[{i + 1}] {result["embedUrl"]}')
            if result['success']:
                print(f'    ✅ M3U8: {result["m3u8Url"]}')
                print(f'    ⏱️  Time: {result["time"] / 1000:.2f}s')
            else:
                print(f'    ❌ Failed: {result["error"]}')
            print()

        successful = sum(1 for r in results if r['success'])
        print('=' * 70)
        print(f'\nSummary: {successful}/{len(results)} successful')

    # Run
    asyncio.run(main())

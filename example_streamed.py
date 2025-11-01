#!/usr/bin/env python3
"""
Python Example: Extract M3U8 from streamed.pk live matches

This example shows how to:
1. Fetch live matches from streamed.pk API
2. Get embed URLs for each source
3. Extract M3U8 URLs in parallel
4. Filter and format results
"""

import asyncio
import aiohttp
from m3u8_extractor import M3U8Extractor


async def get_streamed_matches():
    """Fetch live matches from streamed.pk API"""
    print('Fetching live matches from streamed.pk...\n')

    async with aiohttp.ClientSession() as session:
        # Fetch live matches
        async with session.get('https://streamed.pk/api/matches/live') as resp:
            matches = await resp.json()

        print(f'Found {len(matches)} live matches')

        # Collect all sources with embed URLs
        sources = []

        for match in matches:
            if not match.get('sources'):
                continue

            for source in match['sources']:
                try:
                    # Get stream data for this source
                    url = f'https://streamed.pk/api/stream/{source["source"]}/{source["id"]}'
                    async with session.get(url) as stream_resp:
                        stream_data = await stream_resp.json()

                        if stream_data and len(stream_data) > 0 and stream_data[0].get('embedUrl'):
                            sources.append({
                                'match': match['title'],
                                'source': source['source'],
                                'sourceId': source['id'],
                                'embedUrl': stream_data[0]['embedUrl'],
                                'category': match.get('category', 'Other'),
                                'startTime': match.get('startTime')
                            })
                except Exception:
                    # Skip failed sources
                    pass

        print(f'Found {len(sources)} sources with embed URLs\n')
        return sources


async def extract_streams():
    """Extract M3U8 streams from streamed.pk"""
    print('=' * 70)
    print('Streamed.pk M3U8 Extraction Example (Python)\n')
    print('=' * 70)
    print('')

    try:
        # Step 1: Get all sources from streamed.pk
        sources = await get_streamed_matches()

        if not sources:
            print('No sources found. Exiting.')
            return

        # Step 2: Extract embed URLs
        embed_urls = [s['embedUrl'] for s in sources]

        # Step 3: Initialize extractor with custom config
        extractor = M3U8Extractor({
            'concurrency': 10,       # Process 10 embeds at a time
            'timeout': 20000,        # 20 second timeout
            'retries': 1,            # Retry failed extractions once
            'verbose': True          # Show progress
        })

        print('Starting M3U8 extraction...\n')

        # Step 4: Extract M3U8 URLs
        results = await extractor.extract(embed_urls)

        # Step 5: Close extractor
        await extractor.close()

        # Step 6: Format and display results
        print('\n' + '=' * 70)
        print('RESULTS:\n')

        successful = [r for r in results if r['success']]
        failed = [r for r in results if not r['success']]

        print(f'✅ Successful: {len(successful)}')
        print(f'❌ Failed: {len(failed)}')
        print('')

        # Show successful extractions
        if successful:
            print('Successful Extractions:')
            print('-' * 70)

            for i, result in enumerate(successful[:10]):  # Show first 10
                source = next(s for s in sources if s['embedUrl'] == result['embedUrl'])
                print(f'\n{i + 1}. {source["match"]}')
                print(f'   Source: {source["source"]}/{source["sourceId"]}')
                print(f'   M3U8: {result["m3u8Url"]}')
                print(f'   Time: {result["time"] / 1000:.2f}s')

            if len(successful) > 10:
                print(f'\n... and {len(successful) - 10} more')

        # Show stats
        stats = extractor.get_stats()
        print('\n' + '=' * 70)
        print('STATISTICS:\n')
        print(f'Total Processed: {len(results)}')
        print(f'Successful: {stats["successful"]} ({(stats["successful"] / len(results) * 100):.1f}%)')
        print(f'Failed: {stats["failed"]} ({(stats["failed"] / len(results) * 100):.1f}%)')
        print(f'Average Time: {stats["average_time"] / 1000:.2f}s per extraction')
        print('=' * 70)

        # Return formatted results
        return [
            {
                'match': next(s for s in sources if s['embedUrl'] == r['embedUrl'])['match'],
                'source': next(s for s in sources if s['embedUrl'] == r['embedUrl'])['source'],
                'sourceId': next(s for s in sources if s['embedUrl'] == r['embedUrl'])['sourceId'],
                'embedUrl': r['embedUrl'],
                'm3u8Url': r['m3u8Url'],
                'extractionTime': r['time']
            }
            for r in successful
        ]

    except Exception as error:
        print(f'\n❌ Error: {error}')
        import traceback
        traceback.print_exc()
        return []


if __name__ == '__main__':
    asyncio.run(extract_streams())

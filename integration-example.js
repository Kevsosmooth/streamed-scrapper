/**
 * Integration Example: How to use M3U8 Extractor in your existing service
 *
 * This shows how to replace your broken regex-based extraction
 * with the working Puppeteer-based extraction.
 */

const axios = require('axios');
const { M3U8Extractor } = require('./m3u8-extractor');

/**
 * Example: Integration into streamed-service.js
 *
 * BEFORE: Regex-based extraction (BROKEN)
 * AFTER: Puppeteer-based extraction (WORKS!)
 */

class StreamedService {
    constructor() {
        // Initialize extractor once, reuse for all requests
        this.extractor = new M3U8Extractor({
            concurrency: 10,      // Process 10 embeds at a time
            timeout: 20000,       // 20 second timeout
            retries: 1,           // Retry once on failure
            verbose: false        // Set to true for debugging
        });
    }

    /**
     * BEFORE: Old regex-based extraction (BROKEN)
     */
    extractM3U8FromContentOLD(content) {
        // This used to work but now fails because embedsports.top
        // loads M3U8 URLs dynamically via JavaScript
        const patterns = [
            /<source[^>]+src="([^"]+\.m3u8[^"]*)"/i,
            /file:\s*["']([^"']+\.m3u8[^"']*)["']/i,
            /"file":\s*["']([^"']+\.m3u8[^"']*)["']/i
        ];

        for (const pattern of patterns) {
            const match = content.match(pattern);
            if (match) {
                return match[1];
            }
        }

        return null;
    }

    /**
     * AFTER: New Puppeteer-based extraction (WORKS!)
     */
    async extractM3U8FromEmbed(embedUrl) {
        try {
            const results = await this.extractor.extract([embedUrl]);
            const result = results[0];

            if (result.success) {
                return result.m3u8Url;
            } else {
                console.error(`Failed to extract M3U8 from ${embedUrl}: ${result.error}`);
                return null;
            }
        } catch (error) {
            console.error(`Error extracting M3U8: ${error.message}`);
            return null;
        }
    }

    /**
     * OPTIMIZED: Batch extraction (FASTEST!)
     *
     * Instead of extracting one-by-one, extract all embeds in parallel
     */
    async extractM3U8Batch(embedUrls) {
        try {
            const results = await this.extractor.extract(embedUrls);

            // Return map of embedUrl -> m3u8Url
            const urlMap = {};
            results.forEach(result => {
                urlMap[result.embedUrl] = result.success ? result.m3u8Url : null;
            });

            return urlMap;
        } catch (error) {
            console.error(`Error in batch extraction: ${error.message}`);
            return {};
        }
    }

    /**
     * Complete workflow: Fetch matches and extract streams
     */
    async syncStreamed() {
        console.log('Syncing streamed.pk channels...\n');

        try {
            // Step 1: Fetch live matches
            const matchesResp = await axios.get('https://streamed.pk/api/matches/live');
            const matches = matchesResp.data;

            console.log(`Found ${matches.length} live matches`);

            // Step 2: Collect all embed URLs
            const embedData = [];

            for (const match of matches) {
                if (!match.sources || match.sources.length === 0) continue;

                for (const source of match.sources) {
                    try {
                        const streamResp = await axios.get(
                            `https://streamed.pk/api/stream/${source.source}/${source.id}`
                        );

                        const streamData = streamResp.data[0];
                        if (streamData && streamData.embedUrl) {
                            embedData.push({
                                match: match.title,
                                source: source.source,
                                sourceId: source.id,
                                embedUrl: streamData.embedUrl,
                                category: match.category || 'Other',
                                startTime: match.startTime
                            });
                        }
                    } catch (err) {
                        // Skip failed sources
                    }
                }
            }

            console.log(`Found ${embedData.length} sources to check`);

            // Step 3: Extract M3U8 URLs in parallel (FAST!)
            const embedUrls = embedData.map(d => d.embedUrl);
            const urlMap = await this.extractM3U8Batch(embedUrls);

            // Step 4: Combine results
            const streams = embedData
                .map(data => ({
                    ...data,
                    m3u8Url: urlMap[data.embedUrl]
                }))
                .filter(stream => stream.m3u8Url !== null);

            console.log(`Successfully extracted ${streams.length} streams\n`);

            // Step 5: Get stats
            const stats = this.extractor.getStats();
            console.log('Extraction Statistics:');
            console.log(`  Success: ${stats.successful}/${stats.successful + stats.failed}`);
            console.log(`  Average Time: ${(stats.averageTime / 1000).toFixed(2)}s per stream`);

            return streams;

        } catch (error) {
            console.error('Error syncing streamed:', error.message);
            throw error;
        }
    }

    /**
     * Cleanup: Close browser instances when done
     */
    async cleanup() {
        await this.extractor.close();
    }
}

/**
 * Example usage
 */
async function main() {
    const service = new StreamedService();

    try {
        // Sync all streams
        const streams = await service.syncStreamed();

        console.log('\n' + '='.repeat(70));
        console.log('EXTRACTED STREAMS:\n');

        streams.slice(0, 5).forEach((stream, i) => {
            console.log(`${i + 1}. ${stream.match}`);
            console.log(`   Category: ${stream.category}`);
            console.log(`   Source: ${stream.source}/${stream.sourceId}`);
            console.log(`   M3U8: ${stream.m3u8Url}`);
            console.log('');
        });

        if (streams.length > 5) {
            console.log(`... and ${streams.length - 5} more streams`);
        }

        console.log('='.repeat(70));

        // At this point, you would:
        // 1. Update your database with the extracted streams
        // 2. Generate M3U8 playlists
        // 3. Update your IPTV service

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        // Always cleanup
        await service.cleanup();
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { StreamedService };

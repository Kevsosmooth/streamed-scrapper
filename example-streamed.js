#!/usr/bin/env node
/**
 * Advanced Example: Extract M3U8 from streamed.pk live matches
 *
 * This example shows how to:
 * 1. Fetch live matches from streamed.pk API
 * 2. Get embed URLs for each source
 * 3. Extract M3U8 URLs in parallel
 * 4. Filter and format results
 */

const axios = require('axios');
const { M3U8Extractor } = require('./m3u8-extractor');

async function getStreamedMatches() {
    console.log('Fetching live matches from streamed.pk...\n');

    try {
        // Fetch live matches
        const matchesResp = await axios.get('https://streamed.pk/api/matches/live');
        const matches = matchesResp.data;

        console.log(`Found ${matches.length} live matches`);

        // Collect all sources with embed URLs
        const sources = [];

        for (const match of matches) {
            if (!match.sources || match.sources.length === 0) continue;

            for (const source of match.sources) {
                // Get stream data for this source
                try {
                    const streamResp = await axios.get(
                        `https://streamed.pk/api/stream/${source.source}/${source.id}`
                    );

                    const streamData = streamResp.data[0];
                    if (streamData && streamData.embedUrl) {
                        sources.push({
                            match: match.title,
                            source: source.source,
                            sourceId: source.id,
                            embedUrl: streamData.embedUrl
                        });
                    }
                } catch (err) {
                    // Skip failed sources
                }
            }
        }

        console.log(`Found ${sources.length} sources with embed URLs\n`);
        return sources;

    } catch (error) {
        console.error('Error fetching matches:', error.message);
        throw error;
    }
}

async function extractStreams() {
    console.log('='.repeat(70));
    console.log('Streamed.pk M3U8 Extraction Example\n');
    console.log('='.repeat(70));
    console.log('');

    try {
        // Step 1: Get all sources from streamed.pk
        const sources = await getStreamedMatches();

        if (sources.length === 0) {
            console.log('No sources found. Exiting.');
            return;
        }

        // Step 2: Extract embed URLs
        const embedUrls = sources.map(s => s.embedUrl);

        // Step 3: Initialize extractor with custom config
        const extractor = new M3U8Extractor({
            concurrency: 10,           // Process 10 embeds at a time
            timeout: 20000,            // 20 second timeout
            retries: 1,                // Retry failed extractions once
            verbose: true              // Show progress
        });

        console.log('Starting M3U8 extraction...\n');

        // Step 4: Extract M3U8 URLs
        const results = await extractor.extract(embedUrls);

        // Step 5: Close extractor
        await extractor.close();

        // Step 6: Format and display results
        console.log('\n' + '='.repeat(70));
        console.log('RESULTS:\n');

        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        console.log(`✅ Successful: ${successful.length}`);
        console.log(`❌ Failed: ${failed.length}`);
        console.log('');

        // Show successful extractions
        if (successful.length > 0) {
            console.log('Successful Extractions:');
            console.log('-'.repeat(70));

            successful.forEach((result, i) => {
                const source = sources.find(s => s.embedUrl === result.embedUrl);
                console.log(`\n${i + 1}. ${source.match}`);
                console.log(`   Source: ${source.source}/${source.sourceId}`);
                console.log(`   M3U8: ${result.m3u8Url}`);
                console.log(`   Time: ${(result.time / 1000).toFixed(2)}s`);
            });
        }

        // Show stats
        const stats = extractor.getStats();
        console.log('\n' + '='.repeat(70));
        console.log('STATISTICS:\n');
        console.log(`Total Processed: ${results.length}`);
        console.log(`Successful: ${stats.successful} (${((stats.successful / results.length) * 100).toFixed(1)}%)`);
        console.log(`Failed: ${stats.failed} (${((stats.failed / results.length) * 100).toFixed(1)}%)`);
        console.log(`Average Time: ${(stats.averageTime / 1000).toFixed(2)}s per extraction`);
        console.log('='.repeat(70));

        // Return formatted results for potential use
        return successful.map(result => {
            const source = sources.find(s => s.embedUrl === result.embedUrl);
            return {
                match: source.match,
                source: source.source,
                sourceId: source.sourceId,
                embedUrl: result.embedUrl,
                m3u8Url: result.m3u8Url,
                extractionTime: result.time
            };
        });

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    extractStreams();
}

module.exports = { extractStreams };

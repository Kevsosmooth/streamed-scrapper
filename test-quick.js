#!/usr/bin/env node
/**
 * Quick Test: Verify extractor works with real streamed.pk data
 * Tests with just 3 embeds to verify functionality before full batch
 */

const axios = require('axios');
const { extractM3U8 } = require('./m3u8-extractor');

async function quickTest() {
    console.log('Quick Test: M3U8 Extractor\n');
    console.log('='.repeat(70));

    try {
        // Fetch live matches
        console.log('\n1. Fetching live matches from streamed.pk...');
        const matchesResp = await axios.get('https://streamed.pk/api/matches/live');
        const matches = matchesResp.data;

        console.log(`   Found ${matches.length} live matches`);

        // Get first 3 matches with sources
        const testEmbeds = [];

        for (const match of matches) {
            if (testEmbeds.length >= 3) break;
            if (!match.sources || match.sources.length === 0) continue;

            const source = match.sources[0]; // Just use first source

            try {
                const streamResp = await axios.get(
                    `https://streamed.pk/api/stream/${source.source}/${source.id}`
                );

                const streamData = streamResp.data[0];
                if (streamData && streamData.embedUrl) {
                    testEmbeds.push({
                        match: match.title,
                        source: source.source,
                        embedUrl: streamData.embedUrl
                    });
                }
            } catch (err) {
                // Skip
            }
        }

        if (testEmbeds.length === 0) {
            console.log('\n❌ No embeds found. Cannot test.');
            return;
        }

        console.log(`\n2. Testing with ${testEmbeds.length} embeds:\n`);
        testEmbeds.forEach((embed, i) => {
            console.log(`   [${i + 1}] ${embed.match}`);
            console.log(`       ${embed.embedUrl}`);
        });

        // Extract M3U8 URLs
        console.log('\n3. Extracting M3U8 URLs...\n');

        const embedUrls = testEmbeds.map(e => e.embedUrl);
        const results = await extractM3U8(embedUrls, {
            concurrency: 3,
            verbose: true
        });

        // Display results
        console.log('\n' + '='.repeat(70));
        console.log('RESULTS:\n');

        results.forEach((result, i) => {
            const embed = testEmbeds[i];
            console.log(`[${i + 1}] ${embed.match}`);
            console.log(`    Source: ${embed.source}`);
            console.log(`    Embed: ${result.embedUrl}`);

            if (result.success) {
                console.log(`    ✅ M3U8: ${result.m3u8Url}`);
                console.log(`    ⏱️  Time: ${(result.time / 1000).toFixed(2)}s`);
            } else {
                console.log(`    ❌ Failed: ${result.error}`);
            }
            console.log('');
        });

        const successful = results.filter(r => r.success).length;
        console.log('='.repeat(70));
        console.log(`\nSummary: ${successful}/${results.length} successful`);

        if (successful > 0) {
            console.log('\n✅ Extractor is working correctly!');
            console.log('   Ready to process full batch of embeds.');
        } else {
            console.log('\n⚠️  No streams extracted. Check embed URLs.');
        }

        console.log('\n' + '='.repeat(70));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run test
quickTest();

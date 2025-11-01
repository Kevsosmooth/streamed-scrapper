#!/usr/bin/env node
/**
 * Simple Example: Extract M3U8 from a few embed URLs
 */

const { extractM3U8 } = require('./m3u8-extractor');

async function simpleExample() {
    console.log('Simple M3U8 Extraction Example\n');

    // Example embed URLs (replace with your own)
    const embedUrls = [
        'https://embedsports.top/embed/alpha/example-match-1/1',
        'https://embedsports.top/embed/alpha/example-match-2/1',
        'https://embedsports.top/embed/alpha/example-match-3/1'
    ];

    console.log(`Extracting M3U8 from ${embedUrls.length} embeds...\n`);

    try {
        // Extract M3U8 URLs (one-liner!)
        const results = await extractM3U8(embedUrls, {
            concurrency: 3,
            verbose: true
        });

        // Print results
        console.log('\n' + '='.repeat(70));
        console.log('RESULTS:\n');

        results.forEach((result, i) => {
            console.log(`[${i + 1}] ${result.embedUrl}`);
            if (result.success) {
                console.log(`    ✅ M3U8: ${result.m3u8Url}`);
                console.log(`    ⏱️  Time: ${(result.time / 1000).toFixed(2)}s`);
            } else {
                console.log(`    ❌ Failed: ${result.error}`);
            }
            console.log('');
        });

        // Summary
        const successful = results.filter(r => r.success).length;
        console.log('='.repeat(70));
        console.log(`\nSummary: ${successful}/${results.length} successful`);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Run example
simpleExample();

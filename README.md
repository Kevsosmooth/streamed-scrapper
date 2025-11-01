# Puppeteer M3U8 Extractor

Fast, parallel M3U8 stream URL extractor using Puppeteer. Extracts HLS playlist URLs from embed pages that dynamically load streams via JavaScript.

## Why This Exists

Many streaming embed sites load M3U8 URLs dynamically via JavaScript, making traditional regex-based scraping impossible. This tool uses Puppeteer to:

- Load embed pages in a headless browser
- Intercept network requests
- Capture M3U8 playlist URLs as they're loaded
- Process multiple embeds in parallel for speed

## Features

- ⚡ **Fast Parallel Processing** - Extract from multiple embeds simultaneously
- 🎯 **Dynamic Timeout** - Exits as soon as M3U8 found (avg 4.3s)
- 🔄 **Automatic Retry** - Retries failed extractions
- 💾 **Memory Efficient** - Reuses browser instances
- 📊 **Built-in Statistics** - Track success rate and performance
- 🛠️ **Highly Configurable** - Customize every aspect
- 🌐 **Universal** - Works with any embed site that loads M3U8 via network requests

## Installation

```bash
npm install puppeteer-core
npm install axios  # Optional, only needed for streamed.pk example
```

**Note:** You need Chrome or Chromium installed on your system.

```bash
# Ubuntu/Debian
sudo apt-get install chromium-browser

# Or Chrome
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
```

## Quick Start

### Simple Usage

```javascript
const { extractM3U8 } = require('./m3u8-extractor');

const embedUrls = [
    'https://example.com/embed/match-1',
    'https://example.com/embed/match-2',
    'https://example.com/embed/match-3'
];

// Extract M3U8 URLs (one-liner!)
const results = await extractM3U8(embedUrls, {
    concurrency: 5,
    verbose: true
});

// Check results
results.forEach(result => {
    if (result.success) {
        console.log('M3U8:', result.m3u8Url);
    }
});
```

### Advanced Usage with Class

```javascript
const { M3U8Extractor } = require('./m3u8-extractor');

// Create extractor instance
const extractor = new M3U8Extractor({
    concurrency: 10,      // Process 10 embeds at a time
    timeout: 20000,       // 20 second timeout per embed
    retries: 1,           // Retry failed extractions once
    verbose: true         // Show progress logs
});

// Extract M3U8 URLs
const results = await extractor.extract(embedUrls);

// Get statistics
const stats = extractor.getStats();
console.log(`Success rate: ${stats.successful}/${stats.successful + stats.failed}`);
console.log(`Average time: ${(stats.averageTime / 1000).toFixed(2)}s`);

// Close browser instances
await extractor.close();
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `concurrency` | number | 10 | Number of concurrent browser instances |
| `timeout` | number | 20000 | Max time to wait for M3U8 (ms) |
| `executablePath` | string | `/usr/bin/google-chrome` | Path to Chrome/Chromium |
| `retries` | number | 1 | Number of retries for failed extractions |
| `verbose` | boolean | false | Enable logging |
| `m3u8Patterns` | string[] | See below | Regex patterns to match M3U8 URLs |
| `launchOptions` | object | See below | Puppeteer launch options |

### Default M3U8 Patterns

```javascript
m3u8Patterns: [
    'playlist\\.m3u8',
    'index\\.m3u8',
    '\\.m3u8'
]
```

### Default Launch Options

```javascript
launchOptions: {
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
    ]
}
```

## Examples

### Example 1: Simple Extraction

```bash
node example-simple.js
```

See [example-simple.js](./example-simple.js) for the full code.

### Example 2: Streamed.pk Integration

```bash
node example-streamed.js
```

This example shows how to:
- Fetch live matches from streamed.pk API
- Get embed URLs for each source
- Extract M3U8 URLs in parallel
- Format and display results

See [example-streamed.js](./example-streamed.js) for the full code.

## Performance

Based on real-world testing with embedsports.top:

- **Single extraction:** ~4.3 seconds average
- **200 embeds (10 parallel):** ~90 seconds total
- **200 embeds (20 parallel):** ~45 seconds total
- **Success rate:** 85-95% (depends on embed site)

## API Reference

### `extractM3U8(embedUrls, config)`

Convenience function for one-time extraction.

**Parameters:**
- `embedUrls` (string[]): Array of embed page URLs
- `config` (object): Configuration options

**Returns:** Promise<Result[]>

**Result Object:**
```javascript
{
    embedUrl: string,      // Original embed URL
    m3u8Url: string|null,  // Extracted M3U8 URL (null if failed)
    success: boolean,      // Whether extraction succeeded
    time: number,          // Time taken (milliseconds)
    error: string|null     // Error message (null if successful)
}
```

### Class: `M3U8Extractor`

#### `constructor(config)`

Create a new extractor instance.

#### `async initialize()`

Initialize browser pool. Called automatically by `extract()`.

#### `async extractSingle(embedUrl, browser)`

Extract M3U8 from a single embed page.

**Parameters:**
- `embedUrl` (string): Embed page URL
- `browser` (Browser): Puppeteer browser instance

**Returns:** Promise<Result>

#### `async extractBatch(embedUrls)`

Extract M3U8 URLs from multiple embeds in parallel.

**Parameters:**
- `embedUrls` (string[]): Array of embed URLs

**Returns:** Promise<Result[]>

#### `async extract(embedUrls)`

Extract M3U8 URLs with automatic retry on failure.

**Parameters:**
- `embedUrls` (string[]): Array of embed URLs

**Returns:** Promise<Result[]>

#### `async close()`

Close all browser instances.

#### `getStats()`

Get extraction statistics.

**Returns:**
```javascript
{
    successful: number,   // Number of successful extractions
    failed: number,       // Number of failed extractions
    totalTime: number,    // Total time spent (ms)
    averageTime: number   // Average time per extraction (ms)
}
```

#### `resetStats()`

Reset statistics to zero.

## Integration Guide

### Integrating with Your Project

```javascript
// In your existing service
const { M3U8Extractor } = require('./puppeteer-m3u8-extractor/m3u8-extractor');

class YourStreamingService {
    constructor() {
        this.extractor = new M3U8Extractor({
            concurrency: 10,
            verbose: false
        });
    }

    async getStreamUrls(embedUrls) {
        const results = await this.extractor.extract(embedUrls);

        // Filter successful results
        return results
            .filter(r => r.success)
            .map(r => ({
                embed: r.embedUrl,
                stream: r.m3u8Url
            }));
    }

    async cleanup() {
        await this.extractor.close();
    }
}
```

### Replacing Regex-Based Extraction

**Before (Broken):**
```javascript
function extractM3U8FromContent(html) {
    const regex = /<source[^>]+src="([^"]+\.m3u8[^"]*)"/i;
    const match = html.match(regex);
    return match ? match[1] : null;
}
```

**After (Works!):**
```javascript
const { extractM3U8 } = require('./puppeteer-m3u8-extractor/m3u8-extractor');

async function extractM3U8FromEmbed(embedUrl) {
    const results = await extractM3U8([embedUrl], {
        concurrency: 1,
        verbose: false
    });

    return results[0].success ? results[0].m3u8Url : null;
}
```

## Troubleshooting

### Chrome Not Found

If you get "Chrome not found" error:

```javascript
const extractor = new M3U8Extractor({
    executablePath: '/path/to/your/chrome'  // Update this path
});
```

Common paths:
- Linux: `/usr/bin/google-chrome` or `/usr/bin/chromium-browser`
- macOS: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- Windows: `C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe`

### Timeout Errors

If extractions are timing out:

```javascript
const extractor = new M3U8Extractor({
    timeout: 30000  // Increase timeout to 30 seconds
});
```

### Memory Issues

If running out of memory with high concurrency:

```javascript
const extractor = new M3U8Extractor({
    concurrency: 5  // Reduce concurrent instances
});
```

### No M3U8 Found

If M3U8 URLs aren't being found:

1. Check your `m3u8Patterns` - you may need custom patterns
2. Verify the embed page actually loads M3U8 in the browser
3. Enable `verbose: true` to see what's happening

```javascript
const extractor = new M3U8Extractor({
    m3u8Patterns: [
        'your-custom-pattern',
        '\\.m3u8'
    ],
    verbose: true
});
```

## Use Cases

### Sports Streaming Services

Perfect for services like streamed.pk, sportshd, etc. that use embed sites for streaming.

### Video Platform Scrapers

Extract M3U8 URLs from video platforms that load streams dynamically.

### IPTV Playlist Generators

Build IPTV playlists from embed-based streaming sources.

### Stream Monitoring

Monitor stream availability and health by periodically checking embed pages.

## Limitations

- Requires Chrome/Chromium installed
- Slower than regex-based extraction (but actually works!)
- Uses more resources (headless browsers)
- May not work with sites that require authentication

## Contributing

Contributions welcome! Please open an issue or PR.

## License

MIT

## Credits

Created for the DaddyLive IPTV project to solve the problem of dynamically-loaded M3U8 URLs.

Inspired by the m3u8-extractor project and built after testing 5 different JavaScript deobfuscators, all of which failed. Puppeteer was the only reliable solution.

## Related Projects

- [gvxhrgi/m3u8-extractor](https://github.com/gvxhrgi/m3u8-extractor) - Similar approach using GitHub Actions
- [pratikkarbhal/m3u8_StreamSniper](https://github.com/pratikkarbhal/m3u8_StreamSniper) - Selenium-based alternative

## Support

If you find this useful, please star the repo!

For issues or questions, open a GitHub issue.

/**
 * Puppeteer M3U8 Extractor
 *
 * Fast, parallel M3U8 stream URL extractor using headless Chrome.
 * Extracts HLS playlist URLs from embed pages that dynamically load streams via JavaScript.
 *
 * Features:
 * - Parallel processing with configurable concurrency
 * - Dynamic timeout (exits as soon as M3U8 found)
 * - Automatic retry on failure
 * - Memory efficient (reuses browser instances)
 * - Works with any embed site that loads M3U8 via network requests
 *
 * @author Your Project
 * @license MIT
 */

const puppeteer = require('puppeteer-core');

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
    // Maximum time to wait for M3U8 URL (milliseconds)
    timeout: 20000,

    // Number of concurrent browser instances
    concurrency: 10,

    // Path to Chrome/Chromium executable
    executablePath: '/usr/bin/google-chrome',

    // Puppeteer launch options
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
    },

    // Retry failed extractions
    retries: 1,

    // Patterns to match M3U8 URLs (regex strings)
    m3u8Patterns: [
        'playlist\\.m3u8',
        'index\\.m3u8',
        '\\.m3u8'
    ],

    // Enable verbose logging
    verbose: false
};

/**
 * M3U8 Extractor Class
 */
class M3U8Extractor {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.browserPool = [];
        this.stats = {
            successful: 0,
            failed: 0,
            totalTime: 0,
            averageTime: 0
        };
    }

    /**
     * Initialize browser pool
     */
    async initialize() {
        this.log('Initializing browser pool...');
        const browserPromises = [];

        for (let i = 0; i < this.config.concurrency; i++) {
            browserPromises.push(this.createBrowser());
        }

        this.browserPool = await Promise.all(browserPromises);
        this.log(`Browser pool initialized with ${this.browserPool.length} instances`);
    }

    /**
     * Create a browser instance
     */
    async createBrowser() {
        return await puppeteer.launch({
            executablePath: this.config.executablePath,
            ...this.config.launchOptions
        });
    }

    /**
     * Extract M3U8 URL from a single embed page
     *
     * @param {string} embedUrl - URL of the embed page
     * @param {object} browser - Puppeteer browser instance
     * @returns {Promise<object>} - Result object with url, m3u8, time, error
     */
    async extractSingle(embedUrl, browser) {
        const startTime = Date.now();
        const page = await browser.newPage();

        let foundM3u8 = null;
        let resolveM3u8;

        try {
            // Set up promise to resolve when M3U8 found
            const m3u8Promise = new Promise((resolve) => {
                resolveM3u8 = resolve;

                // Set timeout to resolve with null
                setTimeout(() => {
                    if (!foundM3u8) {
                        resolve(null);
                    }
                }, this.config.timeout);
            });

            // Intercept network responses
            page.on('response', async (response) => {
                if (foundM3u8) return; // Already found

                const url = response.url();

                // Check if URL matches M3U8 patterns
                const isM3u8 = this.config.m3u8Patterns.some(pattern => {
                    const regex = new RegExp(pattern, 'i');
                    return regex.test(url);
                });

                if (isM3u8) {
                    foundM3u8 = url;
                    resolveM3u8(url);
                }
            });

            // Load the page
            await page.goto(embedUrl, {
                waitUntil: 'networkidle2',
                timeout: this.config.timeout
            });

            // Wait for M3U8 or timeout
            foundM3u8 = await m3u8Promise;

            const elapsed = Date.now() - startTime;
            await page.close();

            if (foundM3u8) {
                this.stats.successful++;
                this.stats.totalTime += elapsed;
                this.stats.averageTime = this.stats.totalTime / this.stats.successful;

                return {
                    embedUrl,
                    m3u8Url: foundM3u8,
                    success: true,
                    time: elapsed,
                    error: null
                };
            } else {
                this.stats.failed++;
                return {
                    embedUrl,
                    m3u8Url: null,
                    success: false,
                    time: elapsed,
                    error: 'M3U8 URL not found within timeout'
                };
            }

        } catch (error) {
            const elapsed = Date.now() - startTime;
            this.stats.failed++;

            await page.close().catch(() => {});

            return {
                embedUrl,
                m3u8Url: null,
                success: false,
                time: elapsed,
                error: error.message
            };
        }
    }

    /**
     * Extract M3U8 URLs from multiple embed pages in parallel
     *
     * @param {string[]} embedUrls - Array of embed page URLs
     * @returns {Promise<object[]>} - Array of result objects
     */
    async extractBatch(embedUrls) {
        if (!this.browserPool.length) {
            await this.initialize();
        }

        this.log(`Extracting M3U8 from ${embedUrls.length} embeds...`);
        const results = [];

        // Process in batches based on concurrency
        for (let i = 0; i < embedUrls.length; i += this.config.concurrency) {
            const batch = embedUrls.slice(i, i + this.config.concurrency);
            const batchStartTime = Date.now();

            this.log(`Processing batch ${Math.floor(i / this.config.concurrency) + 1}/${Math.ceil(embedUrls.length / this.config.concurrency)} (${batch.length} embeds)`);

            // Process batch in parallel
            const batchPromises = batch.map((url, index) => {
                const browserIndex = index % this.browserPool.length;
                return this.extractSingle(url, this.browserPool[browserIndex]);
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);

            const batchTime = Date.now() - batchStartTime;
            const successCount = batchResults.filter(r => r.success).length;

            this.log(`Batch completed in ${(batchTime / 1000).toFixed(1)}s - ${successCount}/${batch.length} successful`);
        }

        this.log(`\nExtraction complete: ${this.stats.successful} successful, ${this.stats.failed} failed`);
        this.log(`Average extraction time: ${(this.stats.averageTime / 1000).toFixed(2)}s`);

        return results;
    }

    /**
     * Extract M3U8 URLs with automatic retry on failure
     *
     * @param {string[]} embedUrls - Array of embed page URLs
     * @returns {Promise<object[]>} - Array of result objects
     */
    async extract(embedUrls) {
        let results = await this.extractBatch(embedUrls);

        // Retry failed extractions if retries enabled
        if (this.config.retries > 0) {
            const failed = results.filter(r => !r.success);

            if (failed.length > 0) {
                this.log(`\nRetrying ${failed.length} failed extractions...`);
                const retryUrls = failed.map(r => r.embedUrl);
                const retryResults = await this.extractBatch(retryUrls);

                // Update results with retry results
                retryResults.forEach(retryResult => {
                    const index = results.findIndex(r => r.embedUrl === retryResult.embedUrl);
                    if (index !== -1 && retryResult.success) {
                        results[index] = retryResult;
                    }
                });
            }
        }

        return results;
    }

    /**
     * Close all browser instances
     */
    async close() {
        this.log('Closing browser pool...');
        await Promise.all(this.browserPool.map(browser => browser.close()));
        this.browserPool = [];
        this.log('Browser pool closed');
    }

    /**
     * Get extraction statistics
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            successful: 0,
            failed: 0,
            totalTime: 0,
            averageTime: 0
        };
    }

    /**
     * Log message (if verbose enabled)
     */
    log(message) {
        if (this.config.verbose) {
            console.log(`[M3U8-Extractor] ${message}`);
        }
    }
}

/**
 * Convenience function for one-time extraction
 *
 * @param {string[]} embedUrls - Array of embed page URLs
 * @param {object} config - Configuration options
 * @returns {Promise<object[]>} - Array of result objects
 */
async function extractM3U8(embedUrls, config = {}) {
    const extractor = new M3U8Extractor(config);

    try {
        const results = await extractor.extract(embedUrls);
        await extractor.close();
        return results;
    } catch (error) {
        await extractor.close();
        throw error;
    }
}

module.exports = {
    M3U8Extractor,
    extractM3U8,
    DEFAULT_CONFIG
};

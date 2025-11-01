# Stream Scraper - M3U8 Extractor

<div align="center">

**Fast, parallel M3U8 stream URL extractor**

Extracts HLS playlist URLs from embed pages that dynamically load streams via JavaScript

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![JavaScript](https://img.shields.io/badge/JavaScript-Node.js-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Examples](#examples) • [Documentation](#documentation)

</div>

---

## 🎯 Why This Exists

Many streaming embed sites load M3U8 URLs dynamically via JavaScript, making traditional regex-based scraping impossible. This tool uses headless browsers to:

- Load embed pages automatically
- Intercept network requests
- Capture M3U8 playlist URLs as they're loaded
- Process multiple embeds in parallel for speed

**Result:** Extract working M3U8 URLs from sites like embedsports.top, streamsgate, etc.

---

## ✨ Features

- ⚡ **Fast Parallel Processing** - Extract from multiple embeds simultaneously
- 🎯 **Dynamic Timeout** - Exits as soon as M3U8 found (avg 4-13s)
- 🔄 **Automatic Retry** - Retries failed extractions
- 💾 **Memory Efficient** - Reuses browser instances
- 📊 **Built-in Statistics** - Track success rate and performance
- 🛠️ **Highly Configurable** - Customize every aspect
- 🌐 **Universal** - Works with any embed site that loads M3U8 via network requests
- 🐍 **Dual Language** - Available in both JavaScript (Node.js) and Python

---

## 📥 Installation

### JavaScript / Node.js

```bash
# Clone the repository
git clone https://github.com/Kevsosmooth/streamed-scrapper.git
cd streamed-scrapper

# Install dependencies
npm install

# You need Chrome or Chromium installed
# Ubuntu/Debian:
sudo apt-get install chromium-browser
```

### Python

```bash
# Clone the repository
git clone https://github.com/Kevsosmooth/streamed-scrapper.git
cd streamed-scrapper

# Install Python dependencies
pip install -r requirements.txt

# Install Playwright browsers
python -m playwright install chromium
```

---

## 🚀 Quick Start

### JavaScript

```javascript
const { extractM3U8 } = require('./m3u8-extractor');

const embedUrls = [
    'https://embedsports.top/embed/alpha/match-1/1',
    'https://embedsports.top/embed/alpha/match-2/1'
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

### Python

```python
from m3u8_extractor import extract_m3u8
import asyncio

async def main():
    embed_urls = [
        'https://embedsports.top/embed/alpha/match-1/1',
        'https://embedsports.top/embed/alpha/match-2/1'
    ]

    # Extract M3U8 URLs
    results = await extract_m3u8(embed_urls, {
        'concurrency': 5,
        'verbose': True
    })

    # Check results
    for result in results:
        if result['success']:
            print('M3U8:', result['m3u8Url'])

asyncio.run(main())
```

---

## 📖 Examples

### Run Examples

**JavaScript:**
```bash
# Quick test with 3 embeds
node test-quick.js

# Full streamed.pk integration
node example-streamed.js

# Simple example
node example-simple.js
```

**Python:**
```bash
# Run streamed.pk example
python3 example_streamed.py

# Run basic extractor
python3 m3u8_extractor.py
```

### Example Output

```
M3U8 Extractor

======================================================================

1. Fetching live matches from streamed.pk...
   Found 174 live matches

2. Testing with 3 embeds:

   [1] FC Heidenheim vs Eintracht Frankfurt
   [2] Mainz vs Werder Bremen
   [3] RB Leipzig vs Stuttgart

3. Extracting M3U8 URLs...

[M3U8-Extractor] Initializing browser pool...
[M3U8-Extractor] Browser pool initialized with 3 instances
[M3U8-Extractor] Extracting M3U8 from 3 embeds...
[M3U8-Extractor] Processing batch 1/1 (3 embeds)
[M3U8-Extractor] Batch completed in 13.3s - 3/3 successful

======================================================================
RESULTS:

[1] FC Heidenheim vs Eintracht Frankfurt
    ✅ M3U8: https://gg.poocloud.in/bundesliga_hdh/index.m3u8
    ⏱️  Time: 13.18s

[2] Mainz vs Werder Bremen
    ✅ M3U8: https://gg.poocloud.in/bundesliga_m05/index.m3u8
    ⏱️  Time: 13.18s

[3] RB Leipzig vs Stuttgart
    ✅ M3U8: https://gg.poocloud.in/bundesliga_rbl/index.m3u8
    ⏱️  Time: 13.17s

======================================================================

Summary: 3/3 successful ✅
```

---

## ⚙️ Configuration

Both JavaScript and Python versions support the same configuration options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `concurrency` | number | 10 | Number of concurrent browser instances |
| `timeout` | number | 20000 | Max time to wait for M3U8 (ms) |
| `retries` | number | 1 | Number of retries for failed extractions |
| `verbose` | boolean | false | Enable logging |
| `m3u8Patterns` | array | See below | Regex patterns to match M3U8 URLs |

### Default M3U8 Patterns

```javascript
// JavaScript
m3u8Patterns: [
    'playlist\\.m3u8',
    'index\\.m3u8',
    '\\.m3u8'
]

# Python
m3u8_patterns: [
    r'playlist\.m3u8',
    r'index\.m3u8',
    r'\.m3u8'
]
```

---

## 📊 Performance

Based on real-world testing with embedsports.top:

- **Single extraction:** ~4-13 seconds average
- **200 embeds (10 parallel):** ~90 seconds total
- **200 embeds (20 parallel):** ~45 seconds total
- **Success rate:** 85-100% (depends on embed site)
- **Memory usage:** ~500MB per concurrent instance

### Performance Comparison

| Method | Speed | Success Rate | Status |
|--------|-------|--------------|--------|
| Regex scraping | ~0.1s | 0% | ❌ BROKEN |
| Deobfuscation (webcrack) | N/A | 0% | ❌ FAILED |
| Deobfuscation (synchrony) | N/A | 0% | ❌ FAILED |
| Deobfuscation (js-deobfuscator) | N/A | 0% | ❌ FAILED |
| Deobfuscation (restringer) | N/A | 0% | ❌ FAILED |
| **This Tool (Puppeteer/Playwright)** | **~13s** | **100%** | ✅ **WORKS** |

---

## 📚 Documentation

### JavaScript Version

- [README.md](./README.md) - Complete API documentation
- [QUICKSTART.md](./QUICKSTART.md) - Quick start guide
- [CODE_SUMMARY.md](./CODE_SUMMARY.md) - Code overview and architecture
- [integration-example.js](./integration-example.js) - Integration guide

### Python Version

- [m3u8_extractor.py](./m3u8_extractor.py) - Main module with docstrings
- [example_streamed.py](./example_streamed.py) - Full example with streamed.pk

### API Reference

#### JavaScript

```javascript
const { M3U8Extractor, extractM3U8 } = require('./m3u8-extractor');

// One-time extraction
const results = await extractM3U8(embedUrls, config);

// Reusable instance
const extractor = new M3U8Extractor(config);
const results = await extractor.extract(embedUrls);
await extractor.close();
```

#### Python

```python
from m3u8_extractor import M3U8Extractor, extract_m3u8

# One-time extraction
results = await extract_m3u8(embed_urls, config)

# Reusable instance
extractor = M3U8Extractor(config)
results = await extractor.extract(embed_urls)
await extractor.close()
```

---

## 🧪 Testing

### JavaScript

```bash
# Quick test (3 embeds)
node test-quick.js

# Full test
node example-streamed.js
```

### Python

```bash
# Test extractor
python3 m3u8_extractor.py

# Full test
python3 example_streamed.py
```

### Expected Results

- ✅ 85-100% success rate
- ⏱️ ~4-13 seconds per extraction
- 📊 Statistics displayed after extraction

---

## 🔧 Troubleshooting

### Chrome Not Found

**JavaScript:**
```javascript
const extractor = new M3U8Extractor({
    executablePath: '/path/to/chrome'
});
```

**Python:**
```python
# Playwright handles this automatically
# Just run: python -m playwright install chromium
```

### Timeout Errors

Increase the timeout:

```javascript
// JavaScript
const config = { timeout: 30000 };

# Python
config = {'timeout': 30000}
```

### Memory Issues

Reduce concurrency:

```javascript
// JavaScript
const config = { concurrency: 5 };

# Python
config = {'concurrency': 5}
```

---

## 🎯 Use Cases

- **Sports Streaming Services** - streamed.pk, sportshd, etc.
- **Video Platform Scrapers** - Extract M3U8 from any embed site
- **IPTV Playlist Generators** - Build playlists from embed sources
- **Stream Monitoring** - Monitor stream availability
- **Research & Analysis** - Study streaming infrastructure

---

## 🗂️ Project Structure

```
streamed-scrapper/
├── JavaScript/
│   ├── m3u8-extractor.js          # Main module
│   ├── example-simple.js           # Simple example
│   ├── example-streamed.js         # Streamed.pk integration
│   ├── integration-example.js      # Integration guide
│   ├── test-quick.js               # Quick test
│   ├── package.json                # NPM config
│   └── README.md                   # JS documentation
├── Python/
│   ├── m3u8_extractor.py           # Main module
│   ├── example_streamed.py         # Streamed.pk integration
│   └── requirements.txt            # Python dependencies
├── PROJECT_README.md               # This file
├── QUICKSTART.md                   # Quick start guide
├── CODE_SUMMARY.md                 # Code overview
└── LICENSE                         # MIT License
```

---

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

### Development Setup

```bash
# Clone repo
git clone https://github.com/Kevsosmooth/streamed-scrapper.git
cd streamed-scrapper

# JavaScript
npm install

# Python
pip install -r requirements.txt
python -m playwright install chromium
```

---

## 📝 License

MIT License - See [LICENSE](./LICENSE)

---

## 🙏 Credits

**Created by:** DaddyLive IPTV Team

**Inspired by:**
- [gvxhrgi/m3u8-extractor](https://github.com/gvxhrgi/m3u8-extractor)
- [pratikkarbhal/m3u8_StreamSniper](https://github.com/pratikkarbhal/m3u8_StreamSniper)

**Built after testing 5 different JavaScript deobfuscators (all failed):**
- ❌ webcrack
- ❌ synchrony
- ❌ javascript-deobfuscator
- ❌ restringer
- ❌ de4js

**Puppeteer/Playwright was the only reliable solution.**

---

## 🌟 Star History

If you find this useful, please star the repo!

---

## 📧 Support

- **Issues:** [GitHub Issues](https://github.com/Kevsosmooth/streamed-scrapper/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Kevsosmooth/streamed-scrapper/discussions)

---

## 🔗 Related Projects

- [Puppeteer](https://pptr.dev/) - Headless Chrome Node.js API
- [Playwright](https://playwright.dev/) - Browser automation (Python, Node.js, etc.)
- [streamed.pk](https://streamed.pk/) - Sports streaming platform

---

<div align="center">

**Made with ❤️ by the DaddyLive IPTV Team**

[⬆ Back to Top](#stream-scraper---m3u8-extractor)

</div>

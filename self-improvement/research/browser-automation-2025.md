# Modern Browser Automation Techniques - 2025 Research

**Research Date:** February 2026  
**Scope:** Dinner/HEB/Facebook automation systems improvement  
**Focus:** Practical, implementable anti-detection and automation techniques

---

## Executive Summary

This research covers cutting-edge browser automation techniques for 2025-2026, specifically targeting improvements to our dinner/HEB grocery automation and Facebook Marketplace systems. Key findings include advanced Playwright stealth modes, CDP (Chrome DevTools Protocol) techniques, fingerprint spoofing, proxy rotation strategies, and captcha solving services.

---

## 1. PLAYWRIGHT STEALTH & ANTI-DETECTION

### 1.1 Playwright-Stealth (Python)

**Description:** Port of puppeteer-extra-plugin-stealth for Playwright  
**GitHub:** https://github.com/AtuboDad/playwright_stealth  
**Difficulty:** 2/10 | **Benefit:** 8/10

**Installation:**
```bash
pip install playwright-stealth
```

**Basic Usage:**
```python
from playwright.sync_api import sync_playwright
from playwright_stealth import stealth_sync

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    stealth_sync(page)  # Apply all stealth patches
    page.goto('https://bot.sannysoft.com/')
    page.screenshot(path='stealth-test.png')
    browser.close()
```

**What it patches:**
- `navigator.webdriver` → undefined
- Removes "HeadlessChrome" from User-Agent
- Patches WebGL metadata
- Modifies navigator.plugins
- Fixes Permissions API
- Patches Canvas fingerprinting

**Application:**
- ✅ **HEB:** HIGHLY RECOMMENDED - Could reduce bot detection issues
- ✅ **Facebook:** USEFUL - May help with automation flags
- ⚠️ **General:** Always test against target sites first

---

### 1.2 Playwright-Extra (JavaScript/Node.js)

**Description:** Enhanced Playwright with plugin system  
**GitHub:** https://github.com/berstend/playwright-extra  
**Difficulty:** 3/10 | **Benefit:** 9/10

**Installation:**
```bash
npm install playwright-extra puppeteer-extra-plugin-stealth
```

**Usage:**
```javascript
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Apply stealth plugin
chromium.use(StealthPlugin());

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://bot.sannysoft.com/');
    await browser.close();
})();
```

**Advanced Configuration:**
```javascript
const stealth = StealthPlugin({
    // Enable specific evasions
    enabledEvasions: [
        'chrome.runtime',
        'console.debug',
        'navigator.permissions',
        'navigator.plugins',
        'webgl.vendor',
        'window.outerdimensions'
    ]
});
chromium.use(stealth);
```

**Application:**
- ✅ **HEB:** Excellent for our Node.js scripts
- ✅ **Facebook:** Recommended for marketplace automation
- ✅ **General:** Most mature stealth solution available

---

### 1.3 Manual Stealth Techniques

If you can't use plugins, implement these manually:

**Disable navigator.webdriver:**
```javascript
// Add to page before navigation
await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
    });
});
```

**Randomize User-Agent:**
```javascript
const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

const context = await browser.newContext({
    userAgent: userAgents[Math.floor(Math.random() * userAgents.length)]
});
```

**Viewport Randomization:**
```javascript
const viewports = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 }
];

const context = await browser.newContext({
    viewport: viewports[Math.floor(Math.random() * viewports.length)]
});
```

---

## 2. CHROME DEVTOOLS PROTOCOL (CDP) ADVANCED TECHNIQUES

### 2.1 CDP Basics

**Description:** Low-level protocol for Chrome automation  
**Official Docs:** https://chromedevtools.github.io/devtools-protocol/  
**Difficulty:** 6/10 | **Benefit:** 9/10

CDP allows direct communication with Chrome for advanced control. Our existing scripts already use CDP (port 9222), but we can do much more.

**Connect to existing Chrome (our current setup):**
```javascript
const { chromium } = require('playwright');

const browser = await chromium.connectOverCDP('http://localhost:9222');
const context = browser.contexts()[0];
const page = context.pages()[0];
```

### 2.2 Network Interception & Monitoring

**Monitor all network requests:**
```javascript
const client = await page.context().newCDPSession(page);
await client.send('Network.enable');

client.on('Network.requestWillBeSent', (params) => {
    console.log('Request:', params.request.url);
});

client.on('Network.responseReceived', (params) => {
    console.log('Response:', params.response.status, params.response.url);
});
```

**Block unnecessary resources (save bandwidth):**
```javascript
await client.send('Network.setBlockedURLs', {
    urls: [
        '*.jpg', '*.jpeg', '*.png', '*.gif',  // Images
        '*.css',                              // Stylesheets (optional)
        '*.woff', '*.woff2', '*.ttf'           // Fonts
    ]
});
```

**Application:**
- ✅ **HEB:** Block images to speed up cart automation
- ✅ **Facebook:** Monitor API calls for message scraping
- 💰 **Benefit:** 2-10x bandwidth reduction

### 2.3 Device Emulation via CDP

**Emulate mobile device:**
```javascript
await client.send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    mobile: true,
    fitWindow: false
});

await client.send('Emulation.setUserAgentOverride', {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)...'
});
```

### 2.4 JavaScript Execution & DOM Manipulation

**Execute script in page context:**
```javascript
const result = await client.send('Runtime.evaluate', {
    expression: 'document.querySelector(".cart-total").innerText',
    returnByValue: true
});
console.log('Cart total:', result.result.value);
```

**Get cookies:**
```javascript
const cookies = await client.send('Network.getAllCookies');
// Save for session persistence
fs.writeFileSync('cookies.json', JSON.stringify(cookies.cookies));
```

### 2.5 Performance Monitoring

**Capture performance metrics:**
```javascript
await client.send('Performance.enable');

// Later, get metrics
const metrics = await client.send('Performance.getMetrics');
metrics.metrics.forEach(m => {
    console.log(`${m.name}: ${m.value}`);
});
```

**Key metrics:**
- `JSHeapUsedSize` - Memory usage
- `JSEventListeners` - Event listener count
- `LayoutDuration` - Layout time
- `RecalcStyleDuration` - CSS recalc time

---

## 3. BROWSER FINGERPRINTING COUNTERMEASURES

### 3.1 Understanding Fingerprinting

Websites collect hundreds of data points to create unique fingerprints:
- HTTP headers (User-Agent, Accept-Language)
- Screen resolution, color depth, timezone
- Installed fonts and plugins
- Canvas & WebGL rendering output
- Audio stack characteristics
- WebRTC IP leaks
- TLS handshake patterns (JA3/JA4)

### 3.2 Canvas Fingerprint Spoofing

**Inject noise into canvas reads:**
```javascript
await page.addInitScript(() => {
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function(...args) {
        const imageData = originalGetImageData.apply(this, args);
        // Add subtle noise
        for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] += Math.floor(Math.random() * 2);     // R
            imageData.data[i+1] += Math.floor(Math.random() * 2);   // G
            imageData.data[i+2] += Math.floor(Math.random() * 2);   // B
        }
        return imageData;
    };
});
```

**Application:**
- ✅ **HEB:** Medium priority - may help with advanced detection
- ✅ **Facebook:** HIGH priority - Facebook heavily uses canvas fingerprinting
- ⚠️ **Difficulty:** 5/10 - Use playwright-extra-stealth instead if possible

### 3.3 WebGL Fingerprint Spoofing

**Modify WebGL vendor/renderer:**
```javascript
await page.addInitScript(() => {
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
            return 'Intel Inc.';
        }
        if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
            return 'Intel Iris OpenGL Engine';
        }
        return getParameter.call(this, parameter);
    };
});
```

### 3.4 Font List Spoofing

**Standardize fonts to common set:**
```javascript
await page.addInitScript(() => {
    const fonts = [
        'Arial', 'Times New Roman', 'Helvetica', 'Georgia',
        'Verdana', 'Courier New', 'Comic Sans MS'
    ];
    
    Object.defineProperty(document, 'fonts', {
        value: {
            check: () => true,
            forEach: (cb) => fonts.forEach(cb)
        }
    });
});
```

### 3.5 Audio Context Fingerprint Spoofing

```javascript
await page.addInitScript(() => {
    const originalCreateOscillator = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function() {
        const oscillator = originalCreateOscillator.call(this);
        const originalStart = oscillator.start;
        oscillator.start = function(...args) {
            // Add subtle timing variation
            setTimeout(() => originalStart.apply(this, args), Math.random() * 10);
        };
        return oscillator;
    };
});
```

### 3.6 TLS Fingerprint Randomization (Advanced)

**JA3 Fingerprinting:** TLS handshake patterns can identify automation tools  
**Solution:** Use real browsers (our CDP approach already handles this)

**For Python requests-based tools:**
```python
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.ssl_ import create_urllib3_context

class TLSAdapter(HTTPAdapter):
    def init_poolmanager(self, *args, **kwargs):
        ctx = create_urllib3_context()
        # Modify cipher suites
        ctx.set_ciphers('ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384')
        kwargs['ssl_context'] = ctx
        return super().init_poolmanager(*args, **kwargs)

session = requests.Session()
session.mount('https://', TLSAdapter())
```

---

## 4. PROXY & IP ROTATION STRATEGIES

### 4.1 Residential Proxy Providers (2025)

| Provider | Pool Size | Price/GB | Min Commit | Anti-Bot | Best For |
|----------|-----------|----------|------------|----------|----------|
| **Scrapeless** | 90M+ | $0.40 | None | Yes | Best value |
| **Bright Data** | 72M+ | $6.43 | $499/mo | No | Enterprise |
| **Oxylabs** | 100M+ | $7.75 | $300/mo | No | Large scale |
| **Smartproxy** | 55M+ | $7.50 | $75/mo | No | Budget option |
| **SOAX** | 8M+ | $99/mo | $99/mo | No | Clean IPs |

**Recommendation for HEB:** Start with Scrapeless ($0.40/GB) if needed  
**Recommendation for Facebook:** Consider Bright Data for critical operations

### 4.2 Proxy Integration in Playwright

```javascript
const { chromium } = require('playwright');

const browser = await chromium.launch({
    proxy: {
        server: 'http://proxy.soax.com:9000',
        username: 'your-username',
        password: 'your-password'
    }
});
```

**Rotation strategy:**
```javascript
const proxies = [
    { server: 'http://proxy1.example.com:8080', username: 'user1', password: 'pass1' },
    { server: 'http://proxy2.example.com:8080', username: 'user2', password: 'pass2' },
];

function getRandomProxy() {
    return proxies[Math.floor(Math.random() * proxies.length)];
}

// Use per session
const context = await browser.newContext({
    proxy: getRandomProxy()
});
```

### 4.3 Proxy + Fingerprint Synchronization

**Critical:** IP geolocation must match timezone and locale:
```javascript
const context = await browser.newContext({
    proxy: { server: 'http://us-proxy.example.com:8080' },
    locale: 'en-US',
    timezoneId: 'America/New_York',
    geolocation: { latitude: 40.7128, longitude: -74.0060 }
});
```

---

## 5. CAPTCHA SOLVING SERVICES

### 5.1 Service Comparison (2025)

| Service | Method | Speed | Price/1K | Accuracy | Best For |
|---------|--------|-------|----------|----------|----------|
| **CapSolver** | AI/ML | 1-9s | $0.40-$1.20 | 99% | Best overall |
| **2Captcha** | Human | 5-30s | $1-$3 | 99%+ | Complex CAPTCHAs |
| **Anti-Captcha** | Human | 5-29s | $0.50-$5 | 99% | Reliability |
| **AZcaptcha** | OCR/AI | 0.2-0.3s | ~$1 | 85% | Speed + budget |
| **Bright Data Web Unlocker** | Hybrid | Fast | $1.89-$3 | 99%+ | Enterprise |

### 5.2 CapSolver Integration Example

**Installation:**
```bash
npm install @capsolver/capsolver-npm
```

**Usage:**
```javascript
const CapSolver = require('@capsolver/capsolver-npm');

const solver = new CapSolver('YOUR_API_KEY');

// Solve reCAPTCHA v2
async function solveRecaptcha(pageUrl, siteKey) {
    const result = await solver.recaptchaV2({
        type: 'ReCaptchaV2TaskProxyLess',
        websiteURL: pageUrl,
        websiteKey: siteKey
    });
    return result.solution.gRecaptchaResponse;
}

// Use in Playwright
const token = await solveRecaptcha('https://example.com', '6Le...');
await page.evaluate(token => {
    document.getElementById('g-recaptcha-response').innerHTML = token;
});
```

### 5.3 2Captcha Integration

```javascript
const fetch = require('node-fetch');
const FormData = require('form-data');

async function solveWith2captcha(siteKey, pageUrl) {
    const form = new FormData();
    form.append('key', 'YOUR_API_KEY');
    form.append('method', 'userrecaptcha');
    form.append('googlekey', siteKey);
    form.append('pageurl', pageUrl);
    form.append('json', '1');
    
    // Submit
    const submitRes = await fetch('http://2captcha.com/in.php', {
        method: 'POST',
        body: form
    });
    const submitData = await submitRes.json();
    const captchaId = submitData.request;
    
    // Poll for result
    while (true) {
        await new Promise(r => setTimeout(r, 5000));
        const resultRes = await fetch(
            `http://2captcha.com/res.php?key=YOUR_API_KEY&action=get&id=${captchaId}&json=1`
        );
        const resultData = await resultRes.json();
        if (resultData.request !== 'CAPCHA_NOT_READY') {
            return resultData.request; // The token
        }
    }
}
```

---

## 6. BEHAVIORAL SIMULATION

### 6.1 Human-Like Mouse Movements

```javascript
async function humanLikeMove(page, targetSelector) {
    const element = await page.locator(targetSelector);
    const box = await element.boundingBox();
    
    // Start from random position
    const startX = Math.random() * 500;
    const startY = Math.random() * 500;
    
    // Target with some randomness
    const targetX = box.x + box.width * (0.3 + Math.random() * 0.4);
    const targetY = box.y + box.height * (0.3 + Math.random() * 0.4);
    
    // Bezier curve movement
    const steps = 20 + Math.floor(Math.random() * 10);
    
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Quadratic bezier curve
        const x = (1-t)*(1-t)*startX + 2*(1-t)*t*(startX + targetX)/2 + t*t*targetX;
        const y = (1-t)*(1-t)*startY + 2*(1-t)*t*(startY + targetY)/2 + t*t*targetY;
        
        await page.mouse.move(x, y);
        await page.waitForTimeout(10 + Math.random() * 20);
    }
    
    await page.mouse.click(targetX, targetY);
}
```

### 6.2 Natural Typing

```javascript
async function humanLikeType(page, selector, text) {
    await page.focus(selector);
    
    for (const char of text) {
        await page.keyboard.type(char);
        // Random delay between keystrokes
        await page.waitForTimeout(50 + Math.random() * 150);
    }
}
```

### 6.3 Random Delays & Scrolling

```javascript
async function humanLikeScroll(page) {
    const scrollAmount = 300 + Math.random() * 400;
    const duration = 500 + Math.random() * 1000;
    
    await page.mouse.wheel({ deltaY: scrollAmount });
    await page.waitForTimeout(duration);
}

// Usage pattern
await page.goto('https://example.com');
await page.waitForTimeout(2000 + Math.random() * 3000); // Initial pause
await humanLikeScroll(page);
await page.waitForTimeout(1000 + Math.random() * 2000);
await humanLikeMove(page, 'button.add-to-cart');
```

---

## 7. SYSTEM-SPECIFIC RECOMMENDATIONS

### 7.1 HEB Grocery Automation

**Current Issues:**
- Occasional bot detection during cart operations
- Login session expiration
- Cart refresh issues

**Recommended Improvements:**

| Technique | Difficulty | Benefit | Priority |
|-----------|------------|---------|----------|
| playwright-extra-stealth | 3/10 | 9/10 | **HIGH** |
| Cookie persistence | 2/10 | 8/10 | **HIGH** |
| Request blocking (images) | 2/10 | 7/10 | MEDIUM |
| Proxy rotation | 4/10 | 6/10 | LOW |

**Implementation:**
```javascript
// Recommended HEB script structure
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

chromium.use(StealthPlugin());

async function hebAutomation() {
    // Load saved cookies
    const cookies = fs.existsSync('heb-cookies.json') 
        ? JSON.parse(fs.readFileSync('heb-cookies.json')) 
        : [];
    
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0];
    
    // Restore cookies
    await context.addCookies(cookies);
    
    const page = context.pages()[0];
    
    // Block images for speed
    const client = await context.newCDPSession(page);
    await client.send('Network.setBlockedURLs', {
        urls: ['*.jpg', '*.jpeg', '*.png', '*.gif', '*.woff*']
    });
    
    // Your automation logic here
    
    // Save cookies after
    const newCookies = await context.cookies();
    fs.writeFileSync('heb-cookies.json', JSON.stringify(newCookies, null, 2));
}
```

### 7.2 Facebook Marketplace

**Current Issues:**
- Message automation detection
- Rate limiting on shares
- Account restrictions

**Recommended Improvements:**

| Technique | Difficulty | Benefit | Priority |
|-----------|------------|---------|----------|
| Behavioral simulation | 5/10 | 9/10 | **HIGH** |
| playwright-extra-stealth | 3/10 | 8/10 | **HIGH** |
| Request timing randomization | 3/10 | 7/10 | MEDIUM |
| Canvas fingerprint spoofing | 4/10 | 6/10 | MEDIUM |

**Implementation:**
```javascript
// Facebook-specific stealth settings
const stealth = StealthPlugin({
    enabledEvasions: [
        'chrome.runtime',
        'iframe.contentWindow',
        'media.codecs',
        'navigator.hardwareConcurrency',
        'navigator.languages',
        'navigator.permissions',
        'navigator.plugins',
        'navigator.webdriver',
        'webgl.vendor',
        'window.outerdimensions'
    ]
});

// Add delays between actions
async function safeFacebookAction(page, action) {
    await humanLikeDelay(2000, 5000);
    await action();
    await humanLikeDelay(1000, 3000);
}
```

### 7.3 General Automation

**Universal Best Practices:**
1. Always use real browser (CDP) for critical automation
2. Implement exponential backoff for retries
3. Monitor console logs for JavaScript errors
4. Take screenshots on failure for debugging
5. Use persistent contexts for session continuity

---

## 8. RECOMMENDED EXPERIMENTS

### Experiment 1: Stealth Plugin Comparison
**Goal:** Compare bot.sannysoft.com scores with/without stealth
**Steps:**
1. Run baseline test without stealth
2. Run with playwright-extra-stealth
3. Compare detection scores
4. Document improvements

**Expected Result:** 90%+ reduction in detection flags

### Experiment 2: Cookie Persistence Impact
**Goal:** Measure login frequency with cookie persistence
**Steps:**
1. Run HEB automation for 1 week without cookie saving
2. Run for 1 week with cookie saving
3. Compare login counts

**Expected Result:** 70%+ reduction in required logins

### Experiment 3: Request Blocking Performance
**Goal:** Measure speed improvement from blocking images
**Steps:**
1. Time 10 cart operations without blocking
2. Time 10 cart operations with image blocking
3. Compare durations

**Expected Result:** 20-50% speed improvement

### Experiment 4: Behavioral Simulation Test
**Goal:** Test if human-like delays reduce rate limiting
**Steps:**
1. Run Facebook shares with instant actions
2. Run with human-like delays
3. Compare account restriction rates

**Expected Result:** Significant reduction in rate limits

---

## 9. TOOLS & LIBRARIES SUMMARY

### Essential Packages
```bash
# Node.js/Playwright
npm install playwright-extra puppeteer-extra-plugin-stealth
npm install @capsolver/capsolver-npm
npm install ghost-cursor  # For human-like mouse movements

# Python
pip install playwright-stealth
pip install selenium-stealth
```

### Testing Tools
- **bot.sannysoft.com** - Comprehensive bot detection test
- **arh.antoinevastel.com/bots/areyouheadless** - Headless detection
- **amiunique.org** - Fingerprint analysis
- **browserleaks.com** - Privacy leak testing

---

## 10. IMPLEMENTATION ROADMAP

### Phase 1: Quick Wins (1-2 days)
- [ ] Add playwright-extra-stealth to HEB scripts
- [ ] Implement cookie persistence
- [ ] Add basic request blocking for images

### Phase 2: Medium Effort (1 week)
- [ ] Implement behavioral simulation for Facebook
- [ ] Add CDP-based network monitoring
- [ ] Set up automated screenshot-on-failure

### Phase 3: Advanced (2-4 weeks)
- [ ] Evaluate residential proxy services
- [ ] Implement canvas/WebGL spoofing if needed
- [ ] Add CapSolver integration for critical paths

### Phase 4: Monitoring & Optimization (Ongoing)
- [ ] Set up success rate tracking
- [ ] Monitor detection test scores
- [ ] Optimize based on failure patterns

---

## CONCLUSION

The browser automation landscape in 2025 offers powerful tools to improve our automation systems. The highest-impact, lowest-effort improvements are:

1. **Playwright-extra-stealth** - Immediate 3/10 difficulty, 9/10 benefit
2. **Cookie persistence** - Trivial to implement, major UX improvement
3. **Request blocking** - Simple optimization for speed
4. **Behavioral simulation** - Critical for Facebook automation

Our existing CDP-based architecture is well-positioned to implement these improvements incrementally without major rewrites.

---

*Research compiled by AI subagent*  
*For: Dinner/HEB/Facebook automation enhancement project*

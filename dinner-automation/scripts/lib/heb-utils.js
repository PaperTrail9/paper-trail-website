/**
 * HEB Automation Utilities - Shared Module
 * Consolidates common functions to reduce code duplication
 */

const fs = require('fs').promises;
const path = require('path');

// ============================================================================
// PERFORMANCE CONFIGURATION
// ============================================================================

const CONFIG = {
  // Timing (optimized based on empirical data)
  delays: {
    min: 800,           // Was 3000ms - reduced with smart waiting
    max: 2500,          // Was 8000ms
    click: 50,          // Was 100-400ms
    scroll: 200,        // Was 500-1200ms
    batchPauseMin: 3000,// Was 10000ms
    batchPauseMax: 5000,// Was 16000ms
  },
  
  // Concurrency
  batchSize: 5,
  maxRetries: 2,        // Reduced from 3 - better selectors = fewer retries needed
  
  // Timeouts
  navigationTimeout: 12000,
  selectorTimeout: 6000,
  cartCacheTTL: 3000,   // 3 second cart cache
  
  // Selectors (prioritized by speed/reliability)
  buttonSelectors: [
    'button[data-testid*="add-to-cart" i]',  // Fastest - modern HEB
    'button[data-qe-id="addToCart"]',        // Legacy but reliable
    'button[data-automation-id*="add" i]',   // Alternative
    'button:has-text("Add to cart")',        // Text-based fallback
  ],
};

// ============================================================================
// TIMING UTILITIES
// ============================================================================

function randomDelay(min, max) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(r => setTimeout(r, delay));
}

function gaussianRandom(min, max) {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  const mean = (min + max) / 2;
  const stdDev = (max - min) / 6;
  return Math.max(min, Math.min(max, Math.round(mean + z * stdDev)));
}

async function smartWait(page, condition, timeout = 5000, checkInterval = 100) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const result = await condition(page);
      if (result) return result;
    } catch (e) {}
    await new Promise(r => setTimeout(r, checkInterval));
  }
  return null;
}

// ============================================================================
// CART OPERATIONS (Cached & Optimized)
// ============================================================================

class CartTracker {
  constructor() {
    this.lastCount = null;
    this.lastCheck = 0;
    this.cacheTTL = CONFIG.cartCacheTTL;
  }

  async getCount(page, useCache = true) {
    // Return cached if fresh
    if (useCache && this.lastCount !== null && (Date.now() - this.lastCheck) < this.cacheTTL) {
      return this.lastCount;
    }

    try {
      const count = await page.evaluate(() => {
        // Fast path: localStorage (single call)
        try {
          const raw = localStorage.getItem('PurchaseCart');
          if (raw) {
            const cart = JSON.parse(raw);
            if (cart.ProductNames) {
              return cart.ProductNames.split('<SEP>').filter(n => n.trim()).length;
            }
            if (cart.Products?.length) return cart.Products.length;
          }
        } catch (e) {}

        // Fallback: DOM query with multiple strategies in one evaluate
        const cartLink = document.querySelector('a[data-testid="cart-link"], a[href*="/cart"]');
        if (cartLink) {
          const label = cartLink.getAttribute('aria-label');
          if (label) {
            const match = label.match(/(\d+)\s+items?/i);
            if (match) return parseInt(match[1]);
          }
        }

        // Badge check
        const badge = document.querySelector('[data-testid="cart-badge"], .CartLink_cartBadge, .Badge_badge');
        if (badge) {
          const num = parseInt(badge.textContent?.trim());
          if (!isNaN(num)) return num;
        }

        return 0;
      });

      this.lastCount = count;
      this.lastCheck = Date.now();
      return count;
    } catch (e) {
      return this.lastCount ?? 0;
    }
  }

  invalidate() {
    this.lastCheck = 0;
  }
}

async function verifyCartIncreased(page, initialCount, tracker, maxRetries = CONFIG.maxRetries) {
  for (let i = 0; i < maxRetries; i++) {
    // Shorter wait with exponential backoff
    const waitTime = 1500 * Math.pow(1.5, i);
    await randomDelay(waitTime, waitTime + 500);
    
    const newCount = await tracker.getCount(page, false);
    
    if (newCount > initialCount) {
      return { success: true, newCount, added: newCount - initialCount };
    }
    
    if (i < maxRetries - 1) {
      console.log(`    🔄 Verification retry ${i + 1}/${maxRetries}...`);
    }
  }
  
  return { success: false, newCount: await tracker.getCount(page, false) };
}

// ============================================================================
// BUTTON OPERATIONS (Optimized)
// ============================================================================

async function findAddButton(page, timeout = CONFIG.selectorTimeout) {
  // Quick scroll to ensure buttons are visible
  await page.evaluate(() => window.scrollTo(0, 250));
  
  // Single optimized evaluate for button discovery
  const buttonInfo = await page.evaluate((selectors) => {
    for (const selector of selectors) {
      const buttons = document.querySelectorAll(selector);
      for (const btn of buttons) {
        const rect = btn.getBoundingClientRect();
        const isDisabled = btn.disabled || btn.getAttribute('aria-disabled') === 'true';
        
        if (rect.width > 0 && rect.height > 0 && !isDisabled) {
          // Create a unique identifier for the button
          const identifier = btn.getAttribute('data-testid') || 
                           btn.getAttribute('data-qe-id') || 
                           btn.textContent?.trim().slice(0, 30);
          return { found: true, selector, identifier };
        }
      }
    }
    return { found: false };
  }, CONFIG.buttonSelectors);
  
  if (!buttonInfo.found) {
    return null;
  }
  
  // Get the Playwright locator for the found button
  try {
    const locator = page.locator(buttonInfo.selector).filter({ visible: true }).first();
    if (await locator.count() > 0) {
      return locator;
    }
  } catch (e) {}
  
  return null;
}

async function clickButton(page, button, options = {}) {
  const { maxAttempts = 2, visualFeedback = true } = options;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Quick scroll
      await button.scrollIntoViewIfNeeded({ timeout: 3000 });
      await randomDelay(200, 500);
      
      // Check disabled state
      const isDisabled = await button.evaluate(el => 
        el.disabled || el.getAttribute('aria-disabled') === 'true'
      ).catch(() => true);
      
      if (isDisabled) {
        if (attempt < maxAttempts) {
          await randomDelay(1000, 1500);
          continue;
        }
        return { success: false, error: 'Button disabled' };
      }
      
      // Visual feedback (fire and forget)
      if (visualFeedback) {
        button.evaluate(el => {
          el.style.outline = '3px solid #22c55e';
          el.style.outlineOffset = '2px';
          setTimeout(() => {
            el.style.outline = '';
            el.style.outlineOffset = '';
          }, 1000);
        }).catch(() => {});
      }
      
      // Click with human-like delay
      await button.click({ delay: CONFIG.delays.click, timeout: 5000 });
      
      return { success: true };
      
    } catch (err) {
      if (attempt >= maxAttempts) {
        return { success: false, error: err.message };
      }
      await randomDelay(1000, 1500);
    }
  }
  
  return { success: false, error: 'All attempts failed' };
}

// ============================================================================
// DATA LOADING
// ============================================================================

async function loadItems(itemsPath) {
  const defaultPath = path.join(__dirname, '..', '..', 'data', 'heb-extension-items.json');
  const filePath = itemsPath || defaultPath;
  
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(data);
    
    if (parsed.shoppingList) {
      const items = [];
      const categories = ['proteins', 'produce', 'pantry', 'grainsAndBread'];
      
      for (const category of categories) {
        if (parsed.shoppingList[category]) {
          for (const item of parsed.shoppingList[category]) {
            items.push({
              name: item.item,
              searchTerm: item.searchTerms ? item.searchTerms[0] : item.item,
              amount: item.quantity,
              for: item.for,
              priority: item.priority,
              organic: item.organicPreferred
            });
          }
        }
      }
      
      return items;
    }
    
    return parsed.items || parsed;
  } catch (e) {
    console.error('Could not load items:', e.message);
    return [];
  }
}

// Hardcoded fallback items (all 42)
const ALL_ITEMS_FALLBACK = [
  { name: "cod fillets", searchTerm: "wild caught cod" },
  { name: "ribeye steak", searchTerm: "organic grass-fed ribeye" },
  { name: "white fish for tacos", searchTerm: "organic tilapia" },
  { name: "chicken breast", searchTerm: "organic chicken breast" },
  { name: "salmon fillets", searchTerm: "wild caught salmon" },
  { name: "fresh parsley", searchTerm: "organic parsley" },
  { name: "capers", searchTerm: "capers in brine" },
  { name: "mixed vegetables for stir-fry", searchTerm: "organic broccoli" },
  { name: "fresh ginger", searchTerm: "organic ginger root" },
  { name: "green onions", searchTerm: "organic green onions" },
  { name: "corn tortillas", searchTerm: "organic corn tortillas" },
  { name: "ripe mangos", searchTerm: "organic mangos" },
  { name: "jalapeño", searchTerm: "organic jalapeño" },
  { name: "fresh cilantro", searchTerm: "organic cilantro" },
  { name: "cabbage slaw mix", searchTerm: "organic coleslaw mix" },
  { name: "Asian pear", searchTerm: "organic Asian pear" },
  { name: "kimchi", searchTerm: "cabbage kimchi" },
  { name: "cucumbers", searchTerm: "organic cucumbers" },
  { name: "cherry tomatoes", searchTerm: "organic cherry tomatoes" },
  { name: "red onion", searchTerm: "organic red onion" },
  { name: "feta cheese", searchTerm: "organic feta cheese" },
  { name: "hummus", searchTerm: "organic hummus" },
  { name: "Kalamata olives", searchTerm: "Kalamata olives pitted" },
  { name: "tzatziki", searchTerm: "organic tzatziki" },
  { name: "fresh dill", searchTerm: "organic dill" },
  { name: "fresh thyme", searchTerm: "organic thyme" },
  { name: "lemon", searchTerm: "organic lemon" },
  { name: "white wine", searchTerm: "white wine" },
  { name: "oyster sauce", searchTerm: "oyster sauce" },
  { name: "cornstarch", searchTerm: "organic cornstarch" },
  { name: "beef broth", searchTerm: "organic beef broth" },
  { name: "sesame seeds", searchTerm: "organic sesame seeds" },
  { name: "chipotle mayo", searchTerm: "chipotle mayo" },
  { name: "brown sugar", searchTerm: "organic brown sugar" },
  { name: "tomato puree", searchTerm: "organic tomato puree" },
  { name: "heavy cream", searchTerm: "organic heavy cream" },
  { name: "plain yogurt", searchTerm: "organic plain yogurt" },
  { name: "garam masala", searchTerm: "garam masala" },
  { name: "turmeric", searchTerm: "organic turmeric powder" },
  { name: "cayenne pepper", searchTerm: "organic cayenne" },
  { name: "basmati rice", searchTerm: "organic basmati rice" },
  { name: "naan bread", searchTerm: "organic naan" }
];

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

async function warmupSession(page, options = {}) {
  const { skipIfWarmed = true, timeout = 10000 } = options;
  
  // Check if already on HEB
  const currentUrl = page.url();
  if (currentUrl.includes('heb.com') && skipIfWarmed) {
    console.log('  ♻️  Already on HEB, skipping warmup');
    return;
  }
  
  console.log('  🌡️  Session warmup...');
  
  // Anti-detection script injection
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    delete window.chrome?.runtime?.OnInstalledReason;
    delete window.chrome?.runtime?.OnRestartRequiredReason;
  });
  
  await page.goto('https://www.heb.com', { 
    waitUntil: 'domcontentloaded',
    timeout 
  });
  
  await randomDelay(1500, 2500);
  
  // Single scroll
  await page.evaluate(() => window.scrollBy(0, 200));
  await randomDelay(500, 1000);
  
  console.log('  ✅ Session warmed');
}

async function checkLogin(page) {
  return await page.evaluate(() => {
    return !!document.querySelector('a[href*="/my-account"]') && 
           !document.querySelector('a[href*="/login"]');
  });
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

async function processBatch(items, processor, options = {}) {
  const { batchSize = CONFIG.batchSize, onBatchComplete } = options;
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(items.length / batchSize);
    
    console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} items)`);
    
    for (let j = 0; j < batch.length; j++) {
      const item = batch[j];
      const globalIndex = i + j + 1;
      
      const result = await processor(item, globalIndex, batch.length);
      results.push({ item, result, index: globalIndex });
      
      // Inter-item delay (except last in batch)
      if (j < batch.length - 1) {
        await randomDelay(CONFIG.delays.min, CONFIG.delays.max);
      }
    }
    
    if (onBatchComplete) {
      await onBatchComplete(batchNum, totalBatches, results);
    }
    
    // Pause between batches (except last)
    if (i + batchSize < items.length) {
      const pause = gaussianRandom(CONFIG.delays.batchPauseMin, CONFIG.delays.batchPauseMax);
      console.log(`\n⏱️  Pausing ${Math.round(pause/1000)}s...`);
      await randomDelay(pause, pause + 1000);
    }
  }
  
  return results;
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

class PerformanceMonitor {
  constructor() {
    this.startTime = Date.now();
    this.itemTimings = [];
  }
  
  startItem() {
    return Date.now();
  }
  
  endItem(startTime, success) {
    const duration = Date.now() - startTime;
    this.itemTimings.push({ duration, success });
    return duration;
  }
  
  getStats() {
    const total = this.itemTimings.length;
    const successful = this.itemTimings.filter(t => t.success).length;
    const avgDuration = this.itemTimings.reduce((a, b) => a + b.duration, 0) / total;
    const totalTime = Date.now() - this.startTime;
    
    return {
      total,
      successful,
      failed: total - successful,
      avgItemTime: Math.round(avgDuration),
      totalTime: Math.round(totalTime / 1000),
      itemsPerMinute: (total / (totalTime / 60000)).toFixed(1)
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  CONFIG,
  randomDelay,
  gaussianRandom,
  smartWait,
  CartTracker,
  verifyCartIncreased,
  findAddButton,
  clickButton,
  loadItems,
  ALL_ITEMS_FALLBACK,
  warmupSession,
  checkLogin,
  processBatch,
  PerformanceMonitor
};

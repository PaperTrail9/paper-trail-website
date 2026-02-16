const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

/**
 * Shared Browser Connector
 * All scripts use ONE browser instance via CDP
 * Configured for Microsoft Edge (dinner automation)
 */

const CONFIG = {
  debugPort: 9222,
  chromePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  userDataDir: 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data',
  profileDirectory: 'Marvin',  // LOCKED: Only use Marvin profile, never create new ones
  pidFile: path.join(__dirname, '..', 'data', 'edge-shared.pid'),
  logFile: path.join(__dirname, '..', 'data', 'edge-connector.log')
};

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = { error: '❌', warn: '⚠️', success: '✅', info: 'ℹ️' }[level] || 'ℹ️';
  const line = `[${timestamp}] ${prefix} ${message}`;
  console.log(line);
  try {
    fs.appendFileSync(CONFIG.logFile, line + '\n');
  } catch {}
}

// Get browser name for logging
function getBrowserName() {
  return CONFIG.chromePath.includes('edge') ? 'Edge' : 'Chrome';
}

/**
 * Check if browser is responding on debug port
 */
async function isBrowserRunning() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${CONFIG.debugPort}/json/version`, {
      timeout: 3000
    }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Launch browser with debug port (truly detached)
 */
function launchBrowser() {
  const browserName = getBrowserName();
  log(`Launching ${browserName} with shared debug port...`);
  
  const args = [
    `"${CONFIG.chromePath}"`,
    `--remote-debugging-port=${CONFIG.debugPort}`,
    `--user-data-dir="${CONFIG.userDataDir}"`,
    `--profile-directory=${CONFIG.profileDirectory}`,
    '--restore-last-session',
    '--no-first-run',
    '--no-default-browser-check',
    '--start-maximized'
  ].join(' ');
  
  // Use batch file to launch browser completely detached
  const batPath = path.join(__dirname, '..', 'data', 'launch-edge.bat');
  
  // Write batch file dynamically
  const batContent = `@echo off
start "" ${args}
`;
  fs.writeFileSync(batPath, batContent);
  
  // Execute batch (completely detached)
  const cmd = spawn('cmd.exe', ['/c', batPath], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  
  cmd.unref();
  
  // Store placeholder PID (actual PID will be discovered via netstat)
  fs.writeFileSync(CONFIG.pidFile, 'detached');
  
  log(`${browserName} launched (detached)`);
  return 'detached';
}

/**
 * Ensure browser is running and connect
 */
async function getBrowser() {
  const browserName = getBrowserName();
  const isRunning = await isBrowserRunning();
  
  if (!isRunning) {
    log(`${browserName} not running, launching...`);
    launchBrowser();
    
    // Wait for browser to start
    log(`Waiting for ${browserName} to initialize...`);
    let attempts = 0;
    while (attempts < 20) {
      await new Promise(r => setTimeout(r, 1000));
      if (await isBrowserRunning()) {
        log(`${browserName} is responding!`);
        break;
      }
      attempts++;
    }
    
    if (attempts >= 20) {
      throw new Error(`${browserName} failed to start`);
    }
  } else {
    log(`Connecting to existing ${browserName} instance`);
  }
  
  // Connect via CDP
  const browser = await chromium.connectOverCDP(`http://localhost:${CONFIG.debugPort}`);
  return browser;
}

/**
 * Get a page - creates new if needed
 */
async function getPage(browser, url = null) {
  const contexts = browser.contexts();
  let context = contexts[0];
  
  if (!context) {
    context = await browser.newContext();
  }
  
  let page = context.pages()[0];
  if (!page) {
    page = await context.newPage();
  }
  
  if (url) {
    await page.goto(url);
  }
  
  return { browser, context, page };
}

/**
 * Disconnect (don't close browser, just disconnect)
 */
async function releaseBrowser(browser) {
  const browserName = getBrowserName();
  try {
    // Check if browser has disconnect method (connectOverCDP returns different type)
    if (browser && typeof browser.disconnect === 'function') {
      await browser.disconnect();
      log(`Disconnected from ${browserName} (${browserName} keeps running)`);
    } else if (browser && typeof browser.close === 'function') {
      // For persistent context, we shouldn't close as it kills the browser
      log('Persistent context - skipping close to keep browser running');
    }
  } catch (e) {
    log('Disconnect error (may be normal): ' + e.message, 'warn');
  }
}

module.exports = {
  getBrowser,
  getPage,
  releaseBrowser,
  isBrowserRunning,
  launchBrowser,
  getBrowserName,
  CONFIG
};

// Browser cleanup utility for HEB and Facebook automation
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function cleanupBrowserTabs() {
  console.log('🔍 Checking for excess browser processes...');
  
  try {
    // Get all Edge processes
    const { stdout: edgeOutput } = await execAsync('tasklist /FI "IMAGENAME eq msedge.exe" /FO CSV');
    const edgeProcesses = edgeOutput.split('\n').filter(line => line.includes('msedge'));
    
    // Get all Chrome processes  
    const { stdout: chromeOutput } = await execAsync('tasklist /FI "IMAGENAME eq chrome.exe" /FO CSV');
    const chromeProcesses = chromeOutput.split('\n').filter(line => line.includes('chrome'));
    
    console.log(`📊 Found ${edgeProcesses.length} Edge processes, ${chromeProcesses.length} Chrome processes`);
    
    // Keep only 1-2 main browser processes, kill the rest
    // This is a safe cleanup that preserves the main browser window
    
    if (edgeProcesses.length > 3) {
      console.log('🧹 Cleaning up excess Edge processes...');
      // Kill Edge processes that are likely background/orphaned (low memory or no window)
      await execAsync('powershell -Command "Get-Process msedge | Where-Object {$_.MainWindowTitle -eq \'\' -and $_.WorkingSet64 -lt 100MB} | Stop-Process -Force"');
      console.log('✅ Edge cleanup complete');
    }
    
    if (chromeProcesses.length > 3) {
      console.log('🧹 Cleaning up excess Chrome processes...');
      await execAsync('powershell -Command "Get-Process chrome | Where-Object {$_.MainWindowTitle -eq \'\' -and $_.WorkingSet64 -lt 100MB} | Stop-Process -Force"');
      console.log('✅ Chrome cleanup complete');
    }
    
    console.log('✅ Browser cleanup finished');
    
  } catch (error) {
    console.error('❌ Cleanup error:', error.message);
  }
}

// Tab management helper
async function closeExcessTabs(browser, maxTabs = 5) {
  try {
    const pages = await browser.pages();
    if (pages.length > maxTabs) {
      console.log(`🧹 Closing ${pages.length - maxTabs} excess tabs...`);
      // Keep the first tab (main window), close the rest
      for (let i = maxTabs; i < pages.length; i++) {
        await pages[i].close();
      }
      console.log('✅ Closed excess tabs');
    }
  } catch (error) {
    console.error('❌ Tab cleanup error:', error.message);
  }
}

// Auto-close browser after script completion
function setupAutoClose(browser, timeoutMs = 30000) {
  setTimeout(async () => {
    try {
      console.log('⏰ Auto-closing browser after timeout...');
      await browser.close();
    } catch (e) {
      // Browser might already be closed
    }
  }, timeoutMs);
}

module.exports = {
  cleanupBrowserTabs,
  closeExcessTabs,
  setupAutoClose
};

// Run cleanup if called directly
if (require.main === module) {
  cleanupBrowserTabs();
}
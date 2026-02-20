#!/usr/bin/env node
/**
 * Marvin Auto-Recovery System
 * Monitors and repairs critical services automatically
 * Run via: node scripts/auto-recovery.js [--auto] [--manual]
 */

const fs = require('fs').promises;
const path = require('path');
const { exec, spawn } = require('child_process');
const util = require('util');
const http = require('http');
const https = require('https');

const execPromise = util.promisify(exec);

const WORKSPACE_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(WORKSPACE_DIR, 'data');
const LOG_FILE = path.join(DATA_DIR, 'recovery.log');
const STATE_FILE = path.join(DATA_DIR, 'recovery-state.json');

// Import progress tracker
const progress = require('./progress-tracker.js');
const TASK_ID = 'auto-recovery';

// Import backup functions
const { createBackup, restoreBackup } = require('./backup.js');

// Service definitions
const SERVICES = {
  'dashboard-server': {
    name: 'Dashboard Server',
    port: 3001,
    startCmd: 'node C:\\Users\\Admin\\.openclaw\\workspace\\marvin-dash\\server.js',
    cwd: 'C:\\Users\\Admin\\.openclaw\\workspace\\marvin-dash',
    healthUrl: 'http://localhost:3001/api/health',
    recoveryActions: ['kill-port', 'restart-service'],
    autoStart: true
  },
  'openclaw-gateway': {
    name: 'OpenClaw Gateway',
    port: 18789,
    checkCmd: 'openclaw gateway status',
    startCmd: 'openclaw gateway start',
    recoveryActions: ['restart-gateway'],
    autoStart: true
  },
  'wsl-ubuntu': {
    name: 'WSL Ubuntu',
    checkCmd: 'wsl echo "ping"',
    recoveryActions: ['restart-wsl'],
    autoStart: false
  }
};

// Recovery state
let recoveryState = {
  lastRun: null,
  lastBackup: null,
  totalRecoveries: 0,
  serviceStates: {},
  consecutiveFailures: {},
  lastRollback: null
};

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset', toFile = true) {
  const timestamp = new Date().toISOString();
  const consoleMsg = `${colors[color]}${message}${colors.reset}`;
  const fileMsg = `[${timestamp}] ${message}`;
  
  console.log(consoleMsg);
  
  if (toFile) {
    fs.appendFile(LOG_FILE, fileMsg + '\n').catch(() => {});
  }
}

function logSection(title) {
  console.log('');
  log(`═══ ${title} ═══`, 'bright');
}

function spawnDetached(command, cwd) {
  try {
    const child = spawn(command, {
      shell: true,
      cwd: cwd || undefined,
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    child.unref();
    return child;
  } catch (error) {
    log(`Failed to spawn command: ${command} (${error.message})`, 'yellow');
    return null;
  }
}

async function waitForServiceHealthy(service, timeoutMs = 15000, intervalMs = 2000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (service.port) {
      const ok = await isPortInUse(service.port);
      if (ok) return true;
    } else if (service.checkCmd) {
      try {
        await execPromise(service.checkCmd, { timeout: 10000 });
        return true;
      } catch {
        // keep waiting
      }
    } else {
      return true; // no health check configured
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return false;
}

// Load recovery state
async function loadState() {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf8');
    recoveryState = JSON.parse(data);
  } catch {
    recoveryState = {
      lastRun: null,
      lastBackup: null,
      totalRecoveries: 0,
      serviceStates: {},
      consecutiveFailures: {},
      lastRollback: null
    };
  }
}

// Save recovery state
async function saveState() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(STATE_FILE, JSON.stringify(recoveryState, null, 2));
  } catch (error) {
    log(`Failed to save state: ${error.message}`, 'yellow', false);
  }
}

// Check if a port is in use
async function isPortInUse(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Check service health
async function checkService(serviceId, service) {
  log(`Checking ${service.name}...`, 'dim');
  
  let status = 'unknown';
  let details = '';
  
  try {
    if (service.port) {
      const isRunning = await isPortInUse(service.port);
      if (isRunning) {
        status = 'healthy';
        details = `Port ${service.port} responding`;
      } else {
        status = 'down';
        details = `Port ${service.port} not responding`;
      }
    }
    
    if (service.checkCmd && status !== 'healthy') {
      try {
        await execPromise(service.checkCmd, { timeout: 10000 });
        status = 'healthy';
        details = 'Check command passed';
      } catch (error) {
        status = 'down';
        details = `Check command failed: ${error.message}`;
      }
    }
  } catch (error) {
    status = 'error';
    details = error.message;
  }
  
  recoveryState.serviceStates[serviceId] = {
    status,
    details,
    lastCheck: new Date().toISOString()
  };
  
  const color = status === 'healthy' ? 'green' : status === 'down' ? 'red' : 'yellow';
  log(`  ${service.name}: ${status} - ${details}`, color);
  
  return { serviceId, status, details };
}

// Kill process on port (Windows)
async function killPort(port) {
  log(`  Killing process on port ${port}...`, 'yellow');
  try {
    // Find PID using the port
    const { stdout } = await execPromise(`netstat -ano | findstr :${port}`);
    const lines = stdout.split('\n').filter(l => l.includes('LISTENING'));
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(parseInt(pid))) {
        try {
          await execPromise(`taskkill /F /PID ${pid}`);
          log(`    Killed process ${pid}`, 'green');
        } catch (e) {
          log(`    Failed to kill ${pid}: ${e.message}`, 'yellow');
        }
      }
    }
    return true;
  } catch (error) {
    log(`    No process found on port ${port}`, 'dim');
    return false;
  }
}

// Start a service
async function startService(serviceId, service) {
  log(`  Starting ${service.name}...`, 'cyan');
  
  try {
    if (service.startCmd) {
      // Spawn in background without blocking
      const child = spawnDetached(service.startCmd, service.cwd);
      if (!child) return false;
      
      // Wait for service to start (poll health instead of fixed sleep)
      const healthy = await waitForServiceHealthy(service, 20000, 2000);
      if (healthy) {
        log(`    ${service.name} started successfully`, 'green');
        return true;
      }
      log(`    ${service.name} did not become healthy within timeout`, 'red');
      return false;
    }
  } catch (error) {
    log(`    Error starting ${service.name}: ${error.message}`, 'red');
    return false;
  }
}

// Recover a service
async function recoverService(serviceId, service) {
  log(`Recovering ${service.name}...`, 'cyan');
  
  let recovered = false;
  
  for (const action of service.recoveryActions) {
    if (recovered) break;
    
    switch (action) {
      case 'kill-port':
        if (service.port) {
          await killPort(service.port);
          await new Promise(r => setTimeout(r, 2000));
        }
        break;
        
      case 'restart-service':
        recovered = await startService(serviceId, service);
        break;
        
      case 'restart-gateway':
        try {
          await execPromise('openclaw gateway restart', { timeout: 30000 });
          await new Promise(r => setTimeout(r, 5000));
          const check = await execPromise('openclaw gateway status');
          recovered = check.includes('running');
          if (recovered) log('    Gateway restarted', 'green');
        } catch (e) {
          log(`    Gateway restart failed: ${e.message}`, 'red');
        }
        break;
        
      case 'restart-wsl':
        try {
          await execPromise('wsl --shutdown', { timeout: 30000 });
          await new Promise(r => setTimeout(r, 5000));
          await execPromise('wsl echo "ping"', { timeout: 10000 });
          recovered = true;
          log('    WSL restarted', 'green');
        } catch (e) {
          log(`    WSL restart failed: ${e.message}`, 'red');
        }
        break;
    }
  }
  
  if (recovered) {
    recoveryState.totalRecoveries++;
    recoveryState.consecutiveFailures[serviceId] = 0;
    log(`  ${service.name} recovered successfully`, 'green');
  } else {
    recoveryState.consecutiveFailures[serviceId] = (recoveryState.consecutiveFailures[serviceId] || 0) + 1;
    log(`  ${service.name} recovery failed`, 'red');
  }
  
  return recovered;
}

// Main recovery function
async function runRecovery(options = {}) {
  const isAuto = options.auto || false;
  const isManual = options.manual || !isAuto;
  
  // Start progress tracking
  await progress.startTask(TASK_ID, 'Auto Recovery System', {
    description: 'Monitors and repairs critical services automatically',
    category: 'system',
    steps: ['Load state', 'Check services', 'Run backup if needed', 'Recover failed services', 'Update dashboard']
  });
  
  console.log('');
  log('════════════════════════════════════════', 'bright', false);
  log('   🔧 MARVIN AUTO-RECOVERY', 'bright', false);
  log('   ' + new Date().toLocaleString(), 'dim', false);
  if (isAuto) log('   Mode: Automatic', 'dim', false);
  if (isManual) log('   Mode: Manual', 'dim', false);
  log('════════════════════════════════════════', 'bright', false);
  
  await loadState();
  await progress.updateProgress(TASK_ID, 10, 'Loaded recovery state', { stepIndex: 0 });
  
  logSection('SYSTEM CHECK');
  await progress.updateProgress(TASK_ID, 25, 'Checking service health...', { stepIndex: 1 });
  
  const results = [];
  let needsRecovery = false;
  
  for (const [serviceId, service] of Object.entries(SERVICES)) {
    await progress.logTask(TASK_ID, `Checking ${service.name}...`);
    const result = await checkService(serviceId, service);
    results.push(result);
    
    if (result.status !== 'healthy' && service.autoStart) {
      needsRecovery = true;
      await progress.logTask(TASK_ID, `${service.name} needs recovery: ${result.status}`, 'warning');
    }
  }
  
  const healthyCount = results.filter(r => r.status === 'healthy').length;
  const totalCount = results.length;
  
  logSection('CHECK SUMMARY');
  log(`${healthyCount}/${totalCount} services healthy`, healthyCount === totalCount ? 'green' : 'yellow');
  await progress.updateProgress(TASK_ID, 40, `Service check complete: ${healthyCount}/${totalCount} healthy`, { stepIndex: 2 });
  
  // Backup phase (every 15 minutes)
  await progress.updateProgress(TASK_ID, 50, 'Running backup if needed...');
  await checkAndRunBackup();
  
  // Recovery phase
  let recoveryFailed = false;
  if (needsRecovery) {
    logSection('RECOVERY PHASE');
    await progress.updateProgress(TASK_ID, 60, 'Recovering failed services...', { stepIndex: 3 });
    
    for (const result of results) {
      if (result.status !== 'healthy' && SERVICES[result.serviceId].autoStart) {
        await progress.logTask(TASK_ID, `Recovering ${SERVICES[result.serviceId].name}...`);
        const recovered = await recoverService(result.serviceId, SERVICES[result.serviceId]);
        if (!recovered) {
          recoveryFailed = true;
          await progress.logTask(TASK_ID, `Failed to recover ${SERVICES[result.serviceId].name}`, 'error');
        } else {
          await progress.logTask(TASK_ID, `${SERVICES[result.serviceId].name} recovered successfully`);
        }
      }
    }
    
    // Re-check after recovery
    logSection('POST-RECOVERY CHECK');
    for (const [serviceId, service] of Object.entries(SERVICES)) {
      await checkService(serviceId, service);
    }
    
    const newHealthyCount = Object.values(recoveryState.serviceStates).filter(s => s.status === 'healthy').length;
    log(`\n${newHealthyCount}/${totalCount} services now healthy`, newHealthyCount === totalCount ? 'green' : 'yellow');
    
    // If recovery failed, attempt rollback
    if (recoveryFailed && newHealthyCount < totalCount) {
      const rolledBack = await rollbackToLastKnownGood();
      if (rolledBack) {
        recoveryFailed = false; // Rollback succeeded
      }
    }
  } else if (healthyCount === totalCount) {
    log('All services healthy - no recovery needed', 'green');
  }
  
  // Update state
  recoveryState.lastRun = new Date().toISOString();
  await saveState();
  
  // Update service status for dashboard
  await updateDashboardStatus();
  await progress.updateProgress(TASK_ID, 90, 'Updating dashboard status...');
  
  logSection('RECOVERY COMPLETE');
  
  // Complete progress tracking
  if (recoveryFailed) {
    await progress.completeTask(TASK_ID, { 
      failed: true, 
      error: 'One or more services could not be recovered',
      result: { healthyCount, totalCount, recoveryFailed }
    });
  } else {
    await progress.completeTask(TASK_ID, {
      result: { healthyCount, totalCount, recoveryFailed, totalRecoveries: recoveryState.totalRecoveries }
    });
  }
  
  log(`Total recoveries to date: ${recoveryState.totalRecoveries}`, 'cyan');
  if (recoveryState.lastBackup) {
    log(`Last backup: ${new Date(recoveryState.lastBackup).toLocaleString()}`, 'dim');
  }
  if (recoveryState.lastRollback) {
    log(`Last rollback: ${new Date(recoveryState.lastRollback).toLocaleString()}`, 'yellow');
  }
  log('Next check: 5 minutes (auto) or manual trigger', 'dim');
  console.log('');
  
  return !recoveryFailed;
}

// Check if backup is needed (every 15 minutes)
async function checkAndRunBackup() {
  const now = Date.now();
  const lastBackup = recoveryState.lastBackup ? new Date(recoveryState.lastBackup).getTime() : 0;
  const fifteenMinutes = 15 * 60 * 1000;
  
  if (now - lastBackup >= fifteenMinutes) {
    logSection('BACKUP PHASE');
    log('Running scheduled backup (every 15 min)...', 'cyan');
    await progress.logTask(TASK_ID, 'Starting scheduled backup');
    
    const result = await createBackup();
    
    if (result.success) {
      recoveryState.lastBackup = new Date().toISOString();
      await progress.logTask(TASK_ID, `Backup completed: ${result.filename}`);
      log('Backup completed successfully', 'green');
      return true;
    } else {
      await progress.logTask(TASK_ID, `Backup failed: ${result.error}`, 'error');
      log('Backup failed', 'red');
      return false;
    }
  }
  
  await progress.logTask(TASK_ID, 'Backup not needed (done recently)');
  return true; // No backup needed (already done recently)
}

// Rollback to last known good state
async function rollbackToLastKnownGood() {
  logSection('ROLLBACK PHASE');
  log('Recovery failed - attempting rollback to last known good state...', 'yellow');
  
  try {
    const restored = await restoreBackup();
    
    if (restored) {
      recoveryState.lastRollback = new Date().toISOString();
      log('Rollback completed successfully', 'green');
      
      // Re-check services after rollback
      log('Re-checking services after rollback...', 'cyan');
      for (const [serviceId, service] of Object.entries(SERVICES)) {
        await checkService(serviceId, service);
      }
      
      return true;
    } else {
      log('Rollback failed - manual intervention required', 'red');
      return false;
    }
  } catch (error) {
    log(`Rollback error: ${error.message}`, 'red');
    return false;
  }
}

// Update dashboard service status
async function updateDashboardStatus() {
  try {
    const SERVICE_STATUS_FILE = path.join(DATA_DIR, 'service-status.json');
    const data = await fs.readFile(SERVICE_STATUS_FILE, 'utf8');
    const serviceStatus = JSON.parse(data);
    
    // Add or update auto-recovery service
    const recoveryService = serviceStatus.services.find(s => s.id === 'auto-recovery');
    if (recoveryService) {
      recoveryService.status = 'online';
      recoveryService.lastRecovery = new Date().toISOString();
      recoveryService.uptimeStarted = recoveryService.uptimeStarted || new Date().toISOString();
    } else {
      serviceStatus.services.push({
        id: 'auto-recovery',
        name: 'Auto Recovery',
        displayName: 'Auto Recovery',
        type: 'daemon',
        status: 'online',
        lastRecovery: new Date().toISOString(),
        uptimeStarted: new Date().toISOString(),
        checkInterval: '5m',
        description: 'Automatic service monitoring and recovery'
      });
    }
    
    serviceStatus.lastUpdated = new Date().toISOString();
    await fs.writeFile(SERVICE_STATUS_FILE, JSON.stringify(serviceStatus, null, 2));
  } catch (error) {
    // Silently fail
  }
}

// Create desktop shortcut
async function createDesktopShortcut() {
  const desktopPath = path.join(process.env.USERPROFILE, 'Desktop');
  const shortcutPath = path.join(desktopPath, 'Marvin Recovery.lnk');
  const scriptPath = path.join(__dirname, 'auto-recovery.js');
  
  const psScript = `
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut('${shortcutPath}')
$Shortcut.TargetPath = 'node'
$Shortcut.Arguments = '"${scriptPath}" --manual'
$Shortcut.WorkingDirectory = '${path.dirname(scriptPath)}'
$Shortcut.IconLocation = 'C:\\Windows\\System32\\shell32.dll, 81'
$Shortcut.Description = 'Marvin Auto-Recovery - Manual Trigger'
$Shortcut.Save()
`;
  
  try {
    await execPromise(`powershell -Command "${psScript}"`);
    log(`Desktop shortcut created: ${shortcutPath}`, 'green');
    return true;
  } catch (error) {
    log(`Failed to create shortcut: ${error.message}`, 'yellow');
    return false;
  }
}

// Main entry point
async function main() {
  const args = process.argv.slice(2);
  const isAuto = args.includes('--auto');
  const isManual = args.includes('--manual');
  const createShortcut = args.includes('--create-shortcut');
  
  if (createShortcut) {
    await createDesktopShortcut();
    return;
  }
  
  try {
    await runRecovery({ auto: isAuto, manual: isManual });
  } catch (error) {
    log(`Recovery failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runRecovery, createDesktopShortcut };

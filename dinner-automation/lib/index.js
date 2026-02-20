/**
 * Dinner Automation Shared Library
 * 
 * Centralized utilities for the dinner-automation codebase.
 * 
 * @example
 * const { CDPClient, logger, withRetry, formatDateTime, getConfig } = require('./lib');
 * 
 * @module lib
 */

// CDP Client
const { CDPClient, connectToBrowser, getBrowserInfo, listPages } = require('./cdp-client');

// Retry Utilities
const { 
  withRetry, 
  sleep, 
  CircuitBreaker, 
  CircuitBreakerError,
  CIRCUIT_STATE,
  batchProcess,
  withTimeout,
  debounce,
  throttle
} = require('./retry-utils');

// Logger
const { Logger, logger, LOG_LEVELS } = require('./logger');

// Date Utilities
const { 
  formatDateTime, 
  formatRelativeTime, 
  formatDuration,
  addTime, 
  diff, 
  isToday, 
  getWeekRange,
  timestampForFilename,
  DATE_FORMATS
} = require('./date-utils');

// Configuration
const { Config, getConfig, createConfig, DEFAULTS } = require('./config');

// Browser Automation
const {
  BROWSER_CONFIG,
  smartSelector,
  smartClick,
  smartType,
  waitForAnySelector,
  checkLoginStatus,
  waitForPageReady,
  elementExists,
  safeEvaluate,
  smartNavigate,
  humanLikeScroll,
  SessionManager,
  RateLimiter
} = require('./browser');

// Selectors
const {
  HEB_SELECTORS,
  FB_SELECTORS,
  COMMON_SELECTORS,
  flattenSelectors,
  getSelectorByPath,
  mergeSelectors,
  validateSelectors
} = require('./selectors');

// Validation
const {
  ValidationError,
  ValidationErrors,
  validateEmail,
  validateUrl,
  validateLength,
  validatePattern,
  validateRange,
  validatePositive,
  validateRequired,
  validateArray,
  validateHEBCartItem,
  validateMarketplaceConfig,
  validateAutomationConfig,
  sanitizeString,
  sanitizeFilename,
  sanitizeHTML,
  validateSchema
} = require('./validation');

module.exports = {
  // CDP Client
  CDPClient,
  connectToBrowser,
  getBrowserInfo,
  listPages,
  
  // Retry Utilities
  withRetry,
  sleep,
  CircuitBreaker,
  CircuitBreakerError,
  CIRCUIT_STATE,
  batchProcess,
  withTimeout,
  debounce,
  throttle,
  
  // Logger
  Logger,
  logger,
  LOG_LEVELS,
  
  // Date Utilities
  formatDateTime,
  formatRelativeTime,
  formatDuration,
  addTime,
  diff,
  isToday,
  getWeekRange,
  timestampForFilename,
  DATE_FORMATS,
  
  // Configuration
  Config,
  getConfig,
  createConfig,
  DEFAULTS,
  
  // Browser Automation
  BROWSER_CONFIG,
  smartSelector,
  smartClick,
  smartType,
  waitForAnySelector,
  checkLoginStatus,
  waitForPageReady,
  elementExists,
  safeEvaluate,
  smartNavigate,
  humanLikeScroll,
  SessionManager,
  RateLimiter,
  
  // Selectors
  HEB_SELECTORS,
  FB_SELECTORS,
  COMMON_SELECTORS,
  flattenSelectors,
  getSelectorByPath,
  mergeSelectors,
  validateSelectors,
  
  // Validation
  ValidationError,
  ValidationErrors,
  validateEmail,
  validateUrl,
  validateLength,
  validatePattern,
  validateRange,
  validatePositive,
  validateRequired,
  validateArray,
  validateHEBCartItem,
  validateMarketplaceConfig,
  validateAutomationConfig,
  sanitizeString,
  sanitizeFilename,
  sanitizeHTML,
  validateSchema
};

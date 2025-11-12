/**
 * Security Utilities Module
 * 
 * Provides comprehensive security functions for:
 * - Deep link URL validation
 * - Rate limiting with exponential backoff
 * - CSRF state token management
 * - Session timeout utilities
 */

import type { Session } from '@supabase/supabase-js';

// ============================================================================
// Constants
// ============================================================================

export const ALLOWED_DEEP_LINK_PATHS = ['/callback', '/password-reset'];
export const MAX_URL_LENGTH = 2048;
export const ALLOWED_QUERY_PARAMS = ['access_token', 'refresh_token', 'type', 'token_hash', 'state'];

export const RATE_LIMIT_DEFAULTS = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockDurationMs: 30 * 60 * 1000, // 30 minutes
};

export const SESSION_TIMEOUT_DEFAULTS = {
  idleTimeoutMs: 30 * 60 * 1000, // 30 minutes
  maxSessionMs: 24 * 60 * 60 * 1000, // 24 hours
  warningBeforeMs: 5 * 60 * 1000, // 5 minutes
};

const STATE_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes
const STATE_TOKEN_STORAGE_KEY = 'auth_state_token';
const STATE_TOKEN_TIMESTAMP_KEY = 'auth_state_timestamp';

// ============================================================================
// Deep Link URL Validation
// ============================================================================

export interface DeepLinkValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Validates incoming deep link URLs against strict security criteria
 */
export function validateDeepLinkUrl(urlString: string): DeepLinkValidationResult {
  // Check URL length
  if (urlString.length > MAX_URL_LENGTH) {
    return {
      isValid: false,
      reason: `URL exceeds maximum length of ${MAX_URL_LENGTH} characters`,
    };
  }

  // Parse URL
  let url: URL;
  try {
    url = new URL(urlString);
  } catch (error) {
    return {
      isValid: false,
      reason: 'Invalid URL format',
    };
  }

  // Validate scheme (case-insensitive)
  if (url.protocol.toLowerCase() !== 'todoapp:') {
    return {
      isValid: false,
      reason: `Invalid scheme: ${url.protocol}. Expected: todoapp:`,
    };
  }

  // Validate host is exactly 'auth'
  if (url.host !== 'auth') {
    return {
      isValid: false,
      reason: `Invalid host: ${url.host}. Expected: auth`,
    };
  }

  // Validate path is in allowlist
  const path = url.pathname;
  if (!ALLOWED_DEEP_LINK_PATHS.includes(path)) {
    return {
      isValid: false,
      reason: `Path not allowed: ${path}. Allowed paths: ${ALLOWED_DEEP_LINK_PATHS.join(', ')}`,
    };
  }

  // Validate query parameters
  const params = Array.from(url.searchParams.keys());
  for (const param of params) {
    if (!ALLOWED_QUERY_PARAMS.includes(param)) {
      return {
        isValid: false,
        reason: `Query parameter not allowed: ${param}. Allowed: ${ALLOWED_QUERY_PARAMS.join(', ')}`,
      };
    }

    // Check for duplicate parameters
    const values = url.searchParams.getAll(param);
    if (values.length > 1) {
      return {
        isValid: false,
        reason: `Duplicate query parameter: ${param}`,
      };
    }
  }

  // Reject URLs with fragments
  if (url.hash) {
    return {
      isValid: false,
      reason: 'URL fragments are not allowed',
    };
  }

  return { isValid: true };
}

/**
 * Sanitizes and normalizes URLs
 */
export function sanitizeUrl(urlString: string): string {
  try {
    const url = new URL(urlString);
    // Lowercase scheme and host
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    // Remove trailing slash from pathname
    if (url.pathname.endsWith('/') && url.pathname.length > 1) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return urlString;
  }
}

// ============================================================================
// Rate Limiting
// ============================================================================

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  blockedUntil?: number;
  lockoutCount: number; // Track number of times user has been locked out
}

export interface RateLimitCheckResult {
  allowed: boolean;
  retryAfter?: number;
}

export class RateLimiter {
  private attempts: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;
  private cleanupInterval?: number;

  constructor(config: RateLimitConfig = RATE_LIMIT_DEFAULTS) {
    this.config = config;
    this.startCleanup();
  }

  /**
   * Check if an action is allowed for the given key
   */
  checkLimit(key: string): RateLimitCheckResult {
    const entry = this.attempts.get(key);
    const now = Date.now();

    if (!entry) {
      return { allowed: true };
    }

    // Check if currently blocked
    if (entry.blockedUntil && entry.blockedUntil > now) {
      return {
        allowed: false,
        retryAfter: entry.blockedUntil - now,
      };
    }

    // Check if window has expired
    if (now - entry.firstAttempt > this.config.windowMs) {
      // Window expired, reset
      this.attempts.delete(key);
      return { allowed: true };
    }

    // Check if max attempts reached
    if (entry.attempts >= this.config.maxAttempts) {
      // Calculate block duration with exponential backoff
      const blockDuration = this.calculateBlockDuration(entry.lockoutCount);
      entry.blockedUntil = now + blockDuration;
      entry.lockoutCount++;
      
      return {
        allowed: false,
        retryAfter: blockDuration,
      };
    }

    return { allowed: true };
  }

  /**
   * Record an attempt (success or failure)
   */
  recordAttempt(key: string, success: boolean): void {
    if (success) {
      // Clear rate limit on success
      this.attempts.delete(key);
      return;
    }

    const now = Date.now();
    const entry = this.attempts.get(key);

    if (!entry) {
      this.attempts.set(key, {
        attempts: 1,
        firstAttempt: now,
        lockoutCount: 0,
      });
    } else {
      // Check if window has expired
      if (now - entry.firstAttempt > this.config.windowMs) {
        // Reset window
        entry.attempts = 1;
        entry.firstAttempt = now;
      } else {
        entry.attempts++;
      }
    }
  }

  /**
   * Get remaining attempts before lockout
   */
  getRemainingAttempts(key: string): number {
    const entry = this.attempts.get(key);
    const now = Date.now();

    if (!entry) {
      return this.config.maxAttempts;
    }

    // If blocked, return 0
    if (entry.blockedUntil && entry.blockedUntil > now) {
      return 0;
    }

    // If window expired, return max
    if (now - entry.firstAttempt > this.config.windowMs) {
      return this.config.maxAttempts;
    }

    return Math.max(0, this.config.maxAttempts - entry.attempts);
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.attempts.delete(key);
  }

  /**
   * Calculate block duration with exponential backoff (capped at 2 hours)
   */
  private calculateBlockDuration(lockoutCount: number): number {
    const maxDuration = 2 * 60 * 60 * 1000; // 2 hours
    const duration = this.config.blockDurationMs * Math.pow(2, lockoutCount);
    return Math.min(duration, maxDuration);
  }

  /**
   * Start cleanup interval to remove stale entries
   */
  private startCleanup(): void {
    this.cleanupInterval = window.setInterval(() => {
      const now = Date.now();
      const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours

      for (const [key, entry] of this.attempts.entries()) {
        if (now - entry.firstAttempt > staleThreshold) {
          this.attempts.delete(key);
        }
      }
    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// ============================================================================
// CSRF State Token Management
// ============================================================================

/**
 * Generate a cryptographically secure random state token
 */
export function generateStateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  // Convert to base64url encoding
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Store state token in localStorage with timestamp
 */
export function storeStateToken(token: string): void {
  localStorage.setItem(STATE_TOKEN_STORAGE_KEY, token);
  localStorage.setItem(STATE_TOKEN_TIMESTAMP_KEY, Date.now().toString());
}

/**
 * Validate state token matches stored value and is not expired
 */
export function validateStateToken(token: string): boolean {
  const storedToken = localStorage.getItem(STATE_TOKEN_STORAGE_KEY);
  const timestamp = localStorage.getItem(STATE_TOKEN_TIMESTAMP_KEY);

  if (!storedToken || !timestamp) {
    return false;
  }

  // Check if token matches
  if (storedToken !== token) {
    return false;
  }

  // Check if token is expired (5 minute TTL)
  const age = Date.now() - parseInt(timestamp, 10);
  if (age > STATE_TOKEN_TTL_MS) {
    return false;
  }

  // Clear token on successful validation
  clearStateToken();

  return true;
}

/**
 * Clear stored state token
 */
export function clearStateToken(): void {
  localStorage.removeItem(STATE_TOKEN_STORAGE_KEY);
  localStorage.removeItem(STATE_TOKEN_TIMESTAMP_KEY);
}

// ============================================================================
// Session Timeout Utilities
// ============================================================================

export interface SessionTimeoutConfig {
  idleTimeoutMs: number;
  maxSessionMs: number;
  warningBeforeMs: number;
}

export interface SessionExpiryInfo {
  expiresAt: number;
  isExpired: boolean;
}

/**
 * Calculate session expiry from Supabase session
 */
export function calculateSessionExpiry(session: Session): SessionExpiryInfo {
  // Supabase session includes expires_at timestamp
  const expiresAt = session.expires_at ? session.expires_at * 1000 : Date.now() + 3600000; // Default 1 hour
  const isExpired = expiresAt < Date.now();

  return { expiresAt, isExpired };
}

/**
 * Determine if session should be refreshed based on config
 */
export function shouldRefreshSession(
  session: Session,
  lastActivity: number,
  sessionStartTime: number,
  config: SessionTimeoutConfig = SESSION_TIMEOUT_DEFAULTS
): { shouldRefresh: boolean; reason?: string } {
  const now = Date.now();
  const { expiresAt, isExpired } = calculateSessionExpiry(session);

  // Check if already expired
  if (isExpired) {
    return { shouldRefresh: false, reason: 'Session already expired' };
  }

  // Check idle timeout
  const idleTime = now - lastActivity;
  if (idleTime > config.idleTimeoutMs) {
    return { shouldRefresh: false, reason: 'Idle timeout exceeded' };
  }

  // Check max session age
  const sessionAge = now - sessionStartTime;
  if (sessionAge > config.maxSessionMs) {
    return { shouldRefresh: false, reason: 'Maximum session lifetime exceeded' };
  }

  // Check if expiring soon (within warning window)
  const timeUntilExpiry = expiresAt - now;
  if (timeUntilExpiry < config.warningBeforeMs) {
    return { shouldRefresh: true, reason: 'Session expiring soon' };
  }

  return { shouldRefresh: false };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Basic email format validation
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Format milliseconds to human-readable time
 */
export function formatTimeRemaining(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours !== 1 ? 's' : ''}`;
}

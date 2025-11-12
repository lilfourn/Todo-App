/**
 * Centralized logging and error tracking utility
 * 
 * Provides environment-aware logging that:
 * - Logs everything to console in development
 * - Strips console output in production (via Vite terser config)
 * - Sanitizes errors to prevent sensitive data leakage
 * - Prepares for optional Sentry integration
 * 
 * @example
 * ```typescript
 * import { logger } from './lib/logger';
 * 
 * // Development-only logging
 * logger.debug('Component mounted', { props });
 * 
 * // Error logging with context
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   logger.error(error, { context: 'risky_operation', userId });
 * }
 * 
 * // User-friendly error messages
 * const message = getUserFriendlyMessage(error);
 * showToast(message);
 * ```
 */

// Environment detection
export const IS_DEV = import.meta.env.DEV;
export const IS_PROD = import.meta.env.PROD;

// User-friendly error messages for common error patterns
export const ERROR_MESSAGES: Record<string, string> = {
  // Network errors
  'Failed to fetch': 'Unable to connect to the server. Please check your internet connection.',
  'NetworkError': 'Network connection lost. Please try again.',
  'TypeError: Failed to fetch': 'Unable to connect to the server. Please check your internet connection.',
  
  // Auth errors
  'Invalid login credentials': 'Invalid email or password. Please try again.',
  'Email not confirmed': 'Please confirm your email address before signing in.',
  'User already registered': 'An account with this email already exists.',
  'Password should be at least 6 characters': 'Password must be at least 6 characters long.',
  
  // Database errors
  'PGRST': 'Database error occurred. Please try again later.',
  'permission denied': 'You do not have permission to perform this action.',
  
  // Rate limiting
  'rate_limit_exceeded': 'Too many attempts. Please wait a moment and try again.',
  
  // Generic fallback
  'default': 'An unexpected error occurred. Please try again.',
};

/**
 * Sanitizes error objects for safe logging in production
 * Removes stack traces and sensitive information
 */
export function sanitizeError(error: unknown): { message: string; name?: string; code?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      // Extract Supabase error codes if present
      code: (error as any).code || (error as any).error_code,
    };
  }
  
  if (typeof error === 'string') {
    return { message: error };
  }
  
  if (error && typeof error === 'object') {
    return {
      message: (error as any).message || 'Unknown error',
      name: (error as any).name,
      code: (error as any).code || (error as any).error_code,
    };
  }
  
  return { message: 'Unknown error occurred' };
}

/**
 * Converts technical errors to user-friendly messages
 * Maps common error patterns to helpful messages
 */
export function getUserFriendlyMessage(error: unknown): string {
  const sanitized = sanitizeError(error);
  
  // Check for exact message matches
  if (sanitized.message && ERROR_MESSAGES[sanitized.message]) {
    return ERROR_MESSAGES[sanitized.message];
  }
  
  // Check for partial matches
  for (const [pattern, message] of Object.entries(ERROR_MESSAGES)) {
    if (sanitized.message?.includes(pattern)) {
      return message;
    }
  }
  
  // Check for error codes
  if (sanitized.code && ERROR_MESSAGES[sanitized.code]) {
    return ERROR_MESSAGES[sanitized.code];
  }
  
  // Fallback to generic message
  return ERROR_MESSAGES.default;
}

/**
 * Error tracking service integration (Sentry)
 * 
 * To integrate Sentry:
 * 1. Install dependencies: npm install @sentry/react @sentry/vite-plugin
 * 2. Add to vite.config.ts:
 *    import { sentryVitePlugin } from "@sentry/vite-plugin";
 *    plugins: [sentryVitePlugin({ org: "...", project: "..." })]
 * 3. Initialize in main.tsx before React render:
 *    import { initErrorTracking } from './lib/logger';
 *    initErrorTracking({ dsn: import.meta.env.VITE_SENTRY_DSN, environment: import.meta.env.MODE });
 * 4. For Tauri backend, add tauri-plugin-sentry to Cargo.toml
 */

let errorTrackingInitialized = false;
let Sentry: any = null;

export function initErrorTracking(config?: { dsn?: string; environment?: string }): void {
  if (errorTrackingInitialized) {
    logger.warn('Error tracking already initialized');
    return;
  }
  
  if (!IS_PROD) {
    logger.debug('Error tracking disabled in development mode');
    return;
  }
  
  // Initialize Sentry if DSN is provided
  if (config?.dsn) {
    // Dynamically import Sentry only in production
    // Note: @sentry/react is an optional dependency
    // Use dynamic import with string template to prevent Vite from resolving at build time
    const sentryPackage = '@sentry/react';
    
    // Create a dynamic import that Vite won't try to resolve during dev
    const loadSentry = new Function('pkg', 'return import(pkg)');
    
    loadSentry(sentryPackage)
      .then((SentryModule: any) => {
        Sentry = SentryModule;
        Sentry.init({
          dsn: config.dsn,
          environment: config.environment || import.meta.env.MODE,
          tracesSampleRate: 1.0,
          beforeSend(event: any) {
            // Sanitize event data before sending
            if (event.user) {
              delete event.user.email;
              delete event.user.ip_address;
            }
            return event;
          },
        });
        errorTrackingInitialized = true;
        logger.info('Error tracking initialized with Sentry');
      })
      .catch(() => {
        // Sentry not installed or failed to load - this is expected if optional
        if (IS_DEV) {
          console.log('Sentry not available (optional dependency not installed)');
        }
      });
  } else {
    logger.debug('Error tracking not initialized: No DSN provided');
  }
}

export function captureException(error: Error, context?: Record<string, any>): void {
  if (!IS_PROD) {
    return; // Don't send to tracking in development
  }
  
  // Send to Sentry if initialized
  if (errorTrackingInitialized && Sentry) {
    Sentry.captureException(error, { extra: context });
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  if (!IS_PROD) {
    return; // Don't send to tracking in development
  }
  
  // Send to Sentry if initialized
  if (errorTrackingInitialized && Sentry) {
    Sentry.captureMessage(message, level);
  }
}

/**
 * Sanitizes context data by removing sensitive keys in production
 */
function sanitizeContext(context?: Record<string, any>): Record<string, any> | undefined {
  if (!context) return context;
  
  // List of sensitive keys to remove in production
  const sensitiveKeys = ['email', 'password', 'token', 'accessToken', 'refreshToken', 'apiKey', 'secret'];
  
  if (IS_PROD) {
    const sanitized = { ...context };
    sensitiveKeys.forEach(key => {
      if (key in sanitized) {
        delete sanitized[key];
      }
    });
    return sanitized;
  }
  
  return context;
}

/**
 * Logger interface with environment-aware behavior
 */
export const logger = {
  /**
   * Development-only logging (no-op in production)
   * Use for debugging information that should never reach production
   */
  debug(message: string, ...args: any[]): void {
    if (IS_DEV) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },
  
  /**
   * Informational logging
   * Logs to console in development, can be sent to tracking in production
   */
  info(message: string, context?: Record<string, any>): void {
    if (IS_DEV) {
      console.log(`[INFO] ${message}`, context || '');
    } else if (context) {
      captureMessage(message, 'info');
    }
  },
  
  /**
   * Warning logging
   * Logs to console in development, sent to tracking in production
   */
  warn(message: string, context?: Record<string, any>): void {
    if (IS_DEV) {
      console.warn(`[WARN] ${message}`, context || '');
    } else {
      captureMessage(message, 'warning');
    }
  },
  
  /**
   * Error logging with automatic sanitization
   * Always logs in development, sends sanitized errors to tracking in production
   * Automatically removes sensitive data (email, password, tokens) in production
   */
  error(error: Error | unknown, context?: Record<string, any>): void {
    const sanitized = sanitizeError(error);
    const sanitizedContext = sanitizeContext(context);
    
    if (IS_DEV) {
      console.error('[ERROR]', error, context || '');
    } else {
      // In production, only send sanitized error to tracking
      if (error instanceof Error) {
        captureException(error, sanitizedContext);
      } else {
        captureMessage(sanitized.message, 'error');
      }
    }
  },
  
  /**
   * Alias for debug (legacy console.log replacement)
   */
  log(message: string, ...args: any[]): void {
    this.debug(message, ...args);
  },
};

// Export default for convenience
export default logger;

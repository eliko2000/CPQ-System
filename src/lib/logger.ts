/**
 * Centralized logging utility for CPQ System
 *
 * Uses loglevel for environment-aware logging:
 * - Development: Shows all log levels (debug, info, warn, error)
 * - Production: Only shows warnings and errors
 *
 * @see https://github.com/pimterry/loglevel
 */

import log from 'loglevel';

// Configure log level based on environment
const isDevelopment = import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === 'true';

if (isDevelopment) {
  // Development: show all logs including debug
  log.setLevel('debug');
} else {
  // Production: only show warnings and errors
  log.setLevel('warn');
}

/**
 * Logger instance with environment-aware configuration
 *
 * Usage:
 * ```typescript
 * import { logger } from '@/lib/logger';
 *
 * logger.debug('Detailed debugging info');
 * logger.info('General information');
 * logger.warn('Warning message');
 * logger.error('Error message', errorObject);
 * ```
 */
export const logger = log;

/**
 * Convenience exports for direct use
 */
export const debug = log.debug.bind(log);
export const info = log.info.bind(log);
export const warn = log.warn.bind(log);
export const error = log.error.bind(log);

/**
 * Set log level programmatically (useful for testing)
 *
 * @param level - 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'
 */
export const setLogLevel = (level: log.LogLevelDesc) => {
  log.setLevel(level);
};

export default logger;

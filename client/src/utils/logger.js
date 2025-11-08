/**
 * Logger Utility
 * 
 * Provides environment-aware logging that automatically suppresses
 * debug logs in production while keeping error logs visible.
 * 
 * Usage:
 *   import { logger } from './utils/logger';
 *   logger.log('Debug message');  // Only shows in development
 *   logger.error('Error message'); // Always shows
 */

// Check if we're in development mode
// Vite automatically provides import.meta.env.DEV
const isDev = import.meta.env.DEV;

/**
 * Logger object with environment-aware methods
 */
export const logger = {
  /**
   * Standard debug logging - only appears in development
   * @param {...any} args - Arguments to log
   */
  log: (...args) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Error logging - always appears (both dev and production)
   * @param {...any} args - Arguments to log
   */
  error: (...args) => {
    console.error(...args);
  },

  /**
   * Warning logging - only appears in development
   * @param {...any} args - Arguments to log
   */
  warn: (...args) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * Info logging - only appears in development
   * @param {...any} args - Arguments to log
   */
  info: (...args) => {
    if (isDev) {
      console.info(...args);
    }
  },

  /**
   * Table logging - only appears in development
   * Useful for displaying arrays or objects in a formatted table
   * @param {any} data - Data to display in table format
   */
  table: (data) => {
    if (isDev) {
      console.table(data);
    }
  },

  /**
   * Group logging - only appears in development
   * Groups related logs together in the console
   * @param {string} label - Label for the group
   */
  group: (label) => {
    if (isDev) {
      console.group(label);
    }
  },

  /**
   * End group logging - only appears in development
   */
  groupEnd: () => {
    if (isDev) {
      console.groupEnd();
    }
  }
};

export default logger;

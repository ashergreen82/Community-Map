/**
 * Utility functions for tracking the initial page a user visits
 */

import { logger } from './logger';

// Key used for localStorage
const INITIAL_PAGE_KEY = 'initialPage';

/**
 * Records the initial page the user visited
 * Should be called when the app first loads
 * @param {string} path - The current path
 */
export const recordInitialPage = (path) => {
  // Only set it if it hasn't been set before in this session
  if (!localStorage.getItem(INITIAL_PAGE_KEY)) {
    localStorage.setItem(INITIAL_PAGE_KEY, path);
    logger.log(`[InitialPageTracker] First page recorded: ${path}`);
  } else {
    logger.log(`[InitialPageTracker] Initial page already recorded: ${localStorage.getItem(INITIAL_PAGE_KEY)}`);
  }
};

/**
 * Gets the initial page the user visited
 * @returns {string} The initial page path or null if not set
 */
export const getInitialPage = () => {
  return localStorage.getItem(INITIAL_PAGE_KEY);
};

/**
 * Checks if the initial page was the map
 * @returns {boolean} True if the initial page was the map
 */
export const wasInitialPageMap = () => {
  return getInitialPage() === '/';
};

/**
 * Checks if the initial page was the about or landing page
 * @returns {boolean} True if the initial page was about or landing
 */
export const wasInitialPageAbout = () => {
  const initialPage = getInitialPage();
  return initialPage === '/about' || initialPage === '/landing';
};

/**
 * Clears the initial page tracking
 * Useful for testing or when you want to reset the tracking
 */
export const clearInitialPage = () => {
  localStorage.removeItem(INITIAL_PAGE_KEY);
};

/**
 * Debug function to display initial page information in the console
 * Call this function when you want to see the current initial page
 */
export const debugInitialPage = () => {
  const initialPage = getInitialPage();
  logger.log('[InitialPageTracker] ===== DEBUG INFO =====');
  logger.log(`[InitialPageTracker] Current initial page: ${initialPage || 'Not set'}`);
  logger.log(`[InitialPageTracker] Is initial page map? ${wasInitialPageMap() ? 'YES' : 'NO'}`);
  logger.log(`[InitialPageTracker] Is initial page about/landing? ${wasInitialPageAbout() ? 'YES' : 'NO'}`);
  logger.log('[InitialPageTracker] ===================================');
  return initialPage;
};

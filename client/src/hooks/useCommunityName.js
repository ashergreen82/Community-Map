import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';

/**
 * Custom hook to fetch and manage community name based on community ID.
 * Handles fetching from the API and updates the provided setCommunityName function.
 * 
 * @param {string|null} communityId - Community ID to fetch name for
 * @param {string|null} existingCommunityName - Existing community name (if already in context)
 * @param {Function} setCommunityName - Function to update community name in context/state
 * @param {Object} options - Configuration options
 * @param {string} options.componentName - Name of component using this hook (for logging)
 * @param {boolean} options.skipIfExists - If true, skip fetch if existingCommunityName already exists
 * @returns {Object} { communityName, loading, error, refetch }
 */
export function useCommunityName(
  communityId,
  existingCommunityName = null,
  setCommunityName = null,
  options = {}
) {
  const {
    componentName = 'useCommunityName',
    skipIfExists = true
  } = options;

  const [communityName, setCommunityNameLocal] = useState(existingCommunityName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCommunityName = async (forceRefetch = false) => {
    // Skip if no communityId
    if (!communityId) {
      logger.log(`[${componentName}] No communityId provided, skipping fetch`);
      return;
    }

    // Skip if we already have the name and skipIfExists is true
    if (skipIfExists && existingCommunityName && !forceRefetch) {
      logger.log(`[${componentName}] Using existing community name from context:`, existingCommunityName);
      setCommunityNameLocal(existingCommunityName);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logger.log(`[${componentName}] Fetching community name for ID:`, communityId);

      // Use the most reliable endpoint that works across multiple components
      const apiUrl = `${import.meta.env.VITE_MAPS_API_URL}/v1/getAddressByCommunity/${communityId}`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'app-name': 'web-service',
          'app-key': import.meta.env.VITE_APP_SESSION_KEY
        }
      });

      if (response.ok) {
        const data = await response.json();
        const name = data.name || 'Community Sale';

        logger.log(`[${componentName}] Fetched community name:`, name);

        // Update local state
        setCommunityNameLocal(name);

        // Update external state if function provided
        if (setCommunityName && typeof setCommunityName === 'function') {
          setCommunityName(name);
        }
      } else {
        throw new Error(`API returned status ${response.status}`);
      }
    } catch (err) {
      const errorMessage = `Error fetching community name: ${err.message}`;
      logger.error(`[${componentName}]`, errorMessage);
      setError(errorMessage);

      // Set empty name on error
      setCommunityNameLocal('');
      if (setCommunityName && typeof setCommunityName === 'function') {
        setCommunityName('');
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when communityId changes
  useEffect(() => {
    fetchCommunityName();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId]);

  return {
    communityName,
    loading,
    error,
    refetch: () => fetchCommunityName(true) // Allow manual refetch
  };
}

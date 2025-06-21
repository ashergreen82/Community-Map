import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import api from '../utils/api';

const GarageSalesContext = createContext();

export function GarageSalesProvider({ children }) {
  const [garageSales, setGarageSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchInProgressRef = useRef(false);
  const initialFetchDoneRef = useRef(false);
  
  useEffect(() => {
    console.log('GarageSalesContext: Provider mounted');
    // Initial fetch will be triggered by components as needed
    
    return () => {
      console.log('GarageSalesContext: Provider unmounted');
    };
  }, []);

  // Keep track of the last fetched community ID
  const lastFetchedCommunityIdRef = useRef(null);

  const fetchGarageSales = useCallback(async (communityId = null, forceRefresh = false) => {
    if (fetchInProgressRef.current) {
      console.log('GarageSalesContext: Fetch already in progress');
      return;
    }

    // Always fetch if:
    // 1. forceRefresh is true, OR
    // 2. communityId is different from the last one we fetched
    const communityChanged = communityId && communityId !== lastFetchedCommunityIdRef.current;
    
    if (initialFetchDoneRef.current && !forceRefresh && !communityChanged) {
      console.log('GarageSalesContext: Skipping fetch - no changes detected');
      return;
    }
    
    // Update the last fetched community ID reference
    if (communityId) {
      console.log('GarageSalesContext: Updating lastFetchedCommunityId from', lastFetchedCommunityIdRef.current, 'to', communityId);
      lastFetchedCommunityIdRef.current = communityId;
    }

    try {
      console.log('GarageSalesContext: Starting fetch');
      fetchInProgressRef.current = true;
      setLoading(true);
      setError(null);

      // If communityId is provided, fetch garage sales for that community
      // Otherwise fetch all garage sales
      const response = communityId
        ? await api.getAddressesByCommunity(communityId)
        : await api.getAddresses();
      
      console.warn('GarageSalesContext: Fetching with communityId:', communityId);
      console.log('GarageSalesContext: Raw API response:', JSON.stringify(response));
      
      // Handle case where response.data is false instead of an empty array
      if (response && response.data === false) {
        console.log('GarageSalesContext: Response data is false, converting to empty array');
        response.data = [];
      }
      
      console.log('GarageSalesContext: Response data structure:', JSON.stringify(response.data?.[0], null, 2));

      if (response && response.data) {
        const processedData = response.data.map(sale => {
          const address = sale.address ? 
            `${sale.address.streetNum} ${sale.address.street}` : 
            'Address not available';

          // Extract position data, ensuring we have valid numbers
          const position = {
            lat: parseFloat(sale.address?.latitude) || parseFloat(sale.address?.lat) || 0,
            lng: parseFloat(sale.address?.longitude) || parseFloat(sale.address?.long) || 0
          };

          // Log position data for debugging
          console.log('Processing sale position:', {
            originalAddress: sale.address,
            processedPosition: position
          });

          return {
            id: sale.id,
            name: sale.name || '',
            address: address,
            description: sale.description || 'No description available',
            position: position,
            highlightedItems: Array.isArray(sale.highlightedItems) ? sale.highlightedItems.join(', ') : '',
            // Also include featuredItems for backward compatibility
            featuredItems: sale.highlightedItems || []
          };
        });

        setGarageSales(processedData);
        initialFetchDoneRef.current = true;
        console.log('GarageSalesContext: Fetch completed successfully');
      }
    } catch (err) {
      console.error('GarageSalesContext: Error fetching garage sales:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  }, []);

  return (
    <GarageSalesContext.Provider
      value={{
        garageSales,
        loading,
        error,
        fetchGarageSales
      }}
    >
      {children}
    </GarageSalesContext.Provider>
  );
}

export function useGarageSales() {
  return useContext(GarageSalesContext);
}

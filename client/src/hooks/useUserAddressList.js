import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSelection } from '../context/SelectionContext';
import api from '../utils/api';
import { logger } from '../utils/logger';

/**
 * Custom hook to manage user's saved address list (selections) from the server.
 * Handles fetching, filtering by community, and applying selections to the SelectionContext.
 * 
 * @param {Array} garageSales - Array of garage sales for the current view
 * @param {string|null} communityId - Community ID to filter selections (optional)
 * @param {Object} options - Configuration options
 * @param {string} options.componentName - Name of component using this hook (for logging)
 * @param {boolean} options.requireCommunityId - If true, only applies selections when communityId is present
 * @returns {Object} { userAddressList, selectionsInitialized, setSelectionsInitialized }
 */
export function useUserAddressList(garageSales, communityId = null, options = {}) {
  const { 
    componentName = 'useUserAddressList',
    requireCommunityId = false 
  } = options;

  const { isAuthenticated, userInfo } = useAuth();
  const { handleCheckboxChange, handleDeselectAll } = useSelection();
  
  const [userAddressList, setUserAddressList] = useState(null);
  const [selectionsInitialized, setSelectionsInitialized] = useState(false);

  // Reset selections initialized flag when community changes
  useEffect(() => {
    if (communityId) {
      setSelectionsInitialized(false);
    }
  }, [communityId]);

  // Effect to fetch user's saved address list from server if user is logged in
  useEffect(() => {
    const fetchUserAddressList = async () => {
      if (isAuthenticated && userInfo?.userId) {
        try {
          logger.log(`[${componentName}] Fetching user address list for user:`, userInfo.userId);
          const userAddressListResponse = await api.getUserAddressList(userInfo.userId);

          if (userAddressListResponse && userAddressListResponse.addressList && userAddressListResponse.addressList.length > 0) {
            logger.log(`[${componentName}] User has saved address list on server:`, userAddressListResponse.addressList);
            setUserAddressList(userAddressListResponse.addressList);
          } else {
            logger.log(`[${componentName}] User does not have a saved address list on server, using local selections`);
            setUserAddressList([]);
          }
        } catch (error) {
          logger.error(`[${componentName}] Error fetching user address list:`, error);
          // If there's an error, we'll fall back to the local storage selections
          setUserAddressList([]);
        }
      }
    };

    fetchUserAddressList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userInfo?.userId]);

  // Effect to filter and apply user's selected sales when garage sales are loaded
  useEffect(() => {
    // Check if we should proceed with applying selections
    const shouldApplySelections = requireCommunityId 
      ? (userAddressList && garageSales && garageSales.length > 0 && communityId && !selectionsInitialized)
      : (userAddressList && garageSales && garageSales.length > 0 && !selectionsInitialized);

    if (shouldApplySelections) {
      // Get the IDs of garage sales that belong to the current view
      const currentGarageSaleIds = garageSales.map(sale => sale.id);

      // Filter the user's selected sales to only include those in the current garage sales list
      const filteredSelectedSales = userAddressList.filter(selectedSaleId =>
        currentGarageSaleIds.includes(selectedSaleId)
      );

      const communityLabel = communityId || 'current view';
      logger.log(`[${componentName}] Filtered selected sales for ${communityLabel}:`, filteredSelectedSales);
      logger.log(`[${componentName}] Garage sale IDs in ${communityLabel}:`, currentGarageSaleIds);

      // Convert the filtered array to a Set for the selection context
      const serverSelectedSales = new Set(filteredSelectedSales);

      // Update the selected sales in the selection context
      // This will override any locally stored selections
      handleDeselectAll(); // Clear existing selections first

      // Add each server-side selection that belongs to the current community
      serverSelectedSales.forEach(saleId => {
        handleCheckboxChange(saleId);
      });

      logger.log(`[${componentName}] Updated selections from server list (filtered for ${communityLabel})`);
      setSelectionsInitialized(true); // Mark selections as initialized
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userAddressList, garageSales, communityId, selectionsInitialized]);

  return {
    userAddressList,
    selectionsInitialized,
    setSelectionsInitialized
  };
}

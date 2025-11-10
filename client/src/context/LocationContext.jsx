import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { logger } from '../utils/logger';

const LocationContext = createContext();

export function LocationProvider({ children }) {
  const [userLocation, setUserLocation] = useState(null);
  const [shouldCenterOnUser, setShouldCenterOnUser] = useState(false);
  const [error, setError] = useState(null);

  const centerOnUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        logger.log('[LocationContext] User location obtained:', pos);
        setUserLocation(pos);
        setShouldCenterOnUser(true);
        setError(null);
      },
      (error) => {
        setError(`Error getting location: ${error.message}`);
        logger.warn('[LocationContext] Error getting location:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, []);

  const clearCenterOnUser = useCallback(() => {
    setShouldCenterOnUser(false);
  }, []);

  // Get initial location when component mounts
  useEffect(() => {
    logger.log('[LocationContext] Getting initial location');
    centerOnUserLocation();
  }, [centerOnUserLocation]);

  const value = {
    userLocation,
    shouldCenterOnUser,
    error,
    centerOnUserLocation,
    clearCenterOnUser
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}

export default LocationContext;

import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { logger } from '../utils/logger';

/**
 * LanderRedirect component
 * 
 * This component handles redirects from /lander to the root route
 * while preserving query parameters like communityId.
 * 
 * This is specifically designed to handle QR code readers that 
 * add "/lander" to URLs when scanning QR codes.
 */
const LanderRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Extract the query string from the current URL
    const queryParams = new URLSearchParams(location.search);
    
    // Log the redirect for debugging
    logger.log('[LanderRedirect] Redirecting from /lander to / with params:', 
      Object.fromEntries(queryParams.entries()));
    
    // Redirect to the root route with the same query parameters
    navigate({
      pathname: '/',
      search: location.search
    });
  }, [navigate, location.search]);

  // Return a loading message while redirecting
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2>Redirecting to Community Map...</h2>
      <p>Please wait while we take you to the community sales map.</p>
    </div>
  );
};

export default LanderRedirect;

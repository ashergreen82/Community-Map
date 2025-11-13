import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import useWindowSize from '../hooks/useWindowSize';
import MenuBarHamburger from './MenuBarHamburger';
import api from '../utils/api';
import './MenuBar.css';
import { logger } from '../utils/logger';

const MenuBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout, userEmail } = useAuth();
  const { setFromLanding } = useNavigation();

  // Get window dimensions
  const { width } = useWindowSize();
  const isCompactView = width < 1045;

  const handleNavigation = (path) => {
    setFromLanding(true); // Set that navigation came from landing/menu bar
    navigate(path);
  };

  const handleGarageSalesClick = async () => {
    setFromLanding(true); // Set that navigation came from landing/menu bar
    try {
      // Make API call to get all single garage sales with community ID "GENPUB"
      logger.log('[MenuBar] Fetching garage sales for GENPUB community...');

      // Use the MAPS API URL from environment variables
      const apiUrl = `${import.meta.env.VITE_MAPS_API_URL}/v1/getAddressByCommunity/GENPUB`;
      logger.log('[MenuBar] Using API URL:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'app-name': 'web-service',
          'app-key': import.meta.env.VITE_APP_SESSION_KEY
        }
      });

      if (response.ok) {
        const data = await response.json();
        logger.log('[MenuBar] Garage sales fetched successfully:', data);

        // Store the data in sessionStorage to ensure it's available when the page loads
        sessionStorage.setItem('garageSalesData', JSON.stringify(data));
      }

      // Navigate to the new SingleGarageSales page
      navigate('/single-garage-sales');
    } catch (error) {
      logger.error('[MenuBar] Error fetching garage sales:', error);
      // Navigate anyway in case of error
      navigate('/single-garage-sales');
    }
  };

  const handleRegisterGarageSaleClick = () => {
    setFromLanding(true);

    // Check if user is authenticated before allowing registration
    if (isAuthenticated) {
      navigate('/register-garage-sale');
    } else {
      // Redirect to login with a return path to the registration page
      navigate('/login?returnTo=/register-garage-sale');
    }
  };

  const handleLogout = () => {
    logout();
    setFromLanding(true); // Maintain the menu bar even after logout
    
    // Force a small delay to ensure state updates before navigation
    setTimeout(() => {
      // When on landing/about page, stay there after logout
      if (location.pathname === '/landing' || location.pathname === '/about') {
        window.location.href = location.pathname; // Full page reload to reset state
      } else {
        window.location.href = '/landing'; // Full page reload to reset state
      }
    }, 100);
  };

  // If screen is small, render hamburger menu instead
  if (isCompactView) {
    return <MenuBarHamburger />;
  }

  return (
    <>
      <nav className="menu-bar">
        <div className="menu-bar-item" onClick={() => handleNavigation('/about')}>About</div>
        <div className="menu-bar-item" onClick={() => handleNavigation('/list-active-community-sales-events')}>Community Sales Events</div>
        <div className="menu-bar-item" onClick={handleGarageSalesClick}>Garage Sales</div>
        <div className="menu-bar-item" onClick={handleRegisterGarageSaleClick}>Register a Garage Sale</div>
        {isAuthenticated &&
          <div className="menu-bar-item" onClick={() => handleNavigation('/admin/community-sales')}>Manage Community Sales</div>
        }

        <div className="menu-bar-item" style={{ marginLeft: 'auto' }}></div>

        {isAuthenticated ? (
          <div className="menu-bar-item" onClick={handleLogout}>Logout</div>
        ) : (
          <div className="menu-bar-item-button-wrapper">
            <button className=" menu-bar-item-button menu-bar-item-loginButton" onClick={() => handleNavigation('/login?from=landing')} >Login</button>
          </div>
        )}
        {/* <div className="menu-bar-item" onClick={() => handleNavigation('/info')}>Info</div> */}
      </nav>

    </>
  );
};

export default MenuBar;

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import useWindowSize from '../hooks/useWindowSize';
import MenuBarHamburger from './MenuBarHamburger';
import api from '../utils/api';
import './MenuBar.css';

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
      console.log('Fetching garage sales for GENPUB community...');
      
      // Use the MAPS API URL from environment variables
      const apiUrl = `${import.meta.env.VITE_MAPS_API_URL}/v1/getAddressByCommunity/GENPUB`;
      console.log('Using API URL:', apiUrl);
      
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
        console.log('Garage sales fetched successfully:', data);
        
        // Store the data in sessionStorage to ensure it's available when the page loads
        sessionStorage.setItem('garageSalesData', JSON.stringify(data));
      }
      
      // Navigate to the new SingleGarageSales page
      navigate('/single-garage-sales');
    } catch (error) {
      console.error('Error fetching garage sales:', error);
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
    
    // When on landing/about page, stay there after logout
    if (location.pathname === '/landing' || location.pathname === '/about') {
      navigate(location.pathname); // Stay on the current page
    } else {
      navigate('/landing'); // Otherwise go to landing page
    }
  };

  // If screen is small, render hamburger menu instead
  if (isCompactView) {
    return <MenuBarHamburger />;
  }

  return (
    <nav className="flex justify-center py-4 bg-slate-800 sticky top-0 z-50">
      {isCompactView ? (
        <MenuBarHamburger />
      ) : (
        <div className="flex flex-wrap justify-center">
          <button 
            className="text-white px-6 py-3 text-xl font-medium transition-colors cursor-pointer hover:bg-slate-700"
            onClick={() => handleNavigation('/about')}
          >
            About
          </button>
          <button 
            className="text-white px-6 py-3 text-xl font-medium transition-colors cursor-pointer hover:bg-slate-700"
            onClick={() => handleNavigation('/list-active-community-sales-events')}
          >
            Active Community Sales Events
          </button>
          <button 
            className="text-white px-6 py-3 text-xl font-medium transition-colors cursor-pointer hover:bg-slate-700"
            onClick={handleGarageSalesClick}
          >
            Garage Sales
          </button>
          <button 
            className="text-white px-6 py-3 text-xl font-medium transition-colors cursor-pointer hover:bg-slate-700"
            onClick={handleRegisterGarageSaleClick}
          >
            Register a Garage Sale
          </button>
          <button 
            className="text-white px-6 py-3 text-xl font-medium transition-colors cursor-pointer hover:bg-slate-700"
            onClick={() => handleNavigation('/admin/community-sales')}
          >
            Manage Community Sales
          </button>
          <button 
            className="text-white px-6 py-3 text-xl font-medium transition-colors cursor-pointer hover:bg-slate-700"
            onClick={() => handleNavigation('/info')}
          >
            Info
          </button>
          {isAuthenticated ? (
            <button 
              className="text-white px-6 py-3 text-xl font-medium transition-colors cursor-pointer hover:bg-slate-700"
              onClick={handleLogout}
            >
              Logout
            </button>
          ) : (
            <button 
              className="text-white px-6 py-3 text-xl font-medium transition-colors cursor-pointer hover:bg-slate-700"
              onClick={() => handleNavigation('/login?from=landing')}
            >
              Login
            </button>
          )}
        </div>
      )}
    </nav>
  );
};

export default MenuBar;

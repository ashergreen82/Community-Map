import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import useWindowSize from '../hooks/useWindowSize';
import MenuBarHamburger from './MenuBarHamburger';
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
    <nav className="menu-bar">
      <div className="menu-bar-item" onClick={() => handleNavigation('/about')}>About</div>
      <div className="menu-bar-item" onClick={() => handleNavigation('/list-active-community-sales-events')}>List of Active Community Sales Events</div>
      <div className="menu-bar-item" onClick={() => handleNavigation('/sales')}>List of Garage Sales</div>
      <div className="menu-bar-item" onClick={() => handleNavigation('/admin/community-sales')}>Manage Community Sales</div>
      {isAuthenticated ? (
        <div className="menu-bar-item" onClick={handleLogout}>Logout</div>
      ) : (
        <div className="menu-bar-item" onClick={() => handleNavigation('/login?from=landing')}>Login</div>
      )}
      <div className="menu-bar-item" onClick={() => handleNavigation('/info')}>Info</div>
    </nav>
  );
};

export default MenuBar;

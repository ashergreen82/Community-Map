import React from 'react';
import HamburgerMenu from './HamburgerMenu';
import MenuBar from './MenuBar';
import { useNavigation } from '../context/NavigationContext';
import { useLocation } from 'react-router-dom';

const ConditionalMenu = () => {
  const { fromLanding } = useNavigation();
  const location = useLocation();
  
  // Admin pages should never show the hamburger menu
  if (location.pathname.startsWith('/admin')) {
    return <MenuBar />; // Don't show any menu for admin pages
  }
  
  // Info pages should never show the hamburger menu  
  if (location.pathname.startsWith('/info')) {
    return <MenuBar />; // Don't show any menu for info pages
  }
  
  // Single Garage Sales and Register Garage Sale pages should always use MenuBar
  if (location.pathname === '/single-garage-sales' || location.pathname === '/register-garage-sale') {
    return <MenuBar />;
  }
    
  // Pages that should always use the HamburgerMenu regardless of navigation path
  const alwaysHamburgerPages = ['/', '/help', '/settings', '/sales'];
  if (alwaysHamburgerPages.includes(location.pathname)) {
    return <HamburgerMenu />;
  }
  
  // Use the MenuBar on landing and about pages or if we came from landing
  // but not for pages that should always use the hamburger menu
  if ((location.pathname === '/landing' || location.pathname === '/about' || fromLanding) && 
      !alwaysHamburgerPages.includes(location.pathname)) {
    return <MenuBar />;
  }
  
  // Use HamburgerMenu for all other cases
  return <HamburgerMenu />;
};

export default ConditionalMenu;

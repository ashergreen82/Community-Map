import React from 'react';
import { useDisplay } from '../../context/DisplayContext';
import { useSelection } from '../../context/SelectionContext';
import { useGarageSales } from '../../context/GarageSalesContext';
import { useNavigate, useLocation } from 'react-router-dom';

const DisplayMode = ({ onSelect }) => {
  const { showOnlySelected, toggleDisplayMode } = useDisplay();
  const { selectedSales } = useSelection();
  const { garageSales } = useGarageSales();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we're on the admin sales page
  const isOnAdminPage = location.pathname === '/admin/sales';
  
  // If we're on the admin page, don't render this menu item
  if (isOnAdminPage) {
    return null;
  }

  const handleClick = () => {
    if (!showOnlySelected) {
      // "Show Selected Sales" option is clicked
      const selectedSalesData = garageSales
        .filter(sale => selectedSales.has(sale.id))
        .map(sale => ({
          ...sale,
          lat: sale.position.lat,
          lng: sale.position.lng,
          address: sale.address,
          description: sale.description
        }));

      // Only proceed if there are selected sales
      if (selectedSalesData.length > 0) {
        // Save to localStorage for the map to use
        localStorage.setItem('selectedSales', JSON.stringify(selectedSalesData));
        
        // Toggle the display mode
        toggleDisplayMode();
        
        // Navigate to the map page
        navigate('/');
      } else {
        // If no sales are selected, navigate to the GarageSales page where users can select sales
        navigate('/sales');
      }
    } else {
      // "Show All Sales" option is clicked
      // Clear any selected sales data in localStorage
      localStorage.removeItem('selectedSales');
      
      // Toggle the display mode
      toggleDisplayMode();
      
      // Always navigate to the map page for consistency
      navigate('/');
    }

    // Call the onSelect callback to close the menu
    if (onSelect) {
      onSelect();
    }
  };

  return (
    <div className="menu-item" onClick={handleClick}>
      <span className="menu-icon">
        {showOnlySelected ? '👁️' : '🔍'}
      </span>
      <span className="menu-text">
        {showOnlySelected ? 'Show All Sales' : 'Show Selected Sales'}
      </span>
    </div>
  );
};

export default DisplayMode;

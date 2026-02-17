import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGarageSales } from '../context/GarageSalesContext';
import { useAuth } from '../context/AuthContext';
import { useDisplay } from '../context/DisplayContext';
import { useSearch } from '../context/SearchContext';
import { useCommunitySales } from '../context/CommunitySalesContext';
import { useCommunityName } from '../hooks/useCommunityName';
import AutoResizeTextArea from '../components/AutoResizeTextArea';
import GooglePlacesAutocomplete from 'react-google-places-autocomplete';
import { parseAddressString } from '../utils/addressFormatter';
import api from '../utils/api';
import styles from './GarageSalesAdmin.module.css';
import CommunityQRCode from '../components/CommunityQRCode';
import { logger } from '../utils/logger';

const GarageSalesAdmin = () => {
  const {
    garageSales,
    loading,
    error,
    fetchGarageSales,
  } = useGarageSales();
  
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, userEmail, userInfo } = useAuth();
  const { searchTerm, handleSearchChange } = useSearch();
  const { communityName, setCommunityName, communityId, setCommunityId } = useCommunitySales();
  
  // Use custom hook for community name fetching
  useCommunityName(communityId, communityName, setCommunityName, {
    componentName: 'GarageSalesAdmin',
    skipIfExists: true
  });
  
  // Create a separate state for admin selections
  const [adminSelectedSales, setAdminSelectedSales] = useState(new Set());
  
  const { showOnlySelected, toggleDisplayMode } = useDisplay();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [formData, setFormData] = useState({
    address: '',
    description: '',
    featuredItems: [],
    paymentTypes: []
  });
  const [submitError, setSubmitError] = useState(null);
  
  // --- QR Code Section ---
  // Prefer context values if available, fallback to local state
  const qrCommunityId = communityId;
  const qrCommunityName = communityName;

  // --- Render QR Code above admin content ---
  // (This will be inserted at the top of the returned JSX)
  // Usage: <CommunityQRCode communityId={qrCommunityId} communityName={qrCommunityName} size={220} />

  // Update state when context or URL parameters change
  useEffect(() => {
    logger.log('[GarageSalesAdmin] Context values:', { communityName, communityId });
    
    // Get communityId from URL or context
    const queryParams = new URLSearchParams(location.search);
    const newId = queryParams.get('communityId') || communityId;
    logger.log('[GarageSalesAdmin] Extracted communityId from URL:', newId);
    if (newId && newId !== communityId) {
      logger.log('[GarageSalesAdmin] Community ID changed, updating context:', newId);
      if (typeof setCommunityId === 'function') setCommunityId(newId);
      // Reset selections when community changes
      setAdminSelectedSales(new Set());
      // Force a refresh of garage sales data with the new communityId
      fetchGarageSales(newId, true);
    }
  }, [location.search, fetchGarageSales, communityName, communityId]);

  // Extract communityId from URL parameters - community name fetching handled by useCommunityName hook
  
  // Load any previously saved admin selections
  useEffect(() => {
    const savedAdminSelections = localStorage.getItem('adminSelectedSaleIds');
    if (savedAdminSelections) {
      try {
        setAdminSelectedSales(new Set(JSON.parse(savedAdminSelections)));
      } catch (error) {
        logger.error('[GarageSalesAdmin] Error parsing admin selections:', error);
      }
    }
  }, []);

  // Save admin selections to localStorage when they change
  useEffect(() => {
    localStorage.setItem('adminSelectedSaleIds', JSON.stringify([...adminSelectedSales]));
  }, [adminSelectedSales]);



  // Refresh garage sales data when component mounts or communityId changes
  useEffect(() => {
    if (communityId) {
      logger.log('[GarageSalesAdmin] Fetching garage sales for communityId:', communityId);
      // Always force a refresh when the communityId changes
      fetchGarageSales(communityId, true);
    }
  }, [fetchGarageSales, communityId]);

  // Address parsing handled by parseAddressString utility

  const handleAddNew = () => {
    setEditingSale(null);
    setFormData({
      address: '',
      description: '',
      featuredItems: [],
      paymentTypes: []
    });
    setIsAddingNew(true);
    setSubmitError('');
  };

  const handleEdit = (sale) => {
    setIsAddingNew(false);
    setEditingSale(sale);
    setFormData({
      address: sale.address,
      description: sale.description,
      featuredItems: sale.featuredItems || [],
      paymentTypes: sale.paymentTypes || []
    });
    // Scroll to the top of the page to make the form visible
    window.scrollTo(0, 0);
  };

  const handleCancelEdit = () => {
    setEditingSale(null);
    setFormData({
      address: '',
      description: '',
      featuredItems: [],
      paymentTypes: []
    });
    setIsAddingNew(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle adding a new featured item
  const handleAddFeaturedItem = () => {
    setFormData(prev => ({
      ...prev,
      featuredItems: [...(prev.featuredItems || []), '']
    }));
  };
  
  // Handle removing a featured item
  const handleRemoveFeaturedItem = (index) => {
    setFormData(prev => ({
      ...prev,
      featuredItems: (prev.featuredItems || []).filter((_, i) => i !== index)
    }));
  };
  
  // Handle changing a featured item
  const handleFeaturedItemChange = (e, index) => {
    const newItems = [...(formData.featuredItems || [])];
    newItems[index] = e.target.value;
    setFormData(prev => ({
      ...prev,
      featuredItems: newItems
    }));
  };

  // Available payment types - matching backend format (uppercase)
  const availablePaymentTypes = [
    { display: 'Cash', value: 'CASH' },
    { display: 'Visa', value: 'Visa' },
    { display: 'Mastercard', value: 'MasterCard' },
    { display: 'American Express', value: 'American Express' },
    { display: 'Debit', value: 'Debit' },
    { display: 'Email Transfer', value: 'Email Transfer' }
  ];

  // Handle toggling a payment type checkbox
  const handlePaymentTypeToggle = (paymentType) => {
    setFormData(prev => {
      const currentTypes = prev.paymentTypes || [];
      const isSelected = currentTypes.includes(paymentType);
      
      if (isSelected) {
        // Remove the payment type
        return {
          ...prev,
          paymentTypes: currentTypes.filter(type => type !== paymentType)
        };
      } else {
        // Add the payment type
        return {
          ...prev,
          paymentTypes: [...currentTypes, paymentType]
        };
      }
    });
  };

  const handleAddressSelect = (selected) => {
    setFormData(prev => ({
      ...prev,
      address: selected ? selected.label : ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    try {
      if (editingSale) {
        // Prepare the update data based on what changed
        const updateData = {
          // Always include the community ID in the payload
          community: communityId
        };
        
        // Check if address was updated
        if (formData.address !== editingSale.address) {
          // Parse address components using utility
          const addressParts = parseAddressString(formData.address);
          updateData.address = {
            street: addressParts.street,
            streetNum: addressParts.streetNumber,
            city: addressParts.city,
            provState: addressParts.state,
            postalZipCode: '',
            unit: ''
          };
        }
        
        // Check if description was updated
        if (formData.description !== editingSale.description) {
          updateData.description = formData.description;
        }
        
        // Check if featured items were updated
        const currentFeaturedItems = formData.featuredItems?.filter(item => item.trim() !== '') || [];
        const existingFeaturedItems = editingSale.featuredItems || [];
        
        // Check if featured items have changed (order-insensitive comparison)
        const itemsChanged = 
          currentFeaturedItems.length !== existingFeaturedItems.length ||
          !currentFeaturedItems.every(item => existingFeaturedItems.includes(item));
          
        if (itemsChanged) {
          updateData.highlightedItems = currentFeaturedItems;
        }
        
        // Check if payment types were updated
        const currentPaymentTypes = formData.paymentTypes?.filter(type => type.trim() !== '') || [];
        const existingPaymentTypes = editingSale.paymentTypes || [];
        
        // Check if payment types have changed (order-insensitive comparison)
        const paymentTypesChanged = 
          currentPaymentTypes.length !== existingPaymentTypes.length ||
          !currentPaymentTypes.every(type => existingPaymentTypes.includes(type));
          
        if (paymentTypesChanged) {
          updateData.paymentTypes = currentPaymentTypes;
        }
        
        // Only make the API call if there are changes to update (community ID is always included)
        if (Object.keys(updateData).length > 1) { // More than just communityId
          await api.updateGarageSale(editingSale.id, updateData);
        }
      } else {
        // Parse the address from the form using utility
        const addressData = parseAddressString(formData.address);
        
        // Create the sale data object with all required fields
        const saleData = {
          address: {
            street: addressData.street || '',
            streetNum: addressData.streetNumber || '',
            city: addressData.city || '',
            provState: addressData.state || '',
            postalZipCode: addressData.postalCode || '',
            unit: addressData.unit || '',
            country: 'Canada' // Ensure country is included
          },
          description: formData.description || 'GARAGE SALE',
          highlightedItems: formData.featuredItems || [], // Use featured items from form
          paymentTypes: formData.paymentTypes?.filter(type => type.trim() !== '') || [],
          name: formData.name || 'Garage Sale',
          community: communityId || 'GENPUB',
          userId: userInfo?.id || userInfo?.userId || 'anonymous', // Ensure we have a fallback user ID
          dateTime: {
            start: (formData.startDate ? 
              new Date(`${formData.startDate}T09:00:00-04:00`) : 
              new Date()).toISOString().replace(/\.\d+Z$/, '').replace('Z', ''),
            end: (formData.endDate ? 
              new Date(`${formData.endDate}T18:00:00-04:00`) : 
              new Date(Date.now() + 86400000)).toISOString().replace(/\.\d+Z$/, '').replace('Z', ''),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto'
          },
          // Add date fields at the root level if needed by the API
          startDate: formData.startDate ? 
            new Date(`${formData.startDate}T00:00:00-04:00`).toISOString().split('T')[0] : 
            new Date().toISOString().split('T')[0],
          endDate: formData.endDate ? 
            new Date(`${formData.endDate}T23:59:59-04:00`).toISOString().split('T')[0] : 
            new Date(Date.now() + 86400000).toISOString().split('T')[0],
          // Add any additional fields that might be required
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        logger.log('[GarageSalesAdmin] Creating garage sale with data:', JSON.stringify(saleData, null, 2));
        
        try {
          await api.createGarageSale(saleData);
        } catch (error) {
          logger.error('[GarageSalesAdmin] API Error:', error.response?.data || error.message);
          throw error; // Re-throw to be caught by the outer catch block
        }
      }
      
      setIsAddingNew(false);
      setEditingSale(null);
      setFormData({
        address: '',
        description: '',
        featuredItems: [],
        paymentTypes: []
      });
      // Force refresh the list after adding/editing with the current community ID
      await fetchGarageSales(communityId, true);
    } catch (error) {
      logger.error('[GarageSalesAdmin] Error saving garage sale:', error);
      setSubmitError(error.message || 'Failed to save garage sale. Please try again.');
      // Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDelete = async (saleId) => {
    if (window.confirm('Are you sure you want to delete this garage sale?')) {
      try {
        await api.deleteGarageSale(saleId);
        
        // Force refresh the garage sales list to update the UI
        // Pass the communityId to ensure we're fetching the correct sales
        await fetchGarageSales(communityId, true);
      } catch (error) {
        logger.error('[GarageSalesAdmin] Error deleting garage sale:', error);
      }
    }
  };

  const handleAdminCheckboxChange = (saleId) => {
    setAdminSelectedSales(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(saleId)) {
        newSelected.delete(saleId);
      } else {
        newSelected.add(saleId);
      }
      return newSelected;
    });
  };

  const handleAdminDeselectAll = () => {
    setAdminSelectedSales(new Set());
  };

  const handleDeleteSelected = async () => {
    const selectedIds = Array.from(adminSelectedSales);
    
    if (selectedIds.length === 0) {
      alert('Please select garage sales to delete');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected garage sales?`)) {
      try {
        // Use bulk deletion instead of deleting one by one
        await api.deleteGarageSale(selectedIds);
        
        // Force refresh the garage sales list to update the UI
        // Pass the communityId to ensure we're fetching the correct sales
        await fetchGarageSales(communityId, true);
        handleAdminDeselectAll();
      } catch (error) {
        logger.error('[GarageSalesAdmin] Error deleting selected garage sales:', error);
        alert('An error occurred while deleting selected garage sales.');
      }
    }
  };

  const handleViewOnMap = (sale) => {
    const saleToView = {
      ...sale,
      lat: sale.position.lat,
      lng: sale.position.lng
    };
    
    localStorage.setItem('selectedSales', JSON.stringify([saleToView]));
    navigate(`/?communityId=${communityId || ''}`);
  };
  
  // Function to handle QR code generation for the community map
  const handleCreateQRCode = () => {
    // Use the environment variable for the community map URL
    let baseUrl = import.meta.env.VITE_COMMUNITYMAP_API_URL;
    
    // Ensure the URL includes 'www' if it's not already there
    if (baseUrl.includes('://') && !baseUrl.includes('://www.')) {
      baseUrl = baseUrl.replace('://', '://www.');
    } else if (!baseUrl.includes('://')) {
      baseUrl = `https://www.${baseUrl}`;
    }
    
    const mapUrl = `${baseUrl}/?communityId=${communityId || ''}`;
    
    // Use a free QR code generation service
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(mapUrl)}`;
    
    // Create a custom HTML page with white background and title
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${communityName || 'Community Garage Sale'} QR Code</title>
        <style>
          body {
            background-color: white;
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          h1 {
            color: #333;
            margin-bottom: 30px;
            text-align: center;
          }
          .qr-container {
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            background-color: white;
          }
          .instructions {
            margin-top: 20px;
            text-align: center;
            color: #666;
            max-width: 500px;
          }
        </style>
      </head>
      <body>
        <h1>${communityName || 'Community Garage Sale'}</h1>
        <div class="qr-container">
          <img src="${qrCodeUrl}" alt="QR Code for Community Garage Sale" />
        </div>
        <div className={styles.adminContent}>
        <h2>Manage Garage Sales for ${communityName || 'Community'}</h2>
        {submitError && (
          <div style={{
            backgroundColor: '#ffebee',
            color: '#c62828',
            padding: '12px',
            borderRadius: '4px',
            margin: '10px 0',
            border: '1px solid #ef9a9a',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontWeight: 'bold' }}>Error:</span>
            <span>{submitError}</span>
            <button 
              onClick={() => setSubmitError(null)}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: '#c62828',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '0 4px'
              }}
              aria-label="Dismiss error"
            >
              &times;
            </button>
            border: 1px solid #ffcccc;
            border-radius: 4px;
            background-color: #fff0f0
          ">
            ${submitError}
          </div>
        )}
        <p>Scan this QR code to access the ${communityName || 'Community Garage Sale'} map on your mobile device.</p>
          <p>You can print this page or save the QR code image for distribution.</p>
        </div>
      </body>
      </html>
    `;
    
    // Create a blob from the HTML content
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    
    // Open the custom HTML page in a new tab
    const newTab = window.open(blobUrl, '_blank');
    
    // Clean up the blob URL when the tab is closed
    if (newTab) {
      newTab.onload = () => {
        // This will execute when the new tab has loaded
        URL.revokeObjectURL(blobUrl);
      };
    }
  };

  const handleViewSelected = () => {
    const selectedSalesData = filteredSales
      .filter(sale => adminSelectedSales.has(sale.id))
      .map(sale => ({
        ...sale,
        lat: sale.position.lat,
        lng: sale.position.lng,
        address: sale.address,
        description: sale.description
      }));

    if (selectedSalesData.length > 0) {
      localStorage.setItem('selectedSales', JSON.stringify(selectedSalesData));
      // If not already showing only selected sales, turn it on
      if (!showOnlySelected) {
        toggleDisplayMode();
      }
      navigate('/');
    } else {
      alert('Please select at least one garage sale to view on the map.');
    }
  };

  // Filter garage sales based on search term
  const filteredSales = garageSales.filter(sale => 
    (sale.address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sale.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle selection of all sales
  const handleSelectAll = () => {
    const allIds = new Set(garageSales.map(sale => sale.id));
    setAdminSelectedSales(allIds);
  };

  // Handle deselection of all sales
  const handleDeselectAll = () => {
    setAdminSelectedSales(new Set());
  };



  // Export all garage sale addresses to CSV
  const handleExportCSV = async () => {
    if (!garageSales || garageSales.length === 0) {
      alert('No garage sales to export.');
      return;
    }

    const headers = ['Address', 'Description', 'Featured Items', 'Payment Types'];
    const rows = garageSales.map(sale => [
      `"${(sale.address || '').replace(/"/g, '""')}"`,
      `"${(sale.description || '').replace(/"/g, '""')}"`,
      `"${(sale.featuredItems || []).join(', ').replace(/"/g, '""')}"`,
      `"${(sale.paymentTypes || []).join(', ').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const defaultName = `${communityName || 'garage-sales'}-addresses.csv`;

    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: defaultName,
          startIn: 'downloads',
          types: [{
            description: 'CSV File',
            accept: { 'text/csv': ['.csv'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(csvContent);
        await writable.close();
      } catch (pickerErr) {
        if (pickerErr.name === 'AbortError') return;
        logger.error('[GarageSalesAdmin] Error saving CSV:', pickerErr);
      }
    } else {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = defaultName;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  // Return to the community sales admin page
  const handleBackToCommunitySales = () => {
    navigate('/admin/community-sales');
  };

  if (loading) {
    return (
      <div className="garage-sales-admin">
        <div className="loading">Loading garage sales...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="garage-sales-admin">
        <div className="error">{error}</div>
        <button className="retry-button" onClick={fetchGarageSales}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.garageSalesAdmin}>
      <h1 className={styles.title}>{communityName ? `${communityName}` : 'Garage Sales Administration'}</h1>
      <div className={styles.userInfo}>
        <div className={styles.userName}>{userInfo?.fName} {userInfo?.lName}</div>
        <div className={styles.userEmail}>{userEmail}</div>
      </div>
      
      {submitError && (
        <div style={{
          backgroundColor: '#ffebee',
          color: '#c62828',
          padding: '12px',
          borderRadius: '4px',
          margin: '10px 20px',
          border: '1px solid #ef9a9a',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontWeight: 'bold' }}>Error:</span>
          <span>{submitError}</span>
          <button 
            onClick={() => setSubmitError(null)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#c62828',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '0 4px'
            }}
            aria-label="Dismiss error"
          >
            &times;
          </button>
        </div>
      )}
      
      <div className={styles.adminControls}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search by address or description..."
            value={searchTerm}
            onChange={handleSearchChange}
            className={styles.searchInput}
          />
        </div>
        
        <div className={styles.buttonsContainer}>
          <button 
            className={styles.addNewButton}
            onClick={handleAddNew}
            disabled={isAddingNew}
          >
            Add New Garage Sale
          </button>
          
          {adminSelectedSales.size > 0 && (
            <>
              <button 
                className={styles.selectAllButton}
                onClick={handleSelectAll}
              >
                Select All
              </button>
              <button 
                className={styles.deselectAllButton}
                onClick={handleDeselectAll}
              >
                Deselect All
              </button>
              <button 
                className={styles.deleteSelectedButton}
                onClick={handleDeleteSelected}
              >
                Delete Selected ({adminSelectedSales.size})
              </button>
            </>
          )}
          
          <button 
            className={styles.backToCommunityButton}
            onClick={handleBackToCommunitySales}
          >
            Back to Community Sales
          </button>
          
          <button 
            className={styles.exportCsvButton}
            onClick={handleExportCSV}
            disabled={!garageSales || garageSales.length === 0}
          >
            Export CSV
          </button>
        </div>
      </div>

      {(isAddingNew || editingSale) && (
        <form onSubmit={handleSubmit} className={styles.garageForm}>
          <div className={styles.formGroup}>
            <label>Address:</label>
            <GooglePlacesAutocomplete
              selectProps={{
                value: { label: formData.address, value: formData.address },
                onChange: (selected) => handleAddressSelect(selected),
                placeholder: "Enter address..."
              }}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Description:</label>
            <AutoResizeTextArea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter description..."
              minRows={6}
              className={styles.descriptionTextarea}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Featured Items</label>
            {formData.featuredItems?.map((item, index) => (
              <div 
                key={index} 
                className={styles.featuredItemInput}
              >
                <input
                  type="text"
                  value={item}
                  onChange={(e) => handleFeaturedItemChange(e, index)}
                  placeholder="e.g., Furniture, Electronics, Toys"
                />
                {formData.featuredItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveFeaturedItem(index)}
                    className={styles.removeItemButton}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddFeaturedItem}
              className={styles.addItemButton}
            >
              + Add item
            </button>
          </div>

          <div className={styles.formGroup}>
            <label>Payment Types Accepted</label>
            <div className={styles.checkboxGroup}>
              {availablePaymentTypes.map((paymentType) => (
                <label key={paymentType.value} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.paymentTypes?.includes(paymentType.value) || false}
                    onChange={() => handlePaymentTypeToggle(paymentType.value)}
                  />
                  <span>{paymentType.display}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.saveButton}>
              {editingSale ? 'Save Changes' : 'Create Garage Sale'}
            </button>
            <button type="button" className={styles.cancelButton} onClick={handleCancelEdit}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className={`${styles.salesGrid} ${filteredSales.length === 1 ? styles.singleCard : ''}`}>
        {filteredSales && filteredSales.length > 0 ? (
          filteredSales.map(sale => (
            <div key={sale.id} className={styles.saleCard}>
              <div className={styles.cardHeader}>
                <label className={styles.checkboxContainer}>
                  <input
                    type="checkbox"
                    checked={adminSelectedSales.has(sale.id)}
                    onChange={() => handleAdminCheckboxChange(sale.id)}
                  />
                  <span className={styles.checkmark}></span>
                </label>
              </div>
              <h3>{sale.address}</h3>
              <p>{sale.description}</p>
              {sale.featuredItems?.length > 0 && (
                <div className={styles.featuredItemsContainer}>
                  <div className={styles.featuredItemsLabel}>Featured Items:</div>
                  <div className={styles.featuredItemsList}>
                    {sale.featuredItems.map((item, index) => (
                      <span key={index} className={styles.featuredItem}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {sale.paymentTypes?.length > 0 && (
                <div className={styles.featuredItemsContainer}>
                  <div className={styles.featuredItemsLabel}>Payment Types:</div>
                  <div className={styles.featuredItemsList}>
                    {sale.paymentTypes.map((type, index) => (
                      <span key={index} className={styles.featuredItem}>
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className={styles.saleActions}>
                {/* <button
                  className={styles.viewMapButton}
                  onClick={() => handleViewOnMap(sale)}
                >
                  View on Map
                </button> */}
                <button
                  className={styles.editButton}
                  onClick={() => handleEdit(sale)}
                >
                  Edit
                </button>
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDelete(sale.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.noResults}>No garage sales found</div>
        )}
      </div>
      
      <div className={styles.totalCount}>
        Showing {filteredSales.length} of {garageSales.length} garage sales
        {adminSelectedSales.size > 0 && ` (${adminSelectedSales.size} selected)`}
      </div>
    </div>
  );
};

export default GarageSalesAdmin;

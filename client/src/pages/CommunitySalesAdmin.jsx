import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Stack,
  Paper,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField as MuiTextField
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import QrCodeIcon from '@mui/icons-material/QrCode';
import MapIcon from '@mui/icons-material/Map';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useAuth } from '../context/AuthContext';
import { useCommunitySales } from '../context/CommunitySalesContext';
import api from '../utils/api';
import './CommunitySalesAdmin.css';
import { logger } from '../utils/logger';

const CommunitySalesAdmin = () => {
  const navigate = useNavigate();
  const { userInfo, userEmail, sessionId } = useAuth(); // Get user info from auth context
  const { setCommunityName, setCommunityId } = useCommunitySales(); // Get community sales context
  const [communitySales, setCommunitySales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Fetch community sales data when component mounts
  useEffect(() => {
    const fetchCommunitySales = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get the correct userId - similar to what we did in handleSubmit
        if (!userInfo) {
          throw new Error('User information is missing. Please log in again.');
        }
        
        const userId = userInfo.userId || userInfo.id;
        
        if (!userId) {
          throw new Error('User ID is missing. Please log in again.');
        }
        
        logger.log('[CommunitySalesAdmin] Fetching community sales for userId:', userId);
        
        // Use the environment variable for the API URL with the correct userId
        const apiUrl = `${import.meta.env.VITE_MAPS_API_URL}/v1/communitySales/byUser/${userId}`;
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'app-name': 'web-service',
            'app-key': import.meta.env.VITE_APP_SESSION_KEY,
            'sessionId': sessionId || ''
          }
        });

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        
        // Transform API data to match component's expected format
        // Check if data is an array before mapping
        const formattedData = Array.isArray(data) 
          ? data.map(sale => ({
              id: sale.id,
              name: sale.name,
              description: sale.description,
              startDate: sale.startDate ? new Date(sale.startDate).toISOString().split('T')[0] : '',
              endDate: sale.endDate ? new Date(sale.endDate).toISOString().split('T')[0] : '',
              location: sale.location,
              fb: sale.socialAndWeb?.fb || '',
              instagram: sale.socialAndWeb?.instagram || '',
              website: sale.socialAndWeb?.website || ''
            }))
          : [];
        
        setCommunitySales(formattedData);
      } catch (err) {
        logger.error('[CommunitySalesAdmin] Error fetching community sales:', err);
        setError('Failed to load community sales. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    // Check if we have a valid userInfo with userId
    if (userInfo && (userInfo.userId || userInfo.id)) {
      logger.log('[CommunitySalesAdmin] User is logged in, fetching community sales...');
      fetchCommunitySales();
    } else {
      logger.log('[CommunitySalesAdmin] User not logged in or missing userId, skipping fetch');
      setLoading(false);
    }
  }, [userInfo, sessionId]);

  const [selectedSales, setSelectedSales] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedSaleId, setCopiedSaleId] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    fb: '',
    instagram: '',
    website: ''
  });

  // Handle search input changes
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle adding a new community sale
  const handleAddNew = () => {
    setEditingSale(null);
    setFormData({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      location: '',
      fb: '',
      instagram: '',
      website: ''
    });
    setIsAddingNew(true);
  };

  // Handle editing a community sale
  const handleEdit = (sale) => {
    setIsAddingNew(false);
    setEditingSale(sale);
    setFormData({
      name: sale.name,
      description: sale.description,
      startDate: sale.startDate || '',
      endDate: sale.endDate || '',
      location: sale.location || '',
      fb: sale.fb || sale.socialAndWeb?.fb || '',
      instagram: sale.instagram || sale.socialAndWeb?.instagram || '',
      website: sale.website || sale.socialAndWeb?.website || ''
    });
    window.scrollTo(0, 0);
  };

  // Handle canceling edit/add
  const handleCancelEdit = () => {
    setEditingSale(null);
    setIsAddingNew(false);
    setFormData({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      location: '',
      fb: '',
      instagram: '',
      website: ''
    });
    setSubmitError(null);
  };

  // Generate QR code for a specific community sale
  const generateQRCode = (sale) => {
    // Create a URL that points to the map with the community ID
    let baseUrl = import.meta.env.VITE_COMMUNITYMAP_API_URL || window.location.origin;
    if (baseUrl.includes('://') && !baseUrl.includes('://www.')) {
      baseUrl = baseUrl.replace('://', '://www.');
    } else if (!baseUrl.includes('://')) {
      baseUrl = `https://www.${baseUrl}`;
    }
    const mapUrl = `${baseUrl}/?communityId=${sale.id}`;
    
    // Generate QR code URL using a free QR code service
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(mapUrl)}`;
    
    // Create a custom HTML page with the QR code
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${sale.name || 'Community Garage Sale'} QR Code</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f5f5f5;
          }
          .qr-container {
            text-align: center;
            padding: 20px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 {
            margin-top: 0;
            color: #333;
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
        <div class="qr-container">
          <h1>${sale.name || 'Community Garage Sale'}</h1>
          <img src="${qrCodeUrl}" alt="QR Code for ${sale.name || 'Community Garage Sale'}" />
          <p>Scan this QR code to access the ${sale.name || 'Community Garage Sale'} map on your mobile device.</p>
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
        URL.revokeObjectURL(blobUrl);
      };
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Format dates for API submission
  const formatDateForApi = (dateString, isStartDate, submissionData) => {
    if (!dateString) return '';
    // Add default time if not provided
    const defaultStartTime = 'T09:00:00';
    const defaultEndTime = 'T18:00:00';
    return dateString + (isStartDate ? defaultStartTime : defaultEndTime);
  };

  // Format a "YYYY-MM-DD" date string for display, parsed as a local date
  // (avoids the UTC-midnight rollback that new Date("YYYY-MM-DD") causes)
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const datePart = String(dateString).split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) return '';
    return new Date(year, month - 1, day).toLocaleDateString();
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setSubmitError(null);
      
      // Create a copy of form data with default end date if not provided
      const submissionData = {
        ...formData,
        endDate: formData.endDate || formData.startDate
      };
      
      // Update the form state to reflect the default end date
      setFormData(submissionData);
      
      if (editingSale) {
        // Check if we have valid user information
        if (!userInfo) {
          throw new Error('User information is missing. Please log in again.');
        }
        
        // Get the correct userId
        const userId = userInfo.userId || userInfo.id;
        
        if (!userId) {
          throw new Error('User ID is missing. Please log in again.');
        }
        
        // Prepare data for API
        const apiData = {
          userId: userId,
          name: submissionData.name,
          description: submissionData.description,
          startDate: formatDateForApi(submissionData.startDate, true, submissionData),
          endDate: formatDateForApi(submissionData.endDate, false, submissionData),
          location: submissionData.location,
          socialAndWeb: {
            fb: submissionData.fb || null,
            instagram: submissionData.instagram || null,
            website: submissionData.website || null,
          }
        };

        logger.log('[CommunitySalesAdmin] API Update Data:', apiData);
        logger.log('[CommunitySalesAdmin] Updating community sale with ID:', editingSale.id);
        
        // Make API call to update community sale using PATCH method
        const apiUrl = `${import.meta.env.VITE_MAPS_API_URL}/v1/communitySales/update/${editingSale.id}`;
        
        // Prepare headers according to the API requirements
        const headers = {
          'app-name': 'web-service',
          'app-key': import.meta.env.VITE_APP_SESSION_KEY,
          'sessionId': sessionId || '',
          'Content-Type': 'application/json'
        };
        
        logger.log('[CommunitySalesAdmin] Making PATCH request to update community sale with ID:', editingSale.id);
        logger.log('[CommunitySalesAdmin] Request headers:', headers);
        logger.log('[CommunitySalesAdmin] Request payload:', apiData);
        
        const response = await fetch(apiUrl, {
          method: 'PATCH',
          headers: headers,
          body: JSON.stringify(apiData)
        });
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        const result = await response.json();
        
        setCommunitySales(prev => 
          prev.map(sale => 
            sale.id === editingSale.id 
              ? {
                  id: result.data?.id || editingSale.id,
                  name: result.data?.name || formData.name,
                  description: result.data?.description || formData.description,
                  startDate: result.data?.startDate ? new Date(result.data.startDate).toISOString().split('T')[0] : formData.startDate,
                  endDate: result.data?.endDate ? new Date(result.data.endDate).toISOString().split('T')[0] : formData.endDate,
                  location: result.data?.location || formData.location,
                  userId: result.data?.userId || userId,
                  fb: submissionData.fb || '',
                  instagram: submissionData.instagram || '',
                  website: submissionData.website || '',
                  socialAndWeb: {
                    fb: submissionData.fb || null,
                    instagram: submissionData.instagram || null,
                    website: submissionData.website || null,
                  }
                }
              : sale
          )
        );
        
        // Show success message
        alert('Community sale updated successfully!');
      } else {
        // Check if we have valid user information
        if (!userInfo) {
          throw new Error('User information is missing. Please log in again.');
        }
        
        // Get the correct userId - from the console log we can see it's in userInfo.userId or userInfo.id
        const userId = userInfo.userId || userInfo.id;
        
        if (!userId) {
          throw new Error('User ID is missing. Please log in again.');
        }
        
        // Prepare data for API
        const apiData = {
          userId: userId,
          name: submissionData.name,
          description: submissionData.description,
          startDate: formatDateForApi(submissionData.startDate, true, submissionData),
          endDate: formatDateForApi(submissionData.endDate, false, submissionData),
          location: submissionData.location,
          socialAndWeb: {
            fb: submissionData.fb || null,
            instagram: submissionData.instagram || null,
            website: submissionData.website || null,
          }
        };

        logger.log('[CommunitySalesAdmin] API Request Data:', apiData);
        logger.log('[CommunitySalesAdmin] UserInfo:', userInfo);
        logger.log('[CommunitySalesAdmin] Using sessionId:', sessionId);
        logger.log('[CommunitySalesAdmin] App Key:', import.meta.env.VITE_APP_SESSION_KEY);
        
        // Make API call to create community sale
        const apiUrl = `${import.meta.env.VITE_MAPS_API_URL}/v1/communitySales/create`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'app-name': 'web-service',
            'app-key': import.meta.env.VITE_APP_SESSION_KEY,
            'sessionId': sessionId || '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(apiData)
        });
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        const result = await response.json();
        
        const newSale = {
          id: result.data.id,
          name: result.data.name,
          description: result.data.description,
          startDate: result.data.startDate ? new Date(result.data.startDate).toISOString().split('T')[0] : '',
          endDate: result.data.endDate ? new Date(result.data.endDate).toISOString().split('T')[0] : '',
          location: result.data.location,
          userId: result.data.userId,
          fb: result.data.socialAndWeb?.fb || '',
          instagram: result.data.socialAndWeb?.instagram || '',
          website: result.data.socialAndWeb?.website || '',
          socialAndWeb: result.data.socialAndWeb || {}
        };
        
        setCommunitySales(prev => [...prev, newSale]);
        
        // Show success message
        alert('Community sale created successfully!');
      }
      
      setIsAddingNew(false);
      setEditingSale(null);
      setFormData({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        location: '',
        fb: '',
        instagram: '',
        website: ''
      });
    } catch (err) {
      logger.error('[CommunitySalesAdmin] Error creating/updating community sale:', err);
      setSubmitError('Failed to save community sale. Please try again.');
      alert(`Error: ${err.message || 'Failed to save community sale. Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle deleting a community sale
  const handleDelete = async (saleId) => {
    if (window.confirm('Are you sure you want to delete this community sale?')) {
      try {
        // Call the API to delete the community sale
        const result = await api.deleteCommunitySale(saleId);
        
        // If the result is true, the deletion was successful
        if (result === true) {
          // Update local state after successful API call
          setCommunitySales(prev => prev.filter(sale => sale.id !== saleId));
          
          // Also remove from selected if it was selected
          if (selectedSales.has(saleId)) {
            setSelectedSales(prev => {
              const newSelected = new Set(prev);
              newSelected.delete(saleId);
              return newSelected;
            });
          }
        } else {
          // Handle unexpected response
          logger.warn('[CommunitySalesAdmin] Unexpected response from delete API:', result);
          alert('Unexpected response when deleting community sale. Please try again.');
        }
      } catch (error) {
        logger.error('[CommunitySalesAdmin] Error deleting community sale:', error);
        alert(`Failed to delete community sale: ${error.message || 'Unknown error'}`);
      }
    }
  };

  // Handle checkbox selection
  const handleCheckboxChange = (saleId) => {
    setSelectedSales(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(saleId)) {
        newSelected.delete(saleId);
      } else {
        newSelected.add(saleId);
      }
      return newSelected;
    });
  };

  // Handle deselecting all
  const handleDeselectAll = () => {
    setSelectedSales(new Set());
  };

  // Handle deleting selected community sales
  const handleDeleteSelected = () => {
    const selectedIds = Array.from(selectedSales);
    
    if (selectedIds.length === 0) {
      alert('Please select community sales to delete');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected community sales?`)) {
      setCommunitySales(prev => 
        prev.filter(sale => !selectedIds.includes(sale.id))
      );
      
      setSelectedSales(new Set());
    }
  };

  // Handle navigating to manage a specific community sale
  const handleManageSale = (sale) => {
    // Store the community sale name and ID in the context
    setCommunityName(sale.name);
    setCommunityId(sale.id);
    
    // Navigate to the garage sales admin page with the specific community sale ID
    navigate(`/admin/sales?communityId=${sale.id}`);
  };

  // Export garage sale addresses for a specific community sale to CSV
  const handleExportCSV = async (sale) => {
    try {
      const response = await api.getAddressesByCommunity(sale.id);
      const garageSales = response?.data || [];

      if (!garageSales.length) {
        alert('No garage sales found for this community event.');
        return;
      }

      const formatAddress = (addr) => {
        if (!addr) return '';
        const parts = [
          addr.streetNum,
          addr.street,
          addr.city,
          addr.provState,
          addr.postalZipCode
        ].filter(Boolean);
        return parts.join(' ');
      };

      const headers = ['Address', 'Description', 'Featured Items', 'Payment Types'];
      const rows = garageSales.map(gs => [
        `"${(formatAddress(gs.address) || '').replace(/"/g, '""')}"`,
        `"${(gs.description || '').replace(/"/g, '""')}"`,
        `"${(gs.highlightedItems || []).join(', ').replace(/"/g, '""')}"`,
        `"${(gs.paymentTypes || []).join(', ').replace(/"/g, '""')}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const defaultName = `${sale.name || 'garage-sales'}-addresses.csv`;

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
          throw pickerErr;
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
    } catch (err) {
      logger.error('[CommunitySalesAdmin] Error exporting CSV:', err);
      alert('Failed to export garage sales. Please try again.');
    }
  };

  // Copy homeowner registration link for this event to clipboard
  const handleCopyRegistrationLink = (sale) => {
    const url = window.location.origin + '/register-garage-sale/' + sale.id;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedSaleId(sale.id);
      setTimeout(() => setCopiedSaleId(null), 2000);
    }).catch(() => {
      window.prompt('Copy this registration link:', url);
    });
  };

  // Handle viewing a community sale on the map
  const handleViewOnMap = (sale) => {
    // Store the community sale name and ID in the context
    setCommunityName(sale.name);
    setCommunityId(sale.id);
    
    // Navigate to the map with the specific community sale ID
    navigate(`/?communityId=${sale.id}`);
  };

  // Filter community sales based on search term
  const filteredSales = communitySales.filter(sale => 
    (sale.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sale.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sale.location || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Debug logging
  logger.log('[CommunitySalesAdmin] Debug state:', {
    loading,
    error,
    searchTerm,
    communitySalesCount: communitySales.length,
    filteredSalesCount: filteredSales.length,
    communitySalesSample: communitySales.slice(0, 2), // Show first 2 items to avoid console spam
    filteredSalesSample: filteredSales.slice(0, 2)    // Show first 2 items to avoid console spam
  });

  return (
    <Box className="sales-admin" sx={{ maxWidth: 1100, mx: 'auto' }}>
      <Typography variant="h2" gutterBottom sx={{ textAlign: 'center' }}>
        Community Sales Events Administration
      </Typography>
      
      <div className="user-info">
        <div className="user-name">{userInfo?.fName || ''} {userInfo?.lName || ''}</div>
        <div className="user-email">{userEmail}</div>
      </div>

      <Divider sx={{ my: 2 }} />
      
      <div className="admin-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search by name, description, or location..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>
      </div>
      
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center" className="admin-button-row">
        <Button
          variant="contained"
          color="primary"
          className="create-community-sales-button"
          onClick={handleAddNew}
          disabled={isAddingNew}
        >
          Create a New Community Sales Event
        </Button>
        
        {selectedSales.size > 0 && (
          <>
            <Chip size="small" color="primary" variant="outlined" label={`${selectedSales.size} selected`} />
            <Button
              variant="outlined"
              color="inherit"
              className="select-all-button"
              onClick={handleDeselectAll}
            >
              Deselect All
            </Button>
            <Button
              variant="contained"
              color="error"
              className="delete-selected-button"
              onClick={handleDeleteSelected}
            >
              Delete Selected ({selectedSales.size})
            </Button>
          </>
        )}
      </Stack>
      
      {(isAddingNew || editingSale) && (
        <form onSubmit={handleSubmit} className="sale-form">
          <div className="form-group">
            <label>Name:</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter community sale name..."
              required
            />
          </div>
          
          <div className="form-group">
            <label>Description:</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter description..."
              rows={4}
            />
          </div>
          
          <div className="form-group">
            <label>Start Date:</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              placeholder="Select start date..."
            />
          </div>
          
          <div className="form-group">
            <label>End Date:</label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleInputChange}
              placeholder="Select end date..."
            />
          </div>
          
          <div className="form-group">
            <label>Location:</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="Enter location..."
            />
          </div>

          <div className="form-group">
            <label>Facebook Page URL:</label>
            <input
              type="url"
              name="fb"
              value={formData.fb}
              onChange={handleInputChange}
              placeholder="https://www.facebook.com/..."
            />
          </div>

          <div className="form-group">
            <label>Instagram URL:</label>
            <input
              type="url"
              name="instagram"
              value={formData.instagram}
              onChange={handleInputChange}
              placeholder="https://www.instagram.com/..."
            />
          </div>

          <div className="form-group">
            <label>Website URL:</label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleInputChange}
              placeholder="https://..."
            />
          </div>
          
          <div className="form-actions">
            <Button type="submit" variant="contained" color="primary" className="save-button" disabled={submitting}>
              {submitting ? 'Saving...' : (editingSale ? 'Save Changes' : 'Create Community Sale')}
            </Button>
            <Button type="button" variant="outlined" color="inherit" className="cancel-button" onClick={handleCancelEdit} disabled={submitting}>
              Cancel
            </Button>
          </div>
          
          {submitError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {submitError}
            </Alert>
          )}
        </form>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ my: 2 }}>
          <Typography variant="h4" component="div" gutterBottom>
            Error
          </Typography>
          <Typography>{error}</Typography>
        </Alert>
      ) : filteredSales.length === 0 ? (
        <Paper variant="outlined" className="empty-state">
          <Typography variant="h4" gutterBottom>
            No Community Sales Found
          </Typography>
        </Paper>
      ) : (
        <div className="sales-grid">
          {filteredSales.map(sale => (
            <Card key={sale.id} className="sale-card" variant="outlined">
              <CardContent sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column', '&:last-child': { pb: 0 } }}>
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={selectedSales.has(sale.id)}
                    onChange={() => handleCheckboxChange(sale.id)}
                  />
                  <span className="checkmark"></span>
                </label>
                <div className="card-header">
                  <Typography variant="h4" component="h3" className="card-title" gutterBottom>
                    {sale.name}
                  </Typography>
                </div>
                {(sale.startDate || sale.endDate) && (
                  <div className="card-date">
                    {sale.startDate && `Starts: ${formatDateForDisplay(sale.startDate)}`}
                    {sale.startDate && sale.endDate && <br />}
                    {sale.endDate && `Ends: ${formatDateForDisplay(sale.endDate)}`}
                  </div>
                )}
                {sale.location && (
                  <div className="card-location">
                    Location: {sale.location}
                  </div>
                )}
                {sale.description && (
                  <div className="card-description">{sale.description}</div>
                )}
                <div className="card-actions">
                  <div className="left-buttons">
                    <Button
                      variant="outlined"
                      color="secondary"
                      size="small"
                      className="qr-button"
                      startIcon={<QrCodeIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        generateQRCode(sale);
                      }}
                      title="Generate QR Code"
                    >
                      QR Code
                    </Button>
                    <Button
                      variant="outlined"
                      color="info"
                      size="small"
                      className="copy-reg-link-button"
                      startIcon={<ContentCopyIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyRegistrationLink(sale);
                      }}
                      title="Copy homeowner registration link"
                    >
                      {copiedSaleId === sale.id ? 'Copied!' : 'Copy Reg. Link'}
                    </Button>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      className="edit-button"
                      startIcon={<EditIcon />}
                      onClick={() => handleEdit(sale)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      className="delete-button"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDelete(sale.id)}
                    >
                      Delete
                    </Button>
                  </div>
                  <div className="right-buttons">
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      className="view-on-map-button"
                      startIcon={<MapIcon />}
                      onClick={() => handleViewOnMap(sale)}
                    >
                      View the Map
                    </Button>
                    <Button
                      variant="contained"
                      color="secondary"
                      size="small"
                      className="manage-button"
                      onClick={() => handleManageSale(sale)}
                    >
                      Manage Garage Sales
                    </Button>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      className="export-csv-button"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleExportCSV(sale)}
                    >
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Box>
  );
};

export default CommunitySalesAdmin;

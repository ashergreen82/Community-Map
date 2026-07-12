import React, { useState, useEffect } from 'react';
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
  IconButton,
  TextField as MuiTextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGarageSales } from '../context/GarageSalesContext';
import { useAuth } from '../context/AuthContext';
import { useDisplay } from '../context/DisplayContext';
import { useSearch } from '../context/SearchContext';
import { useCommunitySales } from '../context/CommunitySalesContext';
import { useCommunityName } from '../hooks/useCommunityName';
import AutoResizeTextArea from '../components/AutoResizeTextArea';
import GooglePlacesAutocomplete from 'react-google-places-autocomplete';
import { parseAddressString, parseStreetAddress } from '../utils/addressFormatter';
import { uploadImageToCloudinary } from '../utils/imageUpload';
import api from '../utils/api';
import styles from './GarageSalesAdmin.module.css';
import CommunityQRCode from '../components/CommunityQRCode';
import { logger } from '../utils/logger';

// Full RFC 4180 parser — handles quoted fields with embedded newlines and commas.
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 2;
      } else if (ch === '"') {
        inQuotes = false;
        i++;
      } else {
        field += ch;
        i++;
      }
    } else if (ch === '"') {
      inQuotes = true;
      i++;
    } else if (ch === ',') {
      row.push(field);
      field = '';
      i++;
    } else if (ch === '\r' && text[i + 1] === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 2;
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
    } else {
      field += ch;
      i++;
    }
  }
  row.push(field);
  if (row.some(f => f.trim())) rows.push(row);
  return rows;
}

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
    street: '',
    unit: '',
    city: '',
    provState: '',
    postalZipCode: '',
    description: '',
    featuredItems: [],
    paymentTypes: [],
    fb: '',
    instagram: '',
    website: '',
    images: []
  });
  const [imageUploading, setImageUploading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [useManualAddress, setUseManualAddress] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [importDefaultCity, setImportDefaultCity] = useState('');
  const [importDefaultProvince, setImportDefaultProvince] = useState('');
  
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
    setSelectedPlace(null);
    setUseManualAddress(false);
    setFormData({
      street: '',
      unit: '',
      city: '',
      provState: '',
      postalZipCode: '',
      description: '',
      featuredItems: [],
      paymentTypes: [],
      fb: '',
      instagram: '',
      website: '',
      images: []
    });
    setIsAddingNew(true);
    setSubmitError('');
  };

  const handleEdit = (sale) => {
    setIsAddingNew(false);
    setEditingSale(sale);
    // Manual mode so the existing address is visible/editable in the text fields
    setUseManualAddress(true);
    setSelectedPlace(null);
    setFormData({
      street: sale.rawAddress?.streetNum && sale.rawAddress?.street
        ? `${sale.rawAddress.streetNum} ${sale.rawAddress.street}`
        : sale.rawAddress?.street || sale.address || '',
      unit: sale.rawAddress?.unit || '',
      city: sale.rawAddress?.city || '',
      provState: sale.rawAddress?.provState || '',
      postalZipCode: sale.rawAddress?.postalZipCode || '',
      description: sale.description,
      featuredItems: sale.featuredItems || [],
      paymentTypes: sale.paymentTypes || [],
      fb: sale.socialAndWeb?.fb || '',
      instagram: sale.socialAndWeb?.instagram || '',
      website: sale.socialAndWeb?.website || '',
      images: sale.images || []
    });
    window.scrollTo(0, 0);
  };

  const handleCancelEdit = () => {
    setEditingSale(null);
    setFormData({
      street: '',
      unit: '',
      city: '',
      provState: '',
      postalZipCode: '',
      description: '',
      featuredItems: [],
      paymentTypes: [],
      fb: '',
      instagram: '',
      website: '',
      images: []
    });
    setIsAddingNew(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // If manually entering address, clear the selected place
    if (name === 'street' && selectedPlace) {
      setSelectedPlace(null);
    }
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
    { display: 'Cash', value: 'Cash' },
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

  const handleImageAdd = async (file) => {
    setImageUploading(true);
    try {
      const { url, publicId } = await uploadImageToCloudinary(file);
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), { description: '', url, publicId }]
      }));
    } catch (err) {
      logger.error('[GarageSalesAdmin] Image upload failed:', err);
      setSubmitError('Image upload failed. Please try again.');
    } finally {
      setImageUploading(false);
    }
  };

  const handleImageRemove = (index) => {
    setFormData(prev => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index)
    }));
  };

  const handleImageDescriptionChange = (index, value) => {
    setFormData(prev => {
      const updated = [...(prev.images || [])];
      updated[index] = { ...updated[index], description: value };
      return { ...prev, images: updated };
    });
  };

  // Handle address selection from Google Places Autocomplete — fills all address fields
  const handleAddressSelect = (place) => {
    if (!place) {
      // Handle clearing the selection (when X is clicked)
      setSelectedPlace(null);
      setFormData(prev => ({
        ...prev,
        street: '',
        unit: '',
        city: '',
        provState: '',
        postalZipCode: ''
      }));
      return;
    }

    setSelectedPlace(place);

    const placeId = place.value.place_id;

    // Use Google Places service to get detailed address components
    if (window.google && window.google.maps && window.google.maps.places) {
      const service = new window.google.maps.places.PlacesService(document.createElement('div'));

      service.getDetails({
        placeId: placeId,
        fields: ['address_components', 'formatted_address']
      }, (result, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && result) {
          const addressComponents = result.address_components;

          let streetNum = '';
          let streetName = '';
          let city = '';
          let state = '';
          let postalCode = '';
          let unit = '';

          addressComponents.forEach(component => {
            const types = component.types;

            if (types.includes('street_number')) {
              streetNum = component.long_name;
            } else if (types.includes('route')) {
              streetName = component.long_name;
            } else if (types.includes('locality')) {
              city = component.long_name;
            } else if (types.includes('administrative_area_level_1')) {
              state = component.short_name;
            } else if (types.includes('postal_code')) {
              postalCode = component.long_name;
            } else if (types.includes('subpremise')) {
              unit = component.long_name;
            }
          });

          const fullStreet = streetNum ? `${streetNum} ${streetName}`.trim() : streetName;

          setFormData(prev => ({
            ...prev,
            street: fullStreet,
            unit: unit || '',
            city: city || '',
            provState: state || '',
            postalZipCode: postalCode || ''
          }));

          // Custom display value so the selected place shows the full street address
          setSelectedPlace({
            label: fullStreet,
            value: {
              place_id: placeId,
              description: fullStreet
            }
          });
        } else {
          logger.error('[GarageSalesAdmin] Error getting place details:', status);
          setSubmitError('Failed to get address details. Please try entering manually.');
          setUseManualAddress(true);
        }
      });
    } else {
      logger.error('[GarageSalesAdmin] Google Maps Places API not loaded');
      setSubmitError('Address search is not available. Please enter the address manually.');
      setUseManualAddress(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    try {
      if (editingSale) {
        // Only send fields the user has actually changed — keeps PATCH
        // payloads small and skips the API call entirely on a no-op save.
        const updateData = { community: communityId };

        const { streetNum, street } = parseStreetAddress(formData.street);
        const newAddress = {
          street: street || '',
          streetNum: streetNum || '',
          unit: formData.unit || '',
          city: formData.city || '',
          provState: formData.provState || '',
          postalZipCode: formData.postalZipCode || ''
        };
        const existingAddress = editingSale.rawAddress || {};
        const addressChanged = Object.keys(newAddress).some(
          key => String(newAddress[key] ?? '') !== String(existingAddress[key] ?? '')
        );
        if (addressChanged) {
          updateData.address = newAddress;
        }

        if (formData.description !== editingSale.description) {
          updateData.description = formData.description;
        }

        const currentFeaturedItems = formData.featuredItems?.filter(item => item.trim() !== '') || [];
        const existingFeaturedItems = editingSale.featuredItems || [];
        const featuredItemsChanged =
          currentFeaturedItems.length !== existingFeaturedItems.length ||
          !currentFeaturedItems.every(item => existingFeaturedItems.includes(item));
        if (featuredItemsChanged) {
          updateData.highlightedItems = currentFeaturedItems;
        }

        const currentPaymentTypes = formData.paymentTypes?.filter(type => type.trim() !== '') || [];
        const existingPaymentTypes = editingSale.paymentTypes || [];
        const paymentTypesChanged =
          currentPaymentTypes.length !== existingPaymentTypes.length ||
          !currentPaymentTypes.every(type => existingPaymentTypes.includes(type));
        if (paymentTypesChanged) {
          updateData.paymentTypes = currentPaymentTypes;
        }

        const existingSocial = editingSale.socialAndWeb || {};
        const currentSocial = {
          ...(formData.fb ? { fb: formData.fb } : {}),
          ...(formData.instagram ? { instagram: formData.instagram } : {}),
          ...(formData.website ? { website: formData.website } : {}),
        };
        const socialChanged =
          (existingSocial.fb || '') !== (currentSocial.fb || '') ||
          (existingSocial.instagram || '') !== (currentSocial.instagram || '') ||
          (existingSocial.website || '') !== (currentSocial.website || '');
        if (socialChanged) {
          updateData.socialAndWeb = currentSocial;
        }

        const currentImages = formData.images || [];
        const existingImages = editingSale.images || [];
        const imagesChanged =
          JSON.stringify(currentImages) !== JSON.stringify(existingImages);
        if (imagesChanged) {
          updateData.images = currentImages;
        }

        if (Object.keys(updateData).length > 1) {
          await api.updateGarageSale(editingSale.id, updateData);
        }
      } else {
        // Client-side duplicate check against currently loaded sales
        const normalizedInput = formData.street.trim().toLowerCase().replace(/\s+/g, ' ');
        const isDuplicate = garageSales.some(
          sale => (sale.address || '').trim().toLowerCase().replace(/\s+/g, ' ') === normalizedInput
        );
        if (isDuplicate) {
          setSubmitError('A garage sale already exists at this address');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        // Parse street number and name from the street field
        const { streetNum, street } = parseStreetAddress(formData.street);

        // Create the sale data object with all required fields
        const saleData = {
          address: {
            street: street || '',
            streetNum: streetNum || '',
            city: formData.city || '',
            provState: formData.provState || '',
            postalZipCode: formData.postalZipCode || '',
            unit: formData.unit || '',
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
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          socialAndWeb: {
            ...(formData.fb ? { fb: formData.fb } : {}),
            ...(formData.instagram ? { instagram: formData.instagram } : {}),
            ...(formData.website ? { website: formData.website } : {}),
          },
          images: formData.images || []
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
        paymentTypes: [],
        fb: '',
        instagram: '',
        website: '',
        images: []
      });
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
    const rows = garageSales.map(sale => {
      const r = sale.rawAddress || {};
      const fullAddress = [
        [r.streetNum, r.street].filter(Boolean).join(' '),
        r.city,
        r.provState
      ].filter(Boolean).join(', ') || sale.address || '';
      return [
        `"${fullAddress.replace(/"/g, '""')}"`,
        `"${(sale.description || '').replace(/"/g, '""')}"`,
        `"${(sale.featuredItems || []).join(', ').replace(/"/g, '""')}"`,
        `"${(sale.paymentTypes || []).join(', ').replace(/"/g, '""')}"`
      ];
    });

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

  const handleImportCSV = async () => {
    if (!importFile) return;
    setImportLoading(true);

    let text;
    try {
      text = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(importFile);
      });
    } catch (err) {
      setImportResults({ success: [], failed: [{ row: '-', address: '-', error: err.message }] });
      setImportLoading(false);
      return;
    }

    const rows = parseCSV(text);
    if (rows.length < 2) {
      setImportResults({ success: [], failed: [{ row: '-', address: '-', error: 'CSV file is empty or has no data rows' }] });
      setImportLoading(false);
      return;
    }

    const headers = rows[0].map(h => h.trim());
    const addressIdx = headers.findIndex(h => h.toLowerCase() === 'address');
    if (addressIdx === -1) {
      setImportResults({ success: [], failed: [{ row: '-', address: '-', error: 'CSV must have an "Address" column' }] });
      setImportLoading(false);
      return;
    }

    const descIdx = headers.findIndex(h => h.toLowerCase() === 'description');
    const featuredIdx = headers.findIndex(h => h.toLowerCase() === 'featured items');
    const paymentIdx = headers.findIndex(h => h.toLowerCase() === 'payment types');

    const successList = [];
    const failedList = [];

    // Pre-process: merge within-CSV duplicate addresses.
    // Same description → silently skip second. Different description → combine into one entry.
    const addressMap = new Map(); // normalizedAddress → index in dedupedEntries
    const dedupedEntries = [];

    for (let i = 1; i < rows.length; i++) {
      const fields = rows[i];
      const addressStr = (fields[addressIdx] || '').replace(/^=/, '').trim();

      if (!addressStr) {
        failedList.push({ row: i + 1, address: '(empty)', error: 'Address is required' });
        continue;
      }

      const desc = descIdx !== -1 ? (fields[descIdx] || '').replace(/^=/, '').trim() : '';
      const normKey = addressStr.toLowerCase().replace(/\s+/g, ' ');

      if (addressMap.has(normKey)) {
        const prevIdx = addressMap.get(normKey);
        const prevDesc = dedupedEntries[prevIdx].description;
        const thisDesc = desc || 'GARAGE SALE';
        if (prevDesc.toLowerCase() !== thisDesc.toLowerCase()) {
          dedupedEntries[prevIdx].description = prevDesc + ' / ' + thisDesc;
        }
        continue;
      }

      addressMap.set(normKey, dedupedEntries.length);
      dedupedEntries.push({ rowNum: i + 1, fields, description: desc });
    }

    for (const { rowNum, fields, description } of dedupedEntries) {
      const addressStr = (fields[addressIdx] || '').replace(/^=/, '').trim();

      const parsed = parseAddressString(addressStr);
      if (!parsed || !parsed.street) {
        failedList.push({ row: rowNum, address: addressStr, error: 'Could not parse address' });
        continue;
      }

      const streetNumInt = parseInt(parsed.streetNumber, 10);
      if (isNaN(streetNumInt) || streetNumInt <= 0) {
        failedList.push({ row: rowNum, address: addressStr, error: 'Invalid address: no street number' });
        continue;
      }

      const featuredItems = featuredIdx !== -1
        ? (fields[featuredIdx] || '').split(', ').filter(Boolean)
        : [];
      const paymentTypes = paymentIdx !== -1
        ? (fields[paymentIdx] || '').split(', ').filter(Boolean)
        : [];

      const saleData = {
        address: {
          street: parsed.street || '',
          streetNum: parsed.streetNumber || '',
          city: parsed.city || importDefaultCity.trim() || '',
          provState: parsed.state || importDefaultProvince.trim() || '',
          postalZipCode: parsed.postalCode || '',
          unit: parsed.unit || '',
          country: 'Canada',
        },
        description: description || 'GARAGE SALE',
        highlightedItems: featuredItems,
        paymentTypes,
        name: 'Garage Sale',
        community: communityId || 'GENPUB',
        userId: userInfo?.id || userInfo?.userId || 'anonymous',
        dateTime: {
          start: new Date().toISOString().replace(/\.\d+Z$/, '').replace('Z', ''),
          end: new Date(Date.now() + 86400000).toISOString().replace(/\.\d+Z$/, '').replace('Z', ''),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto',
        },
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        socialAndWeb: {},
        images: [],
      };

      try {
        await api.createGarageSale(saleData);
        successList.push(addressStr);
      } catch (err) {
        const msg = err.response?.data?.message || err.response?.data || err.message || 'Unknown error';
        failedList.push({ row: rowNum, address: addressStr, error: typeof msg === 'string' ? msg : JSON.stringify(msg) });
      }
    }

    setImportResults({ success: successList, failed: failedList });
    setImportLoading(false);
  };

  // Return to the community sales admin page
  const handleBackToCommunitySales = () => {
    navigate('/admin/community-sales');
  };

  if (loading) {
    return (
      <div className="garage-sales-admin">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </div>
    );
  }

  if (error) {
    return (
      <div className="garage-sales-admin">
        <Stack spacing={2} sx={{ p: 2 }}>
          <Alert severity="error">{error}</Alert>
          <Button variant="contained" color="primary" className="retry-button" onClick={fetchGarageSales}>
            Retry
          </Button>
        </Stack>
      </div>
    );
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }} className={styles.garageSalesAdmin}>
      <Typography variant="h2" gutterBottom className={styles.title}>
        {communityName ? `${communityName}` : 'Garage Sales Administration'}
      </Typography>
      <Paper elevation={0} className={styles.userInfo}>
        <div className={styles.userName}>{userInfo?.fName} {userInfo?.lName}</div>
        <div className={styles.userEmail}>{userEmail}</div>
      </Paper>
      
      {submitError && (
        <Alert
          severity="error"
          onClose={() => setSubmitError(null)}
          sx={{ mx: 2, mb: 2 }}
        >
          {submitError}
        </Alert>
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
        
        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} className={styles.buttonsContainer}>
          <Button
            variant="contained"
            color="primary"
            className={styles.addNewButton}
            onClick={handleAddNew}
            disabled={isAddingNew}
          >
            Add New Garage Sale
          </Button>
          
          {adminSelectedSales.size > 0 && (
            <>
              <Button
                variant="outlined"
                color="primary"
                className={styles.selectAllButton}
                onClick={handleSelectAll}
              >
                Select All
              </Button>
              <Button
                variant="outlined"
                color="primary"
                className={styles.deselectAllButton}
                onClick={handleDeselectAll}
              >
                Deselect All
              </Button>
              <Button
                variant="contained"
                color="error"
                className={styles.deleteSelectedButton}
                onClick={handleDeleteSelected}
              >
                Delete Selected ({adminSelectedSales.size})
              </Button>
            </>
          )}
          
          <Button
            variant="outlined"
            color="primary"
            startIcon={<ArrowBackIcon />}
            className={styles.backToCommunityButton}
            onClick={handleBackToCommunitySales}
          >
            Back to Community Sales
          </Button>
          
          <Button
            variant="outlined"
            color="primary"
            className={styles.exportCsvButton}
            onClick={handleExportCSV}
            disabled={!garageSales || garageSales.length === 0}
          >
            Export CSV
          </Button>

          <Button
            variant="outlined"
            className={styles.importCsvButton}
            onClick={() => setImportModalOpen(true)}
          >
            Import CSV
          </Button>
        </Stack>
      </div>

      {(isAddingNew || editingSale) && (
        <form onSubmit={handleSubmit} className={styles.garageForm}>
          <div className={styles.formGroup}>
            <label>
              Street Address <span style={{ color: 'red' }}>*</span>
            </label>
            {useManualAddress ? (
              <input
                type="text"
                name="street"
                value={formData.street}
                onChange={handleInputChange}
                placeholder="e.g., 123 Main St"
                required
                className={styles.addressInput}
              />
            ) : (
              <GooglePlacesAutocomplete
                apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                autocompletionRequest={{
                  types: ['address'],
                  componentRestrictions: {
                    country: ['us', 'ca']
                  }
                }}
                selectProps={{
                  value: selectedPlace,
                  onChange: handleAddressSelect,
                  placeholder: 'Search for the address...',
                  isClearable: true
                }}
              />
            )}
            {!useManualAddress && (
              <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                Search for the address to auto-fill all fields below
              </small>
            )}
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Unit</label>
              <input
                type="text"
                name="unit"
                value={formData.unit}
                onChange={handleInputChange}
                placeholder="Unit"
                className={styles.addressInput}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>
                City <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="City, village, town, etc"
                required
                className={styles.addressInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label>
                Province/State <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                name="provState"
                value={formData.provState}
                onChange={handleInputChange}
                placeholder="ON"
                required
                className={styles.addressInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label>
                Postal/Zip Code <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                name="postalZipCode"
                value={formData.postalZipCode}
                onChange={handleInputChange}
                placeholder="A1A 1A1"
                required
                className={styles.addressInput}
              />
            </div>
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
            <label>Images</label>
            <div className={styles.imageUploadSection}>
              {(formData.images || []).map((img, index) => (
                <div key={index} className={styles.imagePreviewItem}>
                  <img
                    src={img.url}
                    alt={img.description || `Image ${index + 1}`}
                    className={styles.imagePreview}
                  />
                  <input
                    type="text"
                    value={img.description}
                    onChange={(e) => handleImageDescriptionChange(index, e.target.value)}
                    placeholder="Caption (optional)"
                    className={styles.imageCaptionInput}
                  />
                  <IconButton
                    type="button"
                    size="small"
                    onClick={() => handleImageRemove(index)}
                    className={styles.removeItemButton}
                    aria-label="Remove image"
                  >
                    ×
                  </IconButton>
                </div>
              ))}
              <label className={styles.imageUploadLabel}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={imageUploading}
                  onChange={(e) => {
                    Array.from(e.target.files).forEach(file => handleImageAdd(file));
                    e.target.value = '';
                  }}
                  style={{ display: 'none' }}
                />
                <Button
                  type="button"
                  variant="outlined"
                  size="small"
                  component="span"
                  disabled={imageUploading}
                >
                  {imageUploading ? 'Uploading…' : '+ Add Images'}
                </Button>
              </label>
            </div>
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
                  <IconButton
                    type="button"
                    size="small"
                    onClick={() => handleRemoveFeaturedItem(index)}
                    className={styles.removeItemButton}
                    aria-label="Remove featured item"
                  >
                    ×
                  </IconButton>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outlined"
              size="small"
              onClick={handleAddFeaturedItem}
              className={styles.addItemButton}
            >
              + Add item
            </Button>
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

          <div className={styles.formGroup}>
            <label>Facebook Page URL:</label>
            <input
              type="url"
              name="fb"
              value={formData.fb}
              onChange={handleInputChange}
              placeholder="https://www.facebook.com/..."
            />
          </div>

          <div className={styles.formGroup}>
            <label>Instagram URL:</label>
            <input
              type="url"
              name="instagram"
              value={formData.instagram}
              onChange={handleInputChange}
              placeholder="https://www.instagram.com/..."
            />
          </div>

          <div className={styles.formGroup}>
            <label>Website URL:</label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleInputChange}
              placeholder="https://..."
            />
          </div>

          <Stack direction="row" spacing={2} className={styles.formActions}>
            <Button type="submit" variant="contained" color="primary" className={styles.saveButton}>
              {editingSale ? 'Save Changes' : 'Create Garage Sale'}
            </Button>
            <Button type="button" variant="outlined" color="primary" className={styles.cancelButton} onClick={handleCancelEdit}>
              Cancel
            </Button>
          </Stack>
        </form>
      )}

      <div className={`${styles.salesGrid} ${filteredSales.length === 1 ? styles.singleCard : ''}`}>
        {filteredSales && filteredSales.length > 0 ? (
          filteredSales.map(sale => (
            <Card key={sale.id} variant="outlined" className={styles.saleCard}>
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
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
                <Typography variant="h4" component="h3" gutterBottom>
                  {sale.address}
                </Typography>
                <Typography variant="body1" component="p" sx={{ mb: 1 }}>
                  {sale.description}
                </Typography>
                {sale.featuredItems?.length > 0 && (
                  <div className={styles.featuredItemsContainer}>
                    <div className={styles.featuredItemsLabel}>Featured Items:</div>
                    <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.5} className={styles.featuredItemsList}>
                      {sale.featuredItems.map((item, index) => (
                        <Chip key={index} size="small" label={item} className={styles.featuredItem} />
                      ))}
                    </Stack>
                  </div>
                )}
                {sale.paymentTypes?.length > 0 && (
                  <div className={styles.featuredItemsContainer}>
                    <div className={styles.featuredItemsLabel}>Payment Types:</div>
                    <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.5} className={styles.featuredItemsList}>
                      {sale.paymentTypes.map((type, index) => (
                        <Chip key={index} size="small" label={type} className={styles.featuredItem} />
                      ))}
                    </Stack>
                  </div>
                )}
                {sale.images?.length > 0 && (
                  <div className={styles.featuredItemsContainer}>
                    <div className={styles.featuredItemsLabel}>Images ({sale.images.length}):</div>
                    <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.5} sx={{ mt: 0.5 }}>
                      {sale.images.map((img, i) => (
                        <img
                          key={i}
                          src={img.url}
                          alt={img.description || `Image ${i + 1}`}
                          style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd' }}
                        />
                      ))}
                    </Stack>
                  </div>
                )}
                <Divider sx={{ my: 1.5 }} />
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap className={styles.saleActions}>
                  {/* <Button
                    className={styles.viewMapButton}
                    onClick={() => handleViewOnMap(sale)}
                  >
                    View on Map
                  </Button> */}
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<EditIcon />}
                    className={styles.editButton}
                    onClick={() => handleEdit(sale)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<DeleteIcon />}
                    className={styles.deleteButton}
                    onClick={() => handleDelete(sale.id)}
                  >
                    Delete
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))
        ) : (
          <Alert severity="info" className={styles.noResults}>
            No garage sales found
          </Alert>
        )}
      </div>
      
      <Typography component="div" variant="body2" className={styles.totalCount} sx={{ mt: 2 }}>
        Showing {filteredSales.length} of {garageSales.length} garage sales
        {adminSelectedSales.size > 0 && ` (${adminSelectedSales.size} selected)`}
      </Typography>

      <Dialog
        open={importModalOpen}
        onClose={() => { if (!importLoading) { setImportModalOpen(false); setImportResults(null); setImportFile(null); setImportDefaultCity(''); setImportDefaultProvince(''); } }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Import Garage Sales from CSV</DialogTitle>
        <DialogContent>
          {!importResults ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Upload a CSV file with columns: <strong>Address</strong>, Description, Featured Items, Payment Types
              </Typography>
              <Stack direction="row" spacing={2}>
                <MuiTextField
                  label="Default City"
                  size="small"
                  value={importDefaultCity}
                  onChange={(e) => setImportDefaultCity(e.target.value)}
                  placeholder="e.g. Barrie"
                  disabled={importLoading}
                  helperText="Used when address has no city"
                  sx={{ flex: 1 }}
                />
                <MuiTextField
                  label="Default Province"
                  size="small"
                  value={importDefaultProvince}
                  onChange={(e) => setImportDefaultProvince(e.target.value)}
                  placeholder="e.g. ON"
                  disabled={importLoading}
                  helperText="Used when address has no province"
                  sx={{ flex: 1 }}
                />
              </Stack>
              <Stack direction="row" alignItems="center" spacing={2}>
                <label htmlFor="csv-import-input">
                  <input
                    id="csv-import-input"
                    type="file"
                    accept=".csv,.txt"
                    style={{ display: 'none' }}
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  />
                  <Button variant="outlined" component="span" disabled={importLoading}>
                    Choose File
                  </Button>
                </label>
                {importFile && (
                  <Typography variant="body2">{importFile.name}</Typography>
                )}
              </Stack>
              {importLoading && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CircularProgress size={20} />
                  <Typography variant="body2">Importing...</Typography>
                </Stack>
              )}
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={2}>
                <Chip label={`${importResults.success.length} sales created`} color="success" />
                {importResults.failed.length > 0 && (
                  <Chip label={`${importResults.failed.length} failed`} color="error" />
                )}
              </Stack>
              {importResults.failed.length > 0 && (
                <>
                  <Typography variant="subtitle2">Failed rows:</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Row</strong></TableCell>
                          <TableCell><strong>Address</strong></TableCell>
                          <TableCell><strong>Error</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {importResults.failed.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{item.row}</TableCell>
                            <TableCell>{item.address}</TableCell>
                            <TableCell>
                              <Typography variant="body2" color="error">{item.error}</Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {!importResults ? (
            <>
              <Button
                onClick={() => { setImportModalOpen(false); setImportFile(null); setImportDefaultCity(''); setImportDefaultProvince(''); }}
                disabled={importLoading}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleImportCSV}
                disabled={!importFile || importLoading}
              >
                Import
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              onClick={() => {
                setImportModalOpen(false);
                setImportResults(null);
                setImportFile(null);
                setImportDefaultCity('');
                setImportDefaultProvince('');
                fetchGarageSales(communityId, true);
              }}
            >
              Close
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GarageSalesAdmin;

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import GooglePlacesAutocomplete from 'react-google-places-autocomplete';
import { parseStreetAddress } from '../utils/addressFormatter';
import { uploadImageToCloudinary } from '../utils/imageUpload';
import './RegisterGarageSale.css';
import api from '../utils/api';
import { logger } from '../utils/logger';

const API_URL = import.meta.env.VITE_MAPS_API_URL;
const APP_KEY = import.meta.env.VITE_APP_SESSION_KEY;

function formatDate(dateString) {
  if (!dateString) return '';
  const [datePart] = dateString.split('T');
  const [year, monthIndex, day] = datePart.split('-').map(Number);
  return new Date(year, monthIndex - 1, day).toLocaleDateString('default', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

const RegisterCommunityGarageSale = () => {
  const navigate = useNavigate();
  const { communityId } = useParams();
  const { isAuthenticated, userInfo } = useAuth();
  const { setFromLanding } = useNavigation();

  // Community event info
  const [communityEvent, setCommunityEvent] = useState(null);

  // Form state — same fields as the manager's GarageSalesAdmin form
  const [formData, setFormData] = useState({
    description: '',
    street: '',
    unit: '',
    city: '',
    provState: '',
    postalZipCode: '',
    fb: '',
    instagram: '',
    website: '',
    paymentTypes: [],
    images: []
  });

  // Featured items as separate array
  const [featuredItems, setFeaturedItems] = useState(['']);

  // Additional state
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [existingSale, setExistingSale] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [useManualAddress, setUseManualAddress] = useState(false);

  // Fetch the community event's name and dates for the header
  useEffect(() => {
    if (!communityId) return;

    const fetchCommunityEvent = async () => {
      try {
        const response = await fetch(`${API_URL}/v1/communitySales/all`, {
          method: 'GET',
          headers: {
            'app-name': 'web-service',
            'app-key': APP_KEY
          }
        });
        if (response.ok) {
          const data = await response.json();
          const match = Array.isArray(data) ? data.find(sale => sale.id === communityId) : null;
          setCommunityEvent(match || null);
        }
      } catch (err) {
        logger.error('[RegisterCommunityGarageSale] Error fetching community event:', err);
      }
    };

    fetchCommunityEvent();
  }, [communityId]);

  // Check if user is authenticated and fetch their existing garage sale if any
  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/login?returnTo=/register-garage-sale/${communityId}`);
      return;
    }

    const fetchUserGarageSale = async () => {
      setLoading(true);
      try {
        // Fetch all garage sales from this community
        const response = await api.getAddressesByCommunity(communityId);
        if (response.data && response.data.length > 0) {
          // Extract userId from userInfo with fallback checks
          const userId = userInfo?.id || userInfo?.sub || userInfo?.userId || userInfo?.user_id ||
                        sessionStorage.getItem('userId');

          // Search for user's garage sale by matching userId
          const userSale = response.data.find(sale => sale.userId === userId);

          if (userSale) {
            setExistingSale(userSale);

            setFormData({
              description: userSale.description || '',
              street: userSale.address?.street || '',
              unit: userSale.address?.unit || '',
              city: userSale.address?.city || '',
              provState: userSale.address?.provState || '',
              postalZipCode: userSale.address?.postalZipCode || '',
              fb: userSale.socialAndWeb?.fb || '',
              instagram: userSale.socialAndWeb?.instagram || '',
              website: userSale.socialAndWeb?.website || '',
              paymentTypes: userSale.paymentTypes || [],
              images: userSale.images || []
            });
            setFeaturedItems(userSale.highlightedItems || ['']);
          }
        }
      } catch (err) {
        logger.error('[RegisterCommunityGarageSale] Error fetching community garage sales:', err);
        // No existing sale or error fetching - that's okay, user can create a new one
      } finally {
        setLoading(false);
      }
    };

    fetchUserGarageSale();
  }, [isAuthenticated, navigate, userInfo, communityId]);

  // Handle form input changes
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

  // Available payment types - matching backend format (same list as GarageSalesAdmin)
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
      return {
        ...prev,
        paymentTypes: currentTypes.includes(paymentType)
          ? currentTypes.filter(type => type !== paymentType)
          : [...currentTypes, paymentType]
      };
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
      logger.error('[RegisterCommunityGarageSale] Image upload failed:', err);
      setError('Image upload failed. Please try again.');
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

  // Handle address selection from Google Places Autocomplete
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

    // Get place details to extract address components
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

          // Parse address components
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

          // Combine street number and name for the street field
          const fullStreet = streetNum ? `${streetNum} ${streetName}`.trim() : streetName;

          // Update form data with parsed address
          setFormData(prev => ({
            ...prev,
            street: fullStreet,
            unit: unit || '',
            city: city || '',
            provState: state || '',
            postalZipCode: postalCode || ''
          }));

          // Create a custom display value for the selected place that shows the full street address
          setSelectedPlace({
            label: fullStreet,
            value: {
              place_id: placeId,
              description: fullStreet
            }
          });
        } else {
          logger.error('[RegisterCommunityGarageSale] Error getting place details:', status);
          setError('Failed to get address details. Please try entering manually.');
        }
      });
    } else {
      logger.error('[RegisterCommunityGarageSale] Google Maps Places API not loaded');
      setError('Address search is not available. Please enter your address manually.');
      setUseManualAddress(true);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Sale dates come from the community event, so it must be loaded before submitting
    if (!communityEvent) {
      setError('Community event details are still loading. Please try again in a moment.');
      return;
    }

    setLoading(true);
    setError(null);

    let innerErrorHandled = false;
    try {
      // Format dates for API - convert to ISO datetime format
      const formatDateForAPI = (dateString, isEndDate = false) => {
        if (!dateString) return null;

        // For start date, use 9:00 AM; for end date, use 6:00 PM
        const [datePart] = dateString.split('T');
        const time = isEndDate ? '18:00:00' : '09:00:00';
        return `${datePart}T${time}`;
      };
      // Parse street number and name using utility function
      const { streetNum, street } = parseStreetAddress(formData.street);

      // Get user ID with fallback to session storage if needed
      const userId = userInfo?.id || userInfo?.sub || userInfo?.userId || userInfo?.user_id || JSON.parse(sessionStorage.getItem('userInfo'))?.id;

      if (!userId) {
        logger.error('[RegisterCommunityGarageSale] No user ID found!');
        throw new Error('User authentication error: No user ID available');
      }

      const saleData = {
        // No name field on either registration form; keep any name already on the record
        name: existingSale?.name || "Garage Sale",
        description: formData.description || "",
        address: {
          streetNum: streetNum,
          street: street,
          unit: formData.unit || "",
          city: formData.city || "",
          provState: formData.provState || "",
          postalZipCode: formData.postalZipCode || ""
        },
        highlightedItems: featuredItems.filter(item => item.trim() !== ''),
        paymentTypes: (formData.paymentTypes || []).filter(type => type.trim() !== ''),
        images: formData.images || [],
        // Dates are dictated by the community event rather than entered by the homeowner
        dateTime: {
          start: formatDateForAPI(communityEvent.startDate, false),
          end: formatDateForAPI(communityEvent.endDate || communityEvent.startDate, true),
          timezone: "America/Toronto"
        },
        community: communityId,
        userId: userId,
        socialAndWeb: {
          ...(formData.fb ? { fb: formData.fb } : {}),
          ...(formData.instagram ? { instagram: formData.instagram } : {}),
          ...(formData.website ? { website: formData.website } : {}),
        }
      };

      logger.log('[RegisterCommunityGarageSale] Sale Data Payload:', JSON.stringify(saleData, null, 2));

      let response;
      try {
        let apiResponse;
        if (existingSale && isEditing) {
          // Update existing garage sale
          apiResponse = await api.updateGarageSale(existingSale.id, saleData);
          // Set fromLanding to true and persist in sessionStorage
          setFromLanding(true);
          // Store in sessionStorage to persist across page reload
          sessionStorage.setItem('shouldShowMenuBar', 'true');
          // Force a full page reload to refresh all components
          window.location.reload();
        } else {
          // Create new garage sale
          apiResponse = await api.createGarageSale(saleData);
          setSuccess('');
        }
        response = apiResponse;

        // Update the existingSale state with the new data
        setExistingSale(response.data);

        // Fetch community garage sales after successful creation
        const fetchCommunitySales = async () => {
          try {
            const response = await api.getAddressesByCommunity(communityId);
            const userGarageSale = response.data.find(sale => sale.userId === userId);

            if (userGarageSale) {
              setExistingSale(userGarageSale);
            }
          } catch (err) {
            logger.error('[RegisterCommunityGarageSale] Error fetching community garage sales:', err);
          }
        };

        // Only fetch if this was a new garage sale creation (not an edit)
        if (!isEditing) {
          fetchCommunitySales();
        }
      } catch (err) {
        logger.error('[RegisterCommunityGarageSale] Error in form submission:', err);

        // Enhanced error message extraction
        let errorMessage = 'An error occurred. Please try again.';

        if (err.response) {
          if (err.response.data) {
            if (typeof err.response.data === 'string') {
              errorMessage = err.response.data;
            } else if (err.response.data.message) {
              errorMessage = err.response.data.message;
            } else if (err.response.data.error) {
              errorMessage = err.response.data.error;
            } else if (err.response.data.details) {
              errorMessage = err.response.data.details;
            } else {
              errorMessage = `Server error (${err.response.status}): ${JSON.stringify(err.response.data)}`;
            }
          } else {
            errorMessage = `Server error: ${err.response.status} ${err.response.statusText}`;
          }
        } else if (err.request) {
          // Network error
          errorMessage = 'Network error: Unable to reach the server. Please check your connection.';
        } else if (err.message) {
          // Other error
          errorMessage = err.message;
        }

        setError(errorMessage);
        innerErrorHandled = true;
        throw err;
      }
      setIsEditing(false);

      // Store in session storage for immediate use in other components
      const currentData = JSON.parse(sessionStorage.getItem('garageSalesData') || '[]');
      const updatedData = existingSale && isEditing
        ? currentData.map(sale => sale.id === existingSale.id ? response.data : sale)
        : [...currentData, response.data];
      sessionStorage.setItem('garageSalesData', JSON.stringify(updatedData));

      // Clear form if it was a new garage sale
      if (!isEditing) {
        setFormData({
          description: '',
          street: '',
          unit: '',
          city: '',
          provState: '',
          postalZipCode: '',
          fb: '',
          instagram: '',
          website: '',
          paymentTypes: [],
          images: []
        });
        setFeaturedItems(['']);
      }
    } catch (err) {
      logger.error('[RegisterCommunityGarageSale] Error saving garage sale:', err);
      if (!innerErrorHandled) {
        setError(err.response?.data?.message || 'Failed to save your garage sale. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setError(null);

    if (existingSale) {
      setFormData({
        description: existingSale.description || '',
        street: existingSale.address?.streetNum && existingSale.address?.street
          ? `${existingSale.address.streetNum} ${existingSale.address.street}`
          : existingSale.address?.street || '',
        unit: existingSale.address?.unit || '',
        city: existingSale.address?.city || '',
        provState: existingSale.address?.provState || '',
        postalZipCode: existingSale.address?.postalZipCode || '',
        fb: existingSale.socialAndWeb?.fb || '',
        instagram: existingSale.socialAndWeb?.instagram || '',
        website: existingSale.socialAndWeb?.website || '',
        paymentTypes: existingSale.paymentTypes || [],
        images: existingSale.images || []
      });
      setFeaturedItems(existingSale.highlightedItems || ['']);
    }
  };

  // Handle delete garage sale
  const handleDelete = async () => {
    if (!existingSale || !existingSale.id) {
      setError('No garage sale to delete');
      return;
    }

    const confirmDelete = window.confirm('Are you sure you want to delete your garage sale? This action cannot be undone.');
    if (!confirmDelete) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.deleteGarageSale([existingSale.id]);

      // Clear the existing sale
      setExistingSale(null);

      setFormData({
        description: '',
        street: '',
        unit: '',
        city: '',
        provState: '',
        postalZipCode: '',
        fb: '',
        instagram: '',
        website: '',
        paymentTypes: [],
        images: []
      });
      setFeaturedItems(['']);
      setIsEditing(false);
    } catch (err) {
      logger.error('[RegisterCommunityGarageSale] Error deleting garage sale:', err);

      // Enhanced error message extraction
      let errorMessage = 'Failed to delete your garage sale. Please try again.';

      if (err.response) {
        if (err.response.data) {
          if (typeof err.response.data === 'string') {
            errorMessage = err.response.data;
          } else if (err.response.data.message) {
            errorMessage = err.response.data.message;
          } else if (err.response.data.error) {
            errorMessage = err.response.data.error;
          } else {
            errorMessage = `Delete failed (${err.response.status}): ${JSON.stringify(err.response.data)}`;
          }
        } else {
          errorMessage = `Delete failed: ${err.response.status} ${err.response.statusText}`;
        }
      } else if (err.request) {
        errorMessage = 'Network error: Unable to reach the server. Please check your connection.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle edit garage sale
  const handleEditClick = () => {
    if (existingSale) {
      setIsEditing(true);
      setSuccess(false);
      setError(null);

      // Switch to manual address mode for editing to ensure the address field is populated
      setUseManualAddress(true);
      setSelectedPlace(null);

      // Construct full street address
      let fullStreetAddress = '';
      if (existingSale.address) {
        if (existingSale.address.streetNum && existingSale.address.street) {
          fullStreetAddress = `${existingSale.address.streetNum} ${existingSale.address.street}`;
        } else if (existingSale.address.street) {
          fullStreetAddress = existingSale.address.street;
        }
      }

      setFormData({
        description: existingSale.description || '',
        street: fullStreetAddress,
        unit: existingSale.address?.unit || '',
        city: existingSale.address?.city || '',
        provState: existingSale.address?.provState || '',
        postalZipCode: existingSale.address?.postalZipCode || '',
        fb: existingSale.socialAndWeb?.fb || '',
        instagram: existingSale.socialAndWeb?.instagram || '',
        website: existingSale.socialAndWeb?.website || '',
        paymentTypes: existingSale.paymentTypes || [],
        images: existingSale.images || []
      });

      // Pre-fill featured items - ensure we always have at least one empty field for adding new items
      if (existingSale.highlightedItems && existingSale.highlightedItems.length > 0) {
        setFeaturedItems([...existingSale.highlightedItems, '']);
      } else {
        setFeaturedItems(['']);
      }
    }
  };

  // Handle adding new featured item input
  const handleAddFeaturedItem = () => {
    setFeaturedItems([...featuredItems, '']);
  };

  // Handle removing featured item input
  const handleRemoveFeaturedItem = (index) => {
    setFeaturedItems(featuredItems.filter((item, i) => i !== index));
  };

  // Handle featured item input change
  const handleFeaturedItemChange = (e, index) => {
    const updatedItems = [...featuredItems];
    updatedItems[index] = e.target.value;
    setFeaturedItems(updatedItems);
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      {communityEvent && (
        <Card sx={{ mb: 3 }} variant="outlined">
          <CardContent>
            <Typography variant="h4" gutterBottom>{communityEvent.name}</Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {formatDate(communityEvent.startDate)} — {formatDate(communityEvent.endDate)}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}

      {(!existingSale || isEditing) && (
        <>
          <Typography variant="h2" gutterBottom>Register a Garage Sale</Typography>
        </>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && !isEditing && (
        <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>
      )}

      {existingSale && !isEditing ? (
        <Box>
          <Typography variant="h2" gutterBottom>Your Garage Sale</Typography>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h4" gutterBottom>{existingSale.name || 'GARAGE SALE'}</Typography>

              {existingSale.address && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body1">
                    {existingSale.address.streetNum} {existingSale.address.street}
                    {existingSale.address.unit && `, Unit ${existingSale.address.unit}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {existingSale.address.city}, {existingSale.address.provState}
                  </Typography>
                  {existingSale.address.postalZipCode && (
                    <Typography variant="body2" color="text.secondary">
                      {existingSale.address.postalZipCode}
                    </Typography>
                  )}
                </Box>
              )}

              {existingSale.description && (
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  {existingSale.description}
                </Typography>
              )}

              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Featured Items:</strong>{' '}
                {existingSale.highlightedItems &&
                 Array.isArray(existingSale.highlightedItems) &&
                 existingSale.highlightedItems.length > 0
                  ? existingSale.highlightedItems.filter(item => item.trim() !== '').join(', ')
                  : 'None'}
              </Typography>

              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Payment Types:</strong>{' '}
                {existingSale.paymentTypes && existingSale.paymentTypes.length > 0
                  ? existingSale.paymentTypes.join(', ')
                  : 'None'}
              </Typography>

              {existingSale.images && existingSale.images.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
                  {existingSale.images.map((img, index) => (
                    <img
                      key={index}
                      src={img.url}
                      alt={img.description || `Image ${index + 1}`}
                      className="image-preview"
                    />
                  ))}
                </Stack>
              )}

              <Stack direction="row" spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Start:</strong> {new Date(existingSale.dateTime.start).toLocaleDateString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>End:</strong> {new Date(existingSale.dateTime.end).toLocaleDateString()}
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Button variant="contained" startIcon={<EditIcon />} onClick={handleEditClick}>
              Edit Garage Sale
            </Button>
            <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDelete}>
              Delete Garage Sale
            </Button>
          </Stack>
        </Box>
      ) : (
        <form className="garage-sale-form" onSubmit={handleSubmit}>
          {/* Street Address */}
          <div className="form-row">
            <div className="form-group" style={{ width: '100%' }}>
              <label htmlFor="street">
                Street Address <span style={{ color: 'red' }}>*</span>
              </label>
              {useManualAddress ? (
                <input
                  type="text"
                  id="street"
                  name="street"
                  value={formData.street}
                  onChange={handleInputChange}
                  placeholder="e.g., Main St"
                  required
                  style={{ width: '100%' }}
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
                    placeholder: 'Search for your address...',
                    isClearable: true,
                    styles: {
                      input: (provided) => ({
                        ...provided,
                        fontSize: '16px',
                      }),
                      option: (provided) => ({
                        ...provided,
                        fontSize: '14px',
                      }),
                      control: (provided) => ({
                        ...provided,
                        minHeight: '38px',
                        height: '38px',
                      })
                    }
                  }}
                />
              )}
            </div>
          </div>

          {/* Address Search Toggle */}
          <div style={{ marginBottom: '1rem' }}>
            {!useManualAddress && (
              <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                Search for your address to auto-fill all fields below
              </small>
            )}
          </div>

          <div className="form-row">

            <div className="form-group">
              <label htmlFor="unit">Unit</label>
              <input
                type="text"
                id="unit"
                name="unit"
                value={formData.unit}
                onChange={handleInputChange}
                placeholder="Unit"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city">
                City <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="City, village, town, etc"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="provState">
                Province/State <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                id="provState"
                name="provState"
                value={formData.provState}
                onChange={handleInputChange}
                placeholder="ON"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="postalZipCode">
                Postal/Zip Code <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                id="postalZipCode"
                name="postalZipCode"
                value={formData.postalZipCode}
                onChange={handleInputChange}
                placeholder="A1A 1A1"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your garage sale..."
              rows={4}
            />
          </div>

          <div className="form-group">
            <label>Images</label>
            <div className="image-upload-section">
              {(formData.images || []).map((img, index) => (
                <div key={index} className="image-preview-item">
                  <img
                    src={img.url}
                    alt={img.description || `Image ${index + 1}`}
                    className="image-preview"
                  />
                  <input
                    type="text"
                    value={img.description}
                    onChange={(e) => handleImageDescriptionChange(index, e.target.value)}
                    placeholder="Caption (optional)"
                    className="image-caption-input"
                  />
                  <button
                    type="button"
                    onClick={() => handleImageRemove(index)}
                    className="remove-item-button"
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
              <label className="image-upload-label">
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

          <div className="form-group">
            <label>Featured Items</label>
            {featuredItems.map((item, index) => (
              <div
                key={index}
                className="featured-item-input"
              >
                <input
                  type="text"
                  value={item}
                  onChange={(e) => handleFeaturedItemChange(e, index)}
                  placeholder="e.g., Furniture, Electronics, Toys"
                />
                {featuredItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveFeaturedItem(index)}
                    className="remove-item-button"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddFeaturedItem}
              className="add-item-button"
            >
              + Add item
            </button>
          </div>

          <div className="form-group">
            <label>Payment Types Accepted</label>
            <div className="checkbox-group">
              {availablePaymentTypes.map((paymentType) => (
                <label key={paymentType.value} className="checkbox-label">
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

          <div className="form-group">
            <label htmlFor="fb">Facebook Page URL</label>
            <input
              type="url"
              id="fb"
              name="fb"
              value={formData.fb}
              onChange={handleInputChange}
              placeholder="https://www.facebook.com/..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="instagram">Instagram URL</label>
            <input
              type="url"
              id="instagram"
              name="instagram"
              value={formData.instagram}
              onChange={handleInputChange}
              placeholder="https://www.instagram.com/..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="website">Website URL</label>
            <input
              type="url"
              id="website"
              name="website"
              value={formData.website}
              onChange={handleInputChange}
              placeholder="https://..."
            />
          </div>

          <Stack direction="row" spacing={2} sx={{ mt: 3, justifyContent: 'flex-end' }}>
            {isEditing && (
              <Button variant="outlined" onClick={handleCancelEdit}>
                Cancel
              </Button>
            )}
            <Button type="submit" variant="contained" disabled={loading || !communityEvent}>
              {loading ? 'Saving...' : (isEditing ? 'Update Garage Sale' : 'Register Garage Sale')}
            </Button>
          </Stack>
        </form>
      )}
    </Box>
  );
};

export default RegisterCommunityGarageSale;

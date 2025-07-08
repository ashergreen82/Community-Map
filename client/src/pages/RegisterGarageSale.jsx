import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import GooglePlacesAutocomplete from 'react-google-places-autocomplete';
import './RegisterGarageSale.css'; // Use dedicated CSS for this component
import api from '../utils/api';

const RegisterGarageSale = () => {
  const navigate = useNavigate();
  const { isAuthenticated, userInfo } = useAuth();
  const { setFromLanding } = useNavigation();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    street: '',     // Full street address (e.g., '123 Main St')
    unit: '',
    city: '',
    provState: '',
    postalZipCode: '',
    startDate: '',
    endDate: ''
  });
  
  // Featured items as separate array
  const [featuredItems, setFeaturedItems] = useState(['']);
  
  // Additional state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [existingSale, setExistingSale] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [useManualAddress, setUseManualAddress] = useState(false);
  const [genpubSales, setGenpubSales] = useState([]); // New state to store GENPUB garage sales

  // Check if user is authenticated and fetch their existing garage sale if any
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?returnTo=/register-garage-sale');
      return;
    }
    
    const fetchUserGarageSale = async () => {
      setLoading(true);
      try {
        // Fetch all garage sales from GENPUB community
        const response = await api.getAddressesByCommunity('GENPUB');
        if (response.data && response.data.length > 0) {
          // Extract userId from userInfo with fallback checks
          const userId = userInfo?.id || userInfo?.sub || userInfo?.userId || userInfo?.user_id || 
                        sessionStorage.getItem('userId');
          
          // Search for user's garage sale by matching userId
          const userSale = response.data.find(sale => sale.userId === userId);
          
          if (userSale) {
            setExistingSale(userSale);
            
            // Pre-fill form with existing data
            setFormData({
              name: userSale.name || '',
              description: userSale.description || '',
              street: userSale.address?.street || '',
              unit: userSale.address?.unit || '',
              city: userSale.address?.city || '',
              provState: userSale.address?.provState || '',
              postalZipCode: userSale.address?.postalZipCode || '',
              startDate: userSale.startDate || '',
              endDate: userSale.endDate || ''
            });
            setFeaturedItems(userSale.highlightedItems || ['']);
          }
        }
      } catch (err) {
        console.error('Error fetching GENPUB garage sales:', err);
        // No existing sale or error fetching - that's okay, user can create a new one
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserGarageSale();
  }, [isAuthenticated, navigate, userInfo]);

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
          console.error('Error getting place details:', status);
          setError('Failed to get address details. Please try entering manually.');
        }
      });
    } else {
      console.error('Google Maps Places API not loaded');
      setError('Address search is not available. Please enter your address manually.');
      setUseManualAddress(true);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Format dates for API - convert YYYY-MM-DD to ISO datetime format
      const formatDateForAPI = (dateString, isEndDate = false) => {
        if (!dateString) return null;
        
        // For start date, use 9:00 AM; for end date, use 6:00 PM
        const time = isEndDate ? '18:00:00' : '09:00:00';
        return `${dateString}T${time}`;
      };
      
      // Parse street number and name from the full street address
      const parseStreetAddress = (address) => {
        if (!address) return { streetNum: '', street: '' };
        
        // Match the first sequence of digits at the start of the string
        const match = address.match(/^(\d+)\s*(.*)/);
        if (match) {
          return {
            streetNum: match[1],
            street: match[2].trim()
          };
        }
        return { streetNum: '', street: address };
      };
      
      const { streetNum, street } = parseStreetAddress(formData.street);
      
      // Debug user info
      console.log('User Info Object:', userInfo);
      console.log('User Info Keys:', Object.keys(userInfo));
      console.log('User Info Values:', Object.values(userInfo));
      console.log('User ID from userInfo:', userInfo?.id);
      console.log('User ID from userInfo.sub:', userInfo?.sub);
      console.log('User ID from userInfo.userId:', userInfo?.userId);
      console.log('User ID from userInfo.user_id:', userInfo?.user_id);
      
      // Get user ID with fallback to session storage if needed
      const userId = userInfo?.id || userInfo?.sub || userInfo?.userId || userInfo?.user_id || JSON.parse(sessionStorage.getItem('userInfo'))?.id;
      console.log('Final User ID to be used:', userId);
      
      if (!userId) {
        console.error('No user ID found!');
        throw new Error('User authentication error: No user ID available');
      }
      
      const saleData = {
        name: formData.name.trim() || "Garage Sale",
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
        dateTime: {
          start: formatDateForAPI(formData.startDate, false),
          end: formatDateForAPI(formData.endDate || formData.startDate, true),
          timezone: "America/Toronto"
        },
        community: 'GENPUB',
        userId: userId // Use the explicitly obtained user ID
      };
      
      console.log('Sale Data Payload:', JSON.stringify(saleData, null, 2)); // Debug log
      
      let response;
      try {
        let apiResponse;
        if (existingSale && isEditing) {
          // Update existing garage sale
          console.log('Updating existing garage sale with data:', JSON.stringify(saleData, null, 2));
          apiResponse = await api.updateGarageSale(existingSale.id, saleData);
          // Set fromLanding to true and persist in sessionStorage
          setFromLanding(true);
          // Store in sessionStorage to persist across page reload
          sessionStorage.setItem('shouldShowMenuBar', 'true');
          // Force a full page reload to refresh all components
          window.location.reload();
        } else {
          // Create new garage sale
          console.log('Creating new garage sale with data:', JSON.stringify(saleData, null, 2));
          apiResponse = await api.createGarageSale(saleData);
          setSuccess('');
        }
        console.log('API Response:', apiResponse);
        response = apiResponse;
        
        // Update the existingSale state with the new data
        setExistingSale(response.data);
        
        // Fetch GENPUB garage sales after successful creation
        const fetchGenpubSales = async () => {
          try {
            const response = await api.getAddressesByCommunity('GENPUB');
            console.log('GENPUB garage sales response:', response.data);
            
            // Find the user's garage sale from the GENPUB sales
            const userGarageSale = response.data.find(sale => sale.userId === userId);
            console.log('User garage sale found:', userGarageSale);
            
            if (userGarageSale) {
              setExistingSale(userGarageSale);
              setGenpubSales([userGarageSale]); // Only show the user's garage sale
            }
          } catch (err) {
            console.error('Error fetching GENPUB garage sales:', err);
          }
        };
        
        // Only fetch if this was a new garage sale creation (not an edit)
        if (!isEditing) {
          fetchGenpubSales();
        }
      } catch (err) {
        console.error('Error in form submission:', err);
        
        // Enhanced error message extraction
        let errorMessage = 'An error occurred. Please try again.';
        
        if (err.response) {
          // Server responded with error status
          console.log('Error response:', err.response);
          console.log('Error response data:', err.response.data);
          console.log('Error response status:', err.response.status);
          
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
          name: 'Garage Sale',
          description: '',
          street: '',
          unit: '',
          city: '',
          provState: '',
          postalZipCode: '',
          startDate: '',
          endDate: ''
        });
        setFeaturedItems(['']);
      }
    } catch (err) {
      console.error('Error saving garage sale:', err);
      setError(err.response?.data?.message || 'Failed to save your garage sale. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setError(null);
    
    if (existingSale) {
      // Reset form to existing sale data
      setFormData({
        name: existingSale.name || '',
        description: existingSale.description || '',
        street: existingSale.address?.streetNum && existingSale.address?.street
          ? `${existingSale.address.streetNum} ${existingSale.address.street}`
          : existingSale.address?.street || '',
        unit: existingSale.address?.unit || '',
        city: existingSale.address?.city || '',
        provState: existingSale.address?.provState || '',
        postalZipCode: existingSale.address?.postalZipCode || '',
        startDate: existingSale.dateTime?.start ? existingSale.dateTime.start.split('T')[0] : '',
        endDate: existingSale.dateTime?.end ? existingSale.dateTime.end.split('T')[0] : ''
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
      
      // Clear the existing sale and GENPUB sales display
      setExistingSale(null);
      setGenpubSales([]);
      
      // Reset form
      setFormData({
        name: 'Garage Sale',
        description: '',
        street: '',
        unit: '',
        city: '',
        provState: '',
        postalZipCode: '',
        startDate: '',
        endDate: ''
      });
      setFeaturedItems(['']);
      setIsEditing(false);
    } catch (err) {
      console.error('Error deleting garage sale:', err);
      
      // Enhanced error message extraction
      let errorMessage = 'Failed to delete your garage sale. Please try again.';
      
      if (err.response) {
        console.log('Delete error response:', err.response);
        console.log('Delete error response data:', err.response.data);
        
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
      console.log('Editing existing sale:', existingSale); // Debug log
      
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
      
      // Parse dates properly
      let startDate = '';
      let endDate = '';
      
      if (existingSale.dateTime?.start) {
        // Handle both ISO format and date-only format
        const startDateObj = new Date(existingSale.dateTime.start);
        if (!isNaN(startDateObj.getTime())) {
          startDate = startDateObj.toISOString().split('T')[0];
        }
      }
      
      if (existingSale.dateTime?.end) {
        const endDateObj = new Date(existingSale.dateTime.end);
        if (!isNaN(endDateObj.getTime())) {
          endDate = endDateObj.toISOString().split('T')[0];
        }
      }
      
      console.log('Populating form with:', {
        name: existingSale.name || 'Garage Sale',
        description: existingSale.description || '',
        street: fullStreetAddress,
        unit: existingSale.address?.unit || '',
        city: existingSale.address?.city || '',
        provState: existingSale.address?.provState || '',
        postalZipCode: existingSale.address?.postalZipCode || '',
        startDate,
        endDate
      }); // Debug log
      
      // Pre-fill form with existing data
      setFormData({
        name: existingSale.name || 'Garage Sale',
        description: existingSale.description || '',
        street: fullStreetAddress,
        unit: existingSale.address?.unit || '',
        city: existingSale.address?.city || '',
        provState: existingSale.address?.provState || '',
        postalZipCode: existingSale.address?.postalZipCode || '',
        startDate,
        endDate
      });
      
      // Pre-fill featured items - ensure we always have at least one empty field for adding new items
      if (existingSale.highlightedItems && existingSale.highlightedItems.length > 0) {
        setFeaturedItems([...existingSale.highlightedItems, '']);
      } else {
        setFeaturedItems(['']);
      }
      
      console.log('Form data set, featured items:', existingSale.highlightedItems); // Debug log
      console.log('Manual address mode enabled for editing'); // Debug log
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

  // Get user's display name and email from userInfo with fallbacks
  const firstName = userInfo?.fName || userInfo?.firstName || userInfo?.given_name || '';
  const lastName = userInfo?.lName || userInfo?.lastName || '';
  const displayName = `${firstName} ${lastName}`.trim();
  const userEmail = userInfo?.email || userInfo?.preferred_username || '';

  return (
    <div className="garage-sales-container" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{fontWeight: "600"}}>
        {/* <div className="user-info-header">
          <span className="user-name">{displayName}</span>
          {userEmail && <span className="user-email">{userEmail}</span>}
        </div> */}
        {existingSale && !isEditing ? '' : 'Register a Garage Sale'}
      </h1>
      {!existingSale || isEditing ? (
        <p className="subheading" style={{ marginTop: '0.5rem', color: '#666' }}>
          (If you want to register more than one garage sale then please use the "Manage Community Sales" Page)
        </p>
      ) : null}
      
      {loading && <div className="loading">Loading...</div>}
      
      {error && (
        <div className="error">
          {error}
          <button className="retry-button" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      
      {success && !isEditing && (
        <div className="success-message">
          {success}
        </div>
      )}
      
      {existingSale && !isEditing ? (
        <div className="existing-sale-container">
          <div className="garage-sale-card">
            <div className="register-sale-content">
              <h3>{existingSale.name || 'GARAGE SALE'}</h3>
              
              <div className="sale-address-details">
                {existingSale.address && (
                  <>
                    <p className="address-line">
                      {existingSale.address.streetNum} {existingSale.address.street}
                      {existingSale.address.unit && (
                        <span>, Unit {existingSale.address.unit}</span>
                      )}
                    </p>
                    <p className="address-line">
                      {existingSale.address.city}, {existingSale.address.provState}
                    </p>
                    {existingSale.address.postalZipCode && (
                      <p className="address-line">
                        {existingSale.address.postalZipCode}
                      </p>
                    )}
                  </>
                )}
              </div>
              
              {existingSale.description && (
                <p className="sale-description">{existingSale.description}</p>
              )}
              
              <p className="sale-items">
                <strong>Featured Items:</strong> {
                  existingSale.highlightedItems && 
                  Array.isArray(existingSale.highlightedItems) && 
                  existingSale.highlightedItems.length > 0 
                    ? existingSale.highlightedItems.filter(item => item.trim() !== '').join(', ')
                    : 'None'
                }
              </p>
              
              <div className="sale-dates">
                <p><strong>Start Date:</strong> {new Date(existingSale.dateTime.start).toLocaleDateString()}</p>
                <p><strong>End Date:</strong> {new Date(existingSale.dateTime.end).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
          
          <div className="sale-actions">
            <button className="edit-button" onClick={handleEditClick}>Edit Garage Sale</button>
            <button className="delete-button" onClick={handleDelete}>Delete Garage Sale</button>
          </div>
          <div className="sale-note">
            <p>To create additional garage sales, please visit the <strong>Community Sales Page</strong>.</p>
          </div>
        </div>
      ) : (
        <form className="garage-sale-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Garage Sale Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Spring Cleaning Sale"
              className={formData.name === 'Garage Sale' ? 'default-name' : ''}
            />
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
            <label htmlFor="startDate">
              Start Date <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="endDate">End Date</label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={formData.endDate}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="form-actions">
            {isEditing && (
              <button type="button" className="cancel-button" onClick={handleCancelEdit}>
                Cancel
              </button>
            )}
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Saving...' : (isEditing ? 'Update Garage Sale' : 'Register Garage Sale')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default RegisterGarageSale;

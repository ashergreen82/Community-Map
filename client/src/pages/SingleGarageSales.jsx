import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Container,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
  useTheme,
  useMediaQuery,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  CardActionArea,
  CardActions
} from '@mui/material';
import {
  Search as SearchIcon,
  Map as MapIcon,
  Route as RouteIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useDisplay } from '../context/DisplayContext';
import { useSearch } from '../context/SearchContext';
import { useSelection } from '../context/SelectionContext';
import { useCommunitySales } from '../context/CommunitySalesContext';
import LoginRequiredModal from '../components/LoginRequiredModal';
import { useUserAddressList } from '../hooks/useUserAddressList';
import api from '../utils/api';
import { logger } from '../utils/logger';

const SingleGarageSales = () => {
  const [garageSales, setGarageSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [localCommunityName, setLocalCommunityName] = useState('search for a Garage Sales');
  const { setCommunityName } = useCommunitySales();

  // Optimize route state variables
  const [showOptimizeRoute, setShowOptimizeRoute] = useState(false);
  const [optimizedRouteAddresses, setOptimizedRouteAddresses] = useState([]);
  const [showRouteList, setShowRouteList] = useState(false);
  const [optimizeFullRoute, setOptimizeFullRoute] = useState(false);

  const { searchTerm, handleSearchChange } = useSearch();
  const { selectedSales, handleCheckboxChange, handleDeselectAll } = useSelection();
  const { showOnlySelected, toggleDisplayMode } = useDisplay();

  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, userInfo, userEmail } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Use custom hook for user address list management (GENPUB community)
  const { userAddressList, selectionsInitialized, setSelectionsInitialized } = useUserAddressList(
    garageSales,
    null, // No specific communityId - GENPUB is handled in the fetch
    { componentName: 'SingleGarageSales', requireCommunityId: false }
  );

  // Fetch single garage sales from GENPUB community
  useEffect(() => {
    const fetchSingleGarageSales = async () => {
      setLoading(true);
      setError(null);

      try {
        // Use the environment variable for the API URL
        const apiUrl = `${import.meta.env.VITE_MAPS_API_URL}/v1/getAddressByCommunity/GENPUB`;
        logger.log('[SingleGarageSales] Fetching data from API URL:', apiUrl);

        // Try to get data from the API
        let data;
        try {
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'app-name': 'web-service',
              'app-key': import.meta.env.VITE_APP_SESSION_KEY
            }
          });

          if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
          }

          data = await response.json();
          logger.log('[SingleGarageSales] Data received from API:', data);

          // Store successful API response in sessionStorage for future use
          sessionStorage.setItem('garageSalesData', JSON.stringify(data));
        } catch (apiError) {
          logger.error('[SingleGarageSales] Error fetching from API:', apiError);

          // Try to get data from sessionStorage as fallback
          const storedData = sessionStorage.getItem('garageSalesData');
          if (storedData) {
            logger.log('[SingleGarageSales] Using cached data from sessionStorage');
            data = JSON.parse(storedData);
          } else {
            throw new Error('No cached data available and API request failed');
          }
        }

        // Process the response data properly
        logger.log('[SingleGarageSales] Raw data to process:', data);

        // Based on the screenshots, the response structure is an array
        if (data && Array.isArray(data)) {
          const salesData = data.map(sale => {
            // Extract address data from the nested address object
            const addressObj = sale.address || {};

            // Create a formatted address string including all components
            const formattedAddress = [
              addressObj.streetNum,
              addressObj.street,
              addressObj.city,
              addressObj.provState,
              addressObj.postalZipCode
            ].filter(Boolean).join(', ');

            return {
              id: sale.id || `sale-${Math.random().toString(36).substr(2, 9)}`,
              address: formattedAddress,
              addressLine1: addressObj.streetNum + " " + addressObj.street || '',
              addressLine2: addressObj.city + ", " + addressObj.provState + ", " + addressObj.postalZipCode || '',
              fullAddress: addressObj, // Store the full address object for reference
              description: sale.description || '',
              name: sale.name || 'GARAGE SALE',
              highlightedItems: Array.isArray(sale.highlightedItems) ? sale.highlightedItems.join(', ') : '',
              community: sale.community || 'GENPUB',
              position: {
                lat: parseFloat(addressObj.lat) || 0,
                lng: parseFloat(addressObj.long) || 0
              }
            };
          });

          logger.log('[SingleGarageSales] Processed sales data:', salesData);
          setGarageSales(salesData);
        } else {
          logger.log('[SingleGarageSales] No valid garage sales data found');
          setGarageSales([]);
        }
      } catch (err) {
        logger.error('[SingleGarageSales] Error in garage sales processing:', err);
        setError('Failed to load garage sales. Please try again later.');
        setGarageSales([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSingleGarageSales();
  }, []);

  // Effect to ensure showOnlySelected is set to false when component loads
  useEffect(() => {
    toggleDisplayMode('showAll');
  }, []);

  // Handle optimize route functionality
  const handleOptimizeRoute = async () => {
    // Determine if we're optimizing the full route or just selected sales
    const isFullRouteOptimization = selectedSales.size === 0;
    setOptimizeFullRoute(isFullRouteOptimization);

    logger.log(`[SingleGarageSales] Optimizing ${isFullRouteOptimization ? 'FULL route' : 'SELECTED sales route'}`);

    // If there are selected sales and the user is authenticated, save them to the backend first
    if (selectedSales.size > 0 && isAuthenticated && userInfo?.userId) {
      try {
        logger.log('[SingleGarageSales] Saving selected sales to server before optimization for user:', userInfo.userId);

        // Filter sales to only include those that are selected
        const selectedSalesData = garageSales
          .filter(sale => selectedSales.has(sale.id));

        // Extract just the IDs for the server request
        const selectedSaleIds = selectedSalesData.map(sale => sale.id);

        logger.log(`[SingleGarageSales] Saving ${selectedSaleIds.length} selected sales for GENPUB community`);

        // Save the selected sales to the server with GENPUB as communityId
        const response = await api.createUpdateUserAddressList(userInfo.userId, selectedSaleIds, 'GENPUB');
        logger.log('[SingleGarageSales] Successfully saved selected sales to server before optimization:', response);
      } catch (error) {
        logger.error('[SingleGarageSales] Error saving selected sales to server before optimization:', error);
        // Continue with optimization even if server save fails
        // We don't want to block the user from optimizing their route
      }
    }

    // Show the optimize route view to let the user select a starting point
    setShowOptimizeRoute(true);
  };

  const handleSelectFirstVisit = async (saleId) => {
    try {
      logger.log('[SingleGarageSales] Selected first visit:', saleId);

      // Get sessionId from localStorage
      const sessionId = localStorage.getItem('sessionId');

      // Make API call to get optimized route
      let optimizedRouteData = null;

      // Use different endpoints based on whether we're optimizing full route or selected sales
      const endpoint = !optimizeFullRoute && selectedSales.size > 0
        ? `${import.meta.env.VITE_MAPS_API_URL}/v1/getOptimzedRoute/bySavedList`
        : `${import.meta.env.VITE_MAPS_API_URL}/v1/getOptimzedRoute`;

      logger.log(`[SingleGarageSales] Using endpoint: ${endpoint} (optimizeFullRoute=${optimizeFullRoute}, selectedSales.size=${selectedSales.size})`);

      // Prepare the request payload based on the endpoint
      const payload = !optimizeFullRoute && selectedSales.size > 0
        ? {
          startingAddressId: saleId,
          communityId: 'GENPUB',
          userId: userInfo?.userId || ''
        }
        : {
          startingAddressId: saleId,
          communityId: 'GENPUB'
        };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'app-key': import.meta.env.VITE_APP_API_KEY,
          'app-name': 'postman-call',
          'sessionId': sessionId
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      optimizedRouteData = await response.json();
      logger.log('[SingleGarageSales] API Response:', optimizedRouteData);

      // Process the response
      if (optimizedRouteData && optimizedRouteData.orderedWaypoints) {
        logger.log('[SingleGarageSales] Using optimised route data:', optimizedRouteData);

        // Create a map of addresses to sale data for matching
        const addressToSaleMap = {};

        // Build a map of normalized addresses to their corresponding sale data
        garageSales.forEach(sale => {
          if (sale.address) {
            // Normalize the address by removing extra spaces and converting to lowercase
            const normalizedAddress = sale.address.toLowerCase().replace(/\s+/g, ' ').trim();
            addressToSaleMap[normalizedAddress] = sale;
          }
        });

        logger.log('[SingleGarageSales] Address to sale map created with', Object.keys(addressToSaleMap).length, 'entries');

        // Process the ordered waypoints from the API
        const filteredWaypoints = [];
        logger.log('[SingleGarageSales] Ordered waypoints from API:', optimizedRouteData.orderedWaypoints);

        // Process each waypoint in the optimized route
        optimizedRouteData.orderedWaypoints.forEach((waypoint, index) => {
          // Get the address from the waypoint
          let waypointAddress = '';

          // Handle different possible formats of the waypoint data
          if (typeof waypoint === 'string') {
            waypointAddress = waypoint;
          } else if (waypoint && typeof waypoint === 'object') {
            waypointAddress = waypoint.address || waypoint.location || '';
          }

          logger.log(`[SingleGarageSales] Processing waypoint ${index + 1}:`, waypointAddress);

          if (waypointAddress) {
            // Normalize the address for matching
            const normalizedAddress = waypointAddress.toLowerCase().replace(/\s+/g, ' ').trim();

            // Find the matching sale by address
            const matchingSale = addressToSaleMap[normalizedAddress];

            if (matchingSale) {
              logger.log('[SingleGarageSales] Found matching sale with ID:', matchingSale.id);

              // Add the waypoint with the correct ID and position information
              filteredWaypoints.push({
                id: matchingSale.id,
                address: matchingSale.address,
                description: matchingSale.description,
                position: matchingSale.position,
                // Add the position in the optimized route
                routeOrder: index + 1
              });
            } else {
              logger.log('[SingleGarageSales] No matching sale found for address:', waypointAddress);

              // Include the waypoint even without a matching sale
              filteredWaypoints.push({
                address: waypointAddress,
                description: `Stop ${index + 1}`,
                routeOrder: index + 1
              });
            }
          }
        });

        logger.log('[SingleGarageSales] Filtered waypoints with route order:', filteredWaypoints);

        // Create a modified optimized route data with only selected sales
        const filteredOptimizedRouteData = {
          ...optimizedRouteData,
          orderedWaypoints: filteredWaypoints
        };

        // Store the optimized route data in localStorage for the map to use
        localStorage.setItem('optimizedRoute', JSON.stringify(filteredOptimizedRouteData));

        // Set the optimized route addresses for display
        setOptimizedRouteAddresses(filteredWaypoints);

        // Show the route list
        setShowRouteList(true);
        setShowOptimizeRoute(false);
      } else {
        logger.log('[SingleGarageSales] No optimized route data received or orderedWaypoints is empty');
        alert('No optimized route could be generated. Please try again.');
      }
    } catch (error) {
      logger.error('[SingleGarageSales] Error getting optimised route:', error);
      // Show user-friendly error message
      alert(`Error optimising route: ${error.message}`);
    }
  };

  const handleBackToSelection = () => {
    setShowOptimizeRoute(false);
    setShowRouteList(false);
  };

  const handleProceedToMap = () => {
    // Get the optimized route data from localStorage
    const optimizedRouteData = JSON.parse(localStorage.getItem('optimizedRoute') || '{}');

    // If we have optimized route data and we're not doing a full route optimization
    if (optimizedRouteData.orderedWaypoints && !optimizeFullRoute) {
      // Filter the garage sales to only include those in the optimized route
      const optimizedSales = garageSales.filter(sale =>
        optimizedRouteData.orderedWaypoints.some(wp => wp.id === sale.id)
      );

      // Store only the optimized sales in localStorage
      localStorage.setItem('selectedSales', JSON.stringify(optimizedSales));

      // Make sure we're in selected sales mode
      if (!showOnlySelected) {
        toggleDisplayMode();
      }
    } else if (optimizeFullRoute) {
      // For full route optimization, show all markers
      toggleDisplayMode('showAll');
    }

    // Navigate to map view with parameters for GENPUB community
    navigate(`/?communityId=GENPUB&showOptimizedRoute=true`);

    // Close the route list view
    setShowRouteList(false);
  };

  const handleSelectionWithAuth = (saleId) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    handleCheckboxChange(saleId);
  };

  const handleDeselectAllWithServerUpdate = async () => {
    handleDeselectAll();

    // Also update the server if authenticated
    if (isAuthenticated && userInfo?.userId) {
      try {
        await api.createUpdateUserAddressList(userInfo.userId, [], 'GENPUB');
        logger.log('[SingleGarageSales] Successfully cleared selections on server');
      } catch (error) {
        logger.error('[SingleGarageSales] Error clearing selections on server:', error);
      }
    }
  };

  const handleViewOnMap = (sale) => {
    const saleToView = {
      ...sale,
      lat: sale.position.lat,
      lng: sale.position.lng,
      address: sale.address,
      description: sale.description
    };

    localStorage.setItem('selectedSales', JSON.stringify([saleToView]));
    navigate(`/?communityId=GENPUB`);
  };

  const handleViewSelected = async () => {
    // Filter sales to only include those that are in the selectedSales set
    const selectedSalesData = garageSales
      .filter(sale => selectedSales.has(sale.id));

    if (selectedSalesData.length > 0) {
      // If user is authenticated, save the selection to the server
      if (isAuthenticated && userInfo?.userId) {
        try {
          logger.log('[SingleGarageSales] Saving selected sales to server for user:', userInfo.userId);

          // Extract just the IDs for the server request
          const selectedSaleIds = selectedSalesData.map(sale => sale.id);

          // Save the selected sales to the server with the GENPUB communityId
          const response = await api.createUpdateUserAddressList(userInfo.userId, selectedSaleIds, 'GENPUB');
          logger.log('[SingleGarageSales] Successfully saved selected sales to server:', response);
        } catch (error) {
          logger.error('[SingleGarageSales] Error saving selected sales to server:', error);
        }
      } else {
        logger.log('[SingleGarageSales] User not authenticated, skipping server save of selected sales');
      }

      // If not already showing only selected sales, turn it on
      if (!showOnlySelected) {
        toggleDisplayMode();
      }

      // Store the selected sales in localStorage
      localStorage.setItem('selectedSales', JSON.stringify(selectedSalesData));

      // Set the community name to 'Garage Sales' for the title
      setCommunityName('Garage Sales');
      
      // Navigate to the map view with the GENPUB community ID
      navigate('/?communityId=GENPUB');
    } else {
      alert('Please select at least one garage sale to view on the map.');
    }
  };

  // Add debugging for the garage sales state
  logger.log('[SingleGarageSales] Current garageSales state:', garageSales);
  logger.log('[SingleGarageSales] Number of garage sales:', garageSales.length);

  // Filter sales based on search term and display mode
  const filteredSales = garageSales.filter(sale => {
    // First apply search filter if there's a search term
    const matchesSearch = !searchTerm ||
      (sale.address && sale.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sale.description && sale.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sale.name && sale.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sale.highlightedItems && sale.highlightedItems.toLowerCase().includes(searchTerm.toLowerCase()));

    // Then apply selected filter if showOnlySelected is true
    const matchesSelected = !showOnlySelected || selectedSales.has(sale.id);

    return matchesSearch && matchesSelected;
  });

  // Add debugging for filtered sales
  logger.log('[SingleGarageSales] Filtered sales:', filteredSales);
  logger.log('[SingleGarageSales] Number of filtered sales:', filteredSales.length);
  logger.log('[SingleGarageSales] Search term:', searchTerm);
  logger.log('[SingleGarageSales] Show only selected:', showOnlySelected);
  logger.log('[SingleGarageSales] Selected sales:', selectedSales);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Show optimize route selection view
  if (showOptimizeRoute) {
    const salesToDisplay = optimizeFullRoute ? filteredSales : filteredSales.filter(sale => selectedSales.has(sale.id));
    const displayMessage = optimizeFullRoute
      ? `Select your starting point from ${salesToDisplay.length} garage sales:`
      : `Select your starting point from ${salesToDisplay.length} selected garage sales:`;

    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box mb={3}>
          <Typography variant="h4" component="h1" gutterBottom>
            Optimize Route - Select Starting Point
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            {displayMessage}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToSelection}
            sx={{ mb: 3 }}
          >
            Back to Selection
          </Button>
        </Box>

        <Grid container spacing={2}>
          {salesToDisplay.map((sale) => (
            <Grid item xs={12} key={sale.id}>
              <Card
                variant="outlined"
                sx={{
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 3,
                    cursor: 'pointer',
                    borderColor: 'primary.main'
                  },
                  borderColor: 'divider'
                }}
                onClick={() => handleSelectFirstVisit(sale.id)}
              >
                <CardActionArea>
                  <CardContent>
                    <Typography variant="h6" component="h3" gutterBottom>
                      {sale.address || 'No Address Available'}
                    </Typography>
                    {sale.description && (
                      <Typography variant="body2" color="text.secondary">
                        {sale.description}
                      </Typography>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box mt={2} textAlign="center">
          <Typography variant="body2" color="text.secondary">
            {displayMessage}
          </Typography>
        </Box>
      </Container>
    );
  }

  // Show optimized route list
  if (showRouteList) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box mb={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            Optimized Route
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Your optimized route with {optimizedRouteAddresses.length} stops:
          </Typography>

          <Box display="flex" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handleBackToSelection}
              sx={{ minWidth: 160 }}
            >
              Back to Selection
            </Button>
            <Button
              variant="contained"
              color="primary"
              endIcon={<MapIcon />}
              onClick={handleProceedToMap}
              sx={{ minWidth: 160 }}
            >
              View Route on Map
            </Button>
          </Box>
        </Box>

        <Paper elevation={2} sx={{ mb: 4, borderRadius: 2, overflow: 'hidden' }}>
          <List disablePadding>
            {optimizedRouteAddresses.map((stop, index) => (
              <React.Fragment key={stop.id || index}>
                <ListItem sx={{ py: 2, px: 3 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        bgcolor: theme.palette.primary.main,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 500
                      }}
                    >
                      {index + 1}
                    </Box>
                  </ListItemIcon>
                  <ListItemText
                    primary={stop.address || 'No Address Available'}
                    secondary={stop.description || ''}
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
                {index < optimizedRouteAddresses.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      </Container>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Box textAlign="center">
          <CircularProgress />
          <Typography variant="body1" mt={2}>Loading garage sales...</Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => window.location.reload()}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={4}>
    
    <h2 style={{fontWeight: "200"}}>    Hi {userInfo?.fName || ''}, {localCommunityName || 'Garage Sales'}</h2>  

{/* 
        {isAuthenticated && userInfo && (
          <Box mb={3}>
            <Typography variant="subtitle1" color="text.primary" fontWeight={500}>
              {userInfo.fName} {userInfo.lName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {userEmail}
            </Typography>
          </Box>
        )} */}

<Box
  sx={{
    display: 'flex',
    flexDirection: 'column', // Changed to 'column' to stack items vertically
    gap: 2,
    mb: 3,
    alignItems: 'stretch' // Ensures children (TextField and button Box) stretch to full width
  }}
>
  <TextField
    fullWidth
    variant="outlined"
    placeholder="Search by address or description..."
    value={searchTerm}
    onChange={handleSearchChange}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start">
          <SearchIcon color="action" />
        </InputAdornment>
      ),
    }}
    sx={{
      flex: 1, // This flex property on a column item will make it grow, but not necessary for full width here
      '& .MuiOutlinedInput-root': {
        backgroundColor: 'background.paper',
      },
      mb: 1 // Add a small margin-bottom to separate from buttons if gap isn't enough
    }}
  />


  <Box
    sx={{
      display: 'flex',
      gap: 1,
      flexWrap: 'wrap',
      justifyContent: 'flex-end', // Keep buttons aligned to the end (right)
      '& > *': {
        flex: isMobile ? '1 1 100%' : '0 0 auto',
      }
    }}
  >
    {selectedSales.size > 0 && (
      <>
        <Button
          variant="outlined"
          color="primary"
          onClick={handleDeselectAllWithServerUpdate}
          startIcon={<CloseIcon />}
          fullWidth={isMobile}
        >
          Deselect All
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleViewSelected}
          startIcon={<MapIcon />}
          fullWidth={isMobile}
        >
          View Selected ({selectedSales.size})
        </Button>
        <Button
          variant="outlined"
          color="primary"
          onClick={handleOptimizeRoute}
          startIcon={<RouteIcon />}
          fullWidth={isMobile}
        >
          Optimize Route
        </Button>
      </>
    )}
    {/* Removed Optimize Full Route button as requested */}
  </Box>
</Box>
      </Box>

      {filteredSales.length === 0 ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="200px"
          textAlign="center"
        >
          <Typography variant="body1" color="text.secondary">
            No garage sales found matching your search.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2} sx={{ display: 'flex', flexWrap: 'wrap' }}>
          {filteredSales.map((sale) => (
            <Grid item xs={12} sm={6} md={4} key={sale.id} sx={{ display: 'flex' }}>
              <Card
                variant="outlined"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: '350px',
                  height: '100%',
                  minHeight: '280px',
                  transition: 'all 0.2s ease-in-out',
                  borderColor: selectedSales.has(sale.id) ? 'primary.main' : 'divider',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 3,
                    borderColor: 'primary.main'
                  },
                }}
              >
                <CardActionArea
                  onClick={() => handleSelectionWithAuth(sale.id)}
                  sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start', // Align all major sections to the top within CardActionArea
                    alignItems: 'stretch',
                    height: '100%',
                    overflow: 'hidden'
                  }}
                >
                  <Box sx={{ position: 'relative', width: '100%' }}>
                    {/* Checkbox moved outside CardHeader title for correct positioning */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        zIndex: 1,
                      }}
                    >
                      <Checkbox
                        checked={selectedSales.has(sale.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectionWithAuth(sale.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        icon={<CheckBoxOutlineBlankIcon />}
                        checkedIcon={<CheckBoxIcon color="primary" />}
                        inputProps={{ 'aria-label': 'Select garage sale' }}
                      />{sale.name}
                    </Box>
                    <CardHeader
                      title={
                        <Box sx={{ width: '100%', pt: 1 }}>
                          <Box sx={{ height: 40 }} /> {/* Creates space for the checkbox */}
                          <Typography
                            variant="subtitle1"
                            component="div"
                            sx={{
                              fontWeight: 500,
                              color: 'text.primary',
                              width: '100%',
                              mt: 1,
                              minHeight: '60px', // Ensure consistent space for address (2 lines)
                              maxHeight: '60px', // Strict max height for address
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {sale.addressLine1 || 'No Address Available'}<br />
                            {sale.addressLine2 || ''}
                          </Typography>
                        </Box>
                      }
                      // subheader={
                      //   <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
                      //     GARAGE SALE
                      //   </Typography>
                      // }
                      sx={{
                        pb: 0,
                        width: '100%',
                        '& .MuiCardHeader-content': {
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          width: '100%'
                        }
                      }}
                    />
                  </Box>
                  <CardContent sx={{
                    pt: 0,
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start', // Align description and featured items to the top within CardContent
                    overflow: 'hidden',
                    '&:hover': {
                      overflowY: 'auto',
                      overflowX: 'hidden',
                    },
                    '&::-webkit-scrollbar': {
                      width: '4px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: 'transparent',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: 'rgba(0,0,0,0.2)',
                      borderRadius: '4px',
                    },
                  }}>
                    {sale.description ? (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          lineHeight: 1.5,
                          textAlign: 'center',
                          width: '100%',
                          p: 2,
                          boxSizing: 'border-box',
                          mb: 1.5,
                          minHeight: `calc(${1.5 * 4}em)`, // Ensure consistent space for 4 lines
                          maxHeight: `calc(${1.5 * 4}em)`, // Strict max height for description
                          overflow: 'hidden', // Hide overflow if text exceeds
                          textOverflow: 'ellipsis', // Add ellipsis
                          display: '-webkit-box',
                          WebkitLineClamp: 4,
                          WebkitBoxOrient: 'vertical',
                          // Removed alignItems/justifyContent to prevent vertical centering
                        }}
                      >
                        {sale.description}
                      </Typography>
                    ) : (
                      <Box sx={{
                        minHeight: `calc(${1.5 * 4}em)`, // Match the height of the actual description area
                        display: 'flex',
                        alignItems: 'flex-start', // Align "No description provided." to the top
                        justifyContent: 'center',
                        width: '100%',
                        p: 2,
                        boxSizing: 'border-box',
                        mb: 1.5,
                      }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          No description provided.
                        </Typography>
                      </Box>
                    )}

                    {sale.highlightedItems ? (
                      <Typography
                        variant="body2"
                        color="primary"
                        sx={{
                          fontWeight: 500,
                          mt: 0, // Align to top (no auto margin)
                          pt: 1,
                          px: 2,
                          pb: 1,
                          borderTop: '1px solid',
                          borderColor: 'divider',
                          textAlign: 'center',
                          width: '100%',
                          boxSizing: 'border-box',
                          minHeight: '20px',
                          // whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: "wrap",
                        }}
                      >
                        <Box component="span" fontWeight={500}>Highlights & Items:</Box> <br />{sale.highlightedItems}
                      </Typography>
                    ) : (
                      <Box sx={{
                        minHeight: '20px',
                        mt: 0, // Align to top (no auto margin)
                        pt: 1,
                        px: 2,
                        pb: 1,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        width: '100%',
                        boxSizing: 'border-box'
                      }} >No Items to Highlight</Box>
                    )}
                  </CardContent>
                </CardActionArea>
                <CardActions sx={{
                  justifyContent: 'flex-end',
                  pt: 0,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: 'action.hover',
                  px: 2,
                  py: 1,
                  flexShrink: 0,
                }}>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Box mt={3} textAlign="center">
        <Typography variant="body2" color="text.secondary">
          Showing {filteredSales.length} of {garageSales.length} garage sales
          {selectedSales.size > 0 && ` • ${selectedSales.size} selected`}
        </Typography>
      </Box>

      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </Container>
  );
};

export default SingleGarageSales;

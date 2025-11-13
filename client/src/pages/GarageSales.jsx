import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';//
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
import { useGarageSales } from '../context/GarageSalesContext';
import { useAuth } from '../context/AuthContext';
import { useDisplay } from '../context/DisplayContext';
import { useSearch } from '../context/SearchContext';
import { useSelection } from '../context/SelectionContext';
import { useCommunitySales } from '../context/CommunitySalesContext';
import LoginRequiredModal from '../components/LoginRequiredModal';
import api from '../utils/api';
import { logger } from '../utils/logger';

const GarageSales = () => {
  const {
    garageSales,
    loading,
    error,
    fetchGarageSales
  } = useGarageSales();

  const { searchTerm, handleSearchChange } = useSearch();
  const { selectedSales, handleCheckboxChange, handleDeselectAll } = useSelection();
  const { showOnlySelected, toggleDisplayMode } = useDisplay();

  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, userEmail, userInfo } = useAuth();
  const { communityName, setCommunityName, communityId, setCommunityId } = useCommunitySales();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showOptimizeRoute, setShowOptimizeRoute] = useState(false);
  const [optimizedRouteAddresses, setOptimizedRouteAddresses] = useState([]);
  const [showRouteList, setShowRouteList] = useState(false);
  const [userAddressList, setUserAddressList] = useState(null);
  const [optimizeFullRoute, setOptimizeFullRoute] = useState(false);
  const [selectionsInitialized, setSelectionsInitialized] = useState(false);

  // Extract communityId from URL parameters and update context/state
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const id = queryParams.get('communityId');
  


    if (id) {
      // Update local state
      setCommunityId(id);
      // Update context
      setCommunityId(id);

      // If we don't have the community name in context, fetch it
      if (!communityName) {
        logger.log('[GarageSales] Community name not in context, fetching from API');
        const fetchCommunityName = async () => {
          try {
            const apiUrl = `${import.meta.env.VITE_MAPS_API_URL}/v1/communitySales/${id}`;
            const response = await fetch(apiUrl, {
              method: 'GET',
              headers: {
                'app-name': 'web-service',
                'app-key': import.meta.env.VITE_APP_SESSION_KEY
              }
            });

            if (response.ok) {
              const data = await response.json();
              const name = data.name || 'Community Sale';
              setCommunityName(name);
              setCommunityName(name); // Also update the context
            }
          } catch (error) {
            logger.error('[GarageSales] Error fetching community name:', error);
          }
        };

        fetchCommunityName();
      } else {
        logger.log('[GarageSales] Using community name from context:', communityName);
        setCommunityName(communityName);
      }
    }
  }, [location, communityName, setCommunityId, setCommunityName]);

  // Fetch garage sales, filtered by communityId if available
  useEffect(() => {
    fetchGarageSales(communityId);
  }, [fetchGarageSales, communityId]);

  // Reset selections initialized flag when community changes
  useEffect(() => {
    setSelectionsInitialized(false);
  }, [communityId]);

  // Effect to fetch user's saved address list from server if user is logged in - only runs once on mount
  useEffect(() => {
    const fetchUserAddressList = async () => {
      if (isAuthenticated && userInfo?.userId) {
        try {
          logger.log('[GarageSales] Fetching user address list for user:', userInfo.userId);
          const userAddressListResponse = await api.getUserAddressList(userInfo.userId);

          if (userAddressListResponse && userAddressListResponse.addressList && userAddressListResponse.addressList.length > 0) {
            logger.log('[GarageSales] User has saved address list on server:', userAddressListResponse.addressList);
            setUserAddressList(userAddressListResponse.addressList);
          } else {
            logger.log('[GarageSales] User does not have a saved address list on server, using local selections');
            setUserAddressList([]);
          }
        } catch (error) {
          logger.error('[GarageSales] Error fetching user address list:', error);
          // If there's an error, we'll fall back to the local storage selections
          setUserAddressList([]);
        }
      }
    };

    fetchUserAddressList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect to filter and apply user's selected sales when garage sales are loaded
  useEffect(() => {
    if (userAddressList && garageSales && garageSales.length > 0 && communityId && !selectionsInitialized) {
      // Filter the selected sales to only include those from the current community
      let filteredSelectedSales = userAddressList;

      // Get the IDs of garage sales that belong to the current community
      const currentCommunityGarageSaleIds = garageSales.map(sale => sale.id);

      // Filter the user's selected sales to only include those in the current community
      filteredSelectedSales = userAddressList.filter(selectedSaleId =>
        currentCommunityGarageSaleIds.includes(selectedSaleId)
      );

      logger.log('[GarageSales] Filtered selected sales for current community:', filteredSelectedSales);
      logger.log('[GarageSales] Current community garage sale IDs:', currentCommunityGarageSaleIds);

      // Convert the filtered array to a Set for the selection context
      const serverSelectedSales = new Set(filteredSelectedSales);

      // Update the selected sales in the selection context
      // This will override any locally stored selections
      handleDeselectAll(); // Clear existing selections first

      // Add each server-side selection that belongs to the current community
      serverSelectedSales.forEach(saleId => {
        handleCheckboxChange(saleId);
      });

      logger.log('[GarageSales] Updated selections from server list (filtered for current community)');
      setSelectionsInitialized(true); // Mark selections as initialized
    }
  }, [userAddressList, garageSales, communityId]);

  const handleSelectionWithAuth = (saleId) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    // Just update local selection state without server calls
    handleCheckboxChange(saleId);
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
    navigate(`/?communityId=${communityId || ''}`);
  };

  const handleDeselectAllWithServerUpdate = async () => {
    // First, clear the local selections
    handleDeselectAll();

    // Then, if user is authenticated, update the server with an empty list
    if (isAuthenticated && userInfo?.userId) {
      try {
        logger.log('[GarageSales] Updating server with empty selection list for user:', userInfo.userId);

        // Call API with empty array for addressList
        const response = await api.createUpdateUserAddressList(userInfo.userId, []);
        logger.log('[GarageSales] Successfully updated server with empty selection list:', response);
      } catch (error) {
        logger.error('[GarageSales] Error updating server with empty selection list:', error);
      }
    }
  };

  const handleViewSelected = async () => {
    // Filter sales to only include those from the current communityId
    // and that are also in the selectedSales set
    const selectedSalesData = filteredSales
      .filter(sale => selectedSales.has(sale.id));

    if (selectedSalesData.length > 0) {
      // If user is authenticated, save the selection to the server
      if (isAuthenticated && userInfo?.userId) {
        try {
          logger.log('[GarageSales] Saving selected sales to server for user:', userInfo.userId);

          // Extract just the IDs for the server request, but only for the current communityId
          // This ensures we're not including sales from other community events
          const selectedSaleIds = selectedSalesData.map(sale => sale.id);

          logger.log(`[GarageSales] Filtered ${selectedSales.size} total selected sales to ${selectedSaleIds.length} sales for current community ID: ${communityId}`);

          // Save the selected sales to the server with the current communityId
          const response = await api.createUpdateUserAddressList(userInfo.userId, selectedSaleIds, communityId);
          logger.log('[GarageSales] Successfully saved selected sales to server:', response);

          // Optional: Show a success message
          // alert('Your selected garage sales have been saved to your account.');
        } catch (error) {
          logger.error('[GarageSales] Error saving selected sales to server:', error);
          // Continue with navigation even if server save fails
          // We don't want to block the user from viewing their selections
        }
      } else {
        logger.log('[GarageSales] User not authenticated, skipping server save of selected sales');
      }

      // If not already showing only selected sales, turn it on
      if (!showOnlySelected) {
        toggleDisplayMode();
      }

      // Store only the selected sales for this community in localStorage
      localStorage.setItem('selectedSales', JSON.stringify(selectedSalesData));

      // Navigate to the map page to view the selected sales
      navigate(`/?communityId=${communityId || ''}`);
    } else {
      alert('Please select at least one garage sale to view on the map.');
    }
  };

  const handleOptimizeRoute = async () => {
    // Determine if we're optimizing the full route or just selected sales
    const isFullRouteOptimization = selectedSales.size === 0;
    setOptimizeFullRoute(isFullRouteOptimization);

    logger.log(`[GarageSales] Optimizing ${isFullRouteOptimization ? 'FULL route' : 'SELECTED sales route'}`);

    // If there are selected sales and the user is authenticated, save them to the backend first
    if (selectedSales.size > 0 && isAuthenticated && userInfo?.userId) {
      try {
        logger.log('[GarageSales] Saving selected sales to server before optimization for user:', userInfo.userId);

        // Filter sales to only include those from the current communityId
        // and that are also in the selectedSales set
        const selectedSalesData = filteredSales
          .filter(sale => selectedSales.has(sale.id));

        // Extract just the IDs for the server request
        const selectedSaleIds = selectedSalesData.map(sale => sale.id);

        logger.log(`[GarageSales] Saving ${selectedSaleIds.length} selected sales for current community ID: ${communityId}`);

        // Save the selected sales to the server with the current communityId
        const response = await api.createUpdateUserAddressList(userInfo.userId, selectedSaleIds, communityId);
        logger.log('[GarageSales] Successfully saved selected sales to server before optimization:', response);
      } catch (error) {
        logger.error('[GarageSales] Error saving selected sales to server before optimization:', error);
        // Continue with optimization even if server save fails
        // We don't want to block the user from optimizing their route
      }
    }

    // Show the optimize route view to let the user select a starting point
    // This will eventually call handleSelectFirstVisit with the appropriate endpoint
    // based on whether there are selected sales or not
    setShowOptimizeRoute(true);
  };

  const handleFullRouteOptimization = async () => {
    try {
      logger.log('[GarageSales] Getting full route optimization');

      // Get sessionId from localStorage
      const sessionId = localStorage.getItem('sessionId');

      // Make API call to get optimized route without a specific starting point
      let optimizedRouteData = null;

      const response = await fetch(`${import.meta.env.VITE_MAPS_API_URL}/v1/getOptimzedRoute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'app-key': import.meta.env.VITE_APP_API_KEY,
          'app-name': 'postman-call',
          'sessionId': sessionId
        },
        body: JSON.stringify({
          communityId: communityId
          // No startingAddressId means the API will optimize the full route
        })
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      optimizedRouteData = await response.json();
      logger.log('[GarageSales] API Response:', optimizedRouteData);

      // Process the response
      if (optimizedRouteData && optimizedRouteData.orderedWaypoints) {
        logger.log('[GarageSales] Using optimized route data:', optimizedRouteData);

        // Store the optimized route data in localStorage for the map to use
        localStorage.setItem('optimizedRoute', JSON.stringify(optimizedRouteData));

        // Set the optimized route addresses for display
        setOptimizedRouteAddresses(optimizedRouteData.orderedWaypoints);

        // Show the route list
        setShowRouteList(true);
      } else {
        throw new Error('Invalid route data received');
      }

    } catch (error) {
      logger.error('[GarageSales] Error getting optimized route:', error);
      // Show user-friendly error message
      alert(`Error optimizing route: ${error.message}`);
    }
  };

  const handleSelectFirstVisit = async (saleId) => {
    try {
      logger.log('[GarageSales] Selected first visit:', saleId);

      // Get sessionId from localStorage
      const sessionId = localStorage.getItem('sessionId');

      // Make API call to get optimized route
      let optimizedRouteData = null;

      // Make API call to get optimized route
      // Use different endpoints based on whether we're optimizing full route or selected sales
      // If optimizeFullRoute is true, we always use the regular endpoint regardless of selections
      const endpoint = !optimizeFullRoute && selectedSales.size > 0
        ? `${import.meta.env.VITE_MAPS_API_URL}/v1/getOptimzedRoute/bySavedList`
        : `${import.meta.env.VITE_MAPS_API_URL}/v1/getOptimzedRoute`;

      logger.log(`[GarageSales] Using endpoint: ${endpoint} (optimizeFullRoute=${optimizeFullRoute}, selectedSales.size=${selectedSales.size})`);

      // Prepare the request payload based on the endpoint
      const payload = !optimizeFullRoute && selectedSales.size > 0
        ? {
          startingAddressId: saleId,
          communityId: communityId || id,
          userId: userInfo?.userId || ''
        }
        : {
          startingAddressId: saleId,
          communityId: communityId || id
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
      logger.log('[GarageSales] API Response:', optimizedRouteData);

      // Process the response
      if (optimizedRouteData && optimizedRouteData.orderedWaypoints) {
        logger.log('[GarageSales] Using optimised route data:', optimizedRouteData);

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

        logger.log('[GarageSales] Address to sale map created with', Object.keys(addressToSaleMap).length, 'entries');

        // Process the ordered waypoints from the API
        const filteredWaypoints = [];
        logger.log('[GarageSales] Ordered waypoints from API:', optimizedRouteData.orderedWaypoints);

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

          logger.log(`[GarageSales] Processing waypoint ${index + 1}:`, waypointAddress);

          if (waypointAddress) {
            // Normalize the address for matching
            const normalizedAddress = waypointAddress.toLowerCase().replace(/\s+/g, ' ').trim();

            // Find the matching sale by address
            const matchingSale = addressToSaleMap[normalizedAddress];

            if (matchingSale) {
              logger.log('[GarageSales] Found matching sale with ID:', matchingSale.id);

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
              logger.log('[GarageSales] No matching sale found for address:', waypointAddress);

              // Include the waypoint even without a matching sale
              filteredWaypoints.push({
                address: waypointAddress,
                description: `Stop ${index + 1}`,
                routeOrder: index + 1
              });
            }
          }
        });

        logger.log('[GarageSales] Filtered waypoints with route order:', filteredWaypoints);

        // Create a modified optimized route data with only selected sales
        const filteredOptimizedRouteData = {
          ...optimizedRouteData,
          orderedWaypoints: filteredWaypoints
        };

        // Store the filtered optimized route data in localStorage for the map to use
        localStorage.setItem('optimizedRoute', JSON.stringify(filteredOptimizedRouteData));

        // Set the optimized route addresses for display
        setOptimizedRouteAddresses(filteredWaypoints);

        // Close the optimize route view and show the route list
        setShowOptimizeRoute(false);
        setShowRouteList(true);
      } else {
        throw new Error('Invalid route data received');
      }

    } catch (error) {
      logger.error('[GarageSales] Error getting optimised route:', error);
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

    // Navigate to map view with parameters
    navigate(`/?communityId=${communityId}&showOptimizedRoute=true`);

    // Close the route list view
    setShowRouteList(false);
  };

  const filteredSales = garageSales.filter(sale =>
    (sale.address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sale.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sale.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // console.log("JMD", JSON.stringify(garageSales, null, 2));

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
            <Button color="inherit" size="small" onClick={fetchGarageSales}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  // Get selected sales for display
  const selectedSalesData = garageSales.filter(sale => selectedSales.has(sale.id));

  // Show optimized route list if active
  if (showRouteList && optimizedRouteAddresses.length > 0) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box mb={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            {communityName ? `${communityName} - Optimised Route` : 'Optimised Route'}
          </Typography>
          <Typography variant="body1" color="textSecondary" paragraph>
            <strong>Your optimised route in order of visits:</strong>
          </Typography>
        </Box>

        <Paper elevation={2} sx={{ mb: 4, borderRadius: 2, overflow: 'hidden' }}>
          <List disablePadding>
            {optimizedRouteAddresses.slice(0, -1).map((waypoint, index) => (
              <React.Fragment key={index}>
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
                    primary={waypoint.address || 'No Address Available'}
                    secondary={waypoint.description || ''}
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
                {index < optimizedRouteAddresses.length - 2 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        </Paper>

        <Box display="flex" justifyContent="space-between" mt={4}>
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
            View on Map
          </Button>
        </Box>
      </Container>
    );
  }

  // Show optimize route view if active
  if (showOptimizeRoute) {
    // Use all sales data if there are no selections, otherwise use selected sales
    const salesToDisplay = selectedSales.size > 0 ? selectedSalesData : filteredSales;
    const displayMessage = selectedSales.size > 0 ?
      `Showing ${salesToDisplay.length} selected garage sales` :
      `Showing all ${salesToDisplay.length} garage sales`;

    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box mb={3}>
          <Typography variant="h4" component="h1" gutterBottom>
            {communityName ? `${communityName} - Optimised Route` : 'Optimised Route'}
          </Typography>
          <Typography variant="body1" color="textSecondary" paragraph>
            <strong>Click on the address which will be your first visit</strong>
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBackToSelection}
          sx={{ mb: 3 }}
        >
          Back to Selection
        </Button>

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
                    {/* {sale.description && (
                      <Typography variant="body2" color="text.secondary">
                        {sale.description}
                      </Typography>
                    )} */}
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

  // Main component return
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={4}>
        {/* <Typography variant="h4" component="h1" gutterBottom> */}
        <h1>{communityId === 'GENPUB' ? 'Garage Sales' : (communityName || 'Garage Sales')}</h1>
        {/* </Typography><br /> */}
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
              flex: 1,
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'background.paper',
              },
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
              </>
            )}
            {communityId !== 'GENPUB' && (
              <Button
                variant={selectedSales.size > 0 ? "outlined" : "contained"}
                color="primary"
                onClick={handleOptimizeRoute}
                startIcon={<RouteIcon />}
                fullWidth={isMobile}
              >
                {selectedSales.size > 0 ? 'Optimise Selected' : 'Optimise Full Route'}
              </Button>
            )}
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
        <Grid container spacing={2} sx={{ display: 'flex', flexWrap: 'wrap' }} style={{ justifyContent: 'center' }}>
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
                            {sale.address || 'No Address Available'}<br />
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
                    {sale.description && (
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

export default GarageSales;

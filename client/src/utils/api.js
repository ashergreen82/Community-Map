import axios from 'axios';
import { logger } from './logger';

// Track processed Google auth codes to prevent duplicate requests
const processedAuthCodes = new Set();

// Session API configuration
const sessionApi = axios.create({
  baseURL: import.meta.env.VITE_SESSION_API_URL || '/session-api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'app-name': 'web-service',
    'app-key': import.meta.env.VITE_APP_SESSION_KEY
  }
});

// Maps API configuration
const mapsApi = axios.create({
  baseURL: import.meta.env.VITE_MAPS_API_URL || '/maps-api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'app-key': import.meta.env.VITE_APP_SESSION_KEY,
    'app-name': 'web-service'
  },
  withCredentials: false
});

// Auth (Logging in) API configuration
const authApi = axios.create({
  baseURL: import.meta.env.VITE_AUTH_API_URL || '/auth-api', // Always use the proxy path
  timeout: 30000,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'app-name': 'web-service',
    'app-key': import.meta.env.VITE_APP_API_KEY
  },
  withCredentials: false // Must be false to avoid CORS issues with wildcard response
});

// Create Customer/user API configuration
const createCustomerApi = axios.create({
  baseURL: import.meta.env.VITE_CUSTOMER_API_URL || '/customer-api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'app-name': 'web-service',
    'app-key': import.meta.env.VITE_APP_SESSION_KEY
  }
});

// User Information API configuration
const userInformationApi = axios.create({
  baseURL: import.meta.env.VITE_CUSTOMER_API_URL ? `${import.meta.env.VITE_CUSTOMER_API_URL}/v1/getCustomerByEmail/EMAIL` : '/customer-api/v1/getCustomerByEmail/EMAIL',
  timeout: 30000,
  // withCredentials: true, //flagged with true when it should be false
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'app-name': 'web-service',
    'app-key': import.meta.env.VITE_APP_SESSION_KEY
  }
});

// Add response interceptor to handle errors
const errorInterceptor = error => {
  logger.error('[api] 🔴 API Error Details:', {
    // Request details
    request: {
      url: error.config?.url,
      method: error.config?.method,
      baseURL: error.config?.baseURL,
      headers: {
        ...error.config?.headers,
        'app-key': error.config?.headers['app-key'] ? '[PRESENT]' : '[MISSING]'
      },
      data: error.config?.data
    },
    // Response details
    response: {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers
    },
    // Error specific details
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  });
  
  // Log the request headers that were actually sent
  logger.log('[api] 📨 Request Headers:', {
    contentType: error.config?.headers['Content-Type'],
    appName: error.config?.headers['app-name'],
    appKey: error.config?.headers['app-key'] ? '[PRESENT]' : '[MISSING]',
    sessionId: error.config?.headers['sessionId']
  });
  
  return Promise.reject(error);
};

// Add request interceptor to log headers
const requestInterceptor = async config => {
  const currentSessionId = localStorage.getItem('sessionId');
  logger.log('[api] Current session ID before request:', currentSessionId);
  
  // Ensure headers object exists
  config.headers = config.headers || {};
  
  // Add session ID if it exists
  if (currentSessionId) {
    config.headers['sessionId'] = currentSessionId;
    logger.log('[api] Added session ID to request headers');
  } else {
    logger.log('[api] No session ID available for request');
  }
  
  logger.log('[api] Final request config:', {
    url: config.url,
    method: config.method,
    headers: {
      contentType: config.headers['Content-Type'],
      appName: config.headers['app-name'],
      appKey: config.headers['app-key'] ? '[PRESENT]' : '[MISSING]',
      sessionId: config.headers['sessionId']
    }
  });
  
  return config;
};

sessionApi.interceptors.response.use(response => response, errorInterceptor);
authApi.interceptors.response.use(response => response, errorInterceptor);
mapsApi.interceptors.response.use(response => response, errorInterceptor);
userInformationApi.interceptors.response.use(response => response, errorInterceptor);

authApi.interceptors.request.use(requestInterceptor);
userInformationApi.interceptors.request.use(requestInterceptor);
mapsApi.interceptors.request.use(requestInterceptor);

// Create a new session
const createSession = async () => {
  try {
    logger.log('[api] Creating new session...');
    logger.log('[api] Previous sessionId in localStorage:', localStorage.getItem('sessionId'));
    const response = await sessionApi.post('/createSession');
    logger.log('[api] Create session raw response:', response);
    
    if (!response.data) {
      throw new Error('No response data received from createSession');
    }

    // Handle the nested response structure
    const sessionData = response.data.data || response.data;
    
    if (!sessionData) {
      logger.error('[api] Invalid response structure:', response.data);
      throw new Error('No session data in response');
    }

    const sessionId = sessionData.sessionId || sessionData.sessionID; //updated the OR to include ID rahter than Id again (was duplicated)
    
    if (!sessionId) {
      logger.error('[api] Invalid session data structure:', sessionData);
      throw new Error('No sessionId in response data');
    }

    logger.log('[api] New session data:', sessionData);
    logger.log('[api] Setting new sessionId in localStorage:', sessionId);
    // sessionStorage.setItem('sessionId', sessionId);// Line 171 in api.js
    localStorage.setItem('sessionId', sessionId);
    return sessionId;
  } catch (error) {
    logger.error('[api] Error creating session:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      }
    });
    throw error;
  }
};

// Verify session is valid
const verifySession = async (sessionId) => {
  try {
    logger.log('[api] Verifying session:', sessionId);
    const response = await sessionApi.get(`/getSessionDetailsById/${sessionId}`);
    logger.log('[api] Session verification response:', response);
    return true;
  } catch (error) {
    logger.error('[api] Session verification failed:', error);
    return false;
  }
};

// Get or create session ID - central function for session management
const getSessionId = async () => {
  const storedSessionId = localStorage.getItem('sessionId');
  if (storedSessionId) {
    logger.log('[api] Found stored session:', storedSessionId);
    const isValid = await verifySession(storedSessionId);
    if (isValid) {
      logger.log('[api] Stored session is valid');
      return storedSessionId;
    }
    logger.log('[api] Stored session is invalid, creating new one...');
    localStorage.removeItem('sessionId');
  }
  return await createSession();
};

// Custom get method for addresses - defaults to Bay Ridges Community Sales if no ID provided
const getAddresses = async (communityId = 'eef06da4-788b-435b-8f84-9467dd5b89a9') => {
  try {
    logger.log('[api] Starting getAddresses call...');
    
    // Ensure we have a valid session
    logger.log('[api] Getting session ID...');
    await getSessionId(); // This will create or verify the session
    
    // Make the request - sessionId will be added by interceptor
    logger.log(`[api] Making request to /getAddressByCommunity/${communityId}...`);
    const response = await mapsApi.get(`/v1/getAddressByCommunity/${communityId}`);
    
    logger.log('[api] Successful response from backend:', response);
    return response;
  } catch (error) {
    logger.error('[api] Error in getAddresses:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      }
    });
    throw error;
  }
};

// Get addresses for a specific community
const getAddressesByCommunity = async (communityId) => {
  try {
    logger.log(`[api] Starting getAddressesByCommunity call for community ${communityId}...`);
    
    // Ensure we have a valid session
    logger.log('[api] Getting session ID...');
    await getSessionId(); // This will create or verify the session
    
    // Make the request - sessionId will be added by interceptor
    logger.log(`[api] Making request to /getAddressByCommunity/${communityId}...`);
    const response = await mapsApi.get(`/v1/getAddressByCommunity/${communityId}`);
    
    logger.log('[api] Successful response from backend:', response);
    return response;
  } catch (error) {
    logger.error(`[api] Error in getAddressesByCommunity for community ${communityId}:`, {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      }
    });
    throw error;
  }
};

// Get user information by email
async function getUserInfo(email) {
  try {
    logger.log('[api] Getting user info for email:', email);
    
    // Ensure we have a valid session
    const sessionId = await getSessionId();
    logger.log('[api] Using session ID for user info request:', sessionId);
    
    // Make the request
    logger.log('[api] Making user info request...');
    const response = await userInformationApi.get(email);
    logger.log('[api] User info response:', response);
    
    // Get the raw data
    let userData = response.data;
    
    // Normalize the user data to ensure consistent property names
    // This ensures that properties are accessible regardless of the API response format
    const normalizedUserData = {
      ...userData,
      // Ensure fName and lName are always available for the hamburger menu
      fName: userData.fName || userData.firstName || userData.given_name || '',
      lName: userData.lName || userData.lastName || userData.family_name || '',
      // Also keep firstName/lastName for backward compatibility
      firstName: userData.firstName || userData.fName || userData.given_name || '',
      lastName: userData.lastName || userData.lName || userData.family_name || '',
      // Ensure email is always available
      email: userData.email || email
    };
    
    logger.log('[api] Normalized user data:', normalizedUserData);
    return normalizedUserData;
  } catch (error) {
    logger.error('[api] Error fetching user information:', error);
    throw error;
  }
}

// Create a new garage sale
const createGarageSale = async (saleData) => {
  try {
    const sessionId = await getSessionId();
    logger.log('[api] Sending sale data to API:', JSON.stringify(saleData, null, 2));
    
    const response = await mapsApi.post('/v1/createAddress', saleData, {
      headers: {
        'sessionId': sessionId,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    logger.error('[api] Create garage sale error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.config?.headers,
      url: error.config?.url,
      method: error.config?.method,
      data: error.config?.data
    });
    
    if (error.response?.data?.code === 'ERR_MAPS001' && 
        error.response?.data?.errorMsg === 'Existing Address') {
      throw new Error('A garage sale already exists at this address');
    }
    
    // Add more specific error messages based on status code
    if (error.response?.status === 400) {
      throw new Error(`Invalid request: ${error.response.data?.message || 'Please check your input and try again'}`);
    }
    
    throw new Error(error.response?.data?.message || 'Failed to create garage sale. Please try again.');
  }
};

// Get garage sales for a specific user
const getUserGarageSale = async (userId) => {
  try {
    const sessionId = await getSessionId();
    const response = await mapsApi.get(`/v1/getUserGarageSales/${userId}`, {
      headers: {
        'sessionId': sessionId
      }
    });
    return response.data;
  } catch (error) {
    logger.error('[api] Get user garage sale error:', error);
    throw error;
  }
};

// Delete a garage sale
const deleteGarageSale = async (saleIds) => {
  try {
    const currentSessionId = await getSessionId();
    
    // Handle both single ID and array of IDs
    const idsToDelete = Array.isArray(saleIds) ? saleIds : [saleIds];
    
    logger.log('[api] Deleting garage sales with IDs:', idsToDelete);
    
    const response = await mapsApi.delete('/v1/deleteAddress', {
      headers: {
        'sessionId': currentSessionId,
        'Content-Type': 'application/json'
      },
      data: idsToDelete
    });
    
    logger.log('[api] Delete response:', response);
    return response.data;
  } catch (error) {
    logger.error('[api] Delete garage sale error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    throw error;
  }
};

// Delete a community sale
const deleteCommunitySale = async (saleId) => {
  try {
    const currentSessionId = await getSessionId();
    
    logger.log('[api] Deleting community sale with ID:', saleId);
    
    const response = await mapsApi.delete(`/v1/communitySales/delete/${saleId}`, {
      headers: {
        'sessionId': currentSessionId,
        'Content-Type': 'application/json',
        'app-name': 'web-service',
        'app-key': import.meta.env.VITE_APP_SESSION_KEY
      }
    });
    
    logger.log('[api] Delete community sale response:', response);
    
    // Backend returns 'true' for successful deletion, 'null' if not deleted or not found
    if (response.data === true) {
      return true;
    } else if (response.data === null) {
      throw new Error('Community sale could not be deleted or was not found');
    } else {
      // Handle any other unexpected response
      logger.warn('[api] Unexpected response format from delete community sale:', response.data);
      return response.data;
    }
  } catch (error) {
    logger.error('[api] Delete community sale error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    throw error;
  }
};

// Get user's saved address list
const getUserAddressList = async (userId) => {
  try {
    logger.log('[api] Fetching user address list for userId:', userId);
    const sessionId = await getSessionId();
    
    const response = await mapsApi.get(`/v1/userAddressList/getUserAddressList/${userId}`, {
      headers: {
        'sessionId': sessionId
      }
    });
    
    logger.log('[api] User address list response:', response);
    return response.data;
  } catch (error) {
    logger.error('[api] Error fetching user address list:', error);
    
    // If the error is a 404, it means the user doesn't have a saved list
    if (error.response?.status === 404) {
      return false;
    }
    
    // Extract error message from response if available
    const errorMessage = error.response?.data?.message || 
                         error.response?.data?.error || 
                         error.message || 
                         'Failed to fetch user address list';
    
    throw new Error(errorMessage);
  }
};

// Update a garage sale
const updateGarageSale = async (saleId, updateData) => {
  try {
    const sessionId = await getSessionId();
    
    const response = await mapsApi.patch(`/v1/updateAddress/${saleId}`, updateData, {
      headers: {
        'sessionId': sessionId
      }
    });
    
    logger.log('[api] Updated garage sale:', response.data);
    return response.data;
  } catch (error) {
    logger.error('[api] Error updating garage sale:', error);
    throw error;
  }
};

// Authentication methods
const register = async (userEmail, password, firstName, lastName) => {
  try {
    // First create a session
    const sessionResponse = await createSession();
    logger.log('[api] Current session ID before request:', sessionResponse);
    
    // Prepare the request body to match the exact format from curl
    const requestBody = {
      fName: firstName,
      lName: lastName,
      userEmail: userEmail,
      password: password,
      regType: "MANUAL",
      userType: "USER"
    };

    // Log complete request details
    logger.log('[api] Registration Request Details:', {
      method: 'POST',
      url: createCustomerApi.defaults.baseURL + '/v1/createCustomer',
      headers: {
        ...createCustomerApi.defaults.headers,
        'sessionId': sessionResponse
      },
      body: requestBody
    });

    // Make the registration request
    try {
      const response = await createCustomerApi.post('/v1/createCustomer', requestBody, {
        headers: {
          'sessionId': sessionResponse
        }
      });
    
      logger.log('[api] Registration Response Details:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      });
      
      if (response.status === 200) {
        // Store sessionId if it exists in the response
        if (response.data?.sessionId) {
          localStorage.setItem('sessionId', response.data.sessionId);
        }
        return response.data;
      }
    } catch (error) {
      logger.error('[api] Registration error:', error);

      if (error.response?.status === 400) {
        // display a modal with the error message
        throw new Error(error.response?.data?.errorMsg);
      }

      throw error;
    }
    throw new Error('Registration failed: ' + response.statusText);
  } catch (error) {
    logger.error('[api] Registration Error Details:', {
      name: error.name,
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      request: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
        data: error.config?.data
      }
    });
    throw error;
  }
};

const login = async (email, password) => {
  try {
    // First ensure we have a valid session
    const sessionId = await getSessionId();
    logger.log('[api] Created/Retrieved session for login:', sessionId);
    
    // Create form data
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    formData.append('type', 'EMAIL');

    logger.log('[api] Sending login request with sessionId:', sessionId);
    
    // Create temporary headers with sessionId for this request
    const headers = { 
      'Content-Type': 'application/x-www-form-urlencoded',
      'app-name': 'web-service',
      'app-key': import.meta.env.VITE_APP_API_KEY,
      'sessionId': sessionId
    };
    
    // Use the full backend URL from environment variable
    const authApiUrl = import.meta.env.VITE_AUTH_API_URL || 'https://br-auth-api-dev001-207215937730.us-central1.run.app';
    const fullLoginUrl = `${authApiUrl}/login`;
    
    logger.log('[api] Login Request Details:', {
      url: fullLoginUrl,
      method: 'POST',
      headers: headers,
      body: formData.toString(),
      credentials: 'omit'
    });
    
    const fetchResponse = await fetch(fullLoginUrl, {
      method: 'POST',
      headers: headers,
      body: formData,
      credentials: 'omit' // Don't send cookies or HTTP auth
    });
    
    // Check if the response is successful
    if (!fetchResponse.ok) {
      logger.error('[api] Login failed with status:', fetchResponse.status);
      const errorText = await fetchResponse.text();
      logger.error('[api] Error response:', errorText);
      throw new Error(`Login failed with status ${fetchResponse.status}: ${errorText}`);
    }
    
    // Convert fetch response to a format similar to axios
    const responseData = await fetchResponse.text();
    let response;
    try {
      // Try to parse as JSON if possible
      response = { data: JSON.parse(responseData) };
    } catch (e) {
      // If not JSON, handle as boolean or text
      response = { data: responseData === 'true' };
    }
    
    logger.log('[api] Login response:', response);
    
    // Check if login was successful
    if (response.data === true || response.data.success === true) {
      logger.log('[api] Login successful, fetching user info');
      
      // Ensure we have email (the parameter passed to this function)
      if (!email) {
        logger.error('[api] Email is undefined during login process');
        throw new Error('Email is required for user information retrieval');
      }
      
      try {
        // If login successful, fetch user information
        const userInfo = await getUserInfo(email);
        
        // Return the structured data needed by AuthContext
        return {
          data: {
            sessionId: sessionId,
            userId: userInfo.userId,
            userType: userInfo.userType,
            userInfo: userInfo // Include full user info
          }
        };
      } catch (userInfoError) {
        logger.error('[api] Error fetching user info after successful login:', userInfoError);
        // Still return a successful login but with minimal user info
        return {
          data: {
            sessionId: sessionId,
            userId: email, // Use email as fallback userId if userInfo fetch fails
            userType: 'USER', // Default user type
            userInfo: { email, fName: '', lName: '' } // Minimal user info
          }
        };
      }
    }
    throw new Error('Invalid login response');
  } catch (error) {
    logger.error('[api] Login error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
        data: error.config?.data
      }
    });
    if (error.response?.status === 404) {
      throw new Error('Login endpoint not found. Please check the API configuration.');
    }
    // if response status is 401 throw error "please check credentials"
    throw new Error(error.response?.data?.message || 'Login failed. Please check your credentials.');
    // otherwise
    // throw error "Server is down. Please try again."
  }
};

const logout = async () => {
  try {
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      await authApi.post('/auth/logout', { 
        sessionId,
        application: 'web-service'
      });
      localStorage.removeItem('sessionId');
    }
  } catch (error) {
    logger.error('[api] Logout error:', error);
    // Still remove the session ID even if the server call fails
    localStorage.removeItem('sessionId');
    throw error;
  }
};

// Request password reset - send email to user
const requestPasswordReset = async (email) => {
  try {
    // Get or create session ID
    const sessionId = await getSessionId();
    logger.log('[api] Using session for password reset request:', sessionId);
    
    const response = await authApi.post('/sendResetEmail', { 
      userEmail: email
    }, {
      headers: {
        sessionId: sessionId
      }
    });
    logger.log('[api] Password reset email sent successfully');
    return response.data;
  } catch (error) {
    logger.error('[api] Password reset request error:', error);
    if (error.response && error.response.status === 404) {
      throw new Error('Password reset service unavailable. Please try again later.');
    }
    throw new Error(error.response?.data?.message || 'Failed to send password reset email. Please try again.');
  }
};

// Verify reset token - no longer needed as a separate function
// We'll use the token directly in resetPassword
const verifyResetToken = async (token) => {
  try {
    // Just return success since verification happens when resetting the password
    logger.log('[api] Token will be verified during password reset');
    return { valid: true };
  } catch (error) {
    logger.error('[api] Token verification error:', error);
    throw new Error('Failed to verify reset token. Please try again.');
  }
};

// Reset password with token
const resetPassword = async (token, newPassword, userEmail) => {
  try {
    // Get or create session ID
    const sessionId = await getSessionId();
    logger.log('[api] Using session for password reset:', sessionId);
    logger.log('[api] Headers being sent to the backend:', {
      sessionId: sessionId,
      token,
      userEmail,
      newPassword,
      appCode: 'app1234'//import.meta.env.VITE_APP_CODE || '6mful1WT8NOcQLTrYdHLskYSOL4hXQ5c'
    });
    
    const response = await authApi.patch('/resetPassword', { 
      token,
      userEmail,
      newPassword,
      appCode: 'app1234'//import.meta.env.VITE_APP_CODE || '6mful1WT8NOcQLTrYdHLskYSOL4hXQ5c'
    }, {
      headers: {
        sessionId: sessionId
      }
    });
    logger.log('[api] Server response from password reset:', response);
    logger.log('[api] Password reset successful');
    return response.data;
  } catch (error) {
    logger.error('[api] Password reset error:', error);
    if (error.response && error.response.status === 400) {
      throw new Error('Invalid token or password requirements not met. Please try again.');
    }
    throw new Error(error.response?.data?.message || 'Failed to reset password. Please try again.');
  }
};

// Add the custom methods to the api object
const api = {
  createSession,
  getSessionId,
  verifySession,
  getAddresses,
  getAddressesByCommunity,
  getUserInfo,
  createGarageSale,
  getUserGarageSale,
  deleteGarageSale,
  updateGarageSale,
  register,
  login,
  logout,
  
  // Create or update user's saved address list
  createUpdateUserAddressList: async (userId, addressList, community = 'eef06da4-788b-435b-8f84-9467dd5b89a9') => {
    try {
      logger.log('[api] Saving user address list for user:', userId);
      const sessionId = await getSessionId();
      
      const payload = {
        userId: userId,
        addressList: Array.isArray(addressList) ? addressList : Array.from(addressList), // Ensure addressList is an array
        community: community // Always include community parameter
      };
      
      // Using mapsApi instead of createCustomerApi to use VITE_MAPS_API_URL
      logger.log('[api] Saving user address list payload:', payload);
      
      // Ensure headers match exactly what's in the CURL example
      const response = await mapsApi.post('/v1/userAddressList/createUpdateUserAddressList', payload, {
        headers: {
          'sessionId': sessionId,
          'Content-Type': 'application/json',
          'app-name': 'web-service',
          'app-key': import.meta.env.VITE_APP_SESSION_KEY
        }
      });
      
      logger.log('[api] User address list saved successfully:', response.data);
      return response.data;
    } catch (error) {
      logger.error('[api] Error saving user address list:', error);
      throw error;
    }
  },
  
  // Google SSO login
  googleLogin: async () => {
    try {
      // Google OAuth parameters
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID_PLACEHOLDER';
      const redirectUri = import.meta.env.VITE_REDIRECT_URI || 'http://localhost:5173/loginRedirect';
      const scope = 'email profile';
      // Use authorization code flow instead of implicit flow
      const responseType = 'code';
      
      
      // Construct the Google OAuth URL
      const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=${encodeURIComponent(responseType)}`;
      
      logger.log('[api] Redirecting to Google OAuth:', authUrl);
      
      // Redirect the user to Google login
      window.location.href = authUrl;
      
      return { success: true };
    } catch (error) {
      logger.error('[api] Error initiating Google login:', error);
      throw error;
    }
  },
  
  
  // Handle Google SSO callback
  handleGoogleCallback: async (code) => {
    try {
      // Check if this code has already been processed
      if (processedAuthCodes.has(code)) {
        logger.log('[api] This authorization code has already been processed, preventing duplicate request');
        
        // Instead of returning minimal data, retrieve the user info from localStorage
        const storedUserInfo = localStorage.getItem('userInfo');
        const storedEmail = localStorage.getItem('userEmail');
        
        if (storedUserInfo) {
          try {
            // Parse the stored user info
            const userData = JSON.parse(storedUserInfo);
            logger.log('[api] Using stored user data from localStorage:', userData);
            return { success: true, user: userData };
          } catch (e) {
            logger.error('[api] Error parsing stored user info:', e);
          }
        }
        
        // If we couldn't get valid user data from localStorage but have an email
        if (storedEmail && storedEmail !== 'cached_request') {
          return { success: true, user: { 
            email: storedEmail
          }};
        }
        
        // As a last resort, clear the processed codes set to force a fresh login
        logger.log('[api] No valid user data found in localStorage, clearing processed codes');
        processedAuthCodes.clear();
      }
      
      // Mark this code as being processed
      processedAuthCodes.add(code);
      
      // Get or create session ID
      const sessionId = await getSessionId();
      logger.log('[api] Using session for Google SSO:', sessionId);
      
      // Send the authorization code to the backend
      logger.log('[api] 🔐 Google authorization code received:', code);
      logger.log('[api] Sending auth code to backend for token exchange');
      
      const response = await authApi.post('/login', {
        token: code,
        redirectUri: import.meta.env.VITE_REDIRECT_URI || 'http://localhost:5173/loginRedirect', // Must match the original redirect URI
        sessionId: sessionId,
        type: "SSO_G"
      }, {
        headers: {
          sessionId: sessionId,
          'app-name': 'web-service',
          'app-key': import.meta.env.VITE_APP_API_KEY
        }
      });
      
      // The backend should exchange the code for tokens and return user info
      logger.log('[api] Google authentication successful');
      
      if (!response.data || !response.data.success) {
        // If request fails, remove the code from processed set so it can be tried again
        processedAuthCodes.delete(code);
        throw new Error('Invalid response from Google authentication');
      }
      
      // Extract email from the response
      let email;
      if (typeof response.data.user === 'string') {
        email = response.data.user;
      } else if (response.data.user && response.data.user.email) {
        email = response.data.user.email;
      } else {
        email = response.data.email;
      }
      
      if (!email) {
        throw new Error('No email found in Google authentication response');
      }
      
      logger.log('[api] Retrieved email from SSO:', email);
      
      // Extract any available name information from the response
      let firstName = '';
      let lastName = '';
      
      if (response.data.user && typeof response.data.user !== 'string') {
        firstName = response.data.user.firstName || response.data.user.given_name || '';
        lastName = response.data.user.lastName || response.data.user.family_name || '';
      } else {
        firstName = response.data.firstName || response.data.given_name || '';
        lastName = response.data.lastName || response.data.family_name || '';
      }
      
      // Always make a separate call to get full user information from the backend
      let userData;
      try {
        // Fetch complete user information using the email
        logger.log('[api] Making separate backend call for complete user information...');
        userData = await getUserInfo(email); // This function already normalizes the data
        logger.log('[api] Complete user info retrieved successfully:', userData);
      } catch (userInfoError) {
        logger.error('[api] Failed to retrieve user info from backend:', userInfoError);
        
        // Create a comprehensive fallback user object
        userData = {
          // Required fields for display in UI
          email: email,
          fName: firstName,
          lName: lastName,
          firstName: firstName,
          lastName: lastName,
          // Extra fields that might be needed
          userId: `google-${email}`,
          userType: 'USER',
          id: `google-${email}`
        };
        
        logger.log('[api] Using fallback user data for hamburger menu display:', userData);
      }
      
      // Final verification to ensure required fields exist
      if (!userData.fName && (userData.firstName || firstName)) {
        userData.fName = userData.firstName || firstName;
      }
      
      if (!userData.lName && (userData.lastName || lastName)) {
        userData.lName = userData.lastName || lastName;
      }
      
      if (!userData.email) {
        userData.email = email;
      }
      
      logger.log('[api] Final normalized user data for UI display:', userData);
      
      return {
        success: true,
        user: userData
      };
    } catch (error) {
      logger.error('[api] Error handling Google callback:', error);
      if (error.response && error.response.status === 400) {
        throw new Error('Invalid authorization code. Please try logging in again.');
      } else if (error.response && error.response.status === 404) {
        throw new Error('Google login service unavailable. Please try again later.');
      }
      throw new Error(error.response?.data?.message || 'Failed to authenticate with Google. Please try again.');
    }
  },
  
  requestPasswordReset,
  verifyResetToken,
  resetPassword,
  getUserAddressList,
  getAddressesByCommunity,
  deleteCommunitySale
};

export default api;

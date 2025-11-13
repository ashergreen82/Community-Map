import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { logger } from '../utils/logger';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sessionId, setSessionId] = useState(localStorage.getItem('sessionId') || null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userType, setUserType] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail') || null);

  useEffect(() => {
    const loadSession = async () => {
      // Restore user data if available
      const storedUserId = localStorage.getItem('userId');
      const storedUserType = localStorage.getItem('userType');
      const storedUserInfo = localStorage.getItem('userInfo');
      const storedUserEmail = localStorage.getItem('userEmail');

      if (storedUserId) {
        // If we have a userId, user is logged in
        setIsAuthenticated(true);
        setUserId(storedUserId);
        if (storedUserType) {
          setUserType(storedUserType);
        }
        if (storedUserInfo) {
          setUserInfo(JSON.parse(storedUserInfo));
        }
        if (storedUserEmail) {
          setUserEmail(storedUserEmail);
        }
      } else {
        // No userId means not logged in
        setIsAuthenticated(false);
        setUserId(null);
        setUserType(null);
        setUserInfo(null);
        setUserEmail(null);
      }

      // Handle session separately
      if (sessionId == null) {
        // get a session if we don't have one
        const session = await api.createSession();
        setSessionId(session.sessionId);
        localStorage.setItem('sessionId', session.sessionId);
      }
    };

    loadSession();
  }, []);

  const login = async (userEmail, password) => {
    try {
      const response = await api.login(userEmail, password);
      const { sessionId: newSessionId, userId: newUserId, userType: newUserType, userInfo: newUserInfo } = response.data;
      
      setIsAuthenticated(true);
      setUserId(newUserId);
      setUserType(newUserType);
      setUserInfo(newUserInfo);
      setUserEmail(userEmail);
      
      localStorage.setItem('sessionId', newSessionId);
      localStorage.setItem('userId', newUserId);
      localStorage.setItem('userType', newUserType);
      localStorage.setItem('userEmail', userEmail);
      localStorage.setItem('userInfo', JSON.stringify(newUserInfo));
      return response;
    } catch (error) {
      throw error;
    }
  };

  const googleLogin = async () => {
    try {
      // Just call the API method - it handles the redirect directly
      await api.googleLogin();
      // No need to redirect here as it's handled in the API
    } catch (error) {
      logger.error('[AuthContext] Error in googleLogin:', error);
      throw error;
    }
  };

  const handleGoogleCallback = async (code) => {
    try {
      logger.log('[AuthContext] Processing Google callback with authorization code');
      const response = await api.handleGoogleCallback(code);
      
      if (response && response.success && response.user) {
        // Extract user data from backend response
        const userData = response.user;
        logger.log('[AuthContext] Login successful with user:', userData);
        
        // Construct user session data
        const authData = {
          userId: userData.userId || userData.id || `google-${userData.email}`,
          userType: userData.userType || 'USER',
          userInfo: userData,
          email: userData.email
        };
        
        // Ensure we have a standardized userData with consistent email property
        if (userData.userEmail && !userData.email) {
          userData.email = userData.userEmail;
        }
        
        // Update state with user information
        setIsAuthenticated(true);
        setUserId(authData.userId);
        setUserType(authData.userType);
        setUserInfo(userData);
        setUserEmail(userData.email);
        
        // Store the authentication data in localStorage
        localStorage.setItem('userId', authData.userId);
        localStorage.setItem('userType', authData.userType);
        localStorage.setItem('userEmail', userData.email);
        localStorage.setItem('userInfo', JSON.stringify(userData));
        
        // Get the initial page from sessionStorage and navigate directly back to it
        const initialPage = sessionStorage.getItem('initialPage');
        logger.log(`[AuthContext] Google login successful, navigating back to initial page: ${initialPage}`);
        
        // We need to use window.location instead of navigate() since this isn't a component
        setTimeout(() => {
          window.location.href = initialPage;
        }, 100);
        
        return { success: true, data: authData };
      } else {
        throw new Error('Invalid response from Google authentication');
      }
    } catch (error) {
      logger.error('[AuthContext] Error in handleGoogleCallback:', error);
      setIsAuthenticated(false);
      setUserId(null);
      setUserType(null);
      setUserInfo(null);
      setUserEmail(null);
      throw error;
    }
  };

  const requestPasswordReset = async (email) => {
    try {
      const response = await api.requestPasswordReset(email);
      logger.log('[AuthContext] Password reset email sent successfully');
      return { success: true, data: response };
    } catch (error) {
      logger.error('[AuthContext] Error in requestPasswordReset:', error);
      throw error;
    }
  };

  const verifyResetToken = async (token) => {
    try {
      const response = await api.verifyResetToken(token);
      logger.log('[AuthContext] Reset token verified successfully');
      return { success: true, data: response };
    } catch (error) {
      logger.error('[AuthContext] Error in verifyResetToken:', error);
      throw error;
    }
  };

  const resetPassword = async (token, newPassword, userEmail) => {
    try {
      const response = await api.resetPassword(token, newPassword, userEmail);
      logger.log('[AuthContext] Password reset successful');
      return { success: true, data: response };
    } catch (error) {
      logger.error('[AuthContext] Error in resetPassword:', error);
      throw error;
    }
  };

  const register = async (userEmail, password, firstName, lastName) => {
    try {
      const response = await api.register(userEmail, password, firstName, lastName);
      
      // Create user info from registration data
      const userInfo = {
        email: userEmail,
        firstName: firstName,
        lastName: lastName
      };

      setIsAuthenticated(true);
      setUserInfo(userInfo);
      setUserEmail(userEmail);
      
      // Store user information
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      localStorage.setItem('userEmail', userEmail);
      
      // After registration, automatically log in the user
      await login(userEmail, password);
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserId(null);
    setUserType(null);
    setUserInfo(null);
    setUserEmail(null);
    
    // Clear all authentication data from localStorage
    localStorage.removeItem('sessionId');
    localStorage.removeItem('userId');
    localStorage.removeItem('userType');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('userEmail');
    
    // Clear selected sales data
    localStorage.removeItem('selectedSaleIds');
    localStorage.removeItem('selectedSales');
    localStorage.removeItem('adminSelectedSaleIds');
    
    logger.log('[AuthContext] User logged out, cleared all user data and selections');
    
    // If user is on the garage sales page, navigate to the map page
    if (location.pathname === '/sales') {
      logger.log('[AuthContext] User was on garage sales page, navigating to map page');
      navigate('/');
    }
    
    // Reload the page to ensure a clean state
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userInfo,
        userEmail,
        userId,
        userType,
        login,
        logout,
        register,
        googleLogin,
        handleGoogleCallback,
        requestPasswordReset,
        verifyResetToken,
        resetPassword,
        sessionId 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

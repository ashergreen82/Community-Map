import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../pages/Login.css';
import { logger } from '../utils/logger';

const LoginRedirect = () => {
  const navigate = useNavigate();
  const { handleGoogleCallback } = useAuth();
  const location = useLocation();
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Processing your login...');
  const processingRef = useRef(false);

  useEffect(() => {
    logger.error('[LoginRedirect] -------------------- useEffect FIRED -----------------------');
    const processAuth = async () => {
      // Prevent duplicate processing
      if (processingRef.current) {
        logger.log('[LoginRedirect] Auth processing already in progress, skipping duplicate execution');
        return;
      }
      
      // Set processing flag to true
      processingRef.current = true;
      
      try {
        // Debug the incoming URL
        logger.log('[LoginRedirect] === Page Loaded ===');
        logger.log('[LoginRedirect] Current location:', location);
        logger.log('[LoginRedirect] URL:', window.location.href);
        logger.log('[LoginRedirect] Search params:', location.search);
        logger.log('[LoginRedirect] Hash params:', location.hash);
        
        // Look for either code in search params or token in hash
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        
        // Check if we've already processed this code in this session
        const processedCode = sessionStorage.getItem('processedAuthCode');
        if (code && processedCode === code) {
          logger.log('[LoginRedirect] This code has already been processed in this session');
          setStatus('Login successful! Redirecting...');
          setTimeout(() => navigate('/'), 1000);
          return;
        }
        
        if (code) {
          logger.log('[LoginRedirect] Authorization code found:', code);
          
          // Store the code in session storage to prevent duplicate processing
          sessionStorage.setItem('processedAuthCode', code);
          
          // Process the code
          await handleGoogleCallback(code);
          setStatus('Login successful! Redirecting...');
          setTimeout(() => navigate('/'), 1000);
        } else {
          logger.error('[LoginRedirect] No authorization code found in URL');
          setError('Authentication failed: No authorization code found');
          setTimeout(() => navigate('/login'), 3000);
        }
      } catch (err) {
        logger.error('[LoginRedirect] Error in LoginRedirect:', err);
        setError(`Authentication error: ${err.message}`);
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    processAuth();
    
    // Cleanup function to reset the processing flag when component unmounts
    return () => {
      processingRef.current = false;
    };
  }, [navigate, handleGoogleCallback]); // Removed location from dependencies

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Google Sign-In</h2>
        {error ? (
          <div className="error-message">{error}</div>
        ) : (
          <div>
            <p>{status}</p>
            <div className="loading-spinner"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginRedirect;

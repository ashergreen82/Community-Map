import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Divider,
  TextField as MuiTextField,
  Stack
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useInitialPage } from '../context/InitialPageContext';
import ReactGA from 'react-ga4';
import './Login.css';
import { logger } from '../utils/logger';

// Read and clear the stored returnTo; only allow same-origin relative paths
const consumeReturnTo = (search) => {
  const returnTo = new URLSearchParams(search).get('returnTo') || sessionStorage.getItem('returnTo');
  sessionStorage.removeItem('returnTo');
  return returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : null;
};

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, googleLogin, handleGoogleCallback, requestPasswordReset, verifyResetToken, resetPassword } = useAuth();
  const { initialPath, wasInitialPageMap, wasInitialPageAbout, debugInitialPage } = useInitialPage();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Persist returnTo in sessionStorage so it survives the Google OAuth round-trip
  useEffect(() => {
    const returnToParam = new URLSearchParams(location.search).get('returnTo');
    if (returnToParam) {
      sessionStorage.setItem('returnTo', returnToParam);
    }
  }, [location]);

  // Check for Google auth callback or password reset token
  useEffect(() => {
    logger.log('[Login] -------------------- useEffect FIRED -----------------------');
    const searchParams = new URLSearchParams(location.search);
    const code = searchParams.get('code'); // Google returns 'code' not 'token'
    const resetTokenParam = searchParams.get('reset');
    const userEmailParam = searchParams.get('email');

    if (code) {
      // Immediately remove the code from URL to prevent reprocessing
      // This must happen synchronously before any async operations
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      // Handle Google auth callback
      const handleCallback = async () => {
        try {
          setLoading(true);
          setError('');
          logger.log('[Login] GOOGLE AUTH: Processing Google authorization code');
          await handleGoogleCallback(code);

          // --- GA Tracking for Google Login Success ---
          ReactGA.event({
            category: 'Authentication',
            action: 'Login',
            label: 'Google',
            value: 1
          });

          // Force a delay to ensure context is properly loaded
          logger.log('[Login] GOOGLE AUTH: Authentication complete, preparing navigation');

          // Honor a pending returnTo (e.g. a shared registration link), otherwise
          // navigate to community sales admin after Google login
          const googleReturnTo = consumeReturnTo(location.search);
          logger.log('[Login] GOOGLE AUTH: Navigating to', googleReturnTo || '/admin/community-sales');
          navigate(googleReturnTo || '/admin/community-sales');
        } catch (err) {
          setError('Failed to authenticate with Google. Please try again.');
          logger.error('[Login] Google authentication error:', err);
          ReactGA.event({
            category: 'Authentication',
            action: 'Login Failed',
            label: 'Google',
            value: 0 // You can use 0 for failures, 1 for success if you map values
          });
        } finally {
          setLoading(false);
        }
      };

      handleCallback();
    } else if (resetTokenParam) {
      // Handle password reset token
      const verifyToken = async () => {
        try {
          setLoading(true);
          await verifyResetToken(resetTokenParam);
          setIsResetPassword(true);
          setResetToken(resetTokenParam);

          // Save the email from the query parameter if available
          if (userEmailParam) {
            setFormData(prev => ({
              ...prev,
              email: userEmailParam
            }));
          }
        } catch (err) {
          setError('Invalid or expired password reset link. Please request a new one.');
        } finally {
          setLoading(false);
        }
      };

      verifyToken();
    }
  }, [location, handleGoogleCallback, navigate, verifyResetToken]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
    if (successMessage) setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);

        // --- GA Tracking for Email/Password Login Success ---
        ReactGA.event({
          category: 'Authentication',
          action: 'Login',
          label: 'Email/Password'
        });

        // Honor a pending returnTo first, then fall back to the initial page tracker
        const loginReturnTo = consumeReturnTo(location.search);
        if (loginReturnTo) {
          navigate(loginReturnTo);
        } else if (wasInitialPageAbout()) {
          // If they started on the about/landing page, go to Manage Community Sales
          navigate('/admin/community-sales');
        } else if (wasInitialPageMap()) {
          // If they started on the map page, go back to the map
          navigate('/');
        } else {
          // Default fallback - if we can't determine, go to the map
          navigate('/');
        }
      } else if (isForgotPassword) {
        // Handle forgot password form submission
        if (!formData.email) {
          throw new Error('Please enter your email address');
        }

        const response = await requestPasswordReset(formData.email);
        setSuccessMessage('Password reset link has been sent to your email. Please check your inbox and spam folder. Due to email provider limitations, the email may appear in your spam folder.');

        // Clear the email field after successful submission
        setFormData({
          ...formData,
          email: ''
        });
      } else if (isResetPassword) {
        // Handle password reset form submission
        if (!formData.newPassword || !formData.confirmNewPassword) {
          throw new Error('Please fill in all password fields');
        }

        if (formData.newPassword !== formData.confirmNewPassword) {
          throw new Error('Passwords do not match');
        }

        // Basic password validation
        if (formData.newPassword.length < 8) {
          throw new Error('Password must be at least 8 characters long');
        }

        // Use the email that was saved from the URL or entered by the user
        if (!formData.email) {
          throw new Error('Email address is missing. Please contact support.');
        }

        await resetPassword(resetToken, formData.newPassword, formData.email);
        setSuccessMessage('Your password has been reset successfully. You can now log in with your new password.');

        // Reset the form state after successful reset
        setTimeout(() => {
          setIsResetPassword(false);
          setIsForgotPassword(false);
          setIsLogin(true);
          setSuccessMessage('');
          setFormData({
            ...formData,
            newPassword: '',
            confirmNewPassword: ''
          });
        }, 3000);
      } else {
        // Validation for registration
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (!formData.firstName || !formData.lastName) {
          throw new Error('First name and last name are required');
        }
        await register(
          formData.email,
          formData.password,
          formData.firstName,
          formData.lastName
        );

        // --- GA Tracking for Registration Success ---
        ReactGA.event({
          category: 'Authentication',
          action: 'Register',
          label: 'Email/Password'
        });
        // Honor a pending returnTo first, then fall back to the initial page tracker
        const registerReturnTo = consumeReturnTo(location.search);
        if (registerReturnTo) {
          navigate(registerReturnTo);
        } else if (wasInitialPageAbout()) {
          // If they started on the about/landing page, go to Manage Community Sales
          navigate('/admin/community-sales');
        } else if (wasInitialPageMap()) {
          // If they started on the map page, go back to the map
          navigate('/');
        } else {
          // Default fallback - if we can't determine, go to the map
          navigate('/');
        }
      }
    } catch (err) {
      if (isForgotPassword) {
        setError(err.message || 'Failed to send password reset email. Please try again.');
      } else if (isResetPassword) {
        setError(err.message || 'Failed to reset password. Please try again.');
      } else {
        setError(err.message || `Failed to ${isLogin ? 'log in' : 'sign up'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      // The initial page is already stored in sessionStorage by the InitialPageContext
      // so it will persist during the Google OAuth redirect
      logger.log('[Login] Starting Google login, initial page is preserved in session storage');
      debugInitialPage(); // Log the current initial page before redirect
      await googleLogin();
      // No need to navigate here as googleLogin will redirect to Google OAuth
    } catch (err) {
      setError('Failed to initiate Google login. Please try again.');
      ReactGA.event({
        category: 'Authentication',
        action: 'Google Login Initiation Failed'
      });
      setLoading(false);
    }
  };

  const toggleForgotPassword = () => {
    setIsForgotPassword(!isForgotPassword);
    setIsLogin(!isLogin);
    setError('');
    setSuccessMessage('');
  };

  const backToLogin = () => {
    setIsForgotPassword(false);
    setIsResetPassword(false);
    setIsLogin(true);
    setError('');
    setSuccessMessage('');
    setFormData({
      ...formData,
      password: '',
      newPassword: '',
      confirmNewPassword: ''
    });
  };

  const renderForm = () => {
    if (isForgotPassword) {
      return (
        <>
          <Typography variant="h2" gutterBottom>
            Forgot Password
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {successMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {successMessage}
            </Alert>
          )}

          {!successMessage && (
            <form onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <MuiTextField
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  fullWidth
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  fullWidth
                >
                  {loading ? (
                    <>
                      <CircularProgress size={18} sx={{ mr: 1 }} color="inherit" />
                      Processing...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </Stack>
            </form>
          )}

          <Button variant="outlined" onClick={backToLogin} disabled={loading} fullWidth sx={{ mt: 2 }}>
            Back to Login
          </Button>
        </>
      );
    } else if (isResetPassword) {
      return (
        <>
          <Typography variant="h2" gutterBottom>
            Reset Password
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {successMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {successMessage}
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <MuiTextField
                type="password"
                id="newPassword"
                name="newPassword"
                placeholder="New Password"
                value={formData.newPassword}
                onChange={handleInputChange}
                required
                fullWidth
              />
              <MuiTextField
                type="password"
                id="confirmNewPassword"
                name="confirmNewPassword"
                placeholder="Confirm New Password"
                value={formData.confirmNewPassword}
                onChange={handleInputChange}
                required
                fullWidth
              />
              <Button type="submit" variant="contained" disabled={loading} fullWidth>
                {loading ? (
                  <>
                    <CircularProgress size={18} sx={{ mr: 1 }} color="inherit" />
                    Processing...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </Stack>
          </form>
        </>
      );
    } else {
      return (
        <>
          <Typography variant="h2" gutterBottom>
            {isLogin ? 'Login' : 'Sign Up'}
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {successMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {successMessage}
            </Alert>
          )}

          <Button
            variant="outlined"
            fullWidth
            onClick={handleGoogleLogin}
            disabled={loading}
            startIcon={
              <img
                src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg"
                alt="Google"
                className="google-icon"
              />
            }
          >
            Sign in with Google
          </Button>

          <Divider sx={{ my: 3 }}>OR</Divider>

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {!isLogin && (
                <>
                  <MuiTextField
                    type="text"
                    id="firstName"
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required={!isLogin}
                    fullWidth
                  />
                  <MuiTextField
                    type="text"
                    id="lastName"
                    name="lastName"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required={!isLogin}
                    fullWidth
                  />
                </>
              )}

              <MuiTextField
                type="email"
                id="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                required
                fullWidth
              />
              <MuiTextField
                type="password"
                id="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                required
                fullWidth
              />
              {!isLogin && (
                <MuiTextField
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required={!isLogin}
                  fullWidth
                />
              )}
              <Button type="submit" variant="contained" disabled={loading} fullWidth>
                {loading ? (
                  <>
                    <CircularProgress size={18} sx={{ mr: 1 }} color="inherit" />
                    Processing...
                  </>
                ) : isLogin ? (
                  'Login'
                ) : (
                  'Sign Up'
                )}
              </Button>
            </Stack>
          </form>

          <Stack spacing={1} sx={{ mt: 2 }} className="form-footer">
            {isLogin ? (
              <>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setIsLogin(false);
                    setIsForgotPassword(false);
                    setError('');
                  }}
                  disabled={loading}
                  fullWidth
                >
                  Need an account? Sign Up
                </Button>
                <Button variant="outlined" onClick={toggleForgotPassword} disabled={loading} fullWidth>
                  Forgot Password?
                </Button>
              </>
            ) : (
              <Button
                variant="outlined"
                onClick={() => {
                  setIsLogin(true);
                  setError('');
                }}
                disabled={loading}
                fullWidth
              >
                Already have an account? Login
              </Button>
            )}
          </Stack>
        </>
      );
    }
  };

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto' }}>
      <Paper variant="outlined" sx={{ p: 4 }}>
        {renderForm()}
      </Paper>
    </Box>
  );
};

export default Login;

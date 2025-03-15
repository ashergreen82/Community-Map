import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, googleLogin, handleGoogleCallback } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check for Google auth callback
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get('token');
    
    if (token) {
      const handleCallback = async () => {
        try {
          setLoading(true);
          await handleGoogleCallback(token);
          navigate('/');
        } catch (err) {
          setError('Failed to authenticate with Google. Please try again.');
        } finally {
          setLoading(false);
        }
      };
      
      handleCallback();
    }
  }, [location, handleGoogleCallback, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
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
      }
      navigate('/');
    } catch (err) {
      setError(err.message || `Failed to ${isLogin ? 'log in' : 'sign up'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      await googleLogin();
      // No need to navigate here as googleLogin will redirect to Google OAuth
    } catch (err) {
      setError('Failed to initiate Google login. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
        {error && <div className="error-message">{error}</div>}
        
        <button 
          className="google-button"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <img 
            src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg" 
            alt="Google" 
            className="google-icon" 
          />
          Sign in with Google
        </button>
        
        <div className="or-divider">OR</div>
        
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="form-group">
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required={!isLogin}
                />
              </div>
              <div className="form-group">
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required={!isLogin}
                />
              </div>
            </>
          )}
          <div className="form-group">
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              required
            />
          </div>
          {!isLogin && (
            <div className="form-group">
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required={!isLogin}
              />
            </div>
          )}
          <button 
            type="submit" 
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>
        <button 
          className="toggle-button"
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
            setFormData({
              email: '',
              password: '',
              confirmPassword: '',
              firstName: '',
              lastName: ''
            });
          }}
          disabled={loading}
        >
          {isLogin ? 'Need an account? Sign up' : 'Have an account? Login'}
        </button>
      </div>
    </div>
  );
};

export default Login;

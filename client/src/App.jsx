import React, { useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoadScript } from '@react-google-maps/api';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme/theme';
import './App.css';
import HamburgerMenu from './components/HamburgerMenu';
import DashboardLayout from './components/DashboardLayout';
import InfoPage from './pages/Info';
import ListActiveCommunitySalesEvents from './pages/ListActiveCommunitySalesEvents';
import Help from './pages/Help';
import Login from './pages/Login';
import LoginRedirect from './pages/LoginRedirect';
import LanderRedirect from './components/LanderRedirect';
import PasswordReset from './pages/PasswordReset';
import GarageSales from './pages/GarageSales';
import SingleGarageSales from './pages/SingleGarageSales';
import RegisterGarageSale from './pages/RegisterGarageSale';
import RegisterCommunityGarageSale from './pages/RegisterCommunityGarageSale';
import GarageSalesAdmin from './pages/GarageSalesAdmin';
import GarageSalesBulkUpload from './pages/GarageSalesBulkUpload';
import CommunitySalesAdmin from './pages/CommunitySalesAdmin';
import LandingPage from './pages/LandingPage';
import MapView from './components/MapView';
import { GarageSalesProvider } from './context/GarageSalesContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DisplayProvider } from './context/DisplayContext';
import { LocationProvider } from './context/LocationContext';
import { NavigationProvider } from './context/NavigationContext';
import { CommunitySalesProvider } from './context/CommunitySalesContext';
import { InitialPageProvider } from './context/InitialPageContext';
import DocumentTitle from './components/DocumentTitle';

const DashboardRoute = ({ children }) => (
  <DashboardLayout>{children}</DashboardLayout>
);

const ProtectedDashboardRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  return <DashboardLayout>{children}</DashboardLayout>;
};

const SalesRoute = () => {
  const location = useLocation();
  if (location.state?.fromMap) {
    return (
      <>
        <HamburgerMenu />
        <div style={{ paddingTop: '60px', padding: '60px 16px 16px 16px' }}>
          <GarageSales />
        </div>
      </>
    );
  }
  return <DashboardLayout><GarageSales /></DashboardLayout>;
};

const HelpRoute = () => {
  return (
    <>
      <HamburgerMenu />
      <div style={{ paddingTop: '60px', padding: '60px 16px 16px 16px' }}>
        <Help />
      </div>
    </>
  );
};

function App() {
  const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
  ReactGA.initialize(GA_MEASUREMENT_ID);
  const location = useLocation();

  const libraries = useMemo(() => ['places', 'marker'], []);

  const mapContainerStyle = useMemo(() => ({
    width: '100%',
    height: '100vh'
  }), []);

  const mapOptions = useMemo(() => ({
    disableDefaultUI: false,
    zoomControl: true,
    mapId: import.meta.env.VITE_GOOGLE_MAPS_ID,
    streetViewControl: true,
    mapTypeControl: true,
    mapTypeControlOptions: {
      position: window.google?.maps?.ControlPosition?.TOP_RIGHT,
      style: window.google?.maps?.MapTypeControlStyle?.DROPDOWN_MENU
    },
    fullscreenControl: true,
    fullscreenControlOptions: {
      position: window.google?.maps?.ControlPosition?.TOP_RIGHT
    },
    zoomControlOptions: {
      position: window.google?.maps?.ControlPosition?.RIGHT_CENTER
    }
  }), []);

  useEffect(() => {
    ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
  }, [location]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <LoadScript
          googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
          libraries={libraries}
          loadingElement={<div>Loading Google Maps...</div>}
        >
          <GarageSalesProvider>
            <DisplayProvider>
              <LocationProvider>
                <NavigationProvider>
                  <InitialPageProvider>
                    <CommunitySalesProvider>
                      <DocumentTitle />
                      <div className="app">
                        <Routes>
                          <Route path="/loginRedirect" element={<LoginRedirect />} />

                          {/* Dashboard routes */}
                          <Route path="/about" element={
                            <DashboardRoute><LandingPage /></DashboardRoute>
                          } />
                          <Route path="/info" element={
                            <DashboardRoute><InfoPage /></DashboardRoute>
                          } />
                          <Route path="/help" element={<HelpRoute />} />
                          <Route path="/list-active-community-sales-events" element={
                            <DashboardRoute><ListActiveCommunitySalesEvents /></DashboardRoute>
                          } />
                          <Route path="/login" element={
                            <DashboardRoute><Login /></DashboardRoute>
                          } />
                          <Route path="/reset-password" element={
                            <DashboardRoute><PasswordReset /></DashboardRoute>
                          } />
                          <Route path="/sales" element={<SalesRoute />} />
                          <Route path="/single-garage-sales" element={
                            <DashboardRoute><SingleGarageSales /></DashboardRoute>
                          } />
                          <Route path="/landing" element={
                            <DashboardRoute><LandingPage /></DashboardRoute>
                          } />
                          <Route path="/lander" element={<LanderRedirect />} />

                          {/* Map route - unchanged, keeps HamburgerMenu */}
                          <Route path="/" element={
                            <>
                              <HamburgerMenu />
                              <div className="map-container">
                                <MapView
                                  mapContainerStyle={mapContainerStyle}
                                  mapOptions={mapOptions}
                                />
                              </div>
                            </>
                          } />

                          {/* Protected dashboard routes */}
                          <Route path="/admin/community-sales" element={
                            <ProtectedDashboardRoute><CommunitySalesAdmin /></ProtectedDashboardRoute>
                          } />
                          <Route path="/admin/sales" element={
                            <ProtectedDashboardRoute><GarageSalesAdmin /></ProtectedDashboardRoute>
                          } />
                          <Route path="/admin/bulk-upload" element={
                            <ProtectedDashboardRoute><GarageSalesBulkUpload /></ProtectedDashboardRoute>
                          } />
                          <Route path="/register-garage-sale" element={
                            <ProtectedDashboardRoute><RegisterGarageSale /></ProtectedDashboardRoute>
                          } />
                          <Route path="/register-garage-sale/:communityId" element={
                            <ProtectedDashboardRoute><RegisterCommunityGarageSale /></ProtectedDashboardRoute>
                          } />
                        </Routes>
                      </div>
                    </CommunitySalesProvider>
                  </InitialPageProvider>
                </NavigationProvider>
              </LocationProvider>
            </DisplayProvider>
          </GarageSalesProvider>
        </LoadScript>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '../utils/logger';
import './LandingPage.css';
import communityMapImage from '../assets/community-map-example.jpg';
import { useNavigation } from '../context/NavigationContext';
import { useCommunitySales } from '../context/CommunitySalesContext';

const LandingPage = () => {
  const navigate = useNavigate();
  const { setFromLanding, fromMap, setFromMap } = useNavigation();
  const { currentCommunityId } = useCommunitySales();

  // Record that the user started on the landing page
  useEffect(() => {
    // Store the initial page in sessionStorage
    sessionStorage.setItem('initialPage', '/landing');
    logger.log('[LandingPage] Recorded initial page as "/landing" in sessionStorage');
  }, []);

  const handleNavigation = (path) => {
    setFromLanding(true); // Set that navigation came from landing page
    navigate(path);
  };

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <h1 className="landing-title">Community Sale Events and Garage Sales</h1>
        <p className="landing-subtitle">
          Create interactive maps for your neighborhood's community sales, making it easy for visitors to find what they're looking for.
        </p>
      </header>

      <div className="landing-content">
        <div className="landing-layout-container">
          {/* Main Image */}
          <img
            src={communityMapImage}
            alt="Example of a community sale map"
            className="landing-image"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/1200x600?text=Community+Sale+Map+Example';
            }}
          />

          {/* Introduction and Call to Action */}
          <section className="landing-section">
            <div className="landing-section-title">Simplify Your Event</div>
            <p>
              Are you organizing a community sale event for your neighbourhood and would like to map out
              all the community sales on Google Maps? This makes it easy for visitors to find the sales
              they want to go to, or even just to see where the sales are in relation to them without the
              need for those old fashioned maps.
            </p>
            <p>
              We have created a simple way to do it right. All you have to do is login to your account,
              create the garage sale event, enter in the addresses and the descriptions. It's really easy.
            </p>
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <div className="cta-button" onClick={() => handleNavigation('/login')}>
                Get Started Today
              </div>
              {fromMap && (
                <div className="cta-button secondary" onClick={() => {
                  // Don't reset fromMap flag so the button remains visible when returning to this page
                  navigate(`/?communityId=${currentCommunityId || ''}`);
                }} style={{ marginLeft: '1rem' }}>
                  Return to Map
                </div>
              )}
            </div>
          </section>
        </div>

        <hr />

        <div className="landing-layout-container">
          {/* Community Sale */}
          <section className="landing-section">
            <h2 className="landing-section-title">How Community Sales Work</h2>
            <div className="landing-steps">
              <div className="landing-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h3 className="step-title">Create an Account</h3>
                  <p className="step-description">
                    Sign up for a free account to get started. It only takes a minute and you'll be ready to create your first community sale event.
                  </p>
                </div>
              </div>

              <div className="landing-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h3 className="step-title">Set Up Your Community Sale</h3>
                  <p className="step-description">
                    Create a new community sale event with details like name, date, and location. This will be the main hub for all the individual garage sales.
                  </p>
                </div>
              </div>

              <div className="landing-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h3 className="step-title">Add Garage Sales</h3>
                  <p className="step-description">
                    Add individual garage sales to your community event by entering addresses and descriptions. Our system automatically places them on the map.
                  </p>
                </div>
              </div>

              <div className="landing-step">
                <div className="step-number">4</div>
                <div className="step-content">
                  <h3 className="step-title">Share With Your Community</h3>
                  <p className="step-description">
                    Your garage sale will be added to our public listing where visitors can browse all active sales. Shoppers can select multiple sales they want to visit and view them on an interactive map, making it easy to plan their route and find the best deals in the area.
                  </p>
                </div>
              </div>
            </div>
          </section>
          <section className="landing-section" style={{ backgroundColor: '#f9f9f9', padding: '2rem', borderRadius: '8px' }}>
            <h2 className="landing-section-title">Individual Garage Sales Made Easy</h2>
            <p>
              Not part of a community event? No problem! Our platform also supports individual garage sales, making it simple for anyone to list their sale and attract more visitors.
            </p>
            <p>
              Whether you're decluttering your home, moving, or just having a seasonal sale, our tools help you reach more potential buyers in your local area.
            </p>
            <div className="landing-features" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginTop: '1.5rem' }}>
              <div style={{ flex: '1', minWidth: '250px', padding: '1rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <h3 style={{ color: '#1976d2', marginTop: 0 }}> Quick Listing</h3>
                <p>Create a listing in minutes with just a few details about your sale.</p>
              </div>
              <div style={{ flex: '1', minWidth: '250px', padding: '1rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <h3 style={{ color: '#1976d2', marginTop: 0 }}> Easy Discovery</h3>
                <p>Get your sale noticed by local shoppers searching for garage sales in your area.</p>
              </div>
              <div style={{ flex: '1', minWidth: '250px', padding: '1rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <h3 style={{ color: '#1976d2', marginTop: 0 }}> Mobile-Friendly</h3>
                <p>Manage your listing and respond to inquiries right from your phone.</p>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <div className="cta-button secondary" onClick={() => handleNavigation('/single-garage-sales')}>
                Browse Garage Sales
              </div>
            </div>
          </section>
        </div>
        <hr />



        <h2 className="landing-section-title">How It Works</h2>
        <div className="landing-layout-container">
          {/* How It Works */}


          <section className="landing-section">
            {/* <div className="landing-steps"> */}

            <div className="landing-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3 className="step-title">Create an Account</h3>
                <p className="step-description">
                  Sign up for a free account to get started. It only takes a minute and you'll be ready to create your first community sale event.
                </p>
              </div>
            </div>

            <div className="landing-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3 className="step-title">Click Register a Garage Sale on the Menu Bar Above</h3>
                <p className="step-description">
                  This will allow you to register your garage sale and add it to our public listing.
                </p>
              </div>
            </div>
          </section>
          <section className="landing-section">
            <div className="landing-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3 className="step-title">Enter In Your Garage Sale Details</h3>
                <p className="step-description">
                  Enter in your garage sale details such as the name, date, and location. Our system will automatically place it on the map.
                </p>
              </div>
            </div>

            <div className="landing-step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3 className="step-title">And It Will Be Listed With All The Other Garage Sales</h3>
                <p className="step-description">
                  Your garage sale will be added to our public listing where visitors can browse all active sales. Shoppers can select multiple sales they want to visit and view them on an interactive map, making it easy to plan their route and find the best deals in the area.
                </p>
              </div>
            </div>
            {/* </div> */}
          </section>
        </div>

        <hr />
        <h2 className="landing-section-title">Features</h2>
        <div className="landing-layout-container">
          {/* Features */}
          <section className="landing-section">

            <div className="landing-grid">
              <div className="landing-card">
                <h3 className="landing-card-title">Interactive Maps</h3>
                <p className="landing-card-content">
                  Fully interactive Google Maps integration that makes it easy for visitors to explore and find sales.
                </p>
              </div>

              <div className="landing-card">
                <h3 className="landing-card-title">Sale Management</h3>
                <p className="landing-card-content">
                  Easy-to-use tools for adding, editing, and removing garage sales from your community event.
                </p>
              </div>
            </div>
          </section>
          <section className="landing-section">

            <div className="landing-grid">
              <div className="landing-card">
                <h3 className="landing-card-title">Search Functionality</h3>
                <p className="landing-card-content">
                  Visitors can search for specific items or categories to find exactly what they're looking for.
                </p>
              </div>

              <div className="landing-card">
                <h3 className="landing-card-title">Mobile Friendly</h3>
                <p className="landing-card-content">
                  Responsive design works great on smartphones and tablets, perfect for visitors on the go.
                </p>
              </div>
            </div>
          </section>
        </div>

        <hr />

        <h2 className="landing-section-title">Ready to Get Started?</h2>
        <div className="landing-layout-container">
          {/* Call to Action */}
          <section className="landing-section" style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.2rem' }}>
            Create your first community garage sale map today and make it easier for everyone to find what they're looking for.
          </section>
          <section className="landing-section" style={{ textAlign: 'center' }}>
            <div className="cta-button" onClick={() => handleNavigation('/login')}>
              Sign Up Now
            </div>
          </section>
        </div>

        <hr />
        {/* <h2 className="landing-section-title">Need Help?</h2> */}
        <div className="landing-layout-container help-section-container">
          {/* Column 1: Contact Information */}
          <section className="landing-section help-column">
            <h3 className="help-column-title">Developed By</h3>
            <p>
              <strong>Asher Green</strong><br />
              <a href="mailto:asher@ashergreen.ca">asher@ashergreen.ca</a><br />
              <a href="http://www.ashergreen.ca" target="_blank" rel="noopener noreferrer">www.ashergreen.ca</a>
            </p>
            <p>
              <strong>Jamie-Lee Mclean-Davis</strong><br />
              <a href="mailto:jmclean.davis@gmail.com">jmclean.davis@gmail.com</a>
            </p>
          </section>

          {/* Column 2: Feedback/Thanks */}
          <section className="landing-section help-column" style={{ flex: 1 }}>
            <h3 className="help-column-title">Thanks for Using Our App!</h3>
            <h3 className="help-column-title">Feedback & Support</h3>
            <p>
              We hope our app made your garage sale adventures more fun and efficient! We're always looking to improve, so feel free to drop us a line with ideas, suggestions, or just to say hi.
            </p>
          </section>
        </div>
      </div>


      {/* Footer */}
      <footer className="landing-footer">
        {/* <p>&copy; 2025 Community Garage Sale Maps. All rights reserved.</p> */}
      </footer>
    </div>
  );
};

export default LandingPage;


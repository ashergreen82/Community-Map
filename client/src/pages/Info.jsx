import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigation } from '../context/NavigationContext';
import { useCommunitySales } from '../context/CommunitySalesContext';
import './Info.css';
import { logger } from '../utils/logger';

const InfoPage = () => {
  const navigate = useNavigate();
  const { fromMap, setFromMap } = useNavigation();
  const { currentCommunityId } = useCommunitySales();
  
  // Record that the user started on the about page
  useEffect(() => {
    // Store the initial page in sessionStorage
    sessionStorage.setItem('initialPage', '/about');
    logger.log('[Info] Recorded initial page as "/about" in sessionStorage');
  }, []);
  return (
    <div className="info-page">
      <div className="info-container">
        <h2>INFO</h2>
        <div className="content">
          <div className="about-section">
            <h3>About Community Map</h3>
            <p>An app that maps out garage sales, both individual listings and community-wide events, making it easy to find and plan your garage sale adventures.</p>
          </div>
          <div className="developed-by">
            <h3>Developed By</h3>
            <div className="developer">
              <p>Asher Green</p>
              <a href="mailto:asher@ashergreen.ca">asher@ashergreen.ca</a>
              <br />
              <a href="https://www.ashergreen.ca" target="_blank" rel="noopener noreferrer">www.ashergreen.ca</a>
            </div>
            <div className="developer">
              <p>Jamie-Lee Mclean-Davis</p>
              <a href="mailto:jmclean.davis@gmail.com">jmclean.davis@gmail.com</a>
            </div>
          </div>
          <div className="version-info">
            <p>🎉 Thanks for checking out the very first version of our app! We hope it made your garage sale adventures just a little more fun (and a lot more efficient). We're always looking to make things better, so if you have ideas, suggestions, or just want to say hi, drop us a line. We'd love to hear from you—constructive feedback or wild praise, we're not picky! 😄</p>
          </div>
          {/* <div className="links">
            <h3>Quick Links</h3>
            <ul>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Community Guidelines</a></li>
            </ul>
          </div> */}
        </div>
      </div>
      
      {/* Return to Map Button - Only shown if user came from map */}
      {fromMap && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <div 
            className="cta-button secondary" 
            onClick={() => {
              navigate(`/?communityId=${currentCommunityId || ''}`);
            }} 
            style={{ 
              display: 'inline-block',
              backgroundColor: '#27ae60',
              color: 'white',
              padding: '0.8rem 1.5rem',
              borderRadius: '4px',
              textDecoration: 'none',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Return to Map
          </div>
        </div>
      )}
    </div>
  );
};

export default InfoPage;

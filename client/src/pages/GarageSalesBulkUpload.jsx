import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './GarageSalesBulkUpload.css';
import { logger } from '../utils/logger';

const GarageSalesBulkUpload = () => {
  const [communityId, setCommunityId] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState({ success: 0, failed: 0, total: 0 });
  const [errors, setErrors] = useState([]);
  const [communityName, setCommunityName] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleCommunityIdChange = (e) => {
    setCommunityId(e.target.value);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const fetchCommunityName = async () => {
    if (!communityId) return;
    
    try {
      const apiUrl = `${import.meta.env.VITE_MAPS_API_URL}/v1/getAddressByCommunity/${communityId}`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'app-name': 'web-service',
          'app-key': import.meta.env.VITE_APP_SESSION_KEY
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCommunityName(data.name || 'Community Sale');
      } else {
        setCommunityName('');
      }
    } catch (error) {
      logger.error('[GarageSalesBulkUpload] Error fetching community name:', error);
      setCommunityName('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!communityId || !file) {
      alert('Please enter a Community ID and select a JSON file');
      return;
    }

    setIsUploading(true);
    setResults({ success: 0, failed: 0, total: 0 });
    setErrors([]);

    try {
      // First fetch the community name to verify the community ID is valid
      await fetchCommunityName();
      
      // Read the file
      const fileReader = new FileReader();
      
      fileReader.onload = async (event) => {
        try {
          const jsonData = JSON.parse(event.target.result);
          
          if (!Array.isArray(jsonData)) {
            throw new Error('Invalid JSON format. Expected an array of garage sales.');
          }
          
          setResults(prev => ({ ...prev, total: jsonData.length }));
          
          const successfulUploads = [];
          const failedUploads = [];
          
          // Process each garage sale
          for (const sale of jsonData) {
            try {
              if (!sale.street || !sale.address) {
                throw new Error(`Missing required fields: ${JSON.stringify(sale)}`);
              }
              
              // Format the address data as required by the API
              const addressData = {
                street: sale.street,
                streetNumber: sale.address,
                city: sale.city || '',
                state: sale.state || '',
                postalCode: sale.postalCode || '',
                unit: sale.unit || ''
              };
              
              // Create the garage sale
              await api.createGarageSale(
                addressData,
                sale.description || 'Garage Sale',
                sale.name || 'Garage Sale',
                sale.highlightedItems || [],
                communityId
              );
              
              successfulUploads.push(sale);
            } catch (error) {
              failedUploads.push({
                sale,
                error: error.message
              });
            }
          }
          
          setResults({
            success: successfulUploads.length,
            failed: failedUploads.length,
            total: jsonData.length
          });
          
          setErrors(failedUploads.map(item => ({
            address: `${item.sale.address} ${item.sale.street}`,
            error: item.error
          })));
          
        } catch (error) {
          logger.error('[GarageSalesBulkUpload] Error processing JSON:', error);
          setErrors([{ address: 'N/A', error: `Error processing JSON file: ${error.message}` }]);
        } finally {
          setIsUploading(false);
        }
      };
      
      fileReader.onerror = () => {
        setErrors([{ address: 'N/A', error: 'Error reading file' }]);
        setIsUploading(false);
      };
      
      fileReader.readAsText(file);
      
    } catch (error) {
      logger.error('[GarageSalesBulkUpload] Error during upload:', error);
      setErrors([{ address: 'N/A', error: `Error during upload: ${error.message}` }]);
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setCommunityId('');
    setFile(null);
    setResults({ success: 0, failed: 0, total: 0 });
    setErrors([]);
    setCommunityName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGoToAdmin = () => {
    navigate(`/admin/sales?communityId=${communityId}`);
  };

  return (
    <div className="garage-sales-bulk-upload">
      <h1>Bulk Upload Garage Sales</h1>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="communityId">Community ID:</label>
          <input
            type="text"
            id="communityId"
            value={communityId}
            onChange={handleCommunityIdChange}
            onBlur={fetchCommunityName}
            placeholder="Enter community ID"
            required
          />
          {communityName && (
            <div className="community-name">
              Community Name: <strong>{communityName}</strong>
            </div>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="jsonFile">JSON File:</label>
          <input
            type="file"
            id="jsonFile"
            accept=".json"
            onChange={handleFileChange}
            ref={fileInputRef}
            required
          />
          <div className="file-format-info">
            <h3>Expected JSON Format:</h3>
            <pre>
{`[
  {
    "street": "STREET NAME",
    "address": "STREET NUMBER",
    "description": "DESCRIPTION",
    "city": "CITY", // optional
    "state": "STATE", // optional
    "postalCode": "POSTAL CODE", // optional
    "unit": "UNIT" // optional
  },
  ...
]`}
            </pre>
          </div>
        </div>
        
        <div className="button-group">
          <button 
            type="submit" 
            className="submit-button" 
            disabled={isUploading || !communityId || !file}
          >
            {isUploading ? 'Uploading...' : 'Upload Garage Sales'}
          </button>
          <button 
            type="button" 
            className="reset-button" 
            onClick={handleReset}
            disabled={isUploading}
          >
            Reset
          </button>
          {results.success > 0 && (
            <button 
              type="button" 
              className="admin-button" 
              onClick={handleGoToAdmin}
            >
              Go to Garage Sales Admin
            </button>
          )}
        </div>
      </form>
      
      {(results.success > 0 || results.failed > 0) && (
        <div className="upload-results">
          <h2>Upload Results</h2>
          <div className="results-summary">
            <p>Total: <strong>{results.total}</strong></p>
            <p>Successful: <strong className="success">{results.success}</strong></p>
            <p>Failed: <strong className="error">{results.failed}</strong></p>
          </div>
          
          {errors.length > 0 && (
            <div className="error-list">
              <h3>Failed Uploads:</h3>
              <table>
                <thead>
                  <tr>
                    <th>Address</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.map((error, index) => (
                    <tr key={index}>
                      <td>{error.address}</td>
                      <td>{error.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GarageSalesBulkUpload;

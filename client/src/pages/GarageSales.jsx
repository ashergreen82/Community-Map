import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './GarageSales.css';
import { AddressesContext } from '../AddressesContext';

const api = axios.create({
  baseURL: 'http://localhost:3001',
  timeout: 5000
});

function GarageSales() {
  const { 
    addresses, 
    setAddresses, 
    filteredAddresses, 
    filterAddresses 
  } = useContext(AddressesContext);

  const [garageSales, setGarageSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSales, setSelectedSales] = useState(new Set());
  const navigate = useNavigate();

  console.info('addresses:', addresses);

  useEffect(() => {
    fetchGarageSales();
  }, []);

  const fetchGarageSales = async () => {
    try {
      setLoading(true);
      // Add a unique ID to each sale
      const salesWithIds = addresses.map((sale, index) => ({
        ...sale,
        id: `sale-${index}`
      }));
      setGarageSales(salesWithIds);
      setError(null);
    } catch (err) {
      setError('Failed to load garage sales. Please try again later.');
      console.error('Error fetching garage sales:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
  };

  const handleCheckboxChange = (saleId) => {
    setSelectedSales(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(saleId)) {
        newSelected.delete(saleId);
      } else {
        newSelected.add(saleId);
      }
      return newSelected;
    });
  };

  const handleSelectAll = () => {
    if (selectedSales.size === filteredSales.length) {
      // If all are selected, unselect all
      setSelectedSales(new Set());
    } else {
      // Select all filtered sales
      setSelectedSales(new Set(filteredSales.map(sale => sale.id)));
    }
  };

  const handleViewSelected = async () => {
    const selectedSalesData = filteredSales.filter(sale => selectedSales.has(sale.id));
    console.log('Selected sales before geocoding:', selectedSalesData);
    
    if (selectedSalesData.length > 0) {
      try {
        // Geocode each selected sale before storing
        const geocodedSales = await Promise.all(selectedSalesData.map(async (sale) => {
          const fullAddress = `${sale.Address}, Pickering, ON, Canada`;
          console.log('Geocoding address:', fullAddress);
          
          const response = await api.get('/api/geocode', {
            params: { address: fullAddress }
          });
          console.log('Geocoding response:', response.data);
          
          if (response.data.status === 'OK' && response.data.results && response.data.results[0]) {
            const location = response.data.results[0].geometry.location;
            // Store coordinates as numbers
            const geocodedSale = {
              ...sale,
              lat: Number(location.lat),
              lng: Number(location.lng),
              address: sale.Address, // Add lowercase version for marker display
              description: sale.Description
            };
            console.log('Geocoded sale:', geocodedSale);
            return geocodedSale;
          }
          return sale;
        }));
        
        console.log('Storing geocoded sales:', geocodedSales);
        localStorage.setItem('selectedSales', JSON.stringify(geocodedSales));
        navigate('/');
      } catch (error) {
        console.error('Error geocoding selected sales:', error);
      }
    }
  };

  const handleViewOnMap = async (sale) => {
    try {
      const fullAddress = `${sale.Address}, Pickering, ON, Canada`;
      console.log('Geocoding single address:', fullAddress);
      
      const response = await api.get('/api/geocode', {
        params: { address: fullAddress }
      });
      console.log('Single geocoding response:', response.data);
      
      if (response.data.status === 'OK' && response.data.results && response.data.results[0]) {
        const location = response.data.results[0].geometry.location;
        // Store coordinates as numbers
        const geocodedSale = {
          ...sale,
          lat: Number(location.lat),
          lng: Number(location.lng),
          address: sale.Address, // Add lowercase version for marker display
          description: sale.Description
        };
        console.log('Storing single geocoded sale:', geocodedSale);
        localStorage.setItem('selectedSales', JSON.stringify([geocodedSale]));
        navigate('/');
      }
    } catch (error) {
      console.error('Error geocoding sale:', error);
    }
  };

  const filteredSales = garageSales.filter(sale => 
    sale.address.toLowerCase().includes(searchTerm) ||
    sale.description.toLowerCase().includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="garage-sales-container">
        <div className="loading">Loading garage sales...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="garage-sales-container">
        <div className="error">{error}</div>
        <button className="retry-button" onClick={fetchGarageSales}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="garage-sales-container">
      <h1>Garage Sales</h1>
      
      <div className="controls-container">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search by address or description..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>

        <div className="selection-controls">
          <button 
            className="select-all-button"
            onClick={handleSelectAll}
          >
            {selectedSales.size === filteredSales.length ? 'Unselect All' : 'Select All'}
          </button>
          {selectedSales.size > 0 && (
            <button 
              className="view-selected-button"
              onClick={handleViewSelected}
            >
              View Selected ({selectedSales.size})
            </button>
          )}
        </div>
      </div>

      {filteredSales.length === 0 ? (
        <div className="no-results">
          No garage sales found matching your search.
        </div>
      ) : (
        <div className="garage-sales-list">
          {filteredSales.map((sale) => (
            <div key={sale.id} className="garage-sale-card">
              <div className="card-header">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={selectedSales.has(sale.id)}
                    onChange={() => handleCheckboxChange(sale.id)}
                  />
                  <span className="checkmark"></span>
                </label>
              </div>
              <div className="sale-content">
                <h3>{sale.address}</h3>
                <p>{sale.description}</p>
              </div>
              <button 
                className="view-map-button"
                onClick={() => handleViewOnMap(sale)}
              >
                View on Map
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="total-count">
        Showing {filteredSales.length} of {garageSales.length} garage sales
        {selectedSales.size > 0 && ` (${selectedSales.size} selected)`}
      </div>
    </div>
  );
}

export default GarageSales;

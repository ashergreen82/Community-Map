import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AddressesContext = createContext();

const api = axios.create({
    baseURL: 'http://localhost:3001',
    timeout: 5000
  });

export const AddressesProvider = ({ children }) => {
    const [addresses, setAddresses] = useState([]);

    const [filteredAddresses, setFilteredAddresses] = useState([]);

    useEffect(() => {
        const getData = async () => {
            const { data: addresses } = await api.get('/api/addresses');
            setAddresses(addresses);
        }
        getData();
    }, []);

    const filterAddresses = (searchTerm) => {
        const filtered = addresses.filter(address => address.address.toLowerCase().includes(searchTerm.toLowerCase()));
        setFilteredAddresses(filtered);
    }

    return (
        <AddressesContext.Provider value={{ 
            addresses, 
            setAddresses, 
            filteredAddresses, 
            filterAddresses }}>
            {children}
        </AddressesContext.Provider>
    );
};
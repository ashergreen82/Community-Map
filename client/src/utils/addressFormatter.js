/**
 * Address Formatting Utilities
 * Centralized functions for parsing and formatting addresses consistently across the application.
 */

/**
 * Format an address object into a simple street address string
 * @param {Object} addressObj - Address object with streetNum and street properties
 * @returns {string} Formatted street address (e.g., "123 Main St")
 */
export function formatSimpleAddress(addressObj) {
  if (!addressObj) return 'Address not available';
  
  const { streetNum, street } = addressObj;
  
  if (!streetNum && !street) {
    return 'Address not available';
  }
  
  return `${streetNum || ''} ${street || ''}`.trim();
}

/**
 * Format an address object into a full address string with all components
 * @param {Object} addressObj - Address object with street components
 * @param {Object} options - Formatting options
 * @param {boolean} options.includeUnit - Whether to include unit number
 * @param {boolean} options.multiLine - Return object with addressLine1 and addressLine2
 * @returns {string|Object} Formatted full address or object with addressLine1 and addressLine2
 */
export function formatFullAddress(addressObj, options = {}) {
  if (!addressObj) return options.multiLine ? { addressLine1: '', addressLine2: '' } : '';
  
  const {
    streetNum,
    street,
    unit,
    city,
    provState,
    state,
    postalZipCode,
    postalCode
  } = addressObj;
  
  const { includeUnit = false, multiLine = false } = options;
  
  // Build address line 1 (street address)
  const streetParts = [streetNum, street];
  if (includeUnit && unit) {
    streetParts.push(`Unit ${unit}`);
  }
  const addressLine1 = streetParts.filter(Boolean).join(' ').trim();
  
  // Build address line 2 (city, state, zip)
  const addressLine2Parts = [
    city,
    provState || state,
    postalZipCode || postalCode
  ];
  const addressLine2 = addressLine2Parts.filter(Boolean).join(', ').trim();
  
  if (multiLine) {
    return { addressLine1, addressLine2 };
  }
  
  // Single line format
  const allParts = [addressLine1, addressLine2].filter(Boolean);
  return allParts.join(', ');
}

/**
 * Parse a full address string into components
 * Handles formats like: "123 Main St, Toronto, ON"
 * @param {string} addressString - Full address string
 * @returns {Object} Address components
 */
export function parseAddressString(addressString) {
  if (!addressString) {
    return {
      streetNumber: '',
      street: '',
      city: '',
      state: '',
      postalCode: '',
      unit: ''
    };
  }
  
  // Split by commas to separate street, city, state
  const parts = addressString.split(',').map(part => part.trim());
  
  // Parse the first part (street address)
  const streetParts = parts[0].split(' ');
  
  return {
    streetNumber: streetParts[0] || '',
    street: streetParts.slice(1).join(' ') || '',
    city: parts[1] || '',
    state: parts[2] || '',
    postalCode: '',
    unit: ''
  };
}

/**
 * Parse street number and name from a street address string
 * Handles formats like: "123 Main St" or "123A Oak Avenue"
 * @param {string} streetAddress - Street address string
 * @returns {Object} Object with streetNum and street properties
 */
export function parseStreetAddress(streetAddress) {
  if (!streetAddress) {
    return { streetNum: '', street: '' };
  }
  
  // Match the first sequence of digits (with optional letter) at the start
  const match = streetAddress.match(/^(\d+[A-Za-z]?)\s*(.*)/);
  
  if (match) {
    return {
      streetNum: match[1],
      street: match[2].trim()
    };
  }
  
  // If no match, assume the entire string is the street name
  return { streetNum: '', street: streetAddress };
}

/**
 * Convert API address object to frontend format
 * Handles different property name variations (streetNum vs streetNumber, etc.)
 * @param {Object} apiAddress - Address from API
 * @returns {Object} Normalized address object
 */
export function normalizeAddressObject(apiAddress) {
  if (!apiAddress) return null;
  
  return {
    streetNum: apiAddress.streetNum || apiAddress.streetNumber || '',
    street: apiAddress.street || apiAddress.streetName || '',
    unit: apiAddress.unit || '',
    city: apiAddress.city || '',
    provState: apiAddress.provState || apiAddress.state || '',
    postalZipCode: apiAddress.postalZipCode || apiAddress.postalCode || apiAddress.zipCode || ''
  };
}

/**
 * Create address object for API submission
 * @param {Object} addressData - Raw address data
 * @returns {Object} API-ready address object
 */
export function prepareAddressForAPI(addressData) {
  return {
    street: addressData.street || addressData.streetName || '',
    streetNum: addressData.streetNum || addressData.streetNumber || '',
    city: addressData.city || '',
    provState: addressData.provState || addressData.state || '',
    postalZipCode: addressData.postalZipCode || addressData.postalCode || '',
    unit: addressData.unit || ''
  };
}

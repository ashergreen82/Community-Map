import { describe, test, expect } from 'vitest';
import { mockGarageSales } from './mockData';

describe('mockData', () => {
  describe('mockGarageSales', () => {
    test('should be an array', () => {
      expect(Array.isArray(mockGarageSales)).toBe(true);
    });

    test('should contain at least one garage sale', () => {
      expect(mockGarageSales.length).toBeGreaterThan(0);
    });

    test('each garage sale should have required properties', () => {
      mockGarageSales.forEach(sale => {
        expect(sale).toHaveProperty('address');
        expect(sale).toHaveProperty('description');
        expect(sale).toHaveProperty('position');
        expect(sale.position).toHaveProperty('lat');
        expect(sale.position).toHaveProperty('lng');
      });
    });

    test('addresses should be strings', () => {
      mockGarageSales.forEach(sale => {
        expect(typeof sale.address).toBe('string');
        expect(sale.address.length).toBeGreaterThan(0);
      });
    });

    test('positions should have valid coordinates', () => {
      mockGarageSales.forEach(sale => {
        expect(typeof sale.position.lat).toBe('number');
        expect(typeof sale.position.lng).toBe('number');
        expect(sale.position.lat).toBeGreaterThan(-90);
        expect(sale.position.lat).toBeLessThan(90);
        expect(sale.position.lng).toBeGreaterThan(-180);
        expect(sale.position.lng).toBeLessThan(180);
      });
    });
  });
});

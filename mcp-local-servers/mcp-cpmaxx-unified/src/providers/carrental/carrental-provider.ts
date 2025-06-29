import { carRentalParser } from './carrental-parser';
import { CarRentalSearchResults, CarRentalSearchCriteria } from './types';
import { logger } from '../../utils/logger';

/**
 * Car Rental Provider for CPMaxx
 * Parses HTML results from CPMaxx car rental searches
 */
export class CarRentalProvider {
  constructor() {
    // No chromeMcp needed - this is now just a parser
  }

  async parse(html: string, criteria: any): Promise<CarRentalSearchResults> {
    logger.info('Parsing car rental results from HTML');
    
    try {
      // Use the parser to extract results
      const results = await carRentalParser.parse(html, undefined, {
        includeDebugInfo: true,
        extractAll: true
      });
      
      // Enhance with criteria
      results.criteria = {
        pickupLocation: criteria.destination,
        dropoffLocation: criteria.destination,
        pickupDate: criteria.departureDate,
        pickupTime: criteria.pickupTime,
        dropoffDate: criteria.returnDate,
        dropoffTime: criteria.dropoffTime,
        carType: criteria.carType
      };
      
      return results;
    } catch (error) {
      logger.error('Failed to parse car rental results:', error);
      throw error;
    }
  }
}
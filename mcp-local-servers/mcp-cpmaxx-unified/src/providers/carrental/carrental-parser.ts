// Car Rental Parser for CPMaxx
// Extracts vehicle data from CPMaxx HTML pages

import { CarRentalVehicle, CarRentalSearchResults } from './types';

export class CarRentalParser {
  /**
   * Parse car rental search results from HTML
   */
  async parse(html: string, url?: string, options?: any): Promise<CarRentalSearchResults> {
    const results: CarRentalSearchResults = {
      provider: 'cpmaxx_carrental',
      searchId: this.generateSearchId(),
      criteria: {} as any,
      searchDate: new Date().toISOString(),
      searchLocation: '',
      offers: [],
      errors: []
    };

    try {
      // Extract vehicles from HTML
      const vehicles = this.extractVehicles(html);
      
      // Convert to offers
      results.offers = vehicles.map((vehicle, index) => ({
        offerId: `${results.searchId}-${index}`,
        vendorCode: 'UNKNOWN',
        vendorName: 'Unknown Vendor',
        vehicle,
        pickupLocation: '',
        dropoffLocation: '',
        pickupDate: '',
        dropoffDate: ''
      }));

      results.totalVehicles = vehicles.length;

    } catch (error) {
      results.errors.push({
        code: 'PARSE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to parse car rental results'
      });
    }

    return results;
  }

  /**
   * Extract vehicles from HTML
   */
  private extractVehicles(html: string): CarRentalVehicle[] {
    const vehicles: CarRentalVehicle[] = [];

    try {
      // Look for vendor result patterns in the HTML
      const vendorMatches = html.match(/<div[^>]*class="[^"]*vendor[^"]*"[^>]*>[\s\S]*?<\/div>/gi) || [];
      
      vendorMatches.forEach((vendorBlock) => {
        // Extract basic vehicle info from each block
        const nameMatch = vendorBlock.match(/class="[^"]*vehicle[^"]*"[^>]*>([^<]+)</i);
        const priceMatch = vendorBlock.match(/\$(\d+\.?\d*)/);
        
        if (nameMatch) {
          vehicles.push({
            id: `vehicle_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            vehicleClass: 'Economy', // Default
            vehicleName: nameMatch[1].trim(),
            vehicleType: 'Car',
            transmission: 'Automatic',
            capacity: {
              passengers: 5,
              luggage: 2
            },
            features: ['Air Conditioning'],
            price: {
              total: priceMatch ? parseFloat(priceMatch[1]) : 0,
              daily: priceMatch ? parseFloat(priceMatch[1]) / 3 : 0, // Estimate
              currency: 'USD'
            }
          });
        }
      });
    } catch (error) {
      console.error('Error extracting vehicles:', error);
    }
    
    // If no vehicles found, this is okay - the HTML might not have results
    return vehicles;
  }

  /**
   * Generate unique search ID
   */
  private generateSearchId(): string {
    return `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const carRentalParser = new CarRentalParser();
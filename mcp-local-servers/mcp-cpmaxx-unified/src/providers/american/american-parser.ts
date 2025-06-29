import { AmericanSearchResults, VacationPackage } from '../../types/index.js';
import * as cheerio from 'cheerio';

export class AmericanParser {
  private searchCriteria: any;
  async parse(html: string, searchCriteria: any): Promise<AmericanSearchResults> {
    this.searchCriteria = searchCriteria;
    const results: AmericanSearchResults = {
      provider: 'american',
      searchId: this.generateSearchId(),
      criteria: searchCriteria,
      searchDate: new Date().toISOString(),
      searchLocation: searchCriteria.destination || '',
      packages: [],
      totalPackages: 0,
      errors: []
    };

    try {
      const $ = cheerio.load(html);
      
      // Look for package containers - American Vacations specific selectors
      $('.package-tile, .vacation-result, .package-option').each((index, element) => {
        try {
          const pkg = this.extractPackage($, element, index);
          if (pkg) {
            results.packages.push(pkg);
          }
        } catch (error) {
          console.error('Error parsing American package:', error);
        }
      });

      // Alternative selectors for American Vacations
      if (results.packages.length === 0) {
        $('[class*="packageResult"], [class*="vacationPackage"]').each((index, element) => {
          try {
            const pkg = this.extractPackage($, element, index);
            if (pkg) {
              results.packages.push(pkg);
            }
          } catch (error) {
            console.error('Error parsing American package (alt):', error);
          }
        });
      }

      results.totalPackages = results.packages.length;

      if (results.packages.length === 0) {
        // Check for no results or error messages
        const noResultsText = $('.no-availability, .error-message').text();
        if (noResultsText) {
          results.errors.push({
            code: 'NO_RESULTS',
            message: 'No vacation packages available for the selected dates and destination'
          });
        }
      }

    } catch (error) {
      results.errors.push({
        code: 'PARSE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to parse American Vacations results'
      });
    }

    return results;
  }

  private extractPackage($: cheerio.CheerioAPI, element: any, index: number): VacationPackage | null {
    const $elem = $(element);
    
    // Extract hotel information
    const hotelName = $elem.find('.hotel-name, .property-name, h3.title').first().text().trim();
    const hotelRating = this.extractRating($elem);
    const hotelLocation = $elem.find('.location, .hotel-address').text().trim();

    // Extract flight information
    const airline = $elem.find('.airline-name, .carrier').text().trim() || 'American Airlines';
    const flightInfo = $elem.find('.flight-info, .flight-details').text();
    const stops = this.extractStops($elem);

    // Extract pricing information
    const priceText = $elem.find('.package-price, .total-price, .price-amount').text();
    const totalPrice = this.extractPrice(priceText);
    const perPersonPrice = this.extractPerPersonPrice($elem) || totalPrice / 2;

    // Extract duration
    const durationText = $elem.find('.duration, .package-duration').text();
    const nights = this.extractNights(durationText);

    if (!hotelName && !totalPrice) {
      return null;
    }

    return {
      packageId: `american_${Date.now()}_${index}`,
      provider: 'american',
      hotel: {
        name: hotelName || 'Hotel Details Available at Booking',
        rating: hotelRating,
        location: hotelLocation || this.searchCriteria?.destination || 'Destination'
      },
      flight: {
        airline: airline,
        departureTime: this.extractFlightTime(flightInfo, 'departure'),
        arrivalTime: this.extractFlightTime(flightInfo, 'arrival'),
        stops: stops
      },
      pricing: {
        total: totalPrice,
        perPerson: perPersonPrice,
        currency: 'USD',
        taxes: totalPrice * 0.12 // Estimate for taxes
      },
      duration: {
        nights: nights,
        days: nights + 1
      }
    };
  }

  private extractRating(element: cheerio.Cheerio<any>): number {
    // Look for star ratings
    const stars = element.find('.star-rating, .rating-stars, [class*="star"]');
    if (stars.length > 0) {
      // Count filled stars
      const filledStars = stars.find('.filled, .active, [class*="filled"]').length;
      if (filledStars > 0) return filledStars;
      
      // Try to extract from text
      const ratingText = stars.text();
      const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
      return ratingMatch ? parseFloat(ratingMatch[1]) : 0;
    }
    
    // Alternative: look for numeric rating
    const ratingText = element.find('.rating, .hotel-rating').text();
    const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
    return ratingMatch ? parseFloat(ratingMatch[1]) : 0;
  }

  private extractPrice(priceText: string): number {
    // Remove currency symbols and extract number
    const priceMatch = priceText.match(/\$?\s*(\d+,?\d*\.?\d*)/);
    if (priceMatch) {
      return parseFloat(priceMatch[1].replace(/,/g, ''));
    }
    return 0;
  }

  private extractPerPersonPrice(element: cheerio.Cheerio<any>): number {
    const perPersonText = element.find('.per-person, .pp-price, [class*="perPerson"]').text();
    return this.extractPrice(perPersonText);
  }

  private extractStops(element: cheerio.Cheerio<any>): number {
    const stopsText = element.find('.stops, .flight-stops, [class*="stop"]').text().toLowerCase();
    if (stopsText.includes('nonstop') || stopsText.includes('non-stop') || stopsText.includes('direct')) {
      return 0;
    }
    const stopsMatch = stopsText.match(/(\d+)\s*stop/);
    return stopsMatch ? parseInt(stopsMatch[1]) : 1;
  }

  private extractNights(durationText: string): number {
    const nightsMatch = durationText.match(/(\d+)\s*night/i);
    if (nightsMatch) return parseInt(nightsMatch[1]);
    
    // Try days format
    const daysMatch = durationText.match(/(\d+)\s*day/i);
    if (daysMatch) return parseInt(daysMatch[1]) - 1;
    
    return 4; // Default to 4 nights
  }

  private extractFlightTime(flightInfo: string, type: 'departure' | 'arrival'): string {
    // Try to extract times from flight info
    const timePattern = /(\d{1,2}:\d{2}\s*[AP]M)/gi;
    const times = flightInfo.match(timePattern);
    
    if (times && times.length >= 2) {
      return type === 'departure' ? times[0] : times[1];
    }
    
    return 'Schedule available at booking';
  }

  private generateSearchId(): string {
    return `american-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const americanParser = new AmericanParser();
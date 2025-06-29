import { DeltaSearchResults, VacationPackage } from '../../types/index.js';
import * as cheerio from 'cheerio';

export class DeltaParser {
  async parse(html: string, searchCriteria: any): Promise<DeltaSearchResults> {
    const results: DeltaSearchResults = {
      provider: 'delta',
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
      
      // Look for package containers
      $('.package-card, .vacation-package, .result-item').each((index, element) => {
        try {
          const pkg = this.extractPackage($, element, index);
          if (pkg) {
            results.packages.push(pkg);
          }
        } catch (error) {
          console.error('Error parsing package:', error);
        }
      });

      // Alternative selectors
      if (results.packages.length === 0) {
        $('[data-testid*="package"], [class*="PackageCard"]').each((index, element) => {
          try {
            const pkg = this.extractPackage($, element, index);
            if (pkg) {
              results.packages.push(pkg);
            }
          } catch (error) {
            console.error('Error parsing package (alt):', error);
          }
        });
      }

      results.totalPackages = results.packages.length;

      if (results.packages.length === 0) {
        // Check for no results message
        const noResultsText = $('.no-results, .empty-results').text();
        if (noResultsText) {
          results.errors.push({
            code: 'NO_RESULTS',
            message: 'No vacation packages found for the selected criteria'
          });
        }
      }

    } catch (error) {
      results.errors.push({
        code: 'PARSE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to parse Delta results'
      });
    }

    return results;
  }

  private extractPackage($: cheerio.CheerioAPI, element: any, index: number): VacationPackage | null {
    const $elem = $(element);
    
    // Extract hotel info
    const hotelName = $elem.find('.hotel-name, [class*="hotelName"], h3').first().text().trim();
    const hotelRating = this.extractRating($elem);
    const hotelLocation = $elem.find('.hotel-location, [class*="location"]').text().trim();

    // Extract flight info
    const airline = $elem.find('.airline, [class*="airline"]').text().trim() || 'Delta Air Lines';
    const flightTimes = $elem.find('.flight-times, [class*="flightTime"]').text();
    const stops = this.extractStops($elem);

    // Extract pricing
    const priceText = $elem.find('.price, .total-price, [class*="price"]').text();
    const totalPrice = this.extractPrice(priceText);

    // Extract duration
    const durationText = $elem.find('.duration, .nights, [class*="duration"]').text();
    const nights = this.extractNights(durationText);

    if (!hotelName && !totalPrice) {
      return null;
    }

    return {
      packageId: `delta_${Date.now()}_${index}`,
      provider: 'delta',
      hotel: {
        name: hotelName || 'Hotel Information Available Upon Booking',
        rating: hotelRating,
        location: hotelLocation || 'Location details available'
      },
      flight: {
        airline: airline,
        departureTime: this.extractDepartureTime(flightTimes),
        arrivalTime: this.extractArrivalTime(flightTimes),
        stops: stops
      },
      pricing: {
        total: totalPrice,
        perPerson: totalPrice / 2, // Assuming 2 people by default
        currency: 'USD',
        taxes: totalPrice * 0.15 // Estimate
      },
      duration: {
        nights: nights,
        days: nights + 1
      }
    };
  }

  private extractRating(element: cheerio.Cheerio<any>): number {
    const ratingText = element.find('.rating, .stars, [class*="rating"]').text();
    const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
    return ratingMatch ? parseFloat(ratingMatch[1]) : 0;
  }

  private extractPrice(priceText: string): number {
    const priceMatch = priceText.match(/\$?\s*(\d+,?\d*\.?\d*)/);
    if (priceMatch) {
      return parseFloat(priceMatch[1].replace(/,/g, ''));
    }
    return 0;
  }

  private extractStops(element: cheerio.Cheerio<any>): number {
    const stopsText = element.find('.stops, [class*="stop"]').text().toLowerCase();
    if (stopsText.includes('nonstop') || stopsText.includes('direct')) {
      return 0;
    }
    const stopsMatch = stopsText.match(/(\d+)\s*stop/);
    return stopsMatch ? parseInt(stopsMatch[1]) : 1;
  }

  private extractNights(durationText: string): number {
    const nightsMatch = durationText.match(/(\d+)\s*night/i);
    return nightsMatch ? parseInt(nightsMatch[1]) : 3; // Default to 3 nights
  }

  private extractDepartureTime(flightTimes: string): string {
    const times = flightTimes.split(/[-–]/);
    return times[0]?.trim() || 'TBA';
  }

  private extractArrivalTime(flightTimes: string): string {
    const times = flightTimes.split(/[-–]/);
    return times[1]?.trim() || 'TBA';
  }

  private generateSearchId(): string {
    return `delta-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const deltaParser = new DeltaParser();
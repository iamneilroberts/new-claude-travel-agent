import { HotelSearchResults, Hotel } from '../../types/index.js';
import * as cheerio from 'cheerio';

export class HotelParser {
  async parse(html: string, searchCriteria: any): Promise<HotelSearchResults> {
    const results: HotelSearchResults = {
      provider: 'hotel',
      searchId: this.generateSearchId(),
      criteria: searchCriteria,
      searchDate: new Date().toISOString(),
      searchLocation: searchCriteria.destination || '',
      hotels: [],
      totalHotels: 0,
      errors: []
    };

    try {
      const $ = cheerio.load(html);
      
      // Look for hotel containers
      $('.hotel-result, .property-card, .hotel-listing').each((index, element) => {
        try {
          const hotel = this.extractHotel($, element, index);
          if (hotel) {
            results.hotels.push(hotel);
          }
        } catch (error) {
          console.error('Error parsing hotel:', error);
        }
      });

      // Alternative selectors for different layouts
      if (results.hotels.length === 0) {
        $('[class*="hotelResult"], [class*="propertyCard"], .search-result-item').each((index, element) => {
          try {
            const hotel = this.extractHotel($, element, index);
            if (hotel) {
              results.hotels.push(hotel);
            }
          } catch (error) {
            console.error('Error parsing hotel (alt):', error);
          }
        });
      }

      results.totalHotels = results.hotels.length;

      if (results.hotels.length === 0) {
        // Check for no results message
        const noResultsText = $('.no-results, .empty-state, .no-hotels-found').text();
        if (noResultsText) {
          results.errors.push({
            code: 'NO_RESULTS',
            message: 'No hotels found for the selected criteria'
          });
        }
      }

    } catch (error) {
      results.errors.push({
        code: 'PARSE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to parse hotel results'
      });
    }

    return results;
  }

  private extractHotel($: cheerio.CheerioAPI, element: any, index: number): Hotel | null {
    const $elem = $(element);
    
    // Extract hotel name
    const hotelName = $elem.find('.hotel-name, .property-name, h3, h2').first().text().trim();
    
    // Extract location
    const location = $elem.find('.location, .address, .hotel-location').text().trim();
    
    // Extract star rating
    const starRating = this.extractStarRating($elem);
    
    // Extract amenities
    const amenities = this.extractAmenities($elem);
    
    // Extract room types and pricing
    const roomTypes = this.extractRoomTypes($elem);
    
    // Extract pricing
    const priceText = $elem.find('.price, .rate, .hotel-price').text();
    const pricePerNight = this.extractPrice(priceText);
    const nights = this.calculateNights(priceText);
    const totalPrice = pricePerNight * nights;

    if (!hotelName && !pricePerNight) {
      return null;
    }

    return {
      hotelId: `hotel_${Date.now()}_${index}`,
      name: hotelName || 'Hotel Name Not Available',
      location: location || 'Location details available at booking',
      starRating: starRating,
      amenities: amenities,
      roomTypes: roomTypes.length > 0 ? roomTypes : [{
        type: 'Standard Room',
        price: pricePerNight,
        available: true
      }],
      pricing: {
        perNight: pricePerNight,
        total: totalPrice,
        currency: 'USD'
      }
    };
  }

  private extractStarRating(element: cheerio.Cheerio<any>): number {
    // Look for star elements
    const stars = element.find('.stars, .star-rating, [class*="star"]');
    
    // Count filled/active stars
    const filledStars = stars.find('.filled, .active, .fa-star:not(.fa-star-o)').length;
    if (filledStars > 0) return filledStars;
    
    // Try to extract from class names
    const starClass = stars.attr('class') || '';
    const starMatch = starClass.match(/star-?(\d)/);
    if (starMatch) return parseInt(starMatch[1]);
    
    // Try to extract from text
    const ratingText = element.find('.rating, .star-text').text();
    const textMatch = ratingText.match(/(\d+\.?\d*)\s*star/i);
    if (textMatch) return Math.round(parseFloat(textMatch[1]));
    
    return 3; // Default to 3 stars
  }

  private extractAmenities(element: cheerio.Cheerio<any>): string[] {
    const amenities: string[] = [];
    
    // Look for amenity lists
    element.find('.amenity, .amenities li, .facility, [class*="amenity"]').each((i, el) => {
      const amenity = element.find(el).text().trim();
      if (amenity && amenity.length < 50) { // Avoid long text blocks
        amenities.push(amenity);
      }
    });
    
    // Look for amenity icons with titles
    element.find('[data-amenity], [title*="amenity"], .amenity-icon').each((i, el) => {
      const $el = element.find(el);
      const amenity = $el.attr('title') || $el.attr('data-amenity') || $el.text().trim();
      if (amenity && !amenities.includes(amenity)) {
        amenities.push(amenity);
      }
    });
    
    // Default amenities if none found
    if (amenities.length === 0) {
      amenities.push('WiFi', 'Air Conditioning', 'Restaurant');
    }
    
    return amenities.slice(0, 10); // Limit to 10 amenities
  }

  private extractRoomTypes(element: cheerio.Cheerio<any>): Array<{ type: string; price: number; available: boolean }> {
    const roomTypes: Array<{ type: string; price: number; available: boolean }> = [];
    
    // Look for room type containers
    element.find('.room-type, .room-option, [class*="roomType"]').each((i, el) => {
      const $room = element.find(el);
      const type = $room.find('.room-name, .type-name, h4').text().trim();
      const priceText = $room.find('.room-price, .price').text();
      const price = this.extractPrice(priceText);
      const available = !$room.hasClass('unavailable') && !$room.find('.sold-out').length;
      
      if (type && price > 0) {
        roomTypes.push({ type, price, available });
      }
    });
    
    return roomTypes;
  }

  private extractPrice(priceText: string): number {
    // Extract numeric price, handling various formats
    const priceMatch = priceText.match(/\$?\s*(\d+,?\d*\.?\d*)/);
    if (priceMatch) {
      return parseFloat(priceMatch[1].replace(/,/g, ''));
    }
    return 0;
  }

  private calculateNights(priceText: string): number {
    // Try to determine number of nights from the price text
    const nightsMatch = priceText.match(/(\d+)\s*night/i);
    if (nightsMatch) return parseInt(nightsMatch[1]);
    
    // Default based on search criteria (would be passed in real implementation)
    return 1; // Default to per night pricing
  }

  private generateSearchId(): string {
    return `hotel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const hotelParser = new HotelParser();
// Data Extractor Module for CPMaxx Integration
// Handles extraction and parsing of search results from CPMaxx pages

import { HotelResult, CarResult, PackageResult } from '../services/browser-service.js';

export interface ExtractionConfig {
  timeout: number;
  debug: boolean;
  maxResults: number;
}

export class CPMaxxDataExtractor {
  private config: ExtractionConfig;

  constructor(config: ExtractionConfig) {
    this.config = config;
  }

  private logWithTime(message: string): void {
    if (this.config.debug) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] CPMaxx DataExtractor: ${message}`);
    }
  }

  /**
   * Extract hotel data from search results page
   */
  async extractHotelResults(page: any, searchLocation: string): Promise<HotelResult[]> {
    this.logWithTime('Extracting hotel data from results page...');
    
    try {
      // Wait for results to load
      await page.waitForSelector('.property, .hotel-item, .search-result-item, .hotel-result', { 
        timeout: this.config.timeout 
      });

      // Extract hotel data using page.evaluate to run in browser context
      const hotelData = await page.evaluate((locationCtx: string, maxResults: number) => {
        const hotels: any[] = [];
        
        // Use robust selectors for hotel containers
        const hotelContainers = Array.from(document.querySelectorAll(
          '.property.result, .hotel-item, .search-result-item, div[data-hotelid], .hotel-result, .property-card'
        ));

        console.log(`[Browser Context] Found ${hotelContainers.length} potential hotel containers`);

        hotelContainers.slice(0, maxResults).forEach((container, index) => {
          const hotel: any = {};
          
          try {
            // Extract hotel name
            const nameElement = container.querySelector(
              '.property-name, .hotel-name, h3[class*="name"], h4[class*="name"], .title, .hotel-title'
            );
            hotel.name = nameElement ? nameElement.textContent?.trim() : `Hotel ${index + 1}`;

            // Extract address/location
            const addressElement = container.querySelector(
              '.property-address, .hotel-address, .address, .location, span[class*="address"]'
            );
            hotel.location = addressElement ? addressElement.textContent?.trim() : locationCtx;

            // Extract description
            const descriptionElement = container.querySelector(
              '.property-description, .hotel-description, .description, .hotel-desc, p[class*="desc"]'
            );
            hotel.description = descriptionElement ? descriptionElement.textContent?.trim() : 'Description not available';

            // Extract star rating
            hotel.starRating = 0;
            const ratingElement = container.querySelector(
              '.hotel-rating, .property-rating, .rating, .stars, div[aria-label*="star"], .star-rating'
            );
            if (ratingElement) {
              const ratingText = ratingElement.getAttribute('aria-label') || ratingElement.textContent?.trim() || '';
              const ratingMatch = ratingText.match(/(\d+(\.\d+)?)\s*star/i);
              if (ratingMatch) {
                hotel.starRating = parseFloat(ratingMatch[1]);
              } else {
                // Count star icons
                const starIcons = ratingElement.querySelectorAll('.fa-star, .star, .icon-star, svg[class*="star"]');
                if (starIcons.length > 0) {
                  hotel.starRating = starIcons.length;
                }
              }
            }

            // Extract price
            const priceElement = container.querySelector(
              '.price, .hotel-price, .property-price, .rate, .cost, .amount, .price-display'
            );
            hotel.price = priceElement ? priceElement.textContent?.trim() : 'Price not available';

            // Extract amenities
            hotel.amenities = [];
            const amenityElements = container.querySelectorAll(
              '.amenity, .amenities li, .features li, .hotel-amenities li, .property-amenities li'
            );
            amenityElements.forEach((amenity: any) => {
              const amenityText = amenity.textContent?.trim();
              if (amenityText) {
                hotel.amenities.push(amenityText);
              }
            });

            // Extract availability
            const availabilityElement = container.querySelector(
              '.availability, .status, .booking-status, .available'
            );
            hotel.availability = availabilityElement ? availabilityElement.textContent?.trim() : 'Available';

            // Extract booking URL
            const bookingLinkElement = container.querySelector('a[href*="book"], .book-button, .booking-link');
            hotel.bookingUrl = bookingLinkElement ? bookingLinkElement.getAttribute('href') : '#';

            // Extract images
            hotel.images = [];
            const imageElements = container.querySelectorAll('img[src*="hotel"], .hotel-image img, .property-image img');
            imageElements.forEach((img: any) => {
              const src = img.getAttribute('src');
              if (src && !src.includes('placeholder')) {
                hotel.images.push(src);
              }
            });

            hotels.push(hotel);
            
          } catch (error) {
            console.log(`[Browser Context] Error extracting hotel ${index + 1}:`, error);
          }
        });

        return hotels;
      }, searchLocation, this.config.maxResults);

      this.logWithTime(`Extracted ${hotelData.length} hotel results`);
      return hotelData as HotelResult[];

    } catch (error) {
      this.logWithTime(`Error extracting hotel data: ${error}`);
      throw new Error(`Hotel data extraction failed: ${error}`);
    }
  }

  /**
   * Extract car rental data from search results page
   */
  async extractCarResults(page: any): Promise<CarResult[]> {
    this.logWithTime('Extracting car rental data from results page...');
    
    try {
      // Wait for results to load
      await page.waitForSelector('.car-result, .vehicle-item, .rental-car, .car-option', { 
        timeout: this.config.timeout 
      });

      // Extract car data using page.evaluate
      const carData = await page.evaluate((maxResults: number) => {
        const cars: any[] = [];
        
        // Use robust selectors for car containers
        const carContainers = Array.from(document.querySelectorAll(
          '.car-result, .vehicle-item, .rental-car, .car-option, .vehicle-card, div[data-carid]'
        ));

        console.log(`[Browser Context] Found ${carContainers.length} potential car containers`);

        carContainers.slice(0, maxResults).forEach((container, index) => {
          const car: any = {};
          
          try {
            // Extract car agency
            const agencyElement = container.querySelector(
              '.agency, .rental-agency, .car-agency, .supplier, .vendor'
            );
            car.agency = agencyElement ? agencyElement.textContent?.trim() : `Agency ${index + 1}`;

            // Extract car type/category
            const typeElement = container.querySelector(
              '.car-type, .vehicle-type, .category, .car-category'
            );
            car.carType = typeElement ? typeElement.textContent?.trim() : 'Standard';

            // Extract car model
            const modelElement = container.querySelector(
              '.car-model, .vehicle-model, .model, .car-name, .vehicle-name'
            );
            car.model = modelElement ? modelElement.textContent?.trim() : 'Vehicle model not specified';

            // Extract daily rate
            const dailyRateElement = container.querySelector(
              '.daily-rate, .day-rate, .per-day, .daily-price'
            );
            car.dailyRate = dailyRateElement ? dailyRateElement.textContent?.trim() : 'Rate not available';

            // Extract total cost
            const totalCostElement = container.querySelector(
              '.total-cost, .total-price, .total, .final-price'
            );
            car.totalCost = totalCostElement ? totalCostElement.textContent?.trim() : 'Total not available';

            // Extract features
            car.features = [];
            const featureElements = container.querySelectorAll(
              '.feature, .features li, .car-features li, .amenities li'
            );
            featureElements.forEach((feature: any) => {
              const featureText = feature.textContent?.trim();
              if (featureText) {
                car.features.push(featureText);
              }
            });

            // Extract insurance info
            const insuranceElement = container.querySelector(
              '.insurance, .coverage, .protection, .insurance-info'
            );
            car.insurance = insuranceElement ? insuranceElement.textContent?.trim() : 'Insurance details not available';

            // Extract booking URL
            const bookingLinkElement = container.querySelector('a[href*="book"], .book-button, .booking-link');
            car.bookingUrl = bookingLinkElement ? bookingLinkElement.getAttribute('href') : '#';

            cars.push(car);
            
          } catch (error) {
            console.log(`[Browser Context] Error extracting car ${index + 1}:`, error);
          }
        });

        return cars;
      }, this.config.maxResults);

      this.logWithTime(`Extracted ${carData.length} car rental results`);
      return carData as CarResult[];

    } catch (error) {
      this.logWithTime(`Error extracting car rental data: ${error}`);
      throw new Error(`Car rental data extraction failed: ${error}`);
    }
  }

  /**
   * Extract vacation package data from search results page
   */
  async extractPackageResults(page: any): Promise<PackageResult[]> {
    this.logWithTime('Extracting vacation package data from results page...');
    
    try {
      // Wait for results to load
      await page.waitForSelector('.package-result, .vacation-package, .package-option, .deal-card', { 
        timeout: this.config.timeout 
      });

      // Extract package data using page.evaluate
      const packageData = await page.evaluate((maxResults: number) => {
        const packages: any[] = [];
        
        // Use robust selectors for package containers
        const packageContainers = Array.from(document.querySelectorAll(
          '.package-result, .vacation-package, .package-option, .deal-card, .package-card'
        ));

        console.log(`[Browser Context] Found ${packageContainers.length} potential package containers`);

        packageContainers.slice(0, maxResults).forEach((container, index) => {
          const pkg: any = {};
          
          try {
            // Extract package name
            const nameElement = container.querySelector(
              '.package-name, .deal-name, .vacation-name, h3, h4, .title'
            );
            pkg.name = nameElement ? nameElement.textContent?.trim() : `Package ${index + 1}`;

            // Extract destination
            const destinationElement = container.querySelector(
              '.destination, .package-destination, .location'
            );
            pkg.destination = destinationElement ? destinationElement.textContent?.trim() : 'Destination not specified';

            // Extract flight details
            const flightElement = container.querySelector('.flight-details, .flight-info');
            if (flightElement) {
              pkg.flight = {
                departure: 'Departure not specified',
                arrival: 'Arrival not specified', 
                airline: 'Airline not specified',
                price: 'Price not available'
              };

              const departureEl = flightElement.querySelector('.departure, .from');
              const arrivalEl = flightElement.querySelector('.arrival, .to');
              const airlineEl = flightElement.querySelector('.airline, .carrier');
              const flightPriceEl = flightElement.querySelector('.flight-price, .price');

              if (departureEl) pkg.flight.departure = departureEl.textContent?.trim();
              if (arrivalEl) pkg.flight.arrival = arrivalEl.textContent?.trim();
              if (airlineEl) pkg.flight.airline = airlineEl.textContent?.trim();
              if (flightPriceEl) pkg.flight.price = flightPriceEl.textContent?.trim();
            }

            // Extract hotel details
            const hotelElement = container.querySelector('.hotel-details, .hotel-info');
            if (hotelElement) {
              pkg.hotel = {
                name: 'Hotel not specified',
                starRating: 0,
                price: 'Price not available'
              };

              const hotelNameEl = hotelElement.querySelector('.hotel-name, .name');
              const hotelRatingEl = hotelElement.querySelector('.rating, .stars');
              const hotelPriceEl = hotelElement.querySelector('.hotel-price, .price');

              if (hotelNameEl) pkg.hotel.name = hotelNameEl.textContent?.trim();
              if (hotelRatingEl) {
                const ratingText = hotelRatingEl.textContent?.trim() || '';
                const ratingMatch = ratingText.match(/(\d+)/);
                if (ratingMatch) pkg.hotel.starRating = parseInt(ratingMatch[1]);
              }
              if (hotelPriceEl) pkg.hotel.price = hotelPriceEl.textContent?.trim();
            }

            // Extract car details
            const carElement = container.querySelector('.car-details, .car-info');
            if (carElement) {
              pkg.car = {
                type: 'Car type not specified',
                price: 'Price not available'
              };

              const carTypeEl = carElement.querySelector('.car-type, .type');
              const carPriceEl = carElement.querySelector('.car-price, .price');

              if (carTypeEl) pkg.car.type = carTypeEl.textContent?.trim();
              if (carPriceEl) pkg.car.price = carPriceEl.textContent?.trim();
            }

            // Extract total price
            const totalPriceElement = container.querySelector(
              '.total-price, .package-price, .total-cost, .final-price'
            );
            pkg.totalPrice = totalPriceElement ? totalPriceElement.textContent?.trim() : 'Price not available';

            // Extract savings
            const savingsElement = container.querySelector(
              '.savings, .save, .discount, .you-save'
            );
            pkg.savings = savingsElement ? savingsElement.textContent?.trim() : undefined;

            // Extract booking URL
            const bookingLinkElement = container.querySelector('a[href*="book"], .book-button, .booking-link');
            pkg.bookingUrl = bookingLinkElement ? bookingLinkElement.getAttribute('href') : '#';

            // Extract description
            const descriptionElement = container.querySelector(
              '.description, .package-description, .details'
            );
            pkg.description = descriptionElement ? descriptionElement.textContent?.trim() : undefined;

            packages.push(pkg);
            
          } catch (error) {
            console.log(`[Browser Context] Error extracting package ${index + 1}:`, error);
          }
        });

        return packages;
      }, this.config.maxResults);

      this.logWithTime(`Extracted ${packageData.length} vacation package results`);
      return packageData as PackageResult[];

    } catch (error) {
      this.logWithTime(`Error extracting vacation package data: ${error}`);
      throw new Error(`Package data extraction failed: ${error}`);
    }
  }

  /**
   * Check if search returned no results
   */
  async checkForNoResults(page: any): Promise<boolean> {
    try {
      const noResultsSelectors = [
        '.no-results',
        '.no-hotels-found',
        '.no-cars-found', 
        '.no-packages-found',
        '.empty-results',
        'text="No results found"',
        'text="No hotels available"',
        'text="No cars available"'
      ];

      for (const selector of noResultsSelectors) {
        const exists = await page.isVisible(selector);
        if (exists) {
          this.logWithTime('No results found on page');
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logWithTime(`Error checking for no results: ${error}`);
      return false;
    }
  }

  /**
   * Handle pagination if results span multiple pages
   */
  async handlePagination(page: any, maxPages: number = 3): Promise<boolean> {
    try {
      const nextPageSelectors = [
        '.next-page',
        '.pagination-next', 
        'a:has-text("Next")',
        'button:has-text("Next")',
        '.page-next'
      ];

      for (const selector of nextPageSelectors) {
        const nextButton = await page.isVisible(selector);
        if (nextButton) {
          await page.click(selector);
          await page.waitForLoadState('networkidle');
          this.logWithTime('Navigated to next page of results');
          return true;
        }
      }

      this.logWithTime('No next page available');
      return false;
    } catch (error) {
      this.logWithTime(`Error handling pagination: ${error}`);
      return false;
    }
  }

  /**
   * Validate extracted data quality
   */
  validateHotelData(hotels: HotelResult[]): HotelResult[] {
    return hotels.filter(hotel => {
      return hotel.name && 
             hotel.name !== 'Hotel' && 
             hotel.name.length > 2 &&
             hotel.location &&
             hotel.price &&
             hotel.price !== 'Price not available';
    });
  }

  validateCarData(cars: CarResult[]): CarResult[] {
    return cars.filter(car => {
      return car.agency && 
             car.agency !== 'Agency' && 
             car.carType &&
             car.model &&
             car.dailyRate &&
             car.dailyRate !== 'Rate not available';
    });
  }

  validatePackageData(packages: PackageResult[]): PackageResult[] {
    return packages.filter(pkg => {
      return pkg.name && 
             pkg.name !== 'Package' && 
             pkg.destination &&
             pkg.totalPrice &&
             pkg.totalPrice !== 'Price not available';
    });
  }
}
import { carRentalParser } from './carrental-parser.js';
import { CarRentalSearchResults, CarRentalSearchCriteria, CarRentalVendorResult, CarRentalOffer } from './types.js';
import { logger } from '../../utils/logger.js';

/**
 * Car Rental Provider for CPMaxx
 * Handles navigation and search execution
 */
export class CarRentalProvider {
  private chromeMcp: any;

  constructor(chromeMcp: any) {
    this.chromeMcp = chromeMcp;
  }

  /**
   * Search for car rentals through CPMaxx
   */
  async search(criteria: CarRentalSearchCriteria): Promise<CarRentalSearchResults> {
    logger.info('🚗 Starting car rental search through CPMaxx...');

    try {
      // Use the new searchAllVendors method for comprehensive results
      return await this.searchAllVendors(criteria);

    } catch (error) {
      logger.error('❌ Car rental search failed:', error);
      throw error;
    }
  }

  /**
   * Search all car rental vendors (multi-page navigation)
   */
  async searchAllVendors(criteria: CarRentalSearchCriteria): Promise<CarRentalSearchResults> {
    logger.info('🚗 Starting comprehensive car rental search...');

    try {
      // Navigate to CPMaxx car rental search
      await this.navigateToCarRentalSearch();

      // Fill search form
      await this.fillCarRentalSearchForm(criteria);

      // Submit search
      await this.submitSearch();

      // Wait for initial results (location page)
      await this.waitForLocationResults();

      // Extract vendor links from location page
      const vendorLinks = await this.extractVendorLinks();

      logger.info(`📍 Found ${vendorLinks.length} vendor locations`);

      // Initialize results
      const results: CarRentalSearchResults = {
        provider: 'cpmaxx_carrental',
        searchId: this.generateSearchId(),
        criteria: criteria,
        searchDate: new Date().toISOString(),
        searchLocation: criteria.pickupLocation,
        airportCode: this.extractAirportCode(criteria.pickupLocation),
        vendors: [],
        offers: [],
        totalVehicles: 0,
        errors: []
      };

      // Visit each vendor page and extract vehicles
      for (const vendorLink of vendorLinks) {
        try {
          logger.info(`🔍 Fetching vehicles from ${vendorLink.vendorName}...`);

          // Navigate to vendor page
          await this.chromeMcp.chrome_navigate({ url: vendorLink.url });
          await this.wait(3000);

          // Extract vehicles from vendor page
          const vendorResult = await this.extractVehiclesFromVendor(vendorLink);

          if (vendorResult && vendorResult.vehicles.length > 0) {
            results.vendors!.push(vendorResult);
            results.totalVehicles! += vendorResult.vehicles.length;

            // Convert vendor vehicles to offers
            const offers = this.convertVehiclesToOffers(vendorResult);
            results.offers.push(...offers);

            logger.info(`✅ Found ${vendorResult.vehicles.length} vehicles from ${vendorLink.vendorName}`);
          }

        } catch (vendorError) {
          logger.error(`❌ Error processing vendor ${vendorLink.vendorName}:`, vendorError);
          results.errors.push({
            code: 'VENDOR_EXTRACTION_ERROR',
            message: `Failed to extract vehicles from ${vendorLink.vendorName}: ${vendorError}`
          });
        }
      }

      // Add filters and extraction report
      results.filters = this.extractFilters(results.offers);
      results.extractionReport = {
        totalResults: results.totalVehicles!,
        offersExtracted: results.offers.length,
        companiesFound: results.vendors!.length,
        warnings: [],
        errors: results.errors.map(e => e.message)
      };

      logger.info(`✅ Car rental search completed: ${results.offers.length} total offers from ${results.vendors!.length} vendors`);

      return results;

    } catch (error) {
      logger.error('❌ Car rental search failed:', error);
      throw error;
    }
  }

  /**
   * Navigate to car rental search page
   */
  private async navigateToCarRentalSearch(): Promise<void> {
    logger.info('📍 Navigating to car rental search...');

    // Check current page
    const currentContent = await this.chromeMcp.chrome_get_web_content({
      textContent: true,
      htmlContent: false
    });

    const currentUrl = currentContent.url || '';

    // If not on CPMaxx, navigate there first
    if (!currentUrl.includes('cruiseplannersnet.com')) {
      await this.chromeMcp.chrome_navigate({
        url: 'https://cpmaxx.cruiseplannersnet.com'
      });
      await this.wait(3000);
    }

    // Look for car rental option
    // First, check if we're already on a car rental page
    if (currentContent.text && currentContent.text.includes('Find a rental car')) {
      logger.info('✅ Already on car rental page');
      return;
    }

    // Navigate to Research Hub as per user guidance
    logger.info('📍 Navigating to Research Hub...');
    await this.chromeMcp.chrome_navigate({
      url: 'https://cpmaxx.cruiseplannersnet.com/main/hub/research_hub'
    });
    await this.wait(3000);

    // Click on car rental option
    logger.info('🚗 Looking for car rental option...');

    // Try multiple selectors for car rental
    const carRentalSelectors = [
      'a:contains("Find a rental car")',
      'a:contains("Car Rental")',
      'a:contains("Rental Car")',
      '.vendor-item[data-vendor="car"]',
      'a[href*="car"], a[href*="rental"]',
      'button:contains("Car")',
      '.partner-option:contains("Car")'
    ];

    let clicked = false;
    for (const selector of carRentalSelectors) {
      try {
        const result = await this.chromeMcp.chrome_click_element({
          selector,
          timeout: 2000
        });
        if (result.success) {
          logger.info(`✅ Clicked car rental using selector: ${selector}`);
          clicked = true;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!clicked) {
      // If no direct link, might need to look in a different section
      logger.warn('⚠️ Could not find direct car rental link, checking for alternative navigation...');

      // Take a screenshot to see current state
      const screenshot = await this.chromeMcp.chrome_screenshot({
        fullPage: false,
        storeBase64: true,
        savePng: false
      });

      throw new Error('Could not find car rental option in Partner Hub. Please check the page structure.');
    }

    // Wait for car rental search page to load
    await this.wait(3000);

    // Verify we're on car rental search
    const carPageContent = await this.chromeMcp.chrome_get_web_content({
      textContent: true,
      htmlContent: false
    });

    if (!carPageContent.text || !carPageContent.text.toLowerCase().includes('car')) {
      logger.warn('⚠️ May not be on car rental page');
    }
  }

  /**
   * Fill car rental search form
   */
  private async fillCarRentalSearchForm(criteria: CarRentalSearchCriteria): Promise<void> {
    logger.info('📝 Filling car rental search form...');

    // Fill pickup location
    await this.fillLocation('pickup', criteria.pickupLocation);

    // Fill dropoff location if different
    if (criteria.dropoffLocation && criteria.dropoffLocation !== criteria.pickupLocation) {
      // Look for "return to different location" checkbox
      await this.chromeMcp.chrome_click_element({
        selector: 'input[type="checkbox"][name*="different"], label:contains("different location")'
      });
      await this.wait(500);

      await this.fillLocation('dropoff', criteria.dropoffLocation);
    }

    // Fill pickup date
    await this.fillDate('pickup', criteria.pickupDate, criteria.pickupTime);

    // Fill dropoff date
    await this.fillDate('dropoff', criteria.dropoffDate, criteria.dropoffTime);

    // Select car type if specified
    if (criteria.carType) {
      await this.selectCarType(criteria.carType);
    }

    logger.info('✅ Car rental form filled');
  }

  /**
   * Fill location field
   */
  private async fillLocation(type: 'pickup' | 'dropoff', location: string): Promise<void> {
    logger.info(`📍 Filling ${type} location: ${location}`);

    // Primary selector for car search
    const selector = '#carsearch-location_search';

    // Execute entire autocomplete sequence in single script to avoid focus loss
    logger.info(`🚀 Using single-script autocomplete solution...`);

    const result = await this.chromeMcp.chrome_inject_script({
      type: 'MAIN',
      jsScript: `
        (async function() {
          const field = document.querySelector('${selector}');
          if (!field) {
            // Try alternative selectors
            const alternates = [
              '#pickup-location',
              'input[name="pickup-location"]',
              'input[placeholder*="Pick"]',
              '#dropoff-location',
              'input[name="dropoff-location"]',
              'input[placeholder*="Drop"]'
            ];

            for (const alt of alternates) {
              const altField = document.querySelector(alt);
              if (altField) {
                return JSON.stringify({
                  success: false,
                  error: 'Primary selector not found, but found: ' + alt,
                  useAlternate: alt
                });
              }
            }

            return JSON.stringify({ success: false, error: 'No location field found' });
          }

          // Step 1: Focus and clear
          field.focus();
          field.value = '';

          // Step 2: Type each character with natural timing
          const value = '${location.toUpperCase()}';

          for (let i = 0; i < value.length; i++) {
            const char = value[i];

            // Set value up to current character
            field.value = value.substring(0, i + 1);

            // Dispatch input event
            field.dispatchEvent(new Event('input', { bubbles: true }));

            // Dispatch keydown
            field.dispatchEvent(new KeyboardEvent('keydown', {
              key: char,
              code: 'Key' + char,
              keyCode: char.charCodeAt(0),
              which: char.charCodeAt(0),
              bubbles: true,
              cancelable: true
            }));

            // Small delay between characters (30ms for faster typing)
            await new Promise(r => setTimeout(r, 30));

            // Dispatch keyup
            field.dispatchEvent(new KeyboardEvent('keyup', {
              key: char,
              code: 'Key' + char,
              keyCode: char.charCodeAt(0),
              which: char.charCodeAt(0),
              bubbles: true,
              cancelable: true
            }));
          }

          // Step 3: Wait for dropdown to appear
          let dropdown = null;
          let attempts = 0;
          const selectors = [
            '.dropdown-item',
            'li.ui-menu-item',
            '.typeahead-result',
            '[role="option"]',
            '.autocomplete-suggestion'
          ];

          while (!dropdown && attempts < 15) { // 1.5 seconds max
            await new Promise(r => setTimeout(r, 100));

            for (const selector of selectors) {
              dropdown = document.querySelector(selector);
              if (dropdown) break;
            }

            attempts++;
          }

          if (!dropdown) {
            // Accept the typed value if no dropdown appears
            return JSON.stringify({
              success: true,
              warning: 'No dropdown appeared, using typed value',
              finalValue: field.value
            });
          }

          // Step 4: Click first suggestion
          const firstItem = document.querySelector('.dropdown-item:first-child, li.ui-menu-item:first-child, .typeahead-result:first-child');

          if (firstItem) {
            firstItem.click();

            // Wait a bit to see if field updated
            await new Promise(r => setTimeout(r, 200));

            return JSON.stringify({
              success: true,
              message: 'Location selected from dropdown',
              finalValue: field.value
            });

          } else {
            // Fallback: use arrow keys
            field.focus();

            field.dispatchEvent(new KeyboardEvent('keydown', {
              key: 'ArrowDown',
              code: 'ArrowDown',
              keyCode: 40,
              bubbles: true
            }));

            await new Promise(r => setTimeout(r, 100));

            field.dispatchEvent(new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              bubbles: true
            }));

            await new Promise(r => setTimeout(r, 200));

            return JSON.stringify({
              success: true,
              message: 'Location selected via keyboard',
              finalValue: field.value
            });
          }
        })();
      `
    });

    // Parse result and handle any issues
    try {
      const parsed = JSON.parse(result);

      if (parsed.success) {
        logger.info(`✅ ${parsed.message || 'Location filled successfully'}`);
        if (parsed.warning) {
          logger.warn(`⚠️ ${parsed.warning}`);
        }
        if (parsed.finalValue) {
          logger.info(`📝 Final value: ${parsed.finalValue}`);
        }
      } else {
        logger.error(`❌ ${parsed.error}`);

        // If we found an alternate selector, try the old method with it
        if (parsed.useAlternate) {
          logger.info(`🔄 Retrying with alternate selector: ${parsed.useAlternate}`);
          await this.chromeMcp.chrome_fill_or_select({
            selector: parsed.useAlternate,
            value: location
          });
        }
      }
    } catch (e) {
      logger.error('❌ Could not parse autocomplete result:', e);
      logger.warn('⚠️ Falling back to simple fill without autocomplete');

      // Fallback: just try to fill the field
      await this.chromeMcp.chrome_fill_or_select({
        selector: '#carsearch-location_search, #pickup-location, #dropoff-location, input[placeholder*="location"]',
        value: location
      });
    }
  }

  /**
   * Fill date and time
   */
  private async fillDate(type: 'pickup' | 'dropoff', date: string, time?: string): Promise<void> {
    // Format date as MM/DD/YYYY
    const [year, month, day] = date.split('-');
    const formattedDate = `${month}/${day}/${year}`;

    const dateSelectors = type === 'pickup' ? [
      '#pickup-date',
      'input[name="pickup-date"]',
      '.pickup-date-input'
    ] : [
      '#dropoff-date',
      'input[name="dropoff-date"]',
      '.dropoff-date-input'
    ];

    // Fill date
    for (const selector of dateSelectors) {
      try {
        await this.chromeMcp.chrome_click_element({ selector });
        await this.wait(300);

        await this.chromeMcp.chrome_keyboard({ keys: 'Ctrl+A' });

        await this.chromeMcp.chrome_fill_or_select({
          selector,
          value: formattedDate
        });

        break;
      } catch (e) {
        // Try next selector
      }
    }

    // Fill time if provided
    if (time) {
      const timeSelectors = type === 'pickup' ? [
        '#pickup-time',
        'select[name="pickup-time"]',
        '.pickup-time-select'
      ] : [
        '#dropoff-time',
        'select[name="dropoff-time"]',
        '.dropoff-time-select'
      ];

      for (const selector of timeSelectors) {
        try {
          await this.chromeMcp.chrome_fill_or_select({
            selector,
            value: time
          });
          break;
        } catch (e) {
          // Try next selector
        }
      }
    }
  }

  /**
   * Select car type
   */
  private async selectCarType(carType: string): Promise<void> {
    logger.info(`🚗 Selecting car type: ${carType}`);

    const carTypeSelectors = [
      'select[name="car-type"]',
      '#car-type',
      '.car-type-select'
    ];

    for (const selector of carTypeSelectors) {
      try {
        await this.chromeMcp.chrome_fill_or_select({
          selector,
          value: carType
        });
        break;
      } catch (e) {
        // Try next selector
      }
    }
  }

  /**
   * Submit search form
   */
  private async submitSearch(): Promise<void> {
    logger.info('🔍 Submitting car rental search...');

    const searchButtonSelectors = [
      'button[type="submit"]',
      '.search-button',
      'button:contains("Search")',
      'button:contains("Find Cars")',
      '#searchButton'
    ];

    for (const selector of searchButtonSelectors) {
      try {
        const result = await this.chromeMcp.chrome_click_element({
          selector,
          waitForNavigation: true,
          timeout: 5000
        });

        if (result.success) {
          logger.info('✅ Search submitted');
          return;
        }
      } catch (e) {
        // Try next selector
      }
    }

    throw new Error('Could not find search button');
  }

  /**
   * Wait for search results
   */
  private async waitForResults(): Promise<void> {
    logger.info('⏳ Waiting for car rental results...');

    const resultSelectors = [
      '.car-result',
      '.rental-option',
      '.vehicle-card',
      '[data-car-id]'
    ];

    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      for (const selector of resultSelectors) {
        const elements = await this.chromeMcp.chrome_get_interactive_elements({
          selector
        });

        if (elements && elements.elements && elements.elements.length > 0) {
          logger.info(`✅ Found ${elements.elements.length} car rental results`);
          await this.wait(2000); // Extra wait for all results
          return;
        }
      }

      await this.wait(1000);
      attempts++;
    }

    logger.warn('⚠️ Results may not have fully loaded');
  }

  /**
   * Extract page HTML
   */
  private async extractPageHtml(): Promise<string> {
    const content = await this.chromeMcp.chrome_get_web_content({
      htmlContent: true,
      textContent: false
    });

    if (!content || !content.html) {
      throw new Error('Failed to extract page HTML');
    }

    return content.html;
  }

  /**
   * Helper wait function
   */
  private async wait(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique search ID
   */
  private generateSearchId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `car_${timestamp}_${random}`;
  }

  /**
   * Extract airport code from location string
   */
  private extractAirportCode(location: string): string | undefined {
    // Check if already an airport code
    if (/^[A-Z]{3}$/.test(location.toUpperCase())) {
      return location.toUpperCase();
    }

    // Try to extract from parentheses (e.g., "San Francisco (SFO)")
    const codeMatch = location.match(/\(([A-Z]{3})\)/);
    if (codeMatch) {
      return codeMatch[1];
    }

    return undefined;
  }

  /**
   * Wait for location results page
   */
  private async waitForLocationResults(): Promise<void> {
    logger.info('⏳ Waiting for location results...');

    const locationSelectors = [
      '.location-result',
      '.vendor-location',
      'a[href*="GetCars"]',
      '.location-link',
      '[data-vendor-location]'
    ];

    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      for (const selector of locationSelectors) {
        const elements = await this.chromeMcp.chrome_get_interactive_elements({
          selector
        });

        if (elements && elements.elements && elements.elements.length > 0) {
          logger.info(`✅ Found ${elements.elements.length} location results`);
          await this.wait(1000); // Extra wait for all results
          return;
        }
      }

      await this.wait(1000);
      attempts++;
    }

    logger.warn('⚠️ Location results may not have fully loaded');
  }

  /**
   * Extract vendor links from location results
   */
  private async extractVendorLinks(): Promise<Array<{vendorName: string, url: string}>> {
    logger.info('🔗 Extracting vendor links...');

    const vendorLinks: Array<{vendorName: string, url: string}> = [];

    try {
      // Get all vendor location links
      const elements = await this.chromeMcp.chrome_get_interactive_elements({
        selector: 'a[href*="GetCars"], .vendor-link, .location-link'
      });

      if (elements && elements.elements) {
        for (const element of elements.elements) {
          if (element.href && element.text) {
            // Extract vendor name from text
            const vendorName = element.text.trim();

            // Only add if it's a GetCars link
            if (element.href.includes('GetCars')) {
              vendorLinks.push({
                vendorName,
                url: element.href
              });
            }
          }
        }
      }

      // If no links found, try alternative extraction
      if (vendorLinks.length === 0) {
        const content = await this.chromeMcp.chrome_get_web_content({
          htmlContent: true,
          textContent: false
        });

        // Parse HTML to find vendor links
        const linkMatches = content.html.matchAll(/<a[^>]+href="([^"]*GetCars[^"]*)"[^>]*>([^<]+)</g);
        for (const match of linkMatches) {
          vendorLinks.push({
            vendorName: match[2].trim(),
            url: match[1]
          });
        }
      }

    } catch (error) {
      logger.error('Error extracting vendor links:', error);
    }

    return vendorLinks;
  }

  /**
   * Extract vehicles from a vendor page
   */
  private async extractVehiclesFromVendor(vendorLink: {vendorName: string, url: string}): Promise<CarRentalVendorResult | null> {
    logger.info(`📋 Extracting vehicles from ${vendorLink.vendorName}...`);

    try {
      // Wait for vehicle results
      await this.waitForResults();

      // Get page content
      const content = await this.chromeMcp.chrome_get_web_content({
        htmlContent: true,
        textContent: false
      });

      // Use parser to extract vehicles
      const parseResult = await carRentalParser.parse(content.html, undefined, {
        includeDebugInfo: true,
        extractAll: true
      });

      // Create vendor result
      const vendorResult: CarRentalVendorResult = {
        vendorCode: this.extractVendorCode(vendorLink.vendorName),
        vendorName: vendorLink.vendorName,
        location: this.extractLocationFromUrl(vendorLink.url),
        vendorUrl: vendorLink.url,
        vehicles: []
      };

      // Convert offers to vehicles
      for (const offer of parseResult.offers) {
        vendorResult.vehicles.push({
          id: offer.vehicle.id,
          category: offer.vehicle.category,
          type: offer.vehicle.type,
          make: offer.vehicle.make,
          model: offer.vehicle.model,
          exampleCar: offer.vehicle.exampleCar,
          transmission: offer.vehicle.transmission,
          fuelType: offer.vehicle.fuelType,
          doors: offer.vehicle.doors,
          seats: offer.vehicle.seats,
          largeBags: offer.vehicle.largeBags,
          smallBags: offer.vehicle.smallBags,
          airConditioning: offer.vehicle.airConditioning,
          image: offer.vehicle.image
        });
      }

      return vendorResult;

    } catch (error) {
      logger.error(`Error extracting vehicles from ${vendorLink.vendorName}:`, error);
      return null;
    }
  }

  /**
   * Convert vendor vehicles to offers
   */
  private convertVehiclesToOffers(vendorResult: CarRentalVendorResult): CarRentalOffer[] {
    const offers: CarRentalOffer[] = [];

    for (const vehicle of vendorResult.vehicles) {
      offers.push({
        offerId: `${vendorResult.vendorCode}_${vehicle.id}`,
        vehicle: vehicle,
        company: {
          code: vendorResult.vendorCode,
          name: vendorResult.vendorName
        },
        pricing: {
          total: 0, // Will be filled by parser
          perDay: 0,
          currency: 'USD'
        },
        pickupLocation: {
          type: 'airport',
          name: vendorResult.location
        },
        dropoffLocation: {
          type: 'airport',
          name: vendorResult.location
        },
        availability: true,
        mileage: 'unlimited',
        commission: {
          percentage: 8,
          amount: 0,
          type: 'standard'
        }
      });
    }

    return offers;
  }

  /**
   * Extract vendor code from name
   */
  private extractVendorCode(vendorName: string): string {
    const cleanName = vendorName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleanName.substring(0, 3).toUpperCase();
  }

  /**
   * Extract location from URL
   */
  private extractLocationFromUrl(url: string): string {
    // Try to extract location code from URL parameters
    const match = url.match(/location=([^&]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
    return 'Unknown Location';
  }

  /**
   * Extract filters from offers
   */
  private extractFilters(offers: CarRentalOffer[]): any {
    const companies = [...new Set(offers.map(o => o.company.name))];
    const carTypes = [...new Set(offers.map(o => o.vehicle.type))];
    const features: string[] = [];

    // Extract unique features
    if (offers.some(o => o.vehicle.airConditioning)) features.push('Air Conditioning');
    if (offers.some(o => o.vehicle.transmission === 'automatic')) features.push('Automatic');
    if (offers.some(o => o.mileage === 'unlimited')) features.push('Unlimited Mileage');

    const prices = offers.map(o => o.pricing.total).filter(p => p > 0);

    return {
      companies,
      carTypes,
      features,
      priceRange: prices.length > 0 ? {
        min: Math.min(...prices),
        max: Math.max(...prices)
      } : { min: 0, max: 0 }
    };
  }
}

/**
 * Factory function to create car rental provider
 */
export function createCarRentalProvider(chromeMcp: any): CarRentalProvider {
  return new CarRentalProvider(chromeMcp);
}

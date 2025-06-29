// Form Handler Module for CPMaxx Integration
// Handles form interactions, input validation, and submission

import { HotelSearchParams, CarSearchParams, PackageSearchParams } from '../services/browser-service.js';

export interface FormConfig {
  timeout: number;
  debug: boolean;
  inputDelay: number;
}

export class CPMaxxFormHandler {
  private config: FormConfig;

  constructor(config: FormConfig) {
    this.config = config;
  }

  private logWithTime(message: string): void {
    if (this.config.debug) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] CPMaxx FormHandler: ${message}`);
    }
  }

  /**
   * Handle location input with autocomplete support
   */
  async handleLocationInput(page: any, locationText: string, inputSelector: string): Promise<void> {
    this.logWithTime(`Handling location input for: ${locationText}`);
    
    try {
      // Wait for the input field to be visible
      await page.waitForSelector(inputSelector, { state: 'visible', timeout: this.config.timeout });

      // Clear the input field
      await page.click(inputSelector);
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Delete');
      this.logWithTime('Cleared location input field');

      // Type the location text with delay
      await page.type(inputSelector, locationText, { delay: this.config.inputDelay });
      this.logWithTime(`Typed "${locationText}" into location input`);

      // Wait for autocomplete dropdown
      await page.waitForTimeout(2500);

      // Try to select from autocomplete dropdown
      const dropdownSelector = '.pac-container .pac-item, .autocomplete-item, .dropdown-item';
      const isDropdownVisible = await page.isVisible(dropdownSelector);

      if (isDropdownVisible) {
        this.logWithTime('Autocomplete dropdown visible, selecting first option');
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
      } else {
        this.logWithTime('No autocomplete dropdown, pressing Tab to confirm input');
        await page.keyboard.press('Tab');
        await page.waitForTimeout(500);
      }

      // Verify the final value
      const finalValue = await page.$eval(inputSelector, (el: any) => el.value);
      this.logWithTime(`Final location value: "${finalValue}"`);

      if (!finalValue || !finalValue.toLowerCase().includes(locationText.split(',')[0].toLowerCase())) {
        throw new Error(`Location input failed: expected "${locationText}", got "${finalValue}"`);
      }

    } catch (error) {
      this.logWithTime(`Error handling location input: ${error}`);
      throw new Error(`Location input failed: ${error}`);
    }
  }

  /**
   * Handle date input fields
   */
  async handleDateInput(page: any, dateSelector: string, dateValue: string): Promise<void> {
    this.logWithTime(`Setting date: ${dateValue} in ${dateSelector}`);
    
    try {
      await page.waitForSelector(dateSelector, { state: 'visible', timeout: this.config.timeout });
      
      // Clear and fill the date field
      await page.click(dateSelector);
      await page.keyboard.press('Control+A');
      await page.type(dateSelector, dateValue, { delay: this.config.inputDelay });
      await page.keyboard.press('Tab'); // Move focus to confirm the date
      
      this.logWithTime(`Date ${dateValue} set successfully`);
    } catch (error) {
      this.logWithTime(`Error setting date: ${error}`);
      throw new Error(`Date input failed: ${error}`);
    }
  }

  /**
   * Handle numeric input fields (rooms, guests, etc.)
   */
  async handleNumericInput(page: any, selector: string, value: number): Promise<void> {
    this.logWithTime(`Setting numeric value: ${value} in ${selector}`);
    
    try {
      await page.waitForSelector(selector, { state: 'visible', timeout: this.config.timeout });
      
      // Clear and fill the numeric field
      await page.click(selector);
      await page.keyboard.press('Control+A');
      await page.type(selector, value.toString(), { delay: this.config.inputDelay });
      
      this.logWithTime(`Numeric value ${value} set successfully`);
    } catch (error) {
      this.logWithTime(`Error setting numeric value: ${error}`);
      throw new Error(`Numeric input failed: ${error}`);
    }
  }

  /**
   * Handle dropdown/select input fields
   */
  async handleSelectInput(page: any, selector: string, value: string): Promise<void> {
    this.logWithTime(`Selecting option: ${value} from ${selector}`);
    
    try {
      await page.waitForSelector(selector, { state: 'visible', timeout: this.config.timeout });
      await page.selectOption(selector, value);
      this.logWithTime(`Option ${value} selected successfully`);
    } catch (error) {
      this.logWithTime(`Error selecting option: ${error}`);
      throw new Error(`Select input failed: ${error}`);
    }
  }

  /**
   * Fill hotel search form
   */
  async fillHotelSearchForm(page: any, params: HotelSearchParams): Promise<void> {
    this.logWithTime('Filling hotel search form...');
    
    try {
      // Handle location input
      const locationSelector = '#hotelenginesearch-location_search, input[name="location"], .location-input';
      await this.handleLocationInput(page, params.location, locationSelector);

      // Handle check-in date
      const checkInSelector = '#hotelenginesearch-checkin, input[name="checkin"], .checkin-date';
      await this.handleDateInput(page, checkInSelector, params.checkInDate);

      // Handle check-out date
      const checkOutSelector = '#hotelenginesearch-checkout, input[name="checkout"], .checkout-date';
      await this.handleDateInput(page, checkOutSelector, params.checkOutDate);

      // Handle rooms
      const roomsSelector = '#hotelenginesearch-rooms, select[name="rooms"], .rooms-select';
      await this.handleNumericInput(page, roomsSelector, params.rooms);

      // Handle adults
      const adultsSelector = '#hotelenginesearch-adults, select[name="adults"], .adults-select';
      await this.handleNumericInput(page, adultsSelector, params.adults);

      // Handle children (if any)
      if (params.children > 0) {
        const childrenSelector = '#hotelenginesearch-children, select[name="children"], .children-select';
        await this.handleNumericInput(page, childrenSelector, params.children);
      }

      this.logWithTime('Hotel search form filled successfully');
    } catch (error) {
      this.logWithTime(`Error filling hotel search form: ${error}`);
      throw new Error(`Hotel form filling failed: ${error}`);
    }
  }

  /**
   * Apply hotel search filters
   */
  async applyHotelFilters(page: any, priceRange?: string, starRating?: number): Promise<void> {
    this.logWithTime('Applying hotel search filters...');
    
    try {
      // Apply price range filter if specified
      if (priceRange) {
        const priceFilterSelector = `input[value="${priceRange}"], .price-filter[data-range="${priceRange}"]`;
        const priceFilterExists = await page.isVisible(priceFilterSelector);
        if (priceFilterExists) {
          await page.click(priceFilterSelector);
          this.logWithTime(`Applied price filter: ${priceRange}`);
        }
      }

      // Apply star rating filter if specified
      if (starRating) {
        const starFilterSelector = `input[value="${starRating}"], .star-filter[data-rating="${starRating}"]`;
        const starFilterExists = await page.isVisible(starFilterSelector);
        if (starFilterExists) {
          await page.click(starFilterSelector);
          this.logWithTime(`Applied star rating filter: ${starRating}`);
        }
      }

      this.logWithTime('Hotel filters applied successfully');
    } catch (error) {
      this.logWithTime(`Error applying hotel filters: ${error}`);
      // Don't throw - filters are optional
    }
  }

  /**
   * Fill car rental search form
   */
  async fillCarSearchForm(page: any, params: CarSearchParams): Promise<void> {
    this.logWithTime('Filling car rental search form...');
    
    try {
      // Handle pickup location
      const pickupLocationSelector = '#car-pickup-location, input[name="pickup_location"], .pickup-location-input';
      await this.handleLocationInput(page, params.pickupLocation, pickupLocationSelector);

      // Handle dropoff location (if different)
      if (params.dropoffLocation && params.dropoffLocation !== params.pickupLocation) {
        const dropoffLocationSelector = '#car-dropoff-location, input[name="dropoff_location"], .dropoff-location-input';
        await this.handleLocationInput(page, params.dropoffLocation, dropoffLocationSelector);
      }

      // Handle pickup date
      const pickupDateSelector = '#car-pickup-date, input[name="pickup_date"], .pickup-date';
      await this.handleDateInput(page, pickupDateSelector, params.pickupDate);

      // Handle dropoff date
      const dropoffDateSelector = '#car-dropoff-date, input[name="dropoff_date"], .dropoff-date';
      await this.handleDateInput(page, dropoffDateSelector, params.dropoffDate);

      // Handle pickup time
      const pickupTimeSelector = '#car-pickup-time, select[name="pickup_time"], .pickup-time';
      await this.handleSelectInput(page, pickupTimeSelector, params.pickupTime);

      // Handle dropoff time
      const dropoffTimeSelector = '#car-dropoff-time, select[name="dropoff_time"], .dropoff-time';
      await this.handleSelectInput(page, dropoffTimeSelector, params.dropoffTime);

      // Handle driver age
      const driverAgeSelector = '#driver-age, input[name="driver_age"], .driver-age';
      await this.handleNumericInput(page, driverAgeSelector, params.driverAge);

      this.logWithTime('Car rental search form filled successfully');
    } catch (error) {
      this.logWithTime(`Error filling car rental search form: ${error}`);
      throw new Error(`Car rental form filling failed: ${error}`);
    }
  }

  /**
   * Apply car rental filters
   */
  async applyCarFilters(page: any, carType?: string): Promise<void> {
    this.logWithTime('Applying car rental filters...');
    
    try {
      if (carType) {
        const carTypeSelector = `input[value="${carType}"], .car-type-filter[data-type="${carType}"]`;
        const carTypeFilterExists = await page.isVisible(carTypeSelector);
        if (carTypeFilterExists) {
          await page.click(carTypeSelector);
          this.logWithTime(`Applied car type filter: ${carType}`);
        }
      }

      this.logWithTime('Car rental filters applied successfully');
    } catch (error) {
      this.logWithTime(`Error applying car rental filters: ${error}`);
      // Don't throw - filters are optional
    }
  }

  /**
   * Fill vacation package search form
   */
  async fillPackageSearchForm(page: any, params: PackageSearchParams): Promise<void> {
    this.logWithTime('Filling vacation package search form...');
    
    try {
      // Handle destination
      const destinationSelector = '#package-destination, input[name="destination"], .destination-input';
      await this.handleLocationInput(page, params.destination, destinationSelector);

      // Handle departure city
      const departureSelector = '#package-departure, input[name="departure"], .departure-input';
      await this.handleLocationInput(page, params.departureCity, departureSelector);

      // Handle departure date
      const departureDateSelector = '#package-departure-date, input[name="departure_date"], .departure-date';
      await this.handleDateInput(page, departureDateSelector, params.departureDate);

      // Handle return date
      const returnDateSelector = '#package-return-date, input[name="return_date"], .return-date';
      await this.handleDateInput(page, returnDateSelector, params.returnDate);

      // Handle number of travelers
      const travelersSelector = '#package-travelers, select[name="travelers"], .travelers-select';
      await this.handleNumericInput(page, travelersSelector, params.travelers);

      // Handle package options
      if (!params.includeHotel) {
        const hotelCheckbox = '#include-hotel, input[name="include_hotel"]';
        const hotelExists = await page.isVisible(hotelCheckbox);
        if (hotelExists) {
          await page.uncheck(hotelCheckbox);
        }
      }

      if (params.includeCar) {
        const carCheckbox = '#include-car, input[name="include_car"]';
        const carExists = await page.isVisible(carCheckbox);
        if (carExists) {
          await page.check(carCheckbox);
        }
      }

      this.logWithTime('Vacation package search form filled successfully');
    } catch (error) {
      this.logWithTime(`Error filling vacation package search form: ${error}`);
      throw new Error(`Package form filling failed: ${error}`);
    }
  }

  /**
   * Submit search form
   */
  async submitSearchForm(page: any): Promise<void> {
    this.logWithTime('Submitting search form...');
    
    try {
      // Look for search/submit button
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        '.search-button',
        '.submit-button',
        'button:has-text("Search")',
        'button:has-text("Find Hotels")',
        'button:has-text("Find Cars")',
        'button:has-text("Find Packages")'
      ];

      let submitted = false;
      for (const selector of submitSelectors) {
        const buttonExists = await page.isVisible(selector);
        if (buttonExists) {
          await page.click(selector);
          submitted = true;
          this.logWithTime(`Clicked submit button: ${selector}`);
          break;
        }
      }

      if (!submitted) {
        throw new Error('No submit button found');
      }

      // Wait for the results page to load
      await page.waitForLoadState('networkidle');
      this.logWithTime('Search form submitted successfully');

    } catch (error) {
      this.logWithTime(`Error submitting search form: ${error}`);
      throw new Error(`Form submission failed: ${error}`);
    }
  }
}
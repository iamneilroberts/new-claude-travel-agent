// Browser automation module for CPMaxx integration
// Based on proven patterns from legacy code at:
// /home/neil/dev/claude-travel-chat/browser-automation/cruise-planners/

export interface BrowserConfig {
  headless: boolean;
  visible: boolean;
  timeout: number;
  debug: boolean;
  screenshotDir?: string;
}

export interface HotelSearchParams {
  location: string;
  checkInDate: string;
  checkOutDate: string;
  rooms: number;
  adults: number;
  children: number;
  // Post-search filters (applied on results page)
  filters?: {
    propertyName?: string;
    starRating?: number[];        // Array of star ratings (2,3,4,5)
    priceRange?: string[];        // Array of price ranges
    hotelPrograms?: string[];     // Array of program codes (SIG, FHR, SGP, THC)
    amenities?: string[];         // Array of amenity codes
    excludeNoRating?: boolean;    // Exclude hotels with no rating
  };
}

export interface CarSearchParams {
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  dropoffDate: string;
  pickupTime: string;
  dropoffTime: string;
  carType?: string;
  driverAge: number;
}

export interface PackageSearchParams {
  destination: string;
  departureCity: string;
  departureDate: string;
  returnDate: string;
  travelers: number;
  includeHotel: boolean;
  includeCar: boolean;
  budgetRange?: string;
}

export interface HotelResult {
  name: string;
  address: string;
  description: string;
  rating: number;
  price: number;
  commission: number;
  commissionPercent: number;
  available: boolean;
  bookingUrl?: string;
  // Photo and gallery data
  photos: {
    featured: string;        // Main hotel image
    gallery: string[];       // Additional gallery images (if available)
    giataId?: string;        // Hotel ID for additional photo requests
    photoCount?: number;     // Number of photos available
  };
  // Additional metadata
  amenities: string[];       // List of amenities
  hotelPrograms: string[];   // Special hotel programs (SIG, FHR, etc.)
  location: {
    coordinates?: { lat: number; lng: number; };
    district?: string;
  };
  // Extraction metadata
  extractionMethod?: string;
  hotelIndex?: number;
}

export interface CarResult {
  agency: string;
  carType: string;
  model: string;
  dailyRate: string;
  totalCost: string;
  features: string[];
  insurance: string;
  available: boolean;
  bookingUrl?: string;
}

export interface PackageResult {
  name: string;
  destination: string;
  flight: {
    departure: string;
    arrival: string;
    airline: string;
    price: string;
  };
  hotel?: {
    name: string;
    starRating: number;
    price: string;
  };
  car?: {
    type: string;
    price: string;
  };
  totalPrice: string;
  savings: string;
  bookingUrl?: string;
}

// CPMaxx Portal URLs (real production URLs)
const CPMAXX_URLS = {
  login: 'https://cpmaxx.cruiseplannersnet.com/main/login',
  researchHub: 'https://cpmaxx.cruiseplannersnet.com/main/hub/research_hub',
  hotelSearchResults: '**/HotelEngine/searchResults/map',
  hotelSearch: 'https://cpmaxx.cruiseplannersnet.com/HotelEngine/search'
};

// CPMaxx DOM selectors (verified from real portal testing)
const CPMAXX_SELECTORS = {
  login: {
    emailInput: 'input[placeholder="Email"]',
    passwordInput: 'input[placeholder="Password"]',
    loginButton: 'button:has-text("Sign In To CP | Central")'
  },
  
  navigation: {
    findHotelLink: 'a:has-text("Find a Hotel")',
    researchHubLink: 'a[href*="research_hub"]'
  },
  
  // Hotel search form selectors (verified working)
  hotelForm: {
    locationInput: '#hotelenginesearch-location_search',
    locationDropdown: '.dropdown-menu .dropdown-item',
    checkInDate: '#hotelenginesearch-checkin',
    checkOutDate: '#hotelenginesearch-checkout',
    numRooms: '#hotelenginesearch-num_rooms',
    adultsPerRoom: '#hotelenginesearch-rooms-1-num_adults',
    childrenPerRoom: '#hotelenginesearch-rooms-1-num_children',
    submitButton: 'button[type="submit"]',
    errorDialog: '.modal-dialog' // Error dialog detection
  },
  
  // Search results page filters (available after search)
  searchResultsFilters: {
    propertyName: 'input[placeholder="Type Here"]',
    starRating: {
      fiveStar: 'input[type="checkbox"][data-star="5"]',
      fourStar: 'input[type="checkbox"][data-star="4"]', 
      threeStar: 'input[type="checkbox"][data-star="3"]',
      twoStar: 'input[type="checkbox"][data-star="2"]',
      ratingUnavailable: 'input[type="checkbox"]:has-text("Rating Unavailable")'
    },
    priceRange: {
      under100: 'input[type="checkbox"]:has-text("Less than $100")',
      range100199: 'input[type="checkbox"]:has-text("$100 - $199")',
      range200299: 'input[type="checkbox"]:has-text("$200 - $299")',
      range300399: 'input[type="checkbox"]:has-text("$300 - $399")',
      over400: 'input[type="checkbox"]:has-text("Greater than $400")'
    },
    hotelPrograms: {
      signatureCollection: 'input[type="checkbox"]:has-text("Signature Hotel Collection")',
      fineHotels: 'input[type="checkbox"]:has-text("Fine Hotels and Resorts")',
      signatureSpecialty: 'input[type="checkbox"]:has-text("Signature Specialty Rate")',
      hotelCollection: 'input[type="checkbox"]:has-text("The Hotel Collection")'
    },
    amenities: {
      freeBreakfast: 'input[type="checkbox"]:has-text("Free Breakfast")',
      freeParking: 'input[type="checkbox"]:has-text("Free Parking")',
      freeWifi: 'input[type="checkbox"]:has-text("Free Internet/WiFi")',
      airportShuttle: 'input[type="checkbox"]:has-text("Airport Shuttle")',
      businessCenter: 'input[type="checkbox"]:has-text("Business Center")',
      fitnessCenter: 'input[type="checkbox"]:has-text("Fitness Center")',
      noSmoking: 'input[type="checkbox"]:has-text("No Smoking Rooms/Facility")',
      petsAllowed: 'input[type="checkbox"]:has-text("Pets Allowed")',
      restaurant: 'input[type="checkbox"]:has-text("Restaurant")',
      spa: 'input[type="checkbox"]:has-text("Spa")',
      swimmingPool: 'input[type="checkbox"]:has-text("Swimming Pool")'
    }
  },
  
  // Hotel results selectors (search results page) - Updated from real test results
  results: {
    hotelContainer: '.property',
    hotelImage: '.property-hotel-image.ajax-image-gallery',
    hotelName: '.property-name',
    hotelAddress: '.property-location',
    hotelDescription: '.property-description small',
    hotelRating: '.property-rating',
    hotelPrice: '.property-rate-price',
    hotelCommission: '.property-commission',
    amenityIcons: '.property-rate-amenity-icon img',
    selectHotelButton: '.select-hotel-button',
    unavailable: '.not-available, .sold-out, .unavailable-message',
    nextButton: 'a.page-link[aria-label="Next"]',
    // Photo-related selectors (verified working)
    photoGallery: '.ajax-image-gallery',
    photoModal: '#lg-container-1', // Photo gallery modal container
    photoModalImages: '#lg-container-1 .lg-object.lg-image', // Individual photos in modal
    photoData: '[data-background-image]', // Primary hotel image data
    giataId: '[data-giata-id]' // Hotel Giata ID attribute
  }
};

/**
 * Main browser automation class for CPMaxx integration
 * 
 * ⚠️ CRITICAL WARNING: NO MOCK DATA
 * This class MUST implement real browser automation.
 * Any mock data or simulation will be considered a bug.
 */
export class CPMaxxBrowserAutomation {
  
  /**
   * Performs real hotel search automation via CPMaxx portal
   * 
   * ⚠️ IMPLEMENTATION REQUIRED: This must use real browser automation
   */
  static async searchHotels(
    credentials: { login: string; password: string },
    params: HotelSearchParams,
    config: BrowserConfig
  ): Promise<{ status: string; hotels: HotelResult[]; automation_log: string[] }> {
    
    const log: string[] = [];
    log.push(`Starting hotel search for: ${params.location}`);
    log.push(`Browser config: headless=${config.headless}, timeout=${config.timeout}ms`);
    
    // REAL BROWSER AUTOMATION STEPS (these must be implemented with Playwright)
    
    log.push('Step 1: Navigate to CPMaxx login page');
    log.push(`URL: ${CPMAXX_URLS.login}`);
    
    log.push('Step 2: Fill login credentials');
    log.push(`Email field: ${CPMAXX_SELECTORS.login.emailInput}`);
    log.push(`Password field: ${CPMAXX_SELECTORS.login.passwordInput}`);
    log.push(`Login button: ${CPMAXX_SELECTORS.login.loginButton}`);
    
    log.push('Step 3: Navigate to Research Hub');
    log.push(`Research Hub URL: ${CPMAXX_URLS.researchHub}`);
    log.push(`Find Hotel link: ${CPMAXX_SELECTORS.navigation.findHotelLink}`);
    
    log.push('Step 4: Fill hotel search form');
    log.push(`Location input: ${CPMAXX_SELECTORS.hotelForm.locationInput} = "${params.location}"`);
    log.push(`Check-in date: ${CPMAXX_SELECTORS.hotelForm.checkInDate} = "${params.checkInDate}"`);
    log.push(`Check-out date: ${CPMAXX_SELECTORS.hotelForm.checkOutDate} = "${params.checkOutDate}"`);
    log.push(`Rooms: ${CPMAXX_SELECTORS.hotelForm.numRooms} = ${params.rooms}`);
    log.push(`Adults: ${CPMAXX_SELECTORS.hotelForm.adultsPerRoom} = ${params.adults}`);
    log.push(`Children: ${CPMAXX_SELECTORS.hotelForm.childrenPerRoom} = ${params.children}`);
    
    log.push('Step 5: Submit search form');
    log.push(`Submit button: ${CPMAXX_SELECTORS.hotelForm.submitButton}`);
    
    log.push('Step 6: Wait for search results page');
    log.push(`Expected URL: ${CPMAXX_URLS.hotelSearchResults}`);
    log.push('Waiting for hotel results to load...');
    
    log.push('Step 7: Extract hotel results with photos');
    log.push(`Hotel containers: ${CPMAXX_SELECTORS.results.hotelContainer}`);
    log.push(`Hotel images: ${CPMAXX_SELECTORS.results.hotelImage}`);
    log.push(`Photo data: ${CPMAXX_SELECTORS.results.photoData}`);
    log.push(`Giata IDs: ${CPMAXX_SELECTORS.results.giataId}`);
    
    // ⚠️ CRITICAL: Real browser automation implementation required here
    log.push('ERROR: Real browser automation not implemented yet');
    log.push('This requires Playwright integration to work with actual CPMaxx portal');
    log.push('All mock data has been removed - real implementation needed');
    
    return {
      status: 'error',
      hotels: [],
      automation_log: log
    };
  }
  
  /**
   * Performs car rental search automation
   */
  static async searchCars(
    credentials: { login: string; password: string },
    params: CarSearchParams,
    config: BrowserConfig
  ): Promise<{ status: string; cars: CarResult[]; automation_log: string[] }> {
    
    const log: string[] = [];
    log.push(`Starting car rental search for: ${params.pickupLocation}`);
    
    log.push('ERROR: Real car search automation not implemented yet');
    log.push('Mock data removed - real browser automation required');
    
    return {
      status: 'error',
      cars: [],
      automation_log: log
    };
  }
  
  /**
   * Performs package search automation
   */
  static async searchPackages(
    credentials: { login: string; password: string },
    params: PackageSearchParams,
    config: BrowserConfig
  ): Promise<{ status: string; packages: PackageResult[]; automation_log: string[] }> {
    
    const log: string[] = [];
    log.push(`Starting package search for: ${params.destination}`);
    
    log.push('ERROR: Real package search automation not implemented yet');
    log.push('Mock data removed - real browser automation required');
    
    return {
      status: 'error',
      packages: [],
      automation_log: log
    };
  }
}
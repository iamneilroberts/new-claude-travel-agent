/**
 * CPMaxx Hotel Search Tool - OPTIMIZED VERSION
 * Real browser automation with complete commission extraction and data optimization
 */

import { z } from 'zod';
import { chromium, Browser, Page } from 'playwright';

export const searchHotelsSchema = z.object({
  location: z.string().describe('Hotel location (city, airport, or address)'),
  check_in_date: z.string().describe('Check-in date (YYYY-MM-DD format)'),
  check_out_date: z.string().describe('Check-out date (YYYY-MM-DD format)'),
  rooms: z.number().min(1).max(8).default(1).describe('Number of rooms (1-8)'),
  adults: z.number().min(1).max(16).default(2).describe('Number of adults (1-16)'),
  children: z.number().min(0).max(16).default(0).describe('Number of children (0-16)'),
  filters: z.object({
    property_name: z.string().optional().describe('Filter by hotel name'),
    star_rating: z.array(z.number().min(1).max(5)).optional().describe('Filter by star ratings (array: [3,4,5])'),
    price_range: z.array(z.enum(['under-100', '100-199', '200-299', '300-399', 'over-400'])).optional().describe('Filter by price ranges'),
    hotel_programs: z.array(z.enum(['SIG', 'FHR', 'SGP', 'THC'])).optional().describe('Hotel programs'),
    amenities: z.array(z.enum([
      'free_breakfast', 'free_parking', 'free_wifi', 'airport_shuttle', 
      'business_center', 'fitness_center', 'no_smoking', 'pets_allowed',
      'restaurant', 'spa', 'swimming_pool'
    ])).optional().describe('Required amenities'),
    exclude_no_rating: z.boolean().default(false).describe('Exclude hotels without ratings')
  }).optional().describe('Advanced search filters'),
  debug_mode: z.boolean().default(false).describe('Enable detailed logging for debugging')
});

export type SearchHotelsInput = z.infer<typeof searchHotelsSchema>;

// CPMaxx configuration
const CPMAXX_CONFIG = {
  baseUrl: 'https://cpmaxx.cruiseplannersnet.com',
  loginUrl: 'https://cpmaxx.cruiseplannersnet.com/main/login',
  hotelSearchUrl: 'https://cpmaxx.cruiseplannersnet.com/HotelEngine'
};

// Store last search results to support additional tools
let lastSearchResults: any = null;

/**
 * OPTIMIZED: Search for hotels using real CPMaxx browser automation
 */
export async function searchHotels(params: SearchHotelsInput, env?: any) {
  console.log(`[Hotel Search] Starting optimized search for: ${params.location}`);
  
  // Get credentials from environment
  const credentials = {
    login: env?.CP_CENTRAL_LOGIN || env?.CPMAXX_LOGIN || 'kim.henderson@cruiseplanners.com',
    password: env?.CP_CENTRAL_PASSWORD || env?.CPMAXX_PASSWORD || '3!Pineapples'
  };

  const results = await withBrowser(async (page) => {
    const log: string[] = [];
    
    try {
      // Step 1: Navigate to CPMaxx
      log.push('=== Navigating to CPMaxx ===');
      await page.goto(CPMAXX_CONFIG.loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(2000);
      log.push(`Navigated to: ${CPMAXX_CONFIG.loginUrl}`);
      
      // Check if already logged in
      const isLoggedIn = await page.locator('a:has-text("Research Hub")').isVisible();
      
      if (!isLoggedIn) {
        // Step 2: Login
        log.push('=== Logging into CPMaxx ===');
        await page.fill('input[placeholder*="mail"]', credentials.login);
        await page.fill('input[placeholder*="assword"]', credentials.password);
        log.push('Filled login credentials');
        
        await page.click('button:has-text("Sign In")');
        await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
        await page.waitForTimeout(3000);
        
        // Wait for login to complete
        await page.waitForSelector('a:has-text("Research Hub")', { timeout: 30000 });
        log.push('Successfully logged in');
      } else {
        log.push('Already logged in, skipping login step');
      }
      
      // Step 3: Navigate to hotel search
      log.push('=== Navigating to Hotel Search ===');
      await page.waitForSelector('text="Find a Hotel"', { timeout: 10000 });
      await page.click('text="Find a Hotel"');
      log.push('Clicked "Find a Hotel" link');
      
      await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
      await page.waitForTimeout(2000);
      log.push('Navigated to hotel search form');
      
      // Step 4: Fill search form with optimized autocomplete handling
      log.push('=== Filling Search Form ===');
      
      // Fill location with autocomplete requirement
      log.push('Filling location field...');
      const locationField = await page.locator('input[placeholder="Enter city, airport, landmark, etc."]');
      await locationField.clear();
      
      // Type location character by character to trigger autocomplete
      await locationField.type(params.location, { delay: 100 });
      log.push(`Location typed: ${params.location}, waiting for autocomplete...`);
      
      // Wait for autocomplete to appear
      await page.waitForTimeout(3000);
      
      // Look for autocomplete dropdown
      let autocompleteCount = 0;
      let autocompleteSelector = '';
      
      const possibleSelectors = [
        '.dropdown-menu .dropdown-item',
        '.autocomplete-dropdown .suggestion',
        '.tt-menu .tt-suggestion',
        '.ui-menu .ui-menu-item',
        '.suggestions .suggestion',
        '.results .result'
      ];
      
      for (const selector of possibleSelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          autocompleteCount = count;
          autocompleteSelector = selector;
          log.push(`✅ Found ${count} autocomplete items with selector: ${selector}`);
          break;
        }
      }
      
      if (autocompleteCount > 0) {
        log.push('✅ Autocomplete dropdown appeared');
        
        // Get all options
        const options = await page.locator(autocompleteSelector).allTextContents();
        log.push('Available options:');
        options.slice(0, 5).forEach((option, i) => {
          log.push(`  ${i + 1}. "${option.trim()}"`);
        });
        
        // Select first option
        await page.click(`${autocompleteSelector}:first-child`);
        await page.waitForTimeout(1500);
        
        const selectedValue = await locationField.inputValue();
        log.push(`✅ Location selected: "${selectedValue}"`);
        
      } else {
        log.push('❌ ERROR: No autocomplete dropdown found - form will fail');
        throw new Error(`Location autocomplete required but not found. Typed "${params.location}" but no dropdown appeared. CPMAXX requires selecting from autocomplete.`);
      }
      
      // Convert dates from YYYY-MM-DD to MM/DD/YYYY format
      const formatDateForForm = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-');
        return `${month}/${day}/${year}`;
      };
      
      const formattedCheckin = formatDateForForm(params.check_in_date);
      const formattedCheckout = formatDateForForm(params.check_out_date);
      
      // Fill dates
      log.push('Filling check-in date...');
      const checkinField = await page.locator('input[placeholder="mm/dd/yyyy"]').first();
      await checkinField.clear();
      await checkinField.fill(formattedCheckin);
      await page.waitForTimeout(1000);
      
      log.push('Filling check-out date...');
      const checkoutField = await page.locator('input[placeholder="mm/dd/yyyy"]').nth(1);
      await checkoutField.clear();
      await checkoutField.fill(formattedCheckout);
      
      log.push(`Dates filled: ${formattedCheckin} to ${formattedCheckout}`);
      
      // Fill occupancy using correct selectors
      log.push('Filling occupancy...');
      
      // Skip Location Radius (first select) and target actual occupancy selectors
      const roomsSelect = await page.locator('select').nth(1); // Second select element
      await roomsSelect.selectOption(params.rooms.toString());
      log.push(`Rooms selected: ${params.rooms}`);
      
      const adultsSelect = await page.locator('select').nth(2); // Third select element
      await adultsSelect.selectOption(params.adults.toString());
      log.push(`Adults selected: ${params.adults}`);
      
      const childrenSelect = await page.locator('select').nth(3); // Fourth select element
      await childrenSelect.selectOption(params.children.toString());
      log.push(`Children selected: ${params.children}`);
      
      log.push(`Occupancy filled: ${params.rooms} rooms, ${params.adults} adults, ${params.children} children`);
      
      // Submit search
      log.push('Submitting search form...');
      await page.click('button:has-text("Start Search")');
      
      // Check for error dialog
      try {
        await page.waitForSelector('text="Error"', { timeout: 3000 });
        log.push('❌ Error dialog appeared - search form submission failed');
        throw new Error('Search form submission failed with error dialog. Check form field validation.');
      } catch (e) {
        if (e instanceof Error && e.message.includes('Search form submission failed')) {
          throw e; // Re-throw our intentional error
        }
        log.push('✅ No error dialog - form submitted successfully');
      }
      
      await page.waitForLoadState('domcontentloaded', { timeout: 60000 });
      await page.waitForTimeout(5000);
      log.push('Search submitted, waiting for results...');
      
      // Step 5: Wait for results and extract data
      log.push('=== Waiting for Hotel Results to Load ===');
      
      // Wait for hotel results to load
      log.push('Waiting for hotel checkboxes to load...');
      try {
        await page.waitForSelector('.he-hotel-comparison[data-name]', { timeout: 90000 }); // 90 seconds
        log.push('✅ Hotel checkboxes found');
      } catch (e) {
        log.push('⚠️ No hotel checkboxes found after 90s');
      }
      
      // Additional wait for more results
      log.push('Waiting additional time for all providers...');
      await page.waitForTimeout(30000); // Wait 30 seconds for more results
      
      // ENHANCED: Extract comprehensive hotel data with REAL commission extraction
      const hotels = await page.$$eval('.he-hotel-comparison[data-name]', (checkboxElements) => {
        return checkboxElements.map((checkbox, index) => {
          // Extract basic data from checkbox attributes
          const hotelName = checkbox.getAttribute('data-name') || 'Unknown Hotel';
          const address = checkbox.getAttribute('data-address') || 'Address not available';
          const description = checkbox.getAttribute('data-description') || 'No description available';
          const price = parseFloat(checkbox.getAttribute('data-total-stay') || '0');
          const originalPrice = parseFloat(checkbox.getAttribute('data-original-price') || '0');
          const rating = parseFloat(checkbox.getAttribute('data-star-rating') || '0');
          const giataId = checkbox.getAttribute('data-giata-id') || '';
          const featuredImage = checkbox.getAttribute('data-image') || '';
          
          // Find the hotel container that contains this checkbox
          const hotelContainer = checkbox.closest('.result, .property, .hotel-result');
          
          // Extract REAL commission data from DOM structure
          let commission = 0;
          let commissionPercent = 0;
          
          if (hotelContainer) {
            // Look for commission text in the hotel details section
            const commissionElement = hotelContainer.querySelector('.hotel-details .row.pad10-vert-top .col-md-5');
            if (commissionElement && commissionElement.textContent) {
              const commissionText = commissionElement.textContent;
              
              // Parse commission: "<b>Commission:</b> $53.77 (28.4%)"
              const commissionMatch = commissionText.match(/Commission:\s*\$?([0-9,.]+)\s*\(([0-9.]+)%\)/i);
              if (commissionMatch) {
                commission = parseFloat(commissionMatch[1].replace(',', ''));
                commissionPercent = parseFloat(commissionMatch[2]);
              }
            }
          }
          
          // Extract hotel programs/badges (THC, SIG, FHR, etc.)
          const hotelPrograms: string[] = [];
          if (hotelContainer) {
            const specialtyBadges = hotelContainer.querySelectorAll('.specialty-badge');
            specialtyBadges.forEach((badge: any) => {
              const badgeText = badge.textContent?.trim();
              if (badgeText) {
                hotelPrograms.push(badgeText);
              }
            });
          }
          
          // Extract coordinates from POI data-marker
          let coordinates: {lat: number, lng: number} | undefined;
          if (hotelContainer) {
            const poiLink = hotelContainer.querySelector('a[data-marker]');
            if (poiLink) {
              const markerData = poiLink.getAttribute('data-marker');
              if (markerData) {
                try {
                  const decodedData = markerData.replace(/&quot;/g, '"');
                  const markerObj = JSON.parse(decodedData);
                  if (markerObj.lat && markerObj.lng) {
                    coordinates = {
                      lat: parseFloat(markerObj.lat),
                      lng: parseFloat(markerObj.lng)
                    };
                  }
                } catch (e) {
                  // Ignore parsing errors
                }
              }
            }
          }
          
          // Extract OTA verification data
          let otaVerification: any = null;
          if (hotelContainer) {
            const verifiedBox = hotelContainer.querySelector('.verified-box[data-content]');
            if (verifiedBox) {
              const dataContent = verifiedBox.getAttribute('data-content');
              if (dataContent) {
                try {
                  const otaMatches = dataContent.match(/<div class='provider-name'>([^<]+)<\/div><div class='provider-price'>\$?([0-9,.]+)<\/div>/g);
                  if (otaMatches) {
                    const otaRates: any[] = [];
                    otaMatches.forEach(match => {
                      const providerMatch = match.match(/<div class='provider-name'>([^<]+)<\/div><div class='provider-price'>\$?([0-9,.]+)<\/div>/);
                      if (providerMatch) {
                        otaRates.push({
                          provider: providerMatch[1],
                          price: parseFloat(providerMatch[2].replace(',', ''))
                        });
                      }
                    });
                    
                    if (otaRates.length > 0) {
                      otaVerification = {
                        verified: true,
                        rates: otaRates,
                        lowestOtaPrice: Math.min(...otaRates.map(r => r.price)),
                        highestOtaPrice: Math.max(...otaRates.map(r => r.price))
                      };
                    }
                  }
                } catch (e) {
                  // Ignore parsing errors
                }
              }
            }
          }
          
          // Extract total price with taxes
          let totalPrice = 0;
          if (hotelContainer) {
            const priceElements = Array.from(hotelContainer.querySelectorAll('p'));
            const totalPriceElement = priceElements.find((p: any) => p.textContent?.includes('Total:'));
            if (totalPriceElement) {
              const totalText = totalPriceElement.textContent || '';
              const totalMatch = totalText.match(/Total:\s*\$([0-9,.]+)/);
              if (totalMatch) {
                totalPrice = parseFloat(totalMatch[1].replace(',', ''));
              }
            }
          }
          
          // Extract amenities from amenity icons
          const amenityIcons = hotelContainer ? 
            Array.from(hotelContainer.querySelectorAll('.property-rate-amenity-icon img, .amenity-icon img')).map(
              (img: any) => img.alt || img.title || img.src?.split('/').pop()?.replace('.png', '') || ''
            ).filter(Boolean) : [];
          
          // Look for photo count
          const containerText = hotelContainer?.textContent || '';
          const photoCountMatch = containerText.match(/(\d+)\s*Pictures?/i);
          const photoCount = photoCountMatch ? parseInt(photoCountMatch[1]) : 0;
          
          // Extract booking URLs
          let selectHotelUrl = '';
          let hotelSheetUrl = '';
          if (hotelContainer) {
            const selectButton = hotelContainer.querySelector('a[href*="/HotelEngine/processor/selectHotel/"]');
            if (selectButton) {
              selectHotelUrl = selectButton.getAttribute('href') || '';
            }
            
            const sheetLink = hotelContainer.querySelector('a[href*="/HotelSheets/processor/selectRooms/"]');
            if (sheetLink) {
              hotelSheetUrl = sheetLink.getAttribute('href') || '';
            }
          }
          
          // Calculate value metrics for intelligent recommendation
          const commissionValue = commission;
          const priceValue = price > 0 ? 1000 / price : 0; // Inverse price (lower is better)
          const ratingValue = rating * 20; // Scale 0-5 to 0-100
          
          // Composite scores for different priorities
          const maxCommissionScore = commissionValue * 2 + ratingValue * 0.5 + priceValue * 0.3;
          const balancedScore = commissionValue * 0.6 + ratingValue * 0.8 + priceValue * 0.6;
          const bestValueScore = ratingValue * 1.0 + priceValue * 0.8 + commissionValue * 0.4;
          
          return {
            name: hotelName,
            address: address,
            description: description,
            rating: Math.round(rating * 10) / 10,
            price: Math.round(price * 100) / 100,
            originalPrice: Math.round(originalPrice * 100) / 100,
            totalPrice: totalPrice,
            commission: Math.round(commission * 100) / 100,
            commissionPercent: Math.round(commissionPercent * 10) / 10,
            available: true,
            
            // URLs for booking/management
            urls: {
              booking: (window as any).location.href,
              selectHotel: selectHotelUrl,
              createHotelSheet: hotelSheetUrl
            },
            
            // Enhanced photo information
            photos: {
              featured: featuredImage.split(',')[0] || '',
              gallery: featuredImage.split(',').filter(Boolean),
              giataId: giataId,
              photoCount: photoCount
            },
            
            // Enhanced amenities and programs
            amenities: amenityIcons,
            hotelPrograms: hotelPrograms,
            
            // Enhanced location data
            location: {
              coordinates: coordinates,
              district: address,
              city: address.split(' ').slice(-2, -1)[0] || '',
              state: address.split(' ').slice(-1)[0] || ''
            },
            
            // OTA comparison data
            otaVerification: otaVerification,
            
            // Intelligence scores for recommendations
            scores: {
              maxCommission: Math.round(maxCommissionScore),
              balanced: Math.round(balancedScore),
              bestValue: Math.round(bestValueScore),
              commissionOnly: Math.round(commissionValue),
              ratingOnly: Math.round(ratingValue),
              priceOnly: Math.round(priceValue)
            },
            
            // Metadata
            extractionMethod: 'comprehensive_dom_extraction',
            hotelIndex: index + 1,
            extractedAt: new Date().toISOString()
          };
        });
      });
      
      log.push(`Successfully extracted ${hotels.length} hotels`);
      hotels.forEach((hotel, index) => {
        log.push(`  ${index + 1}. ${hotel.name} - $${hotel.price}/night - ${hotel.rating}⭐ - Commission: $${hotel.commission} (${hotel.commissionPercent}%)`);
      });
      
      // Calculate analytics
      const avgCommissionPercent = hotels.reduce((sum, h) => sum + h.commissionPercent, 0) / hotels.length;
      const avgPrice = hotels.reduce((sum, h) => sum + h.price, 0) / hotels.length;
      const totalCommissionPotential = hotels.reduce((sum, h) => sum + h.commission, 0);
      
      // OPTIMIZED: Return ALL hotels with essential data for Claude Desktop decision-making
      const summaryResponse = {
        status: 'success',
        totalHotels: hotels.length,
        
        // Return ALL hotels with essential data
        hotels: hotels.map(h => ({
          name: h.name,
          price: h.price,
          rating: h.rating,
          commission: h.commission,
          commissionPercent: h.commissionPercent,
          available: h.available,
          scores: {
            maxCommission: h.scores.maxCommission,
            balanced: h.scores.balanced,
            bestValue: h.scores.bestValue
          },
          extractionMethod: h.extractionMethod
        })),
        
        // Market analysis (simplified)
        analytics: {
          totalHotels: hotels.length,
          priceRange: `$${Math.min(...hotels.map(h => h.price))} - $${Math.max(...hotels.map(h => h.price))}`,
          commissionRange: `${Math.min(...hotels.map(h => h.commissionPercent))}% - ${Math.max(...hotels.map(h => h.commissionPercent))}%`,
          avgPrice: Math.round(avgPrice),
          avgCommission: Math.round(avgCommissionPercent * 10) / 10,
          totalCommissionPotential: Math.round(totalCommissionPotential)
        },
        
        search_metadata: {
          location: params.location,
          dates: `${params.check_in_date} to ${params.check_out_date}`,
          guests: `${params.adults} adults${params.children > 0 ? `, ${params.children} children` : ''}`,
          rooms: params.rooms,
          search_timestamp: new Date().toISOString(),
          source: 'comprehensive_cpmaxx_extraction',
          extractionVersion: '2.0',
          dataEnhancement: 'real_commission_ota_verification_coordinates_programs'
        },
        
        // Instructions for getting full data
        fullDataAccess: {
          note: "All hotels returned with essential decision-making data. Use get_hotel_details for complete information.",
          availableTools: [
            "get_hotel_details - Get complete data for specific hotel",
            "get_hotels_by_criteria - Get hotels filtered by commission/rating/price"
          ]
        },
        
        automation_log: log
      };
      
      // Store full results for detailed queries
      lastSearchResults = {
        fullHotels: hotels,
        searchTimestamp: new Date().toISOString()
      };
      
      return summaryResponse;
      
    } catch (error) {
      log.push(`Error during hotel search: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }, { headless: !params.debug_mode, debug: params.debug_mode });

  return results;
}

// Browser management helper
async function withBrowser<T>(
  callback: (page: Page) => Promise<T>,
  options: { headless?: boolean; debug?: boolean } = { headless: true, debug: false }
): Promise<T> {
  let page: Page;
  let browser: Browser;
  
  console.log('Launching browser...');
  browser = await chromium.launch({ 
    headless: options.headless,
    timeout: 60000
  });
  
  // Create page with enhanced debugging
  page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });
  
  // Enable console logging from the browser
  page.on('console', (msg) => {
    console.log(`🌐 BROWSER CONSOLE [${msg.type()}]:`, msg.text());
  });
  
  // Log page errors
  page.on('pageerror', (error) => {
    console.log(`🚨 PAGE ERROR:`, error.message);
  });
  
  try {
    return await callback(page);
  } finally {
    await page.close();
    await browser.close();
  }
}

/**
 * Get detailed hotel information from last search
 */
export const getHotelDetailsSchema = z.object({
  hotel_name: z.string().describe('Name of the hotel to get detailed information for'),
  search_context: z.string().optional().describe('Recent search context to find the hotel')
});

export type GetHotelDetailsInput = z.infer<typeof getHotelDetailsSchema>;

export async function getHotelDetails(params: GetHotelDetailsInput) {
  console.log(`[Hotel Details] Getting details for: ${params.hotel_name}`);
  
  if (!lastSearchResults || !lastSearchResults.fullHotels) {
    return {
      status: 'error',
      error: 'No recent search results available. Please run cpmaxx_search_hotels first.',
      timestamp: new Date().toISOString()
    };
  }
  
  // Find the hotel by name (case insensitive partial match)
  const hotel = lastSearchResults.fullHotels.find((h: any) => 
    h.name.toLowerCase().includes(params.hotel_name.toLowerCase())
  );
  
  if (!hotel) {
    const availableHotels = lastSearchResults.fullHotels.slice(0, 10).map((h: any) => h.name);
    
    return {
      status: 'error',
      error: `Hotel "${params.hotel_name}" not found in recent search results.`,
      availableHotels: availableHotels,
      timestamp: new Date().toISOString()
    };
  }
  
  return {
    status: 'success',
    hotel: hotel,
    searchTimestamp: lastSearchResults.searchTimestamp,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get hotels by specific criteria from last search
 */
export const getHotelsByCriteriaSchema = z.object({
  criteria: z.enum(['max_commission', 'balanced', 'best_value', 'highest_rated', 'lowest_price']).describe('Sorting criteria'),
  limit: z.number().min(1).max(20).default(10).describe('Number of hotels to return'),
  search_context: z.string().optional().describe('Recent search context')
});

export type GetHotelsByCriteriaInput = z.infer<typeof getHotelsByCriteriaSchema>;

export async function getHotelsByCriteria(params: GetHotelsByCriteriaInput) {
  console.log(`[Hotels By Criteria] Getting hotels by: ${params.criteria}`);
  
  if (!lastSearchResults || !lastSearchResults.fullHotels) {
    return {
      status: 'error',
      error: 'No recent search results available. Please run cpmaxx_search_hotels first.',
      timestamp: new Date().toISOString()
    };
  }
  
  let sortedHotels: any[] = [];
  let strategy = '';
  
  switch (params.criteria) {
    case 'max_commission':
      sortedHotels = [...lastSearchResults.fullHotels].sort((a: any, b: any) => b.scores.maxCommission - a.scores.maxCommission);
      strategy = 'Hotels sorted by maximum commission potential';
      break;
    case 'balanced':
      sortedHotels = [...lastSearchResults.fullHotels].sort((a: any, b: any) => b.scores.balanced - a.scores.balanced);
      strategy = 'Hotels sorted by balanced score (commission, price, quality)';
      break;
    case 'best_value':
      sortedHotels = [...lastSearchResults.fullHotels].sort((a: any, b: any) => b.scores.bestValue - a.scores.bestValue);
      strategy = 'Hotels sorted by best value for clients';
      break;
    case 'highest_rated':
      sortedHotels = [...lastSearchResults.fullHotels].sort((a: any, b: any) => b.rating - a.rating);
      strategy = 'Hotels sorted by highest rating first';
      break;
    case 'lowest_price':
      sortedHotels = [...lastSearchResults.fullHotels].sort((a: any, b: any) => a.price - b.price);
      strategy = 'Hotels sorted by lowest price first';
      break;
  }
  
  const limitedHotels = sortedHotels.slice(0, params.limit || 10);
  
  return {
    status: 'success',
    criteria: params.criteria,
    strategy: strategy,
    totalAvailable: sortedHotels.length,
    returned: limitedHotels.length,
    hotels: limitedHotels,
    searchTimestamp: lastSearchResults.searchTimestamp,
    timestamp: new Date().toISOString()
  };
}

/**
 * Quick hotel search with simplified parameters
 */
export const quickHotelSearchSchema = z.object({
  location: z.string().describe('Hotel location'),
  check_in: z.string().describe('Check-in date (YYYY-MM-DD)'),
  check_out: z.string().describe('Check-out date (YYYY-MM-DD)'),
  guests: z.number().default(2).describe('Total number of guests')
});

export type QuickHotelSearchInput = z.infer<typeof quickHotelSearchSchema>;

export async function quickHotelSearch(params: QuickHotelSearchInput, env?: any) {
  // Convert to full search parameters
  const fullParams: SearchHotelsInput = {
    location: params.location,
    check_in_date: params.check_in,
    check_out_date: params.check_out,
    rooms: 1,
    adults: params.guests,
    children: 0,
    debug_mode: false
  };

  return await searchHotels(fullParams, env);
}
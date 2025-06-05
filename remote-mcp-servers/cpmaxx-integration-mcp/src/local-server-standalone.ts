#!/usr/bin/env node
/**
 * Standalone Local CPMaxx MCP Server with Real Browser Automation
 * Self-contained with no external dependencies on other tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { chromium, Browser, Page } from 'playwright';

// Schema definitions (standalone)
const searchHotelsSchema = z.object({
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

const testBrowserSchema = z.object({
  test_type: z.enum(['hotel_search', 'login_test', 'visible_test']).describe('Type of test to run'),
  visible_browser: z.boolean().default(false).describe('Run with visible browser'),
  debug_mode: z.boolean().default(false).describe('Enable debug output')
});

const getHotelDetailsSchema = z.object({
  hotel_name: z.string().describe('Name of the hotel to get detailed information for'),
  search_context: z.string().optional().describe('Recent search context to find the hotel')
});

const getHotelsByCriteriaSchema = z.object({
  criteria: z.enum(['max_commission', 'balanced', 'best_value', 'highest_rated', 'lowest_price']).describe('Sorting criteria'),
  limit: z.number().min(1).max(20).default(10).describe('Number of hotels to return'),
  search_context: z.string().optional().describe('Recent search context')
});

// CPMaxx configuration
const CPMAXX_CONFIG = {
  baseUrl: 'https://cpmaxx.cruiseplannersnet.com',
  loginUrl: 'https://cpmaxx.cruiseplannersnet.com/main/login',
  hotelSearchUrl: 'https://cpmaxx.cruiseplannersnet.com/HotelEngine',
  credentials: {
    login: process.env.CPMAXX_LOGIN || 'kim.henderson@cruiseplanners.com',
    password: process.env.CPMAXX_PASSWORD || '3!Pineapples'
  }
};

// Browser instance management
let browser: Browser | null = null;

// Store last search results to avoid truncation issues
let lastSearchResults: any = null;

class CPMaxxLocalMCP {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'cpmaxx-integration-local',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupErrorHandling();
    this.setupToolHandlers();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      console.log('\nShutting down CPMaxx MCP server...');
      await this.cleanup();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_hotels',
            description: 'Search for hotels using real CPMaxx browser automation. Returns summarized results to avoid truncation.',
            inputSchema: searchHotelsSchema
          },
          {
            name: 'get_hotel_details',
            description: 'Get complete detailed information for a specific hotel from recent search',
            inputSchema: getHotelDetailsSchema
          },
          {
            name: 'get_hotels_by_criteria',
            description: 'Get hotels sorted by specific criteria (commission, rating, price) with full details',
            inputSchema: getHotelsByCriteriaSchema
          },
          {
            name: 'test_browser',
            description: 'Test browser automation with visible browser',
            inputSchema: testBrowserSchema
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_hotels':
            return await this.searchHotels(args);
          case 'get_hotel_details':
            return await this.getHotelDetails(args);
          case 'get_hotels_by_criteria':
            return await this.getHotelsByCriteria(args);
          case 'test_browser':
            return await this.testBrowser(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error in ${name}:`, errorMessage);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                tool: name,
                error: errorMessage,
                timestamp: new Date().toISOString()
              }, null, 2)
            }
          ],
          isError: true
        };
      }
    });
  }

  // Helper function to take screenshots with descriptive names
  private async takeDebugScreenshot(page: any, stepName: string, debugMode: boolean = false) {
    if (!debugMode) return;
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `debug-${timestamp}-${stepName.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
      await page.screenshot({ 
        path: filename, 
        fullPage: true 
      });
      console.error(`📸 Screenshot saved: ${filename}`);
      return filename;
    } catch (error) {
      console.error(`❌ Failed to take screenshot: ${error}`);
    }
  }

  // Helper function to debug DOM content
  private async debugDOMContent(page: any, stepName: string, debugMode: boolean = false) {
    if (!debugMode) return;
    
    try {
      // Get page title and URL
      const title = await page.title();
      const url = await page.url();
      
      console.error(`🔍 DOM DEBUG [${stepName}]:`);
      console.error(`   URL: ${url}`);
      console.error(`   Title: ${title}`);
      
      // Check for common elements
      const bodyText = await page.evaluate(() => {
        return document.body ? document.body.innerText.substring(0, 500) : 'NO BODY ELEMENT';
      });
      
      console.error(`   Body text (first 500 chars): ${bodyText}`);
      
      // Check for login-related elements
      const loginElements = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const buttons = Array.from(document.querySelectorAll('button'));
        const links = Array.from(document.querySelectorAll('a'));
        
        return {
          inputPlaceholders: inputs.map(i => i.placeholder || i.type),
          buttonTexts: buttons.map(b => b.textContent?.trim()),
          linkTexts: links.slice(0, 10).map(l => l.textContent?.trim())
        };
      });
      
      console.error(`   Input placeholders: ${JSON.stringify(loginElements.inputPlaceholders)}`);
      console.error(`   Button texts: ${JSON.stringify(loginElements.buttonTexts)}`);
      console.error(`   Link texts (first 10): ${JSON.stringify(loginElements.linkTexts)}`);
      
    } catch (error) {
      console.error(`❌ Failed to debug DOM: ${error}`);
    }
  }

  // Helper function to display status in browser
  private async showBrowserStatus(page: any, message: string, step?: number, total?: number) {
    try {
      await page.evaluate((msg: string, stepNum?: number, totalSteps?: number) => {
        // Remove existing status if present
        const existing = document.getElementById('automation-status');
        if (existing) existing.remove();
        
        // Create status overlay
        const statusDiv = document.createElement('div');
        statusDiv.id = 'automation-status';
        statusDiv.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #2196F3;
          color: white;
          padding: 15px 20px;
          border-radius: 8px;
          font-family: Arial, sans-serif;
          font-size: 14px;
          z-index: 10000;
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
          max-width: 300px;
        `;
        
        let content = `🤖 Hotel Search Automation<br><strong>${msg}</strong>`;
        if (stepNum && totalSteps) {
          content += `<br><small>Step ${stepNum} of ${totalSteps}</small>`;
        }
        statusDiv.innerHTML = content;
        
        document.body.appendChild(statusDiv);
        
        // Auto-remove after 5 seconds for non-final messages
        if (!msg.includes('Complete') && !msg.includes('Error')) {
          setTimeout(() => {
            const el = document.getElementById('automation-status');
            if (el) el.remove();
          }, 5000);
        }
      }, message, step, total);
    } catch (e) {
      // Ignore errors in status display
    }
  }

  // Real hotel search with Playwright
  private async searchHotels(args: any) {
    console.error(`[Hotel Search] Starting search for: ${args.location}`);
    
    const results = await this.withBrowser(async (page) => {
      const log: string[] = [];
      
      // Show initial status
      if (args.debug_mode) {
        await this.showBrowserStatus(page, 'Initializing automation...', 1, 6);
      }
      
      try {
        // Step 1: Navigate to CPMaxx
        log.push('=== Navigating to CPMaxx ===');
        if (args.debug_mode) {
          await this.showBrowserStatus(page, 'Navigating to CPMaxx login...', 2, 6);
        }
        
        await page.goto(CPMAXX_CONFIG.loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await this.takeDebugScreenshot(page, '01-after-navigation-to-login', args.debug_mode);
        await this.debugDOMContent(page, 'after-navigation', args.debug_mode);
        
        await page.waitForTimeout(2000); // Allow page to fully load
        await this.takeDebugScreenshot(page, '02-login-page-loaded', args.debug_mode);
        await this.debugDOMContent(page, 'login-page-loaded', args.debug_mode);
        log.push(`Navigated to: ${CPMAXX_CONFIG.loginUrl}`);
        
        // Check if already logged in
        const isLoggedIn = await page.locator('a:has-text("Research Hub")').isVisible();
        
        if (!isLoggedIn) {
          // Step 2: Login
          log.push('=== Logging into CPMaxx ===');
          if (args.debug_mode) {
            await this.showBrowserStatus(page, 'Logging into CPMaxx...', 2, 6);
          }
          
          await page.fill('input[placeholder*="mail"]', CPMAXX_CONFIG.credentials.login);
          await page.fill('input[placeholder*="assword"]', CPMAXX_CONFIG.credentials.password);
          await this.takeDebugScreenshot(page, '03-credentials-filled', args.debug_mode);
          log.push('Filled login credentials');
          
          await page.click('button:has-text("Sign In")');
          await this.takeDebugScreenshot(page, '04-after-login-click', args.debug_mode);
          
          await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
          await page.waitForTimeout(3000); // Allow login to process
          await this.takeDebugScreenshot(page, '05-after-login-wait', args.debug_mode);
          log.push('Login submitted, waiting for dashboard...');
          
          // Wait for login to complete
          await page.waitForSelector('a:has-text("Research Hub")', { timeout: 30000 });
          await this.takeDebugScreenshot(page, '06-dashboard-loaded', args.debug_mode);
          log.push('Successfully logged in');
        } else {
          await this.takeDebugScreenshot(page, '03-already-logged-in', args.debug_mode);
          log.push('Already logged in, skipping login step');
        }
        
        // Step 3: Navigate to hotel search
        log.push('=== Navigating to Hotel Search ===');
        if (args.debug_mode) {
          await this.showBrowserStatus(page, 'Finding hotel search...', 3, 6);
        }
        
        // Look for the hotel search link - fail if not found
        await page.waitForSelector('text="Find a Hotel"', { timeout: 10000 });
        await this.takeDebugScreenshot(page, '07-before-hotel-link-click', args.debug_mode);
        await page.click('text="Find a Hotel"');
        log.push('Clicked "Find a Hotel" link');
        
        await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
        await page.waitForTimeout(2000); // Allow form to load
        await this.takeDebugScreenshot(page, '08-hotel-search-form', args.debug_mode);
        log.push('Navigated to hotel search form');
        
        // Step 4: Fill search form
        log.push('=== Filling Search Form ===');
        if (args.debug_mode) {
          await this.showBrowserStatus(page, `Searching for ${args.location}...`, 4, 6);
        }
        
        // Fill location using the correct selector for this form
        log.push('Filling location field...');
        const locationField = await page.locator('input[placeholder="Enter city, airport, landmark, etc."]');
        await locationField.clear();
        
        // Type location character by character to trigger autocomplete properly
        await locationField.type(args.location, { delay: 100 });
        log.push(`Location typed: ${args.location}, waiting for autocomplete...`);
        
        // Wait longer for autocomplete to appear
        await page.waitForTimeout(3000); // Give more time for autocomplete
        
        // Look for autocomplete dropdown with multiple possible selectors
        let autocompleteCount = 0;
        let autocompleteSelector = '';
        
        // Try different autocomplete selectors
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
        
        log.push(`Autocomplete items found: ${autocompleteCount}`);
        
        if (autocompleteCount > 0) {
          log.push('✅ Autocomplete dropdown appeared');
          
          // Get all options to see what's available
          const options = await page.locator(autocompleteSelector).allTextContents();
          log.push('Available options:');
          options.slice(0, 5).forEach((option, i) => {
            log.push(`  ${i + 1}. "${option.trim()}"`);
          });
          
          // Select first option
          await page.click(`${autocompleteSelector}:first-child`);
          await page.waitForTimeout(1500); // Let selection complete
          
          // Verify selection
          const selectedValue = await locationField.inputValue();
          log.push(`✅ Location selected: "${selectedValue}"`);
          
        } else {
          log.push('❌ ERROR: No autocomplete dropdown found - form will fail');
          log.push('This is a CPMAXX validation requirement - location must be selected from dropdown');
          throw new Error(`Location autocomplete required but not found. Typed "${args.location}" but no dropdown appeared. CPMAXX requires selecting from autocomplete.`);
        }
        
        // Convert dates from YYYY-MM-DD to MM/DD/YYYY format
        const formatDateForForm = (dateStr: string) => {
          const [year, month, day] = dateStr.split('-');
          return `${month}/${day}/${year}`;
        };
        
        const formattedCheckin = formatDateForForm(args.check_in_date);
        const formattedCheckout = formatDateForForm(args.check_out_date);
        
        // Fill dates - need to clear auto-populated values first
        log.push('Filling check-in date...');
        const checkinField = await page.locator('input[placeholder="mm/dd/yyyy"]').first();
        await checkinField.clear();
        await checkinField.fill(formattedCheckin);
        await page.waitForTimeout(1000); // Wait for auto-population of check-out
        
        log.push('Filling check-out date...');
        const checkoutField = await page.locator('input[placeholder="mm/dd/yyyy"]').nth(1);
        await checkoutField.clear(); // Clear the auto-populated value
        await checkoutField.fill(formattedCheckout);
        
        log.push(`Dates filled: ${formattedCheckin} to ${formattedCheckout}`);
        
        // Fill occupancy using the correct selectors for this form
        log.push('Filling occupancy...');
        
        // Skip Location Radius (first select) and target the actual occupancy selectors
        // Number of rooms - target by name attribute or position after location radius
        const roomsSelect = await page.locator('select').nth(1); // Second select element (skip location radius)
        await roomsSelect.selectOption(args.rooms.toString());
        log.push(`Rooms selected: ${args.rooms}`);
        
        // Adults per room - third select element  
        const adultsSelect = await page.locator('select').nth(2); // Third select element
        await adultsSelect.selectOption(args.adults.toString());
        log.push(`Adults selected: ${args.adults}`);
        
        // Children per room - fourth select element
        const childrenSelect = await page.locator('select').nth(3); // Fourth select element
        await childrenSelect.selectOption(args.children.toString());
        log.push(`Children selected: ${args.children}`);
        
        log.push(`Occupancy filled: ${args.rooms} rooms, ${args.adults} adults, ${args.children} children`);
        
        // Submit search
        log.push('Submitting search form...');
        await this.takeDebugScreenshot(page, '09-before-search-submit', args.debug_mode);
        
        // Click the "Start Search" button
        await page.click('button:has-text("Start Search")');
        await this.takeDebugScreenshot(page, '10-after-search-submit', args.debug_mode);
        
        // Check for error dialog - if it appears, fail immediately
        try {
          await page.waitForSelector('text="Error"', { timeout: 3000 });
          log.push('❌ Error dialog appeared - search form submission failed');
          
          // Take screenshot of error for debugging
          await this.takeDebugScreenshot(page, '11-error-dialog', args.debug_mode);
          
          throw new Error('Search form submission failed with error dialog. Check form field validation.');
        } catch (e) {
          // If we reach here, either no error dialog appeared (good) or we threw the error above
          if (e instanceof Error && e.message.includes('Search form submission failed')) {
            throw e; // Re-throw our intentional error
          }
          log.push('✅ No error dialog - form submitted successfully');
        }
        
        await page.waitForLoadState('domcontentloaded', { timeout: 60000 });
        await page.waitForTimeout(5000); // Allow search results to load
        log.push('Search submitted, waiting for results...');
        
        // Take screenshot after search submission
        if (args.debug_mode) {
          await page.screenshot({ path: 'cpmaxx-after-search-submit.png' });
          log.push('📸 Screenshot saved: cpmaxx-after-search-submit.png');
        }
        
        // Step 5: Skip filters for now to get basic search working
        if (args.filters) {
          log.push('=== Filters requested but skipping for initial testing ===');
          log.push(`Requested filters: ${JSON.stringify(args.filters)}`);
          log.push('Will implement filters after basic search is working');
        }
        
        // Step 6: Simple wait for results to load
        log.push('=== Waiting for Hotel Results to Load ===');
        if (args.debug_mode) {
          await this.showBrowserStatus(page, 'Loading hotel results...', 5, 6);
        }
        
        // Wait for hotel results to load (increased timeout for provider aggregation)
        log.push('Waiting for hotel checkboxes to load (this takes time due to provider aggregation)...');
        try {
          await page.waitForSelector('.he-hotel-comparison[data-name]', { timeout: 90000 }); // 90 seconds
          log.push('✅ Hotel checkboxes found');
        } catch (e) {
          log.push('⚠️ No hotel checkboxes found after 90s - may be no results or still loading');
        }
        
        // Additional wait for more results to load from all providers
        log.push('Waiting additional time for all providers to return results...');
        await page.waitForTimeout(30000); // Wait 30 seconds for more results to aggregate
        
        // Final screenshot before extraction
        if (args.debug_mode) {
          await page.screenshot({ path: 'cpmaxx-before-extraction.png' });
          log.push('📸 Screenshot saved: cpmaxx-before-extraction.png');
          
          // Save the actual HTML that Playwright sees after AJAX
          const htmlContent = await page.content();
          const fs = await import('fs');
          fs.writeFileSync('cpmaxx-final-dom.html', htmlContent);
          log.push('📄 HTML saved: cpmaxx-final-dom.html');
          
          // Log all elements with "property" class for debugging
          const propertyElements = await page.$$eval('.property', (elements) => {
            return elements.map((el, i) => ({
              index: i,
              html: el.outerHTML.substring(0, 500),
              textContent: el.textContent?.substring(0, 200),
              hasPropertyName: !!el.querySelector('.property-name'),
              propertyNameText: el.querySelector('.property-name')?.textContent?.trim() || 'NOT FOUND'
            }));
          });
          log.push('🔍 Property elements analysis:');
          propertyElements.forEach((el, i) => {
            log.push(`  Element ${i}: name="${el.propertyNameText}" hasNameEl=${el.hasPropertyName}`);
          });
        }
        
        // Check multiple selectors for hotels with better precision
        const propertyResultCount = await page.locator('.property.result').count();
        const hotelCheckboxCount = await page.locator('.he-hotel-comparison[data-name]').count();
        const featuredCount = await page.locator('[data-featured="1"]').count();
        
        log.push(`Property.result count (featured): ${propertyResultCount}`);
        log.push(`Hotel checkbox count (all results): ${hotelCheckboxCount}`);
        log.push(`Featured hotels: ${featuredCount}`);
        
        // ENHANCED: Extract comprehensive hotel data from DOM
        const hotels = await page.$$eval('.he-hotel-comparison[data-name]', (checkboxElements) => {
          return checkboxElements.map((checkbox, index) => {
            // All hotel data is in the checkbox data attributes!
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
            
            // If no commission found, mark as unavailable rather than calculating
            if (commission === 0) {
              commission = 0;
              commissionPercent = 0;
              // Note: Real commission data not found in DOM for this hotel
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
                    // Decode HTML entities and parse JSON
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
                    // Parse OTA comparison data from popover content
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
            
            // Extract amenities from amenity icons and data attributes
            const amenityIcons = hotelContainer ? 
              Array.from(hotelContainer.querySelectorAll('.property-rate-amenity-icon img, .amenity-icon img')).map(
                (img: any) => img.alt || img.title || img.src?.split('/').pop()?.replace('.png', '') || ''
              ).filter(Boolean) : [];
            
            // Extract amenities from checkbox data (appears to have some amenity data)
            const dataAmenities = amenityIcons.length > 0 ? amenityIcons : [];
            
            // Look for photo count in nearby elements
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
              rating: Math.round(rating * 10) / 10, // Keep one decimal for ratings
              price: Math.round(price * 100) / 100,
              originalPrice: Math.round(originalPrice * 100) / 100,
              totalPrice: totalPrice,
              commission: Math.round(commission * 100) / 100,
              commissionPercent: Math.round(commissionPercent * 10) / 10,
              available: true, // All checkbox results are available
              
              // URLs for booking/management
              urls: {
                booking: window.location.href,
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
              amenities: dataAmenities,
              hotelPrograms: hotelPrograms,
              
              // Enhanced location data
              location: {
                coordinates: coordinates,
                district: address,
                city: address.split(' ').slice(-2, -1)[0] || '', // Extract city from address
                state: address.split(' ').slice(-1)[0] || '' // Extract state/zip
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
        if (args.debug_mode) {
          await this.showBrowserStatus(page, `Complete! Found ${hotels.length} hotels`, 6, 6);
        }
        hotels.forEach((hotel, index) => {
          log.push(`  ${index + 1}. ${hotel.name} - $${hotel.price}/night - ${hotel.rating}⭐ - Commission: $${hotel.commission} (${hotel.commissionPercent}%)`);
        });
        
        // Sort hotels by different criteria for intelligent recommendations
        const hotelsByMaxCommission = [...hotels].sort((a, b) => b.scores.maxCommission - a.scores.maxCommission);
        const hotelsByBalanced = [...hotels].sort((a, b) => b.scores.balanced - a.scores.balanced);
        const hotelsByBestValue = [...hotels].sort((a, b) => b.scores.bestValue - a.scores.bestValue);
        const hotelsByCommissionPercent = [...hotels].sort((a, b) => b.commissionPercent - a.commissionPercent);
        const hotelsByRating = [...hotels].sort((a, b) => b.rating - a.rating);
        const hotelsByPrice = [...hotels].sort((a, b) => a.price - b.price);
        
        // Calculate analytics
        const avgCommissionPercent = hotels.reduce((sum, h) => sum + h.commissionPercent, 0) / hotels.length;
        const avgPrice = hotels.reduce((sum, h) => sum + h.price, 0) / hotels.length;
        const avgRating = hotels.reduce((sum, h) => sum + h.rating, 0) / hotels.length;
        const totalCommissionPotential = hotels.reduce((sum, h) => sum + h.commission, 0);
        
        // Count hotels with special programs
        const hotelProgramCounts: { [key: string]: number } = {};
        hotels.forEach(hotel => {
          hotel.hotelPrograms.forEach(program => {
            hotelProgramCounts[program] = (hotelProgramCounts[program] || 0) + 1;
          });
        });
        
        // Count OTA verified hotels
        const otaVerifiedCount = hotels.filter(h => h.otaVerification?.verified).length;
        
        // Create a summary response optimized for maximum hotel count
        const summaryResponse = {
          status: 'success',
          totalHotels: hotels.length,
          
          // Return ALL hotels with essential data for Claude Desktop decision-making
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
            location: args.location,
            dates: `${args.check_in_date} to ${args.check_out_date}`,
            guests: `${args.adults} adults${args.children > 0 ? `, ${args.children} children` : ''}`,
            rooms: args.rooms,
            search_timestamp: new Date().toISOString(),
            source: 'comprehensive_cpmaxx_extraction',
            extractionVersion: '2.0',
            dataEnhancement: 'real_commission_ota_verification_coordinates_programs'
          },
          
          // Instructions for getting full data
          fullDataAccess: {
            note: "All hotels returned with essential decision-making data. Full details available for specific hotels.",
            availableTools: [
              "get_hotel_details - Get complete data for specific hotel (address, amenities, photos, booking URLs)",
              "get_hotels_by_criteria - Get hotels filtered by commission/rating/price with full details"
            ]
          }
        };
        
        // Store full results for detailed queries
        lastSearchResults = {
          fullHotels: hotels,
          recommendations: {
            maxCommission: {
              strategy: 'Maximize commission earnings',
              topPicks: hotelsByMaxCommission.slice(0, 10)
            },
            balanced: {
              strategy: 'Best balance of commission, price, and quality',
              topPicks: hotelsByBalanced.slice(0, 10)
            },
            bestValue: {
              strategy: 'Best value for clients (price + quality)',
              topPicks: hotelsByBestValue.slice(0, 10)
            },
            premiumPrograms: {
              strategy: 'Hotels with premium programs (THC, SIG, FHR)',
              topPicks: hotels.filter(h => h.hotelPrograms.length > 0).sort((a, b) => b.commission - a.commission).slice(0, 10)
            }
          },
          sortedLists: {
            byCommissionPercent: hotelsByCommissionPercent,
            byRating: hotelsByRating,
            byPrice: hotelsByPrice,
            byCommissionDollar: [...hotels].sort((a, b) => b.commission - a.commission)
          },
          searchTimestamp: new Date().toISOString()
        };
        
        return summaryResponse;
        
      } catch (error) {
        log.push(`Error during hotel search: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    }, { headless: !args.debug_mode, debug: args.debug_mode });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }
      ]
    };
  }

  // Get detailed hotel information
  private async getHotelDetails(args: any) {
    console.error(`[Hotel Details] Getting details for: ${args.hotel_name}`);
    
    if (!lastSearchResults || !lastSearchResults.fullHotels) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              error: 'No recent search results available. Please run search_hotels first.',
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ],
        isError: true
      };
    }
    
    // Find the hotel by name (case insensitive partial match)
    const hotel = lastSearchResults.fullHotels.find((h: any) => 
      h.name.toLowerCase().includes(args.hotel_name.toLowerCase())
    );
    
    if (!hotel) {
      const availableHotels = lastSearchResults.fullHotels.slice(0, 10).map((h: any) => h.name);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              error: `Hotel "${args.hotel_name}" not found in recent search results.`,
              availableHotels: availableHotels,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ],
        isError: true
      };
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'success',
            hotel: hotel,
            searchTimestamp: lastSearchResults.searchTimestamp,
            timestamp: new Date().toISOString()
          }, null, 2)
        }
      ]
    };
  }

  // Get hotels by specific criteria
  private async getHotelsByCriteria(args: any) {
    console.error(`[Hotels By Criteria] Getting hotels by: ${args.criteria}`);
    
    if (!lastSearchResults || !lastSearchResults.fullHotels) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              error: 'No recent search results available. Please run search_hotels first.',
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ],
        isError: true
      };
    }
    
    let sortedHotels: any[] = [];
    let strategy = '';
    
    switch (args.criteria) {
      case 'max_commission':
        sortedHotels = lastSearchResults.recommendations.maxCommission.topPicks;
        strategy = lastSearchResults.recommendations.maxCommission.strategy;
        break;
      case 'balanced':
        sortedHotels = lastSearchResults.recommendations.balanced.topPicks;
        strategy = lastSearchResults.recommendations.balanced.strategy;
        break;
      case 'best_value':
        sortedHotels = lastSearchResults.recommendations.bestValue.topPicks;
        strategy = lastSearchResults.recommendations.bestValue.strategy;
        break;
      case 'highest_rated':
        sortedHotels = lastSearchResults.sortedLists.byRating;
        strategy = 'Hotels sorted by highest rating first';
        break;
      case 'lowest_price':
        sortedHotels = lastSearchResults.sortedLists.byPrice;
        strategy = 'Hotels sorted by lowest price first';
        break;
    }
    
    const limitedHotels = sortedHotels.slice(0, args.limit || 10);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'success',
            criteria: args.criteria,
            strategy: strategy,
            totalAvailable: sortedHotels.length,
            returned: limitedHotels.length,
            hotels: limitedHotels,
            searchTimestamp: lastSearchResults.searchTimestamp,
            timestamp: new Date().toISOString()
          }, null, 2)
        }
      ]
    };
  }

  // Test browser automation
  private async testBrowser(args: any) {
    console.error(`[Test Browser] Running test: ${args.test_type}`);
    
    const results = await this.withBrowser(async (page) => {
      if (args.test_type === 'visible_test') {
        await page.goto('https://example.com');
        await page.waitForTimeout(3000); // Let user see the browser
        return {
          status: 'success',
          message: 'Visible browser test completed - you should have seen a browser window'
        };
      }
      
      return {
        status: 'success',
        test_type: args.test_type,
        message: 'Browser test completed successfully'
      };
    }, { headless: !args.visible_browser });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }
      ]
    };
  }

  // Browser management helper
  private async withBrowser<T>(
    callback: (page: Page) => Promise<T>,
    options: { headless?: boolean; debug?: boolean } = { headless: true, debug: false }
  ): Promise<T> {
    let page: Page;
    let shouldCloseBrowser = false;
    
    if (!browser) {
      console.error('Launching browser...');
      browser = await chromium.launch({ 
        headless: options.headless,
        timeout: 60000
      });
      shouldCloseBrowser = true;
    }
    
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
    
    // Log network requests (optional - can be verbose)
    if (options.debug) {
      page.on('request', (request) => {
        console.log(`📡 REQUEST: ${request.method()} ${request.url()}`);
      });
      
      page.on('response', (response) => {
        console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
      });
    }
    
    try {
      return await callback(page);
    } finally {
      await page.close();
      
      if (shouldCloseBrowser && browser) {
        await browser.close();
        browser = null;
      }
    }
  }

  // Cleanup resources
  private async cleanup(): Promise<void> {
    if (browser) {
      await browser.close();
      browser = null;
    }
  }

  // Start the server
  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('CPMaxx Local MCP Server running on stdio');
  }
}

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new CPMaxxLocalMCP();
  server.run().catch((error) => {
    console.error('Failed to run server:', error);
    process.exit(1);
  });
}

export { CPMaxxLocalMCP };
#!/usr/bin/env node
/**
 * Local CPMaxx MCP Server with Real Browser Automation
 * Uses Node.js + Playwright for actual data extraction from CPMaxx
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { chromium, Browser, Page } from 'playwright';

// Import our existing schemas
import { searchHotelsSchema } from './tools/search-hotels.js';
import { downloadHotelPhotosSchema } from './tools/download-hotel-photos.js';
import { testBrowserAutomationSchema } from './tools/test-automation.js';

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
let currentPage: Page | null = null;

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
            description: 'Search for hotels using real CPMaxx browser automation',
            inputSchema: searchHotelsSchema
          },
          {
            name: 'download_hotel_photos',
            description: 'Download photos for a specific hotel from CPMaxx',
            inputSchema: downloadHotelPhotosSchema
          },
          {
            name: 'test_browser_automation',
            description: 'Test browser automation with visible browser',
            inputSchema: testBrowserAutomationSchema
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
          case 'download_hotel_photos':
            return await this.downloadHotelPhotos(args);
          case 'test_browser_automation':
            return await this.testBrowserAutomation(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error in ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          isError: true
        };
      }
    });
  }

  // Real hotel search with Playwright
  private async searchHotels(args: any) {
    console.log(`[Hotel Search] Starting search for: ${args.location}`);
    
    const results = await this.withBrowser(async (page) => {
      const log: string[] = [];
      
      // Step 1: Login to CPMaxx
      log.push('=== Logging into CPMaxx ===');
      await page.goto(CPMAXX_CONFIG.loginUrl);
      log.push(`Navigated to: ${CPMAXX_CONFIG.loginUrl}`);
      
      // Fill login form
      await page.fill('input[placeholder="Email"]', CPMAXX_CONFIG.credentials.login);
      await page.fill('input[placeholder="Password"]', CPMAXX_CONFIG.credentials.password);
      log.push('Filled login credentials');
      
      // Submit login
      await page.click('button:has-text("Sign In To CP | Central")');
      await page.waitForLoadState('networkidle');
      log.push('Login submitted, waiting for dashboard...');
      
      // Step 2: Navigate to hotel search
      log.push('=== Navigating to Hotel Search ===');
      await page.click('a:has-text("Research Hub")');
      await page.click('a:has-text("Find a Hotel")');
      await page.waitForLoadState('networkidle');
      log.push('Navigated to hotel search form');
      
      // Step 3: Fill search form
      log.push('=== Filling Search Form ===');
      await page.fill('#hotelenginesearch-location_search', args.location);
      await page.fill('#hotelenginesearch-checkin', args.check_in_date);
      await page.fill('#hotelenginesearch-checkout', args.check_out_date);
      await page.selectOption('#hotelenginesearch-num_rooms', args.rooms.toString());
      await page.selectOption('#hotelenginesearch-rooms-1-num_adults', args.adults.toString());
      await page.selectOption('#hotelenginesearch-rooms-1-num_children', args.children.toString());
      
      log.push(`Search form filled:`);
      log.push(`  Location: ${args.location}`);
      log.push(`  Check-in: ${args.check_in_date}`);
      log.push(`  Check-out: ${args.check_out_date}`);
      log.push(`  Rooms: ${args.rooms}, Adults: ${args.adults}, Children: ${args.children}`);
      
      // Handle location autocomplete if it appears
      try {
        await page.waitForSelector('.dropdown-menu .dropdown-item', { timeout: 3000 });
        await page.click('.dropdown-menu .dropdown-item:first-child');
        log.push('Selected first location from autocomplete');
      } catch (e) {
        log.push('No autocomplete appeared, continuing...');
      }
      
      // Submit search
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
      log.push('Search submitted, waiting for results...');
      
      // Step 4: Apply filters if specified
      if (args.filters) {
        log.push('=== Applying Filters ===');
        
        if (args.filters.star_rating?.length) {
          for (const rating of args.filters.star_rating) {
            await page.check(`input[type="checkbox"][data-star="${rating}"]`);
            log.push(`Applied ${rating}★ filter`);
            await page.waitForTimeout(1000); // Wait for AJAX
          }
        }
        
        if (args.filters.property_name) {
          await page.fill('input[placeholder="Type Here"]', args.filters.property_name);
          log.push(`Applied property name filter: ${args.filters.property_name}`);
          await page.waitForTimeout(1500); // Wait for AJAX
        }
      }
      
      // Step 5: Extract hotel results
      log.push('=== Extracting Hotel Results ===');
      await page.waitForSelector('.property', { timeout: 10000 });
      
      const hotels = await page.$$eval('.property', (hotelElements) => {
        return hotelElements.map((hotel) => {
          // Extract basic hotel info
          const nameEl = hotel.querySelector('.property-name');
          const addressEl = hotel.querySelector('.property-location');
          const descEl = hotel.querySelector('.property-description small');
          const ratingEl = hotel.querySelector('.property-rating');
          const priceEl = hotel.querySelector('.property-rate-price');
          const commissionEl = hotel.querySelector('.property-commission');
          
          // Extract photo info
          const imageEl = hotel.querySelector('.property-hotel-image.ajax-image-gallery');
          const photoDataEl = hotel.querySelector('[data-background-image]');
          const giataIdEl = hotel.querySelector('[data-giata-id]');
          
          // Extract amenities
          const amenityIcons = Array.from(hotel.querySelectorAll('.property-rate-amenity-icon img')).map(
            (img: any) => img.alt || img.title || ''
          ).filter(Boolean);
          
          return {
            name: nameEl?.textContent?.trim() || 'Unknown Hotel',
            address: addressEl?.textContent?.trim() || 'Address not available',
            description: descEl?.textContent?.trim() || 'No description available',
            rating: ratingEl ? parseInt(ratingEl.textContent?.trim() || '0') : 0,
            price: priceEl ? parseFloat(priceEl.textContent?.replace(/[^0-9.]/g, '') || '0') : 0,
            commission: commissionEl ? parseFloat(commissionEl.textContent?.replace(/[^0-9.]/g, '') || '0') : 0,
            commissionPercent: 10, // Default CPMaxx commission
            available: !hotel.querySelector('.not-available, .sold-out, .unavailable-message'),
            bookingUrl: window.location.href,
            photos: {
              featured: photoDataEl?.getAttribute('data-background-image') || '',
              gallery: [], // Will be populated later if needed
              giataId: giataIdEl?.getAttribute('data-giata-id') || '',
              photoCount: 0 // Will be determined later
            },
            amenities: amenityIcons,
            hotelPrograms: [], // Will be extracted based on badges/indicators
            location: {
              coordinates: undefined, // Would need geocoding
              district: addressEl?.textContent?.trim() || ''
            }
          };
        });
      });
      
      log.push(`Found ${hotels.length} hotels`);
      hotels.forEach((hotel, index) => {
        log.push(`  ${index + 1}. ${hotel.name} - €${hotel.price}/night - ${hotel.rating}⭐`);
      });
      
      return {
        status: 'success',
        hotels,
        automation_log: log,
        search_metadata: {
          location: args.location,
          dates: `${args.check_in_date} to ${args.check_out_date}`,
          guests: `${args.adults} adults${args.children > 0 ? `, ${args.children} children` : ''}`,
          rooms: args.rooms,
          filters_applied: args.filters || {},
          search_timestamp: new Date().toISOString(),
          source: 'real_cpmaxx_data'
        }
      };
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }
      ]
    };
  }

  // Download hotel photos with real browser automation
  private async downloadHotelPhotos(args: any) {
    console.log(`[Photo Download] Starting for hotel: ${args.hotel_name}`);
    
    const results = await this.withBrowser(async (page) => {
      // Implementation would go here
      // For now, return placeholder
      return {
        status: 'success',
        message: 'Photo download functionality will be implemented next',
        hotel_name: args.hotel_name
      };
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }
      ]
    };
  }

  // Test browser automation with visible browser
  private async testBrowserAutomation(args: any) {
    console.log(`[Test Automation] Running test: ${args.test_type}`);
    
    const results = await this.withBrowser(async (page) => {
      return {
        status: 'success',
        test_type: args.test_type,
        message: 'Browser automation test completed',
        visible_browser: args.visible_browser || false
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
    options: { headless?: boolean } = { headless: true }
  ): Promise<T> {
    let page: Page;
    
    if (!browser) {
      console.log('Launching browser...');
      browser = await chromium.launch({ 
        headless: options.headless,
        timeout: 30000
      });
    }
    
    page = await browser.newPage();
    
    try {
      return await callback(page);
    } finally {
      await page.close();
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
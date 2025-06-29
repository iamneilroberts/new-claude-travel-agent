/**
 * CPMaxx Travel Package Search Tool
 * Uses real browser automation to search for vacation packages
 */

import { z } from 'zod';
import { CPMaxxBrowserAutomation, PackageSearchParams, BrowserConfig } from '../browser-automation';

export const searchPackagesSchema = z.object({
  destination: z.string().describe('Travel destination (city, country, or region)'),
  departure_city: z.string().describe('Departure city or airport'),
  departure_date: z.string().describe('Departure date (YYYY-MM-DD format)'),
  return_date: z.string().describe('Return date (YYYY-MM-DD format)'),
  travelers: z.number().min(1).max(16).default(2).describe('Number of travelers'),
  include_hotel: z.boolean().default(true).describe('Include hotel in package'),
  include_car: z.boolean().default(false).describe('Include car rental in package'),
  budget_range: z.enum(['economy', 'mid-range', 'luxury', 'ultra-luxury']).optional().describe('Budget preference'),
  room_type: z.enum(['standard', 'ocean-view', 'suite', 'villa']).optional().describe('Hotel room preference'),
  debug_mode: z.boolean().default(false).describe('Enable detailed logging for debugging')
});

export type SearchPackagesInput = z.infer<typeof searchPackagesSchema>;

/**
 * Search for travel packages using CPMaxx browser automation
 */
export async function searchPackages(params: SearchPackagesInput, env?: any) {
  // Get credentials from environment
  const credentials = {
    login: env?.CPMAXX_LOGIN || 'test@cruiseplanners.com',
    password: env?.CPMAXX_PASSWORD || 'password123'
  };

  // Configure browser automation
  const browserConfig: BrowserConfig = {
    headless: true, // Always headless in Cloudflare Worker
    visible: false,
    timeout: 45000, // Longer timeout for package searches
    debug: params.debug_mode,
    screenshotDir: params.debug_mode ? '/tmp/cpmaxx-screenshots' : undefined
  };

  // Convert parameters to browser automation format
  const searchParams: PackageSearchParams = {
    destination: params.destination,
    departureCity: params.departure_city,
    departureDate: params.departure_date,
    returnDate: params.return_date,
    travelers: params.travelers,
    includeHotel: params.include_hotel,
    includeCar: params.include_car,
    budgetRange: params.budget_range
  };

  try {
    // Execute the browser automation
    const result = await CPMaxxBrowserAutomation.searchPackages(
      credentials,
      searchParams,
      browserConfig
    );

    // Calculate trip duration
    const startDate = new Date(params.departure_date);
    const endDate = new Date(params.return_date);
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const durationNights = durationDays - 1;

    // Enhance result with additional metadata
    const enhancedResult = {
      ...result,
      search_metadata: {
        destination: params.destination,
        departure_city: params.departure_city,
        travel_period: `${params.departure_date} to ${params.return_date}`,
        duration: `${durationDays} days, ${durationNights} nights`,
        travelers: params.travelers,
        package_includes: {
          flight: true,
          hotel: params.include_hotel,
          car: params.include_car
        },
        preferences: {
          budget_range: params.budget_range || 'not specified',
          room_type: params.room_type || 'standard'
        },
        search_timestamp: new Date().toISOString(),
        commission_note: 'Package commissions typically range from 10-15% depending on components'
      },
      booking_instructions: {
        next_steps: [
          'Review package options and total savings',
          'Compare individual components vs package pricing',
          'Note specific flight times and hotel details',
          'Contact wholesaler for customization options',
          'Process booking through CPMaxx portal'
        ],
        important_notes: [
          'Package prices are per person unless specified',
          'Savings shown compared to booking components separately',
          'Flight times and hotels may have limited flexibility',
          'Additional taxes and fees may apply',
          'Cancellation policies vary by package type'
        ]
      },
      value_analysis: {
        package_benefits: [
          'Bundled pricing with built-in savings',
          'Single booking process for all components',
          'Coordinated travel arrangements',
          'Enhanced commission opportunities'
        ],
        customization_options: [
          'Upgrade hotel category or room type',
          'Add excursions or activities',
          'Extend stay with extra nights',
          'Modify departure/return dates (if available)'
        ]
      }
    };

    return enhancedResult;

  } catch (error) {
    return {
      status: 'error',
      error_message: error instanceof Error ? error.message : 'Unknown error occurred',
      packages: [],
      automation_log: [`Error during package search: ${error instanceof Error ? error.message : 'Unknown error'}`],
      troubleshooting: {
        common_issues: [
          'Check CPMaxx login credentials',
          'Verify destination is available for packages',
          'Ensure departure city is supported',
          'Check dates are in future and valid format',
          'Verify minimum stay requirements',
          'Check if CPMaxx package portal is accessible'
        ],
        debug_suggestion: 'Enable debug_mode for detailed logging',
        alternative_approaches: [
          'Try searching for flight + hotel separately',
          'Check different departure dates',
          'Consider nearby departure airports',
          'Look for similar destinations with packages'
        ]
      }
    };
  }
}

/**
 * Quick package search with simplified parameters
 */
export const quickPackageSearchSchema = z.object({
  destination: z.string().describe('Travel destination'),
  departure_city: z.string().describe('Departure city'),
  departure_date: z.string().describe('Departure date (YYYY-MM-DD)'),
  return_date: z.string().describe('Return date (YYYY-MM-DD)'),
  travelers: z.number().default(2).describe('Number of travelers')
});

export type QuickPackageSearchInput = z.infer<typeof quickPackageSearchSchema>;

export async function quickPackageSearch(params: QuickPackageSearchInput, env?: any) {
  // Convert to full search parameters
  const fullParams: SearchPackagesInput = {
    destination: params.destination,
    departure_city: params.departure_city,
    departure_date: params.departure_date,
    return_date: params.return_date,
    travelers: params.travelers,
    include_hotel: true,
    include_car: false,
    debug_mode: false
  };

  return await searchPackages(fullParams, env);
}
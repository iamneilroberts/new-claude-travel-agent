/**
 * CPMaxx Car Rental Search Tool
 * Uses real browser automation to search for car rentals
 */

import { z } from 'zod';
import { CPMaxxBrowserAutomation, CarSearchParams, BrowserConfig } from '../browser-automation';

export const searchCarsSchema = z.object({
  pickup_location: z.string().describe('Car pickup location (airport, city, or address)'),
  dropoff_location: z.string().describe('Car dropoff location (can be same as pickup)'),
  pickup_date: z.string().describe('Pickup date (YYYY-MM-DD format)'),
  dropoff_date: z.string().describe('Dropoff date (YYYY-MM-DD format)'),
  pickup_time: z.string().default('10:00').describe('Pickup time (HH:MM format)'),
  dropoff_time: z.string().default('10:00').describe('Dropoff time (HH:MM format)'),
  car_type: z.enum(['economy', 'compact', 'intermediate', 'standard', 'full-size', 'premium', 'luxury', 'suv', 'minivan']).optional().describe('Preferred car type'),
  driver_age: z.number().min(18).max(99).default(30).describe('Driver age (affects pricing and availability)'),
  debug_mode: z.boolean().default(false).describe('Enable detailed logging for debugging')
});

export type SearchCarsInput = z.infer<typeof searchCarsSchema>;

/**
 * Search for car rentals using CPMaxx browser automation
 */
export async function searchCars(params: SearchCarsInput, env?: any) {
  // Get credentials from environment
  const credentials = {
    login: env?.CPMAXX_LOGIN || 'test@cruiseplanners.com',
    password: env?.CPMAXX_PASSWORD || 'password123'
  };

  // Configure browser automation
  const browserConfig: BrowserConfig = {
    headless: true, // Always headless in Cloudflare Worker
    visible: false,
    timeout: 30000,
    debug: params.debug_mode,
    screenshotDir: params.debug_mode ? '/tmp/cpmaxx-screenshots' : undefined
  };

  // Convert parameters to browser automation format
  const searchParams: CarSearchParams = {
    pickupLocation: params.pickup_location,
    dropoffLocation: params.dropoff_location,
    pickupDate: params.pickup_date,
    dropoffDate: params.dropoff_date,
    pickupTime: params.pickup_time,
    dropoffTime: params.dropoff_time,
    carType: params.car_type,
    driverAge: params.driver_age
  };

  try {
    // Execute the browser automation
    const result = await CPMaxxBrowserAutomation.searchCars(
      credentials,
      searchParams,
      browserConfig
    );

    // Calculate rental duration
    const startDate = new Date(params.pickup_date);
    const endDate = new Date(params.dropoff_date);
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Enhance result with additional metadata
    const enhancedResult = {
      ...result,
      search_metadata: {
        pickup_location: params.pickup_location,
        dropoff_location: params.dropoff_location,
        rental_period: `${params.pickup_date} ${params.pickup_time} to ${params.dropoff_date} ${params.dropoff_time}`,
        duration_days: durationDays,
        driver_age: params.driver_age,
        preferred_car_type: params.car_type || 'any',
        search_timestamp: new Date().toISOString(),
        commission_note: 'Car rental commissions vary by supplier and booking value'
      },
      booking_instructions: {
        next_steps: [
          'Review car rental options and pricing',
          'Compare daily rates vs total costs',
          'Note insurance and additional fee details',
          'Process booking through CPMaxx portal'
        ],
        important_notes: [
          'Prices exclude taxes, fees, and optional extras',
          'Driver age affects availability and pricing',
          'Verify pickup/dropoff location details',
          'Check cancellation and modification policies'
        ]
      },
      pricing_breakdown: {
        duration: `${durationDays} days`,
        note: 'Total costs include base rental, taxes may apply at pickup',
        commission_structure: 'Varies by car rental agency (typically 8-12%)'
      }
    };

    return enhancedResult;

  } catch (error) {
    return {
      status: 'error',
      error_message: error instanceof Error ? error.message : 'Unknown error occurred',
      cars: [],
      automation_log: [`Error during car rental search: ${error instanceof Error ? error.message : 'Unknown error'}`],
      troubleshooting: {
        common_issues: [
          'Check CPMaxx login credentials',
          'Verify pickup/dropoff locations are supported',
          'Ensure dates are in future and valid format',
          'Check driver age restrictions for location',
          'Verify CPMaxx car rental portal is accessible'
        ],
        debug_suggestion: 'Enable debug_mode for detailed logging'
      }
    };
  }
}

/**
 * Quick car rental search with simplified parameters
 */
export const quickCarSearchSchema = z.object({
  location: z.string().describe('Pickup/dropoff location (same location)'),
  pickup_date: z.string().describe('Pickup date (YYYY-MM-DD)'),
  dropoff_date: z.string().describe('Dropoff date (YYYY-MM-DD)'),
  car_type: z.string().optional().describe('Preferred car type')
});

export type QuickCarSearchInput = z.infer<typeof quickCarSearchSchema>;

export async function quickCarSearch(params: QuickCarSearchInput, env?: any) {
  // Convert to full search parameters
  const fullParams: SearchCarsInput = {
    pickup_location: params.location,
    dropoff_location: params.location,
    pickup_date: params.pickup_date,
    dropoff_date: params.dropoff_date,
    pickup_time: '10:00',
    dropoff_time: '10:00',
    car_type: params.car_type as any,
    driver_age: 30,
    debug_mode: false
  };

  return await searchCars(fullParams, env);
}
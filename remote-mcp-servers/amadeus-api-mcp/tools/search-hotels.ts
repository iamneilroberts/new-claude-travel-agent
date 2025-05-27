import { z } from 'zod';
import { searchHotels } from '../services/hotel-service';
import { Env } from '../index';

const hotelSearchSchema = z.object({
  city: z.string().describe("City name (e.g., 'Paris' or 'Mobile AL')"),
  check_in: z.string().describe('Check-in date in YYYY-MM-DD format'),
  check_out: z.string().describe('Check-out date in YYYY-MM-DD format'),
  adults: z.number().optional().describe('Number of adult guests (default: 1)'),
  radius: z.number().optional().describe('Search radius in kilometers (default: 5)'),
  ratings: z.string().optional().describe('Comma-separated list of star ratings to filter by (e.g., "3,4,5")'),
  priceRange: z.string().optional().describe('Price range filter')
});

export const searchHotelsTool = {
  name: 'search_hotels',
  description: 'Searches for hotels in a specific location using the Amadeus API.',
  schema: {
    type: 'object',
    properties: {
      city: { type: 'string', description: 'City name' },
      check_in: { type: 'string', description: 'Check-in date in YYYY-MM-DD format' },
      check_out: { type: 'string', description: 'Check-out date in YYYY-MM-DD format' },
      adults: { type: 'number', description: 'Number of adult guests', default: 1 },
      radius: { type: 'number', description: 'Search radius in kilometers', default: 5 },
      ratings: { type: 'string', description: 'Star ratings filter' },
      priceRange: { type: 'string', description: 'Price range filter' }
    },
    required: ['city', 'check_in', 'check_out']
  },
  execute: async (params: any, env: Env) => {
    try {
      const validated = hotelSearchSchema.parse(params);
      const result = await searchHotels(validated, env);

      return {
        content: [{
          type: 'text',
          text: result
        }]
      };
    } catch (error: any) {
      console.error('Error in search_hotels tool:', error);

      return {
        content: [{
          type: 'text',
          text: `Error searching hotels: ${error.message}`
        }],
        isError: true
      };
    }
  }
};

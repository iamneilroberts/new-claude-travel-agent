import { z } from 'zod';
import { Env } from '../index';

const hotelsByCitySchema = z.object({
  cityCode: z.string().describe('City IATA code (e.g., "PAR" for Paris)'),
  radius: z.number().optional().describe('Search radius'),
  radiusUnit: z.enum(['KM', 'MILE']).optional().describe('Unit for radius'),
  ratings: z.string().optional().describe('Comma-separated list of star ratings'),
  amenities: z.string().optional().describe('Comma-separated list of amenities')
});

export const searchHotelsByCityTool = {
  name: 'search_hotels_by_city',
  description: 'Searches for hotels in a specific city using the Amadeus API.',
  schema: {
    type: 'object',
    properties: {
      cityCode: { type: 'string' },
      radius: { type: 'number', default: 5 },
      radiusUnit: { type: 'string', enum: ['KM', 'MILE'], default: 'KM' },
      ratings: { type: 'string' },
      amenities: { type: 'string' }
    },
    required: ['cityCode']
  },
  execute: async (params: any, env: Env) => {
    try {
      const validated = hotelsByCitySchema.parse(params);

      // Placeholder for now
      return {
        content: [{
          type: 'text',
          text: `Hotels by city search feature coming soon for ${validated.cityCode}`
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error searching hotels by city: ${error.message}`
        }],
        isError: true
      };
    }
  }
};

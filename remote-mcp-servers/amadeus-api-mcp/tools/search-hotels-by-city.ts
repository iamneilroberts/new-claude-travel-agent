import { z } from 'zod';
import { Env } from '../index';
import { getAmadeusClient } from '../services/amadeus-client';

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
      const amadeus = await getAmadeusClient(env);

      // Search for hotels by city code
      const hotelListResponse = await amadeus.get('/v1/reference-data/locations/hotels/by-city', {
        cityCode: validated.cityCode,
        radius: validated.radius || 5,
        radiusUnit: validated.radiusUnit || 'KM'
      });

      if (!hotelListResponse.data || hotelListResponse.data.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `No hotels found in city ${validated.cityCode}`
          }]
        };
      }

      // Format the results
      const hotels = hotelListResponse.data.slice(0, 10).map((hotel: any, index: number) => {
        const name = hotel.name || 'Unknown Hotel';
        const address = hotel.address
          ? `${hotel.address.lines?.join(', ') || ''}, ${hotel.address.cityName || ''}`
          : 'Location not available';

        return `${index + 1}. ${name}\n   ${address}`;
      });

      return {
        content: [{
          type: 'text',
          text: `Found ${hotels.length} hotels in ${validated.cityCode}:\n\n${hotels.join('\n\n')}`
        }]
      };
    } catch (error: any) {
      console.error('Error searching hotels by city:', error);
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

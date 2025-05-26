import { searchHotels } from '../services/hotel-service.js';

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
  execute: async (params, env) => {
    try {
      const result = await searchHotels(params, env);
      
      return {
        content: [{
          type: 'text',
          text: result
        }]
      };
    } catch (error) {
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
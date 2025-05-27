import { searchPOI } from '../services/poi-service.js';

export const searchPOITool = {
  name: 'search_poi',
  description: 'Searches for points of interest in a location using the Amadeus API.',
  schema: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'City or location name' },
      category: { type: 'string', description: 'Category of POI' },
      radius: { type: 'number', description: 'Search radius in kilometers', default: 5 }
    },
    required: ['location']
  },
  execute: async (params, env) => {
    try {
      const result = await searchPOI(params, env);

      return {
        content: [{
          type: 'text',
          text: result
        }]
      };
    } catch (error) {
      console.error('Error in search_poi tool:', error);

      return {
        content: [{
          type: 'text',
          text: `Error searching POIs: ${error.message}`
        }],
        isError: true
      };
    }
  }
};

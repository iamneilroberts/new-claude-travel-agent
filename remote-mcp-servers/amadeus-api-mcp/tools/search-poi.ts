import { z } from 'zod';
import { searchPOI } from '../services/poi-service';
import { Env } from '../index';

const poiSearchSchema = z.object({
  location: z.string().describe("City or location name (e.g., 'London')"),
  category: z.string().optional().describe("Category of POI (e.g., 'restaurant', 'attraction', 'shopping', 'nightlife')"),
  radius: z.number().optional().describe('Search radius in kilometers (default: 5)')
});

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
  execute: async (params: any, env: Env) => {
    try {
      const validated = poiSearchSchema.parse(params);
      const result = await searchPOI(validated, env);

      return {
        content: [{
          type: 'text',
          text: result
        }]
      };
    } catch (error: any) {
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

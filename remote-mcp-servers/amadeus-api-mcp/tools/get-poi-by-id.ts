import { z } from 'zod';
import { getAmadeusClient } from '../services/amadeus-client';

interface Env {
  AMADEUS_API_KEY: string;
  AMADEUS_API_SECRET: string;
  CACHE: any;
}

const poiByIdSchema = z.object({
  poiId: z.string().describe('Point of Interest ID (e.g., "AF57D529B2")')
});

export const getPOIByIdTool = {
  name: 'get_poi_by_id',
  description: 'Retrieves detailed information about a specific point of interest using its unique ID from the Amadeus Points of Interest API.',
  schema: {
    type: 'object',
    properties: {
      poiId: { 
        type: 'string',
        description: 'Point of Interest ID (e.g., "AF57D529B2")' 
      }
    },
    required: ['poiId']
  },
  execute: async (params: any, env: Env) => {
    try {
      const validated = poiByIdSchema.parse(params);
      
      const amadeus = await getAmadeusClient(env);
      const response = await amadeus.get(`/v1/reference-data/locations/pois/${validated.poiId}`);

      if (!response.data) {
        return {
          content: [{
            type: 'text',
            text: `Point of interest with ID "${validated.poiId}" not found.`
          }]
        };
      }

      const poi = response.data;
      
      // Format the detailed response
      let result = `## Point of Interest Details\n\n`;
      result += `### ${poi.name || 'Unknown POI'}\n\n`;
      result += `**ID:** ${poi.id || 'N/A'}\n`;
      result += `**Type:** ${poi.type || 'N/A'}\n`;
      result += `**SubType:** ${poi.subType || 'N/A'}\n`;
      result += `**Category:** ${poi.category || 'General'}\n`;
      result += `**Rank:** ${poi.rank || 'N/A'} (1 = most popular)\n`;
      
      if (poi.geoCode) {
        result += `**Location:** ${poi.geoCode.latitude}, ${poi.geoCode.longitude}\n`;
      }
      
      if (poi.tags && poi.tags.length > 0) {
        result += `**Tags:** ${poi.tags.join(', ')}\n`;
      }
      
      if (poi.self && poi.self.href) {
        result += `**API URL:** ${poi.self.href}\n`;
      }
      
      result += '\n💡 **Categories:** SIGHTS, BEACH_PARK, HISTORICAL, NIGHTLIFE, RESTAURANT, SHOPPING\n';
      result += '📍 **Note:** This POI can be used for further searches or recommendations';

      return {
        content: [{
          type: 'text',
          text: result
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error retrieving point of interest: ${error.message}`
        }],
        isError: true
      };
    }
  }
};
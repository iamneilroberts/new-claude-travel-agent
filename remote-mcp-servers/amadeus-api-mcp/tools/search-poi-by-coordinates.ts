import { z } from 'zod';
import { getAmadeusClient } from '../services/amadeus-client';

interface Env {
  AMADEUS_API_KEY: string;
  AMADEUS_API_SECRET: string;
  CACHE: any;
}

const poiCoordinatesSchema = z.object({
  latitude: z.number().describe('Latitude coordinate'),
  longitude: z.number().describe('Longitude coordinate'),
  radius: z.number().optional().describe('Search radius in kilometers (default: 1)')
});

export const searchPOIByCoordinatesTool = {
  name: 'search_poi_by_coordinates',
  description: 'Searches for points of interest (sights, restaurants, shops) near specific coordinates using the Amadeus Points of Interest API. Returns ranked POIs with categories and tags.',
  schema: {
    type: 'object',
    properties: {
      latitude: {
        type: 'number',
        description: 'Latitude coordinate'
      },
      longitude: {
        type: 'number',
        description: 'Longitude coordinate'
      },
      radius: {
        type: 'number',
        default: 1,
        description: 'Search radius in kilometers (default: 1)'
      }
    },
    required: ['latitude', 'longitude']
  },
  execute: async (params: any, env: Env) => {
    try {
      const validated = poiCoordinatesSchema.parse(params);

      const amadeus = await getAmadeusClient(env);
      const response = await amadeus.get('/v1/reference-data/locations/pois', {
        latitude: validated.latitude,
        longitude: validated.longitude,
        radius: validated.radius || 1
      });

      if (!response.data || response.data.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `No points of interest found within ${validated.radius || 1}km of coordinates (${validated.latitude}, ${validated.longitude}). Try expanding the search radius.`
          }]
        };
      }

      // Format the response for better readability
      let result = `## Points of Interest Near (${validated.latitude}, ${validated.longitude})\n\n`;

      response.data.slice(0, 15).forEach((poi: any, index: number) => {
        result += `### ${index + 1}. ${poi.name}\n`;
        result += `**Category:** ${poi.category || 'General'}\n`;
        result += `**Rank:** ${poi.rank || 'N/A'} (1 = most popular)\n`;
        result += `**Location:** ${poi.geoCode?.latitude || 'N/A'}, ${poi.geoCode?.longitude || 'N/A'}\n`;

        if (poi.tags && poi.tags.length > 0) {
          result += `**Tags:** ${poi.tags.slice(0, 8).join(', ')}\n`;
        }

        if (poi.id) {
          result += `**ID:** ${poi.id}\n`;
        }

        result += '\n---\n\n';
      });

      const total = response.data.length;
      if (total > 15) {
        result += `*Showing first 15 of ${total} points of interest found.*\n\n`;
      }

      result += '💡 **Categories:** SIGHTS, BEACH_PARK, HISTORICAL, NIGHTLIFE, RESTAURANT, SHOPPING\n';
      result += '📍 **Note:** Results are ranked by popularity (rank 1 = most famous/popular)';

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
          text: `Error searching points of interest: ${error.message}`
        }],
        isError: true
      };
    }
  }
};

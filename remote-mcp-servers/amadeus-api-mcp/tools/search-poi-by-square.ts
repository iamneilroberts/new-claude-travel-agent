import { z } from 'zod';
import { getAmadeusClient } from '../services/amadeus-client';

interface Env {
  AMADEUS_API_KEY: string;
  AMADEUS_API_SECRET: string;
  CACHE: any;
}

const poiSquareSchema = z.object({
  north: z.number().describe('North boundary latitude'),
  west: z.number().describe('West boundary longitude'),
  south: z.number().describe('South boundary latitude'),
  east: z.number().describe('East boundary longitude')
});

export const searchPOIBySquareTool = {
  name: 'search_poi_by_square',
  description: 'Searches for points of interest (sights, restaurants, shops) within a square area defined by north, west, south, and east coordinates using the Amadeus Points of Interest API.',
  schema: {
    type: 'object',
    properties: {
      north: {
        type: 'number',
        description: 'North boundary latitude'
      },
      west: {
        type: 'number',
        description: 'West boundary longitude'
      },
      south: {
        type: 'number',
        description: 'South boundary latitude'
      },
      east: {
        type: 'number',
        description: 'East boundary longitude'
      }
    },
    required: ['north', 'west', 'south', 'east']
  },
  execute: async (params: any, env: Env) => {
    try {
      const validated = poiSquareSchema.parse(params);

      // Validate that coordinates make sense
      if (validated.north <= validated.south) {
        return {
          content: [{
            type: 'text',
            text: 'Error: North latitude must be greater than south latitude.'
          }],
          isError: true
        };
      }

      if (validated.east <= validated.west) {
        return {
          content: [{
            type: 'text',
            text: 'Error: East longitude must be greater than west longitude.'
          }],
          isError: true
        };
      }

      const amadeus = await getAmadeusClient(env);
      const response = await amadeus.get('/v1/reference-data/locations/pois/by-square', {
        north: validated.north,
        west: validated.west,
        south: validated.south,
        east: validated.east
      });

      if (!response.data || response.data.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `No points of interest found in the specified area (N:${validated.north}, W:${validated.west}, S:${validated.south}, E:${validated.east}). Try expanding the search area.`
          }]
        };
      }

      // Format the response for better readability
      let result = `## Points of Interest in Area\n`;
      result += `**Boundaries:** N:${validated.north}, W:${validated.west}, S:${validated.south}, E:${validated.east}\n\n`;

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
          text: `Error searching points of interest by square: ${error.message}`
        }],
        isError: true
      };
    }
  }
};

import { z } from 'zod';
import { Env } from '../index';

const transferSearchSchema = z.object({
  startType: z.enum(['AIRPORT', 'COORDINATES']).describe('Type of start point'),
  endType: z.enum(['AIRPORT', 'COORDINATES']).describe('Type of end point'),
  transferDate: z.string().describe('Transfer date and time in ISO format'),
  startIataCode: z.string().optional().describe('For airport start: IATA code'),
  startLatitude: z.number().optional().describe('For coordinate start: latitude'),
  startLongitude: z.number().optional().describe('For coordinate start: longitude'),
  endIataCode: z.string().optional().describe('For airport end: IATA code'),
  endLatitude: z.number().optional().describe('For coordinate end: latitude'),
  endLongitude: z.number().optional().describe('For coordinate end: longitude'),
  passengers: z.number().optional().describe('Number of passengers')
});

export const searchAirportTransfersTool = {
  name: 'search_airport_transfers',
  description: 'Searches for airport transfer options between airports and locations using the Amadeus API.',
  schema: {
    type: 'object',
    properties: {
      startType: { type: 'string', enum: ['AIRPORT', 'COORDINATES'] },
      endType: { type: 'string', enum: ['AIRPORT', 'COORDINATES'] },
      transferDate: { type: 'string' },
      startIataCode: { type: 'string' },
      startLatitude: { type: 'number' },
      startLongitude: { type: 'number' },
      endIataCode: { type: 'string' },
      endLatitude: { type: 'number' },
      endLongitude: { type: 'number' },
      passengers: { type: 'number', default: 1 }
    },
    required: ['startType', 'endType', 'transferDate']
  },
  execute: async (params: any, env: Env) => {
    try {
      const validated = transferSearchSchema.parse(params);
      
      // For the Cloudflare Worker version, we'll implement the actual API call later
      // This is a placeholder response
      return {
        content: [{
          type: 'text',
          text: `Airport transfer search feature coming soon for ${validated.transferDate}`
        }]
      };
    } catch (error: any) {
      console.error('Error in search_airport_transfers tool:', error);
      
      return {
        content: [{
          type: 'text',
          text: `Error searching transfers: ${error.message}`
        }],
        isError: true
      };
    }
  }
};
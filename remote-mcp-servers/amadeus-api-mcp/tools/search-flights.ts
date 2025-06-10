import { z } from 'zod';
import { searchFlights } from '../services/flight-service';
import { Env } from '../index';

const flightSearchSchema = z.object({
  origin: z.string().describe('Departure IATA airport code (e.g., `JFK`, `LHR`). Use D1 airport_city_lookup tool first if you have city names.'),
  destination: z.string().describe('Arrival IATA airport code (e.g., `LHR`, `JFK`). Use D1 airport_city_lookup tool first if you have city names.'),
  date: z.string().describe('Departure date in YYYY-MM-DD format'),
  adults: z.number().optional().describe('Number of adult passengers (default: 1)'),
  returnDate: z.string().optional().describe('Return date in YYYY-MM-DD format for round trips'),
  travelClass: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']).optional()
    .describe('Preferred travel class (ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST)')
});

export const searchFlightsTool = {
  name: 'search_flights',
  description: 'Searches for flight options between locations on specific dates using the Amadeus API. CRITICAL REQUIREMENT: This tool ONLY accepts IATA airport codes (e.g., "DEN", "MOB", "JFK"). If the user provides city names (e.g., "Mobile, AL", "Denver, CO"), you MUST FIRST use the D1 Database MCP server airport_city_lookup tool to get the correct IATA codes, then use those codes with this flight search tool. Do NOT attempt to search flights with city names - this will fail.',
  schema: {
    type: 'object',
    properties: {
      origin: { type: 'string', description: 'Departure IATA airport code (3-letter code like DEN, MOB). REQUIRED: Must be exact IATA code, not city name. Use D1 Database MCP airport_city_lookup tool first if you have city names.' },
      destination: { type: 'string', description: 'Arrival IATA airport code (3-letter code like DEN, MOB). REQUIRED: Must be exact IATA code, not city name. Use D1 Database MCP airport_city_lookup tool first if you have city names.' },
      date: { type: 'string', description: 'Departure date in YYYY-MM-DD format' },
      adults: { type: 'number', description: 'Number of adult passengers', default: 1 },
      returnDate: { type: 'string', description: 'Return date for round trips' },
      travelClass: {
        type: 'string',
        enum: ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'],
        description: 'Travel class'
      }
    },
    required: ['origin', 'destination', 'date']
  },
  execute: async (params: any, env: Env) => {
    try {
      console.log('search_flights received params:', JSON.stringify(params));
      const validated = flightSearchSchema.parse(params);
      console.log('search_flights validated params:', JSON.stringify(validated));
      const result = await searchFlights(validated, env);

      return {
        content: [{
          type: 'text',
          text: result
        }]
      };
    } catch (error: any) {
      console.error('Error in search_flights tool:', error);

      return {
        content: [{
          type: 'text',
          text: `Error searching flights: ${error.message}`
        }],
        isError: true
      };
    }
  }
};

import { z } from 'zod';
import { searchFlights } from '../services/flight-service';
import { Env } from '../index';

const flightSearchSchema = z.object({
  origin: z.string().describe('Departure IATA city/airport code (e.g., `JFK`, `LHR`)'),
  destination: z.string().describe('Arrival IATA city/airport code (e.g., `LHR`, `JFK`)'),
  date: z.string().describe('Departure date in YYYY-MM-DD format'),
  adults: z.number().optional().describe('Number of adult passengers (default: 1)'),
  returnDate: z.string().optional().describe('Return date in YYYY-MM-DD format for round trips'),
  travelClass: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']).optional()
    .describe('Preferred travel class (ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST)')
});

export const searchFlightsTool = {
  name: 'search_flights',
  description: 'Searches for flight options between locations on specific dates using the Amadeus API.',
  schema: {
    type: 'object',
    properties: {
      origin: { type: 'string', description: 'Departure IATA city/airport code' },
      destination: { type: 'string', description: 'Arrival IATA city/airport code' },
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
      const validated = flightSearchSchema.parse(params);
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
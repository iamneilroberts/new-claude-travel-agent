import { searchFlights } from '../services/flight-service.js';

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
  execute: async (params, env) => {
    try {
      const result = await searchFlights(params, env);
      
      return {
        content: [{
          type: 'text',
          text: result
        }]
      };
    } catch (error) {
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
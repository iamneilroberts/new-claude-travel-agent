import { z } from 'zod';
import { getAmadeusClient } from '../services/amadeus-client';
import { Env } from '../index';

export const testConnectionTool = {
  name: 'test_connection',
  description: 'Tests if the Amadeus API is connected and working properly.',
  schema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  },
  execute: async (_params: any, env: Env) => {
    try {
      const amadeus = await getAmadeusClient(env);
      
      // Test the connection with a simple API call
      const response = await amadeus.get('/reference-data/locations', {
        keyword: 'JFK',
        subType: 'AIRPORT'
      });
      
      if (response.data && response.data.length > 0) {
        return {
          content: [{
            type: 'text',
            text: 'Success: Amadeus API is connected and working properly'
          }]
        };
      } else {
        return {
          content: [{
            type: 'text',
            text: 'Warning: Amadeus API is connected but returned no data'
          }]
        };
      }
    } catch (error: any) {
      console.error('Test connection error:', error);
      
      let errorMessage = 'Error testing connection: ';
      
      if (error.message?.includes('Authentication failed')) {
        errorMessage += 'Authentication failed. Please check your API credentials.';
      } else {
        errorMessage += error.message || 'Unknown error';
      }
      
      return {
        content: [{
          type: 'text',
          text: errorMessage
        }],
        isError: true
      };
    }
  }
};
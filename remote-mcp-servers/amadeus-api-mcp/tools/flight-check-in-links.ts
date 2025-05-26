import { z } from 'zod';
import type { Env } from '../index';
import { getAmadeusClient } from '../services/amadeus-client';

const flightCheckInSchema = z.object({
  airlineCode: z.string().length(2).describe('2-letter IATA airline code (e.g., "AA" for American Airlines)')
});

export const flightCheckInLinksTool = {
  name: 'flight_check_in_links',
  description: 'Gets direct check-in links for a specific airline to simplify the check-in process for travelers.',
  schema: {
    type: 'object',
    properties: {
      airlineCode: { 
        type: 'string', 
        minLength: 2, 
        maxLength: 2, 
        description: '2-letter IATA airline code (e.g., "AA" for American Airlines, "DL" for Delta)' 
      }
    },
    required: ['airlineCode']
  },
  execute: async (params: any, env: Env) => {
    try {
      const validated = flightCheckInSchema.parse(params);
      const amadeus = await getAmadeusClient(env);
      
      // Call Amadeus Flight Check-in Links API
      const response = await amadeus.get(`/v2/reference-data/airlines/${validated.airlineCode}/check-in-links`);
      
      if (!response.data || response.data.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `No check-in links found for airline code ${validated.airlineCode}. Please verify the airline code is correct.`
          }]
        };
      }
      
      // Format the response
      const checkInData = response.data[0];
      const parameters = checkInData.parameters || {};
      
      let summary = `✈️ Check-in Information for ${validated.airlineCode.toUpperCase()}\n\n`;
      
      // Basic check-in URL
      if (checkInData.href) {
        summary += `🔗 Direct Check-in Link:\n${checkInData.href}\n\n`;
      }
      
      // Channel information
      if (checkInData.channel) {
        summary += `📱 Available Channels:\n`;
        checkInData.channel.forEach((channel: string) => {
          summary += `• ${channel}\n`;
        });
        summary += `\n`;
      }
      
      // Parameters needed for check-in
      if (Object.keys(parameters).length > 0) {
        summary += `📋 Required Information for Check-in:\n`;
        
        if (parameters.lastNameRequired) {
          summary += `• Last Name: Required\n`;
        }
        if (parameters.firstNameRequired) {
          summary += `• First Name: Required\n`;
        }
        if (parameters.emailRequired) {
          summary += `• Email Address: Required\n`;
        }
        if (parameters.confirmationNumberRequired) {
          summary += `• Confirmation/Reference Number: Required\n`;
        }
        if (parameters.frequentFlyerNumberRequired) {
          summary += `• Frequent Flyer Number: Required\n`;
        }
        if (parameters.phoneNumberRequired) {
          summary += `• Phone Number: Required\n`;
        }
        
        summary += `\n`;
      }
      
      // Additional notes
      summary += `💡 Tips:\n`;
      summary += `• Check-in typically opens 24 hours before departure\n`;
      summary += `• Mobile boarding passes may be available\n`;
      summary += `• Arrive at airport with sufficient time before departure\n`;
      summary += `• Some airlines offer seat selection during online check-in`;
      
      return {
        content: [{
          type: 'text',
          text: summary
        }]
      };
      
    } catch (error: any) {
      console.error('Error in flight_check_in_links:', error);
      
      // Handle specific error cases
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        return {
          content: [{
            type: 'text',
            text: `Airline code "${params.airlineCode}" not found. Please verify you're using a valid 2-letter IATA airline code (e.g., "AA", "DL", "UA").`
          }],
          isError: true
        };
      }
      
      return {
        content: [{
          type: 'text',
          text: `Error getting check-in links: ${error.message}`
        }],
        isError: true
      };
    }
  }
};
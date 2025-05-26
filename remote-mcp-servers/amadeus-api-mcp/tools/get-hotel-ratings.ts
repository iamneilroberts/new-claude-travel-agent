import { z } from 'zod';
import { getAmadeusClient } from '../services/amadeus-client';

interface Env {
  AMADEUS_API_KEY: string;
  AMADEUS_API_SECRET: string;
  CACHE: any;
}

const hotelRatingsSchema = z.object({
  hotelIds: z.string().describe('Comma-separated list of hotel IDs (e.g., "TELONMFS,ADNYCCTB")')
});

export const getHotelRatingsTool = {
  name: 'get_hotel_ratings',
  description: 'Gets ratings and sentiment analysis for specific hotels using sentiment analysis of hotel reviews. Returns overall ratings and detailed sentiment scores for categories like location, comfort, service, staff, internet, food, facilities, pool, and sleep quality.',
  schema: {
    type: 'object',
    properties: {
      hotelIds: { 
        type: 'string',
        description: 'Comma-separated list of hotel IDs (e.g., "TELONMFS,ADNYCCTB")'
      }
    },
    required: ['hotelIds']
  },
  execute: async (params: any, env: Env) => {
    try {
      const validated = hotelRatingsSchema.parse(params);
      
      const amadeus = await getAmadeusClient(env);
      const response = await amadeus.get('/v2/e-reputation/hotel-sentiments', {
        hotelIds: validated.hotelIds
      });

      if (!response.data || response.data.length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'No hotel ratings found for the specified hotel IDs.'
          }]
        };
      }

      // Format the response for better readability
      let result = '## Hotel Ratings and Sentiment Analysis\n\n';
      
      response.data.forEach((hotel: any) => {
        result += `### Hotel: ${hotel.hotelId}\n`;
        result += `- **Overall Rating**: ${hotel.overallRating}/100\n`;
        result += `- **Number of Reviews**: ${hotel.numberOfReviews}\n`;
        result += `- **Number of Ratings**: ${hotel.numberOfRatings}\n\n`;
        
        if (hotel.sentiments) {
          result += '**Detailed Sentiments:**\n';
          Object.entries(hotel.sentiments).forEach(([category, score]) => {
            const formattedCategory = category.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^./, str => str.toUpperCase());
            result += `- ${formattedCategory}: ${score}/100\n`;
          });
        }
        result += '\n';
      });

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
          text: `Error getting hotel ratings: ${error.message}`
        }],
        isError: true
      };
    }
  }
};
import { getAmadeusClient } from '../services/amadeus-client.js';

export const getHotelRatingsTool = {
  name: 'get_hotel_ratings',
  description: 'Gets ratings and sentiment analysis for specific hotels using the Amadeus API.',
  schema: {
    type: 'object',
    properties: {
      hotelIds: {
        type: 'string',
        description: 'Comma-separated list of hotel IDs (e.g., "SNCHIHAC,RCCHIRLR")'
      }
    },
    required: ['hotelIds']
  },
  execute: async (params, env) => {
    try {
      const amadeus = await getAmadeusClient(env);

      // Call the Hotel Ratings API (v2)
      const response = await amadeus.get('/v2/e-reputation/hotel-sentiments', {
        hotelIds: params.hotelIds
      });

      return {
        content: [{
          type: 'text',
          text: formatHotelRatings(response.data, params.hotelIds)
        }]
      };
    } catch (error) {
      console.error('Error getting hotel ratings:', error);

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

function formatHotelRatings(data, hotelIds) {
  if (!data || data.length === 0) {
    return `No rating data available for hotels: ${hotelIds}`;
  }

  try {
    const ratings = data.map((hotel, index) => {
      const name = hotel.hotelId || 'Unknown Hotel';
      const overall = hotel.overallRating || 'N/A';
      const reviews = hotel.numberOfReviews || 0;

      const sentiments = hotel.sentiments || {};
      const categories = Object.entries(sentiments)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ') || 'No detailed ratings available';

      return `${index + 1}. Hotel ${name}\n   Overall Rating: ${overall}/100\n   Reviews: ${reviews}\n   Categories: ${categories}`;
    });

    return `Hotel ratings and sentiment analysis:\n\n${ratings.join('\n\n')}`;
  } catch (error) {
    console.error('Error formatting hotel ratings:', error);
    return 'Error formatting hotel ratings data.';
  }
}

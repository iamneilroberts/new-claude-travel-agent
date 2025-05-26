import { getAmadeusClient } from '../services/amadeus-client.js';

export const getTravelRecommendationsTool = {
  name: 'get_travel_recommendations',
  description: 'Gets recommended travel destinations based on cities and traveler preferences using the Amadeus API.',
  schema: {
    type: 'object',
    properties: {
      cityCodes: { 
        type: 'string',
        description: 'Comma-separated IATA city codes (e.g., "PAR,LON")'
      },
      travelerCountryCode: { 
        type: 'string',
        description: 'Traveler country code (ISO 3166-1 alpha-2, e.g., "US")'
      },
      destinationCountryCodes: { 
        type: 'string',
        description: 'Comma-separated destination country codes (e.g., "US,FR")'
      }
    },
    required: ['cityCodes']
  },
  execute: async (params, env) => {
    try {
      const amadeus = await getAmadeusClient(env);
      
      // Build request parameters
      const requestParams = {
        cityCodes: params.cityCodes
      };
      
      if (params.travelerCountryCode) {
        requestParams.travelerCountryCode = params.travelerCountryCode;
      }
      
      if (params.destinationCountryCodes) {
        requestParams.destinationCountryCodes = params.destinationCountryCodes;
      }
      
      // Call the Travel Recommendations API (v1)
      const response = await amadeus.get('/v1/reference-data/recommended-locations', requestParams);
      
      return {
        content: [{
          type: 'text',
          text: formatTravelRecommendations(response.data, params.cityCodes)
        }]
      };
    } catch (error) {
      console.error('Error getting travel recommendations:', error);
      
      return {
        content: [{
          type: 'text',
          text: `Error getting travel recommendations: ${error.message}`
        }],
        isError: true
      };
    }
  }
};

function formatTravelRecommendations(data, cityCodes) {
  if (!data || data.length === 0) {
    return `No travel recommendations available for cities: ${cityCodes}`;
  }
  
  try {
    const recommendations = data.map((destination, index) => {
      const name = destination.name || 'Unknown Destination';
      const iataCode = destination.iataCode || 'N/A';
      const subType = destination.subType || 'City';
      const relevance = destination.relevance || 'N/A';
      
      const address = destination.address || {};
      const location = [address.cityName, address.countryName].filter(Boolean).join(', ') || 'Location not available';
      
      const geoCode = destination.geoCode || {};
      const coordinates = geoCode.latitude && geoCode.longitude 
        ? `${geoCode.latitude}, ${geoCode.longitude}` 
        : 'Coordinates not available';
      
      return `${index + 1}. ${name} (${iataCode})\n   Type: ${subType}\n   Location: ${location}\n   Relevance: ${relevance}\n   Coordinates: ${coordinates}`;
    });
    
    return `Travel recommendations based on cities ${cityCodes}:\n\n${recommendations.join('\n\n')}`;
  } catch (error) {
    console.error('Error formatting travel recommendations:', error);
    return 'Error formatting travel recommendations data.';
  }
}
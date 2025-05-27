import { getAmadeusClient } from '../services/amadeus-client.js';

export const searchActivitiesByCoordinatesTool = {
  name: 'search_activities_by_coordinates',
  description: 'Searches for activities and tours at a specific location using the Amadeus API.',
  schema: {
    type: 'object',
    properties: {
      latitude: {
        type: 'number',
        description: 'Latitude coordinate'
      },
      longitude: {
        type: 'number',
        description: 'Longitude coordinate'
      },
      radius: {
        type: 'number',
        default: 2,
        description: 'Search radius in kilometers'
      }
    },
    required: ['latitude', 'longitude']
  },
  execute: async (params, env) => {
    try {
      const amadeus = await getAmadeusClient(env);

      // Call the Tours and Activities API (v1)
      const response = await amadeus.get('/v1/shopping/activities', {
        latitude: params.latitude,
        longitude: params.longitude,
        radius: params.radius || 2
      });

      return {
        content: [{
          type: 'text',
          text: formatActivities(response.data, params)
        }]
      };
    } catch (error) {
      console.error('Error searching activities:', error);

      return {
        content: [{
          type: 'text',
          text: `Error searching activities: ${error.message}`
        }],
        isError: true
      };
    }
  }
};

function formatActivities(data, params) {
  if (!data || data.length === 0) {
    return `No activities found near coordinates (${params.latitude}, ${params.longitude}) within ${params.radius || 2}km radius.`;
  }

  try {
    const activities = data.slice(0, 10).map((activity, index) => {
      const name = activity.name || 'Unknown Activity';
      const shortDescription = activity.shortDescription || 'No description available';
      const price = activity.price ? `${activity.price.amount} ${activity.price.currencyCode}` : 'Price not available';
      const rating = activity.rating || 'No rating';
      const duration = activity.duration || 'Duration not specified';

      return `${index + 1}. ${name}\n   Description: ${shortDescription}\n   Price: ${price}\n   Rating: ${rating}\n   Duration: ${duration}`;
    });

    return `Found ${activities.length} activities near (${params.latitude}, ${params.longitude}):\n\n${activities.join('\n\n')}`;
  } catch (error) {
    console.error('Error formatting activities:', error);
    return 'Error formatting activities data.';
  }
}

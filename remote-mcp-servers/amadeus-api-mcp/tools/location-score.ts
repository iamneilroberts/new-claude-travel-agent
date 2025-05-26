import { z } from 'zod';
import { getAmadeusClient } from '../services/amadeus-client';

interface Env {
  AMADEUS_API_KEY: string;
  AMADEUS_API_SECRET: string;
  CACHE: any;
}

const inputSchema = z.object({
  latitude: z.number().describe('Latitude of the location'),
  longitude: z.number().describe('Longitude of the location'),
  radius: z.number().optional().describe('Search radius in kilometers (default: 1)'),
  categories: z.array(z.enum([
    'SIGHTS', 'NIGHTLIFE', 'RESTAURANT', 'SHOPPING'
  ])).optional().describe('Categories to analyze (default: all categories)')
});

async function locationScore(params: z.infer<typeof inputSchema>, env: Env): Promise<string> {
  try {
    const queryParams = new URLSearchParams({
      latitude: params.latitude.toString(),
      longitude: params.longitude.toString(),
      radius: (params.radius || 1).toString()
    });

    if (params.categories) {
      params.categories.forEach(category => {
        queryParams.append('categories', category);
      });
    }

    const amadeus = await getAmadeusClient(env);
    const response = await amadeus.get(`/v1/location/analytics/category-rated-areas?${queryParams.toString()}`);

    if (!response.data || response.data.length === 0) {
      const errorResult = {
        error: 'No location score data found for the specified coordinates',
        coordinates: { latitude: params.latitude, longitude: params.longitude },
        suggestion: 'Try expanding the search radius or check if coordinates are in a supported area'
      };
      return JSON.stringify(errorResult, null, 2);
    }

    const scores = response.data.map((area: any) => {
      const overallScore = area.overallScore || 0;
      const rating = overallScore >= 80 ? 'Excellent' :
                    overallScore >= 60 ? 'Very Good' :
                    overallScore >= 40 ? 'Good' :
                    overallScore >= 20 ? 'Fair' : 'Limited';

      return {
        categoryScores: area.categoryScores || {},
        overallScore,
        rating,
        recommendation: overallScore >= 70 ? 
          'Highly recommended area with great amenities and attractions' :
          overallScore >= 40 ?
          'Good area with decent options for travelers' :
          'Limited amenities - consider nearby areas for better options',
        radius: area.radius,
        location: {
          latitude: area.geoCode?.latitude || params.latitude,
          longitude: area.geoCode?.longitude || params.longitude
        }
      };
    });

    const bestArea = scores.reduce((best: any, current: any) => 
      current.overallScore > best.overallScore ? current : best
    );

    const result = {
      locationAnalysis: scores,
      summary: {
        searchLocation: { latitude: params.latitude, longitude: params.longitude },
        searchRadius: params.radius || 1,
        bestArea,
        averageScore: scores.reduce((sum: number, area: any) => sum + area.overallScore, 0) / scores.length
      },
      interpretation: {
        'SIGHTS': 'Tourist attractions and landmarks',
        'NIGHTLIFE': 'Bars, clubs, and evening entertainment',
        'RESTAURANT': 'Dining options and food venues', 
        'SHOPPING': 'Retail stores and shopping centers'
      }
    };

    return JSON.stringify(result, null, 2);

  } catch (error: any) {
    const errorResult = {
      error: 'Failed to get location scores',
      details: error.message || error,
      suggestion: 'Verify coordinates are valid and in a supported region'
    };
    return JSON.stringify(errorResult, null, 2);
  }
}

export const locationScoreTool = {
  name: 'location_score',
  description: 'Get location quality scores and ratings for different categories (sights, nightlife, restaurants, shopping) around specific coordinates',
  schema: {
    type: 'object',
    properties: {
      latitude: { type: 'number', description: 'Latitude of the location' },
      longitude: { type: 'number', description: 'Longitude of the location' },
      radius: { type: 'number', description: 'Search radius in kilometers (default: 1)' },
      categories: {
        type: 'array',
        items: { type: 'string', enum: ['SIGHTS', 'NIGHTLIFE', 'RESTAURANT', 'SHOPPING'] },
        description: 'Categories to analyze (default: all categories)'
      }
    },
    required: ['latitude', 'longitude'],
    additionalProperties: false
  },
  execute: async (params: any, env: Env) => {
    const result = await locationScore(params, env);
    return {
      content: [{
        type: 'text',
        text: result
      }]
    };
  }
};
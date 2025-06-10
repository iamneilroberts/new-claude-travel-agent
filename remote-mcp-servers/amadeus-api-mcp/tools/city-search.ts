import { z } from 'zod';
import { getAmadeusClient } from '../services/amadeus-client';

interface Env {
  AMADEUS_API_KEY: string;
  AMADEUS_API_SECRET: string;
  CACHE: any;
}

const inputSchema = z.object({
  keyword: z.string().min(1).describe('City name or partial city name to search for'),
  countryCode: z.string().length(2).optional().describe('2-letter country code to limit search'),
  max: z.number().min(1).max(20).optional().describe('Maximum number of results (1-20, default: 10)'),
  include: z.array(z.enum(['AIRPORTS'])).optional().describe('Additional data to include in results')
});

async function citySearch(params: z.infer<typeof inputSchema>, env: Env): Promise<string> {
  try {
    const queryParams = new URLSearchParams({
      keyword: params.keyword
    });

    if (params.countryCode) {
      queryParams.set('countryCode', params.countryCode);
    }

    if (params.max) {
      queryParams.set('max', params.max.toString());
    }

    if (params.include) {
      params.include.forEach(item => {
        queryParams.append('include', item);
      });
    }

    const amadeus = await getAmadeusClient(env);
    const response = await amadeus.get('/v1/reference-data/locations/cities', Object.fromEntries(queryParams));

    if (!response.data || response.data.length === 0) {
      const errorResult = {
        error: 'No cities found matching the search criteria',
        searchTerm: params.keyword,
        suggestion: 'Try a different keyword, check spelling, or broaden search by removing country filter'
      };
      return JSON.stringify(errorResult, null, 2);
    }

    const cities = response.data.map((city: any) => {
      const timeZone = city.timeZoneOffset ? `UTC${city.timeZoneOffset >= 0 ? '+' : ''}${city.timeZoneOffset}` : null;

      return {
        id: city.id,
        name: city.name,
        iataCode: city.iataCode,
        subType: city.subType,
        address: {
          cityName: city.address?.cityName,
          countryName: city.address?.countryName,
          countryCode: city.address?.countryCode,
          stateCode: city.address?.stateCode,
          regionCode: city.address?.regionCode
        },
        geoCode: city.geoCode,
        timeZone,
        airports: city.relationships?.airports?.data || [],
        relevance: city.relevance,
        rank: city.rank,
        analytics: city.analytics
      };
    });

    // Sort by relevance (higher is better) then by rank (lower is better)
    cities.sort((a: any, b: any) => {
      if (b.relevance !== a.relevance) {
        return (b.relevance || 0) - (a.relevance || 0);
      }
      return (a.rank || 999) - (b.rank || 999);
    });

    const topCity = cities[0];
    const countries = [...new Set(cities.map((c: any) => c.address.countryName).filter(Boolean))];
    const airportCount = cities.reduce((sum: number, city: any) => sum + city.airports.length, 0);

    const result = {
      cities,
      searchSummary: {
        keyword: params.keyword,
        totalResults: cities.length,
        topMatch: {
          name: topCity.name,
          country: topCity.address.countryName,
          iataCode: topCity.iataCode,
          coordinates: topCity.geoCode
        },
        countries,
        totalAirports: airportCount
      },
      usage: {
        flightSearch: 'Use iataCode for origin/destination in flight searches',
        hotelSearch: 'Use geoCode coordinates for hotel location searches',
        locationServices: 'Use id for location-based service queries',
        timeZone: 'TimeZone info helps with scheduling and arrival planning'
      }
    };

    return JSON.stringify(result, null, 2);

  } catch (error: any) {
    const errorResult = {
      error: 'Failed to search for cities',
      details: error.message || error,
      suggestion: 'Ensure keyword is valid and check network connectivity'
    };
    return JSON.stringify(errorResult, null, 2);
  }
}

export const citySearchTool = {
  name: 'city_search',
  description: 'DEPRECATED: This tool has been replaced by the D1 Database airport lookup tool. IMPORTANT: Instead of using this tool, you MUST use the D1 Database MCP server\'s airport_city_lookup tool which has much better coverage and accuracy for airport codes, especially for US cities like Mobile, AL and Denver, CO. The D1 tool provides comprehensive airport data with fuzzy search capabilities.',
  schema: {
    type: 'object',
    properties: {
      keyword: { type: 'string', minLength: 1, description: 'City name or partial city name to search for' },
      countryCode: { type: 'string', minLength: 2, maxLength: 2, description: '2-letter country code to limit search' },
      max: { type: 'number', minimum: 1, maximum: 20, description: 'Maximum number of results (1-20, default: 10)' },
      include: {
        type: 'array',
        items: { type: 'string', enum: ['AIRPORTS'] },
        description: 'Additional data to include in results'
      }
    },
    required: ['keyword'],
    additionalProperties: false
  },
  execute: async (params: any, env: Env) => {
    const redirectMessage = {
      error: 'TOOL DEPRECATED - USE D1 DATABASE INSTEAD',
      message: 'This city search tool has been deprecated. Please use the D1 Database MCP server\'s airport_city_lookup tool instead.',
      instructions: {
        toolToUse: 'airport_city_lookup',
        server: 'D1 Database MCP',
        example: {
          query: params.keyword,
          countryCode: params.countryCode || 'US',
          maxResults: params.max || 5
        }
      },
      benefits: [
        'Better accuracy for US cities like Mobile, AL and Denver, CO',
        'Comprehensive global airport database (4,269+ airports)',
        'Fuzzy search capabilities',
        'Faster response times'
      ]
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(redirectMessage, null, 2)
      }]
    };
  }
};

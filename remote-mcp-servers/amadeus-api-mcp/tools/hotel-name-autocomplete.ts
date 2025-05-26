import { z } from 'zod';
import { getAmadeusClient } from '../services/amadeus-client';

interface Env {
  AMADEUS_API_KEY: string;
  AMADEUS_API_SECRET: string;
  CACHE: any;
}

const inputSchema = z.object({
  keyword: z.string().min(2).describe('Hotel name or partial hotel name to search for (minimum 2 characters)'),
  subType: z.array(z.enum(['HOTEL_LEISURE', 'HOTEL_GDS'])).optional().describe('Hotel subtypes to filter by'),
  countryCode: z.string().length(2).optional().describe('2-letter country code to limit search'),
  lang: z.string().length(2).optional().describe('Language code for results (default: EN)')
});

async function hotelNameAutocomplete(params: z.infer<typeof inputSchema>, env: Env): Promise<string> {
  try {
    const queryParams = new URLSearchParams({
      keyword: params.keyword
    });

    if (params.subType) {
      params.subType.forEach(type => {
        queryParams.append('subType', type);
      });
    }

    if (params.countryCode) {
      queryParams.set('countryCode', params.countryCode);
    }

    if (params.lang) {
      queryParams.set('lang', params.lang);
    }

    const amadeus = await getAmadeusClient(env);
    const response = await amadeus.get(`/v1/reference-data/locations/hotel?${queryParams.toString()}`);

    if (!response.data || response.data.length === 0) {
      const errorResult = {
        error: 'No hotels found matching the search criteria',
        searchTerm: params.keyword,
        suggestion: 'Try a different keyword, check spelling, or broaden search by removing country filter'
      };
      return JSON.stringify(errorResult, null, 2);
    }

    const hotels = response.data.map((hotel: any) => ({
      hotelId: hotel.hotelIds?.[0] || hotel.id,
      name: hotel.name,
      iataCode: hotel.iataCode,
      subType: hotel.subType,
      address: {
        cityName: hotel.address?.cityName,
        countryName: hotel.address?.countryName,
        countryCode: hotel.address?.countryCode,
        stateCode: hotel.address?.stateCode
      },
      geoCode: hotel.geoCode,
      distance: hotel.distance,
      relevance: hotel.relevance,
      type: hotel.type,
      rank: hotel.rank
    }));

    // Sort by relevance (higher is better) then by rank (lower is better)
    hotels.sort((a, b) => {
      if (b.relevance !== a.relevance) {
        return (b.relevance || 0) - (a.relevance || 0);
      }
      return (a.rank || 999) - (b.rank || 999);
    });

    const result = {
      hotels,
      searchSummary: {
        keyword: params.keyword,
        totalResults: hotels.length,
        topMatch: hotels[0],
        countries: [...new Set(hotels.map(h => h.address.countryName).filter(Boolean))],
        cities: [...new Set(hotels.map(h => h.address.cityName).filter(Boolean))]
      },
      usage: {
        hotelBooking: 'Use hotelId for hotel booking APIs',
        locationSearch: 'Use geoCode coordinates for nearby searches',
        filtering: 'Filter by subType for specific hotel categories'
      }
    };

    return JSON.stringify(result, null, 2);

  } catch (error: any) {
    const errorResult = {
      error: 'Failed to search for hotels',
      details: error.message || error,
      suggestion: 'Ensure keyword has at least 2 characters and check network connectivity'
    };
    return JSON.stringify(errorResult, null, 2);
  }
}

export const hotelNameAutocompleteTool = {
  name: 'hotel_name_autocomplete',
  description: 'Search and autocomplete hotel names, get hotel IDs and location details for booking or further searches',
  schema: {
    type: 'object',
    properties: {
      keyword: { type: 'string', minLength: 2, description: 'Hotel name or partial hotel name to search for (minimum 2 characters)' },
      subType: {
        type: 'array',
        items: { type: 'string', enum: ['HOTEL_LEISURE', 'HOTEL_GDS'] },
        description: 'Hotel subtypes to filter by'
      },
      countryCode: { type: 'string', minLength: 2, maxLength: 2, description: '2-letter country code to limit search' },
      lang: { type: 'string', minLength: 2, maxLength: 2, description: 'Language code for results (default: EN)' }
    },
    required: ['keyword'],
    additionalProperties: false
  },
  execute: async (params: any, env: Env) => {
    const result = await hotelNameAutocomplete(params, env);
    return {
      content: [{
        type: 'text',
        text: result
      }]
    };
  }
};
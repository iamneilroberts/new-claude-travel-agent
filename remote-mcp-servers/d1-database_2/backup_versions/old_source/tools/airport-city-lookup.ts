import { z } from 'zod';

interface Env {
  DB: D1Database;
}

const inputSchema = z.object({
  query: z.string().min(1).describe('Search query: city name, airport name, or IATA code (e.g., "Mobile Alabama", "Denver", "DEN")'),
  countryCode: z.string().length(2).optional().describe('2-letter country code to filter results (e.g., "US", "CA")'),
  maxResults: z.number().min(1).max(20).optional().describe('Maximum number of results (default: 10)'),
  includeNearbyAirports: z.boolean().optional().describe('Include airports within 50 miles of city (default: true)'),
  majorsOnly: z.boolean().optional().describe('Only return major airports (default: false)')
});

async function airportCityLookup(params: z.infer<typeof inputSchema>, env: Env): Promise<string> {
  try {
    const query = params.query.toLowerCase().trim();
    const maxResults = params.maxResults || 10;
    const includeNearby = params.includeNearbyAirports !== false;
    const majorsOnly = params.majorsOnly || false;
    
    // Check if query looks like IATA code
    const isIATAQuery = /^[A-Z]{3}$/i.test(query.trim());
    
    let sql: string;
    let queryParams: any[] = [];
    
    if (isIATAQuery) {
      // Direct IATA code lookup
      sql = `
        SELECT 
          a.iata_code,
          a.icao_code,
          a.name as airport_name,
          a.city,
          a.state_province,
          a.country,
          a.country_code,
          a.latitude as airport_lat,
          a.longitude as airport_lng,
          a.elevation,
          a.timezone,
          a.type,
          a.is_major,
          a.is_hub,
          0 as distance_miles
        FROM airports a 
        WHERE UPPER(a.iata_code) = UPPER(?)
        ${params.countryCode ? 'AND a.country_code = ?' : ''}
        ${majorsOnly ? 'AND a.is_major = 1' : ''}
        LIMIT ?
      `;
      queryParams = [query.toUpperCase()];
      if (params.countryCode) queryParams.push(params.countryCode.toUpperCase());
      queryParams.push(maxResults);
      
    } else {
      // Text search for cities and airports
      if (includeNearby) {
        // Use the city_airports view for comprehensive results
        sql = `
          SELECT 
            iata_code,
            icao_code,
            airport_name,
            city_name as city,
            state_province,
            country,
            country_code,
            airport_lat,
            airport_lng,
            elevation,
            city_timezone as timezone,
            'airport' as type,
            is_major,
            is_hub,
            distance_miles
          FROM city_airports
          WHERE (
            LOWER(city_name) LIKE '%' || ? || '%' OR
            LOWER(airport_name) LIKE '%' || ? || '%' OR
            LOWER(country) LIKE '%' || ? || '%' OR
            UPPER(iata_code) LIKE '%' || UPPER(?) || '%'
          )
          ${params.countryCode ? 'AND country_code = ?' : ''}
          ${majorsOnly ? 'AND is_major = 1' : ''}
          AND iata_code IS NOT NULL
          ORDER BY 
            is_major DESC,
            distance_miles ASC,
            city_name ASC
          LIMIT ?
        `;
        queryParams = [query, query, query, query];
        if (params.countryCode) queryParams.push(params.countryCode.toUpperCase());
        queryParams.push(maxResults);
        
      } else {
        // Search only direct city matches
        sql = `
          SELECT 
            a.iata_code,
            a.icao_code,
            a.name as airport_name,
            a.city,
            a.state_province,
            a.country,
            a.country_code,
            a.latitude as airport_lat,
            a.longitude as airport_lng,
            a.elevation,
            a.timezone,
            a.type,
            a.is_major,
            a.is_hub,
            0 as distance_miles
          FROM airports a
          WHERE (
            LOWER(a.city) LIKE '%' || ? || '%' OR
            LOWER(a.name) LIKE '%' || ? || '%' OR
            LOWER(a.country) LIKE '%' || ? || '%'
          )
          ${params.countryCode ? 'AND a.country_code = ?' : ''}
          ${majorsOnly ? 'AND a.is_major = 1' : ''}
          ORDER BY 
            a.is_major DESC,
            a.city ASC
          LIMIT ?
        `;
        queryParams = [query, query, query];
        if (params.countryCode) queryParams.push(params.countryCode.toUpperCase());
        queryParams.push(maxResults);
      }
    }
    
    console.log('🔍 Executing airport/city lookup:', { sql: sql.substring(0, 100) + '...', params: queryParams });
    
    const result = await env.DB.prepare(sql).bind(...queryParams).all();
    
    if (!result.results || result.results.length === 0) {
      return JSON.stringify({
        error: 'No airports or cities found matching the search criteria',
        searchTerm: params.query,
        suggestions: [
          'Try a broader search term (e.g., "Denver" instead of "Denver International")',
          'Check spelling and try alternative names',
          'Add country code for better results (e.g., countryCode: "US")',
          'Try searching for the airport IATA code directly (e.g., "DEN")'
        ]
      }, null, 2);
    }
    
    const airports = result.results.map((row: any) => ({
      iataCode: row.iata_code,
      icaoCode: row.icao_code,
      airportName: row.airport_name,
      city: row.city,
      stateProvince: row.state_province,
      country: row.country,
      countryCode: row.country_code,
      coordinates: {
        latitude: row.airport_lat,
        longitude: row.airport_lng
      },
      elevation: row.elevation,
      timezone: row.timezone,
      type: row.type,
      isMajor: !!row.is_major,
      isHub: !!row.is_hub,
      distanceMiles: row.distance_miles || 0
    }));
    
    // Get some additional stats
    const statsSQL = `
      SELECT 
        COUNT(*) as total_airports,
        COUNT(CASE WHEN is_major = 1 THEN 1 END) as major_airports,
        COUNT(CASE WHEN is_hub = 1 THEN 1 END) as hub_airports
      FROM airports 
      WHERE country_code = ?
    `;
    
    let stats = null;
    if (airports.length > 0) {
      const statsResult = await env.DB.prepare(statsSQL).bind(airports[0].countryCode).first();
      stats = {
        totalAirportsInCountry: statsResult?.total_airports || 0,
        majorAirportsInCountry: statsResult?.major_airports || 0,
        hubAirportsInCountry: statsResult?.hub_airports || 0
      };
    }
    
    const response = {
      airports,
      searchSummary: {
        query: params.query,
        resultsFound: airports.length,
        searchType: isIATAQuery ? 'iata_code' : 'text_search',
        includesNearbyAirports: includeNearby,
        majorsOnly: majorsOnly,
        topMatch: airports[0] ? {
          iataCode: airports[0].iataCode,
          airportName: airports[0].airportName,
          city: airports[0].city,
          country: airports[0].country,
          isMajor: airports[0].isMajor,
          isHub: airports[0].isHub
        } : null
      },
      countryStats: stats,
      usage: {
        flightSearch: 'Use iataCode for origin/destination in Amadeus flight searches',
        coordinates: 'Use coordinates for hotel searches and Google Places queries',
        timezone: 'Use timezone for arrival/departure time calculations',
        cityName: 'Use city + stateProvince for human-readable locations'
      }
    };
    
    return JSON.stringify(response, null, 2);
    
  } catch (error: any) {
    console.error('❌ Error in airport/city lookup:', error);
    return JSON.stringify({
      error: 'Database query failed',
      details: error.message || error.toString(),
      suggestion: 'Try again with a simpler search term or check database connectivity'
    }, null, 2);
  }
}

export const airportCityLookupTool = {
  name: 'airport_city_lookup',
  description: 'Search for airports and cities using D1 database. Fast, reliable lookup for IATA codes, city names, and airport information. Much more accurate than Amadeus city search for US cities like "Mobile, AL" or "Denver, CO".',
  schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        minLength: 1,
        description: 'Search query: city name, airport name, or IATA code (e.g., "Mobile Alabama", "Denver", "DEN")'
      },
      countryCode: {
        type: 'string',
        minLength: 2,
        maxLength: 2,
        description: '2-letter country code to filter results (e.g., "US", "CA")'
      },
      maxResults: {
        type: 'number',
        minimum: 1,
        maximum: 20,
        description: 'Maximum number of results (default: 10)'
      },
      includeNearbyAirports: {
        type: 'boolean',
        description: 'Include airports within 50 miles of city (default: true)'
      },
      majorsOnly: {
        type: 'boolean',
        description: 'Only return major airports (default: false)'
      }
    },
    required: ['query'],
    additionalProperties: false
  },
  execute: async (params: any, env: Env) => {
    const result = await airportCityLookup(params, env);
    return {
      content: [{
        type: 'text',
        text: result
      }]
    };
  }
};
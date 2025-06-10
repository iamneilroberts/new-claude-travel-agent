import { z } from 'zod';

interface Airport {
  id: string;
  name: string;
  city: string;
  country: string;
  iataCode: string;
  icaoCode: string;
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  dst: string;
  tzName: string;
  type: string;
  source: string;
}

interface Env {
  // No environment variables needed for static data
}

// Cached airport data - in production, this would be loaded from a static file
let airportCache: Airport[] | null = null;

async function loadAirportData(): Promise<Airport[]> {
  if (airportCache) return airportCache;

  try {
    // Load from OpenFlights database
    const response = await fetch('https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat');
    const csvData = await response.text();
    
    const airports: Airport[] = [];
    const lines = csvData.split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      // Parse CSV line (handle quoted fields)
      const fields = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
      if (fields.length < 14) continue;
      
      // Clean up fields (remove quotes)
      const cleanFields = fields.map(field => field.replace(/^"|"$/g, ''));
      
      const airport: Airport = {
        id: cleanFields[0],
        name: cleanFields[1],
        city: cleanFields[2],
        country: cleanFields[3],
        iataCode: cleanFields[4] === '\\N' ? '' : cleanFields[4],
        icaoCode: cleanFields[5] === '\\N' ? '' : cleanFields[5],
        latitude: parseFloat(cleanFields[6]) || 0,
        longitude: parseFloat(cleanFields[7]) || 0,
        elevation: parseInt(cleanFields[8]) || 0,
        timezone: cleanFields[9],
        dst: cleanFields[10],
        tzName: cleanFields[11],
        type: cleanFields[12],
        source: cleanFields[13]
      };
      
      // Only include airports with valid IATA codes
      if (airport.iataCode && airport.iataCode.length === 3) {
        airports.push(airport);
      }
    }
    
    airportCache = airports;
    return airports;
  } catch (error) {
    console.error('Failed to load airport data:', error);
    return [];
  }
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const inputSchema = z.object({
  query: z.string().min(1).describe('Search query: city name, airport name, or IATA code'),
  latitude: z.number().optional().describe('Latitude for proximity search'),
  longitude: z.number().optional().describe('Longitude for proximity search'),
  maxResults: z.number().min(1).max(20).optional().describe('Maximum number of results (default: 10)'),
  radiusMiles: z.number().min(1).max(500).optional().describe('Search radius in miles for proximity search (default: 50)')
});

async function airportLookup(params: z.infer<typeof inputSchema>, env: Env): Promise<string> {
  try {
    const airports = await loadAirportData();
    if (airports.length === 0) {
      return JSON.stringify({
        error: 'Airport database not available',
        suggestion: 'Try again later or use manual IATA code entry'
      });
    }

    const query = params.query.toLowerCase().trim();
    const maxResults = params.maxResults || 10;
    const radiusMiles = params.radiusMiles || 50;
    
    let results: (Airport & { distance?: number })[] = [];

    // If coordinates provided, do proximity search
    if (params.latitude && params.longitude) {
      results = airports
        .map(airport => ({
          ...airport,
          distance: calculateDistance(params.latitude!, params.longitude!, airport.latitude, airport.longitude)
        }))
        .filter(airport => airport.distance! <= radiusMiles)
        .sort((a, b) => a.distance! - b.distance!);
    } else {
      // Text search
      results = airports.filter(airport => {
        const searchText = `${airport.name} ${airport.city} ${airport.country} ${airport.iataCode} ${airport.icaoCode}`.toLowerCase();
        return searchText.includes(query);
      });
    }

    // Limit results
    results = results.slice(0, maxResults);

    if (results.length === 0) {
      return JSON.stringify({
        error: 'No airports found matching the search criteria',
        searchTerm: params.query,
        suggestion: 'Try a broader search term, nearby city name, or check spelling'
      });
    }

    const formattedResults = results.map(airport => ({
      iataCode: airport.iataCode,
      icaoCode: airport.icaoCode,
      name: airport.name,
      city: airport.city,
      country: airport.country,
      coordinates: {
        latitude: airport.latitude,
        longitude: airport.longitude
      },
      elevation: airport.elevation,
      timezone: airport.tzName,
      distance: airport.distance ? `${airport.distance.toFixed(1)} miles` : undefined
    }));

    const result = {
      airports: formattedResults,
      searchSummary: {
        query: params.query,
        totalResults: results.length,
        searchType: params.latitude && params.longitude ? 'proximity' : 'text',
        topMatch: formattedResults[0]
      },
      usage: {
        flightSearch: 'Use iataCode for origin/destination in flight searches',
        coordinates: 'Use coordinates for hotel searches and mapping',
        timezone: 'Use timezone for arrival/departure time calculations'
      }
    };

    return JSON.stringify(result, null, 2);

  } catch (error: any) {
    return JSON.stringify({
      error: 'Failed to search airports',
      details: error.message || error,
      suggestion: 'Check network connectivity and try again'
    });
  }
}

export const airportLookupTool = {
  name: 'airport_lookup',
  description: 'Search for airports by city, name, or IATA code using comprehensive global airport database. Supports both text search and proximity search with coordinates. More reliable than Amadeus city search for finding airport codes.',
  schema: {
    type: 'object',
    properties: {
      query: { type: 'string', minLength: 1, description: 'Search query: city name, airport name, or IATA code (e.g., "Mobile Alabama", "Denver", "DEN")' },
      latitude: { type: 'number', description: 'Latitude for proximity search (use with longitude)' },
      longitude: { type: 'number', description: 'Longitude for proximity search (use with latitude)' },
      maxResults: { type: 'number', minimum: 1, maximum: 20, description: 'Maximum number of results (default: 10)' },
      radiusMiles: { type: 'number', minimum: 1, maximum: 500, description: 'Search radius in miles for proximity search (default: 50)' }
    },
    required: ['query'],
    additionalProperties: false
  },
  execute: async (params: any, env: Env) => {
    const result = await airportLookup(params, env);
    return {
      content: [{
        type: 'text',
        text: result
      }]
    };
  }
};
import { getAmadeusClient } from './amadeus-client';
import { Env } from '../src/index';

export interface POISearchParams {
  location: string;
  category?: string;
  radius?: number;
  latitude?: number;
  longitude?: number;
}

export async function searchPOI(params: POISearchParams, env: Env): Promise<string> {
  try {
    // If we have latitude/longitude from the parameters, search directly
    if (params.latitude && params.longitude) {
      return await searchPOIByCoordinates({
        latitude: params.latitude,
        longitude: params.longitude,
        radius: params.radius || 1
      }, env);
    }

    // If we only have location name, suggest using coordinates or Google Places
    return `To search for points of interest, please provide coordinates (latitude/longitude) or use the Google Places API.

For "${params.location}", you can:
1. Use Google Places API for comprehensive attraction search
2. Search hotels in ${params.location} which may include nearby attractions
3. Use city_search to find coordinates for ${params.location}, then search POI by coordinates`;

  } catch (error: any) {
    console.error('Error searching POI:', error);
    throw new Error(`Failed to search POI: ${error.message}`);
  }
}

export async function searchPOIByCoordinates(params: {
  latitude: number;
  longitude: number;
  radius?: number;
}, env: Env): Promise<string> {
  try {
    const amadeus = await getAmadeusClient(env);

    const response = await amadeus.get('/v1/reference-data/locations/pois', {
      latitude: params.latitude,
      longitude: params.longitude,
      radius: params.radius || 1
    });

    if (!response.data || response.data.length === 0) {
      return `No points of interest found near coordinates (${params.latitude}, ${params.longitude}) within ${params.radius || 1}km radius`;
    }

    return formatPOIResults(response.data, params);
  } catch (error: any) {
    console.error('Error searching POI by coordinates:', error);

    if (error.message?.includes('404') || error.message?.includes('not found')) {
      return `POI API may not be available in this region. Try using Google Places API for attractions near (${params.latitude}, ${params.longitude})`;
    }

    throw new Error(`Failed to search POI: ${error.message}`);
  }
}

export async function searchActivitiesByCoordinates(params: {
  latitude: number;
  longitude: number;
  radius?: number;
}, env: Env): Promise<string> {
  try {
    const amadeus = await getAmadeusClient(env);

    const response = await amadeus.get('/v1/shopping/activities', {
      latitude: params.latitude,
      longitude: params.longitude,
      radius: params.radius || 1
    });

    if (!response.data || response.data.length === 0) {
      return `No activities found near coordinates (${params.latitude}, ${params.longitude}) within ${params.radius || 1}km radius`;
    }

    return formatActivitiesResults(response.data, params);
  } catch (error: any) {
    console.error('Error searching activities by coordinates:', error);

    if (error.message?.includes('404') || error.message?.includes('not found')) {
      return `Tours and Activities API may not be available in this region. Try using Google Places API for attractions near (${params.latitude}, ${params.longitude})`;
    }

    throw new Error(`Failed to search activities: ${error.message}`);
  }
}

function formatPOIResults(data: any[], params: { latitude: number; longitude: number; radius?: number }): string {
  if (!data || data.length === 0) {
    return `No points of interest found near (${params.latitude}, ${params.longitude})`;
  }

  try {
    const pois = data.slice(0, 10).map((poi, index) => {
      const name = poi.name || 'Unknown POI';
      const category = poi.category || 'General';
      const rank = poi.rank || 'N/A';
      const tags = poi.tags ? poi.tags.slice(0, 5).join(', ') : 'No tags';
      const coordinates = poi.geoCode ? `(${poi.geoCode.latitude}, ${poi.geoCode.longitude})` : '';

      return `${index + 1}. ${name}\n   Category: ${category}\n   Rank: ${rank}\n   Tags: ${tags}\n   Location: ${coordinates}`;
    });

    return `Found ${pois.length} points of interest near (${params.latitude}, ${params.longitude}):\n\n${pois.join('\n\n')}`;
  } catch (error) {
    console.error('Error formatting POI results:', error);
    return 'Error formatting POI results. Raw data may be in an unexpected format.';
  }
}

function formatActivitiesResults(data: any[], params: { latitude: number; longitude: number; radius?: number }): string {
  if (!data || data.length === 0) {
    return `No activities found near (${params.latitude}, ${params.longitude})`;
  }

  try {
    const activities = data.slice(0, 10).map((activity, index) => {
      const name = activity.name || 'Unknown Activity';
      const description = activity.shortDescription || 'No description available';
      const rating = activity.rating || 'Not rated';
      const price = activity.price ? `${activity.price.amount} ${activity.price.currencyCode}` : 'Price not available';
      const bookingLink = activity.bookingLink || 'No booking link';

      return `${index + 1}. ${name}\n   Description: ${description}\n   Rating: ${rating}\n   Price: ${price}\n   Booking: ${bookingLink}`;
    });

    return `Found ${activities.length} activities near (${params.latitude}, ${params.longitude}):\n\n${activities.join('\n\n')}`;
  } catch (error) {
    console.error('Error formatting activities results:', error);
    return 'Error formatting activities results. Raw data may be in an unexpected format.';
  }
}

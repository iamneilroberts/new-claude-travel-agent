import { getAmadeusClient } from './amadeus-client';
import { Env } from '../index';

export interface POISearchParams {
  location: string;
  category?: string;
  radius?: number;
}

export async function searchPOI(params: POISearchParams, env: Env): Promise<string> {
  // POI API is decommissioned by Amadeus
  return `Sorry, the Points of Interest API has been decommissioned by Amadeus and is no longer available.

As an alternative, you can:
1. Search for hotels in ${params.location} which includes nearby attractions
2. Use the Activities API to find things to do
3. Use the Google Places API for points of interest`;
}

function formatPOIResults(data: any[], params: POISearchParams): string {
  if (!data || data.length === 0) {
    return `No points of interest found in ${params.location}`;
  }

  try {
    const pois = data.slice(0, 10).map((poi, index) => {
      const name = poi.name || 'Unknown POI';
      const category = poi.category || 'General';
      const tags = poi.tags ? poi.tags.join(', ') : 'No tags';
      const rank = poi.rank || 'N/A';

      return `${index + 1}. ${name}\n   Category: ${category}\n   Tags: ${tags}\n   Rank: ${rank}`;
    });

    const categoryText = params.category ? ` (${params.category})` : '';
    return `Top points of interest in ${params.location}${categoryText}:\n\n${pois.join('\n\n')}`;
  } catch (error) {
    console.error('Error formatting POI results:', error);
    return 'Error formatting POI results. Raw data may be in an unexpected format.';
  }
}

/**
 * Google Places API Provider for Image Gallery
 *
 * This module handles fetching images from Google Places API
 */

import { Env } from '../r2-context';

// Interface for Google Places image search parameters
export interface GooglePlacesSearchParams {
  query: string;
  count?: number;
  region?: string;
  language?: string;
}

// Interface for image result
export interface ImageResult {
  id: string;
  source: string;
  source_id: string;
  url: string;
  thumbnail_url: string;
  title: string;
  description?: string;
  attribution?: string;
}

/**
 * Search for images in Google Places API
 */
export async function searchGooglePlacesImages(
  params: GooglePlacesSearchParams,
  env: Env
): Promise<ImageResult[]> {
  try {
    const { query, count = 12, region = 'us', language = 'en' } = params;

    // Check for API key
    if (!env.GOOGLE_PLACES_API_KEY) {
      throw new Error('Google Places API key is missing');
    }

    // First make a search request to find a place
    const placeSearchUrl = new URL('https://maps.googleapis.com/maps/api/place/findplacefromtext/json');
    placeSearchUrl.searchParams.append('input', query);
    placeSearchUrl.searchParams.append('inputtype', 'textquery');
    placeSearchUrl.searchParams.append('fields', 'place_id,name,formatted_address,photos');
    placeSearchUrl.searchParams.append('language', language);
    placeSearchUrl.searchParams.append('key', env.GOOGLE_PLACES_API_KEY);

    const placeResponse = await fetch(placeSearchUrl.toString());
    const placeData = await placeResponse.json();

    if (placeData.status !== 'OK' || !placeData.candidates || placeData.candidates.length === 0) {
      console.warn('No places found for query:', query, placeData);
      return [];
    }

    // Get the first place result
    const place = placeData.candidates[0];
    const placeId = place.place_id;

    // Now get detailed information with photos
    const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    detailsUrl.searchParams.append('place_id', placeId);
    detailsUrl.searchParams.append('fields', 'name,formatted_address,photos');
    detailsUrl.searchParams.append('language', language);
    detailsUrl.searchParams.append('key', env.GOOGLE_PLACES_API_KEY);

    const detailsResponse = await fetch(detailsUrl.toString());
    const detailsData = await detailsResponse.json();

    if (detailsData.status !== 'OK' || !detailsData.result) {
      console.warn('Failed to get place details:', placeId, detailsData);
      return [];
    }

    const placeName = detailsData.result.name;
    const placeAddress = detailsData.result.formatted_address;
    const photos = detailsData.result.photos || [];

    // Limit the number of photos
    const limitedPhotos = photos.slice(0, count);

    // Process photos
    const results: ImageResult[] = limitedPhotos.map((photo: any, index: number) => {
      const photoReference = photo.photo_reference;

      // Generate photo URL
      const photoUrl = new URL('https://maps.googleapis.com/maps/api/place/photo');
      photoUrl.searchParams.append('photoreference', photoReference);
      photoUrl.searchParams.append('maxwidth', '1200');
      photoUrl.searchParams.append('key', env.GOOGLE_PLACES_API_KEY);

      // Generate thumbnail URL (smaller size)
      const thumbnailUrl = new URL('https://maps.googleapis.com/maps/api/place/photo');
      thumbnailUrl.searchParams.append('photoreference', photoReference);
      thumbnailUrl.searchParams.append('maxwidth', '400');
      thumbnailUrl.searchParams.append('key', env.GOOGLE_PLACES_API_KEY);

      // Generate an ID for the image
      const imageId = `gp_${placeId}_${index}`;

      // Create image result
      return {
        id: imageId,
        source: 'googlePlaces',
        source_id: photoReference,
        url: photoUrl.toString(),
        thumbnail_url: thumbnailUrl.toString(),
        title: `${placeName} - Photo ${index + 1}`,
        description: placeAddress,
        attribution: photo.html_attributions?.[0] || 'Google Places'
      };
    });

    return results;
  } catch (error) {
    console.error('Google Places API error:', error);
    return [];
  }
}

/**
 * Cache Google Places API results in KV
 */
export async function cacheGooglePlacesResults(
  query: string,
  results: ImageResult[],
  env: Env
): Promise<void> {
  try {
    const cacheKey = `gp_search_${query.replace(/\s+/g, '_').toLowerCase()}`;
    await env.CACHE.put(cacheKey, JSON.stringify(results), { expirationTtl: 86400 }); // 24 hours
  } catch (error) {
    console.error('Failed to cache Google Places results:', error);
  }
}

/**
 * Get cached Google Places API results
 */
export async function getCachedGooglePlacesResults(
  query: string,
  env: Env
): Promise<ImageResult[] | null> {
  try {
    const cacheKey = `gp_search_${query.replace(/\s+/g, '_').toLowerCase()}`;
    const cached = await env.CACHE.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    return null;
  } catch (error) {
    console.error('Failed to get cached Google Places results:', error);
    return null;
  }
}

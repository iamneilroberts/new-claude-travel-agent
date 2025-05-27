import { PlacesClient } from '@googlemaps/places';

export class GooglePlacesClient {
  private client: PlacesClient;
  public key: string;
  
  constructor(apiKey: string) {
    if (!apiKey) {
      console.error("FATAL ERROR: Google Maps API Key is not defined");
      throw new Error("GooglePlacesClient: Google Maps API Key is not configured");
    }
    this.key = apiKey;
    this.client = new PlacesClient({ key: apiKey });
  }
  
  // Field mapping between legacy field names (used by Claude) and Places API v1 field paths
  private FIELD_MAPPING: Record<string, string> = {
    'place_id': 'places.id',
    'name': 'places.displayName',
    'formatted_address': 'places.formattedAddress',
    'types': 'places.types',
    'geometry': 'places.location',
    'photos': 'places.photos',
    'rating': 'places.rating',
    'user_ratings_total': 'places.userRatingCount',
    'editorial_summary': 'places.editorialSummary',
    'formatted_phone_number': 'places.internationalPhoneNumber',
    'website': 'places.websiteUri',
    'url': 'places.googleMapsUri',
    'opening_hours': 'places.regularOpeningHours',
    'price_level': 'places.priceLevel',
    'business_status': 'places.businessStatus'
  };
  
  // Map Claude-style field names to Google Places API v1 field paths
  private mapFieldNames(fields?: string[]): string {
    if (!fields || fields.length === 0) {
      // Default fields if none specified
      return 'places.id,places.displayName,places.formattedAddress,places.types,places.location';
    }
    
    // Map each field name to its Places API v1 equivalent
    const mappedFields = fields.map(field => this.FIELD_MAPPING[field] || `places.${field}`);
    
    return mappedFields.join(',');
  }
  
  // Method to find places
  async findPlace(params: {
    query: string;
    language?: string;
    region?: string;
    fields?: string[];
    max_results?: number;
  }): Promise<any> {
    console.error(`GooglePlacesClient.findPlace called with query: ${params.query}`);
    try {
      // Create the field mask from the fields array or use default fields
      const fieldMask = this.mapFieldNames(params.fields);
      
      const response = await this.client.searchText({
        textQuery: params.query,
        languageCode: params.language,
        regionCode: params.region,
      }, {
        otherArgs: {
          headers: {
            'X-Goog-FieldMask': fieldMask,
          },
        },
      });
      
      // Handle results and apply max_results limit if needed
      const places = response.places || [];
      const limitedPlaces = params.max_results && params.max_results > 0 
        ? places.slice(0, params.max_results) 
        : places;
      
      return {
        status: "success",
        candidates: limitedPlaces.map(place => ({
          place_id: place.id,
          name: place.displayName?.text,
          formatted_address: place.formattedAddress,
          types: place.types,
          geometry: {
            location: {
              lat: place.location?.latitude,
              lng: place.location?.longitude
            }
          }
        }))
      };
    } catch (e: any) {
      console.error(`GooglePlacesClient.findPlace exception: ${e.message}`, e);
      return { status: "error", message: e.message };
    }
  }
  
  // Method to get place details
  async getPlaceDetails(params: {
    place_id: string;
    language?: string;
    region?: string;
    fields?: string[];
  }): Promise<any> {
    console.error(`GooglePlacesClient.getPlaceDetails called for place_id: ${params.place_id}`);
    try {
      // Create the field mask from the fields array or use default fields
      const fieldMask = this.mapFieldNames(params.fields);
      
      const response = await this.client.fetchPlace({
        place: params.place_id,
        languageCode: params.language,
      }, {
        otherArgs: {
          headers: {
            'X-Goog-FieldMask': fieldMask,
          },
        },
      });
      
      // Transform response to match the format expected by Claude
      return {
        status: "success",
        result: {
          place_id: response.id,
          name: response.displayName?.text,
          formatted_address: response.formattedAddress,
          types: response.types,
          rating: response.rating,
          user_ratings_total: response.userRatingCount,
          editorial_summary: response.editorialSummary?.text,
          formatted_phone_number: response.internationalPhoneNumber,
          website: response.websiteUri,
          url: response.googleMapsUri,
          business_status: response.businessStatus,
          // Handle opening hours
          opening_hours: response.regularOpeningHours ? {
            open_now: response.regularOpeningHours.openNow,
            weekday_text: response.regularOpeningHours.weekdayDescriptions
          } : undefined,
          // Handle photos
          photos: response.photos?.map(photo => ({
            photo_reference: photo.name, // The photo name is used as the reference in Places API v1
            height: photo.heightPx,
            width: photo.widthPx
          }))
        }
      };
    } catch (e: any) {
      console.error(`GooglePlacesClient.getPlaceDetails exception: ${e.message}`, e);
      return { status: "error", message: e.message };
    }
  }
  
  // Method to get place photo URL
  getPlacePhotoUrl(params: {
    photo_reference: string;
    max_width?: number;
    max_height?: number;
  }): any {
    console.error(`GooglePlacesClient.getPlacePhotoUrl called for photo_reference: ${params.photo_reference}`);
    
    try {
      // For Places API v1, the photo_reference is actually the photo name (resource path)
      // It should be in format "photos/ABC123DEF456" or a full resource path
      let photoRef = params.photo_reference;
      
      // If it's not already a resource path, ensure it has the correct format
      if (!photoRef.includes('/')) {
        photoRef = `photos/${photoRef}`;
      }
      
      // The URL format for Places API v1
      let photoUrl = `https://places.googleapis.com/v1/${photoRef}/media`;
      
      // Add URL parameters
      const urlParams = new URLSearchParams();
      urlParams.append('key', this.key);
      
      if (params.max_width) {
        urlParams.append('maxWidthPx', params.max_width.toString());
      }
      
      if (params.max_height) {
        urlParams.append('maxHeightPx', params.max_height.toString());
      }
      
      // If neither max_width nor max_height is provided, add a default width
      if (!params.max_width && !params.max_height) {
        urlParams.append('maxWidthPx', '800');
      }
      
      return {
        status: "success",
        url: `${photoUrl}?${urlParams.toString()}`
      };
    } catch (e: any) {
      console.error(`GooglePlacesClient.getPlacePhotoUrl exception: ${e.message}`, e);
      return { status: "error", message: e.message };
    }
  }
}
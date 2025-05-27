export class GooglePlacesFetchClient {
  private apiKey: string;
  
  constructor(apiKey: string) {
    if (!apiKey) {
      console.error("FATAL ERROR: Google Maps API Key is not defined");
      throw new Error("GooglePlacesFetchClient: Google Maps API Key is not configured");
    }
    this.apiKey = apiKey;
  }
  
  // Field mapping between legacy field names (used by Claude) and Places API v1 field paths
  private FIELD_MAPPING: Record<string, string> = {
    'place_id': 'id',
    'name': 'displayName',
    'formatted_address': 'formattedAddress',
    'types': 'types',
    'geometry': 'location',
    'photos': 'photos',
    'rating': 'rating',
    'user_ratings_total': 'userRatingCount',
    'editorial_summary': 'editorialSummary',
    'formatted_phone_number': 'internationalPhoneNumber',
    'website': 'websiteUri',
    'url': 'googleMapsUri',
    'opening_hours': 'regularOpeningHours',
    'price_level': 'priceLevel',
    'business_status': 'businessStatus'
  };
  
  // Map Claude-style field names to Google Places API v1 field paths
  private mapFieldNames(fields?: string[]): string {
    if (!fields || fields.length === 0) {
      // Default fields - these are validated field names
      return 'name,formattedAddress,types,location,id';
    }
    
    // Map common field names directly to Google Places API v1 field names
    // Rather than adding a 'places.' prefix, we just use the raw field names
    // which seems to be what the Places API v1 expects in the field mask
    const mappedFields = fields.map(field => {
      // Map the field name to the Google Places API v1 field name
      switch (field) {
        case 'place_id': return 'id';
        case 'name': return 'displayName.text';
        case 'formatted_address': return 'formattedAddress';
        case 'types': return 'types';
        case 'geometry': return 'location';
        case 'photos': return 'photos';
        case 'rating': return 'rating';
        case 'user_ratings_total': return 'userRatingCount';
        case 'editorial_summary': return 'editorialSummary.text';
        case 'formatted_phone_number': return 'internationalPhoneNumber';
        case 'website': return 'websiteUri';
        case 'url': return 'googleMapsUri';
        case 'opening_hours': return 'regularOpeningHours';
        case 'price_level': return 'priceLevel';
        case 'business_status': return 'businessStatus';
        default: 
          // For fields that don't have a mapping, strip any 'places.' prefix
          // and use the field name as-is
          return field.startsWith('places.') ? field.substring(7) : field;
      }
    });
    
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
    console.error(`GooglePlacesFetchClient.findPlace called with query: ${params.query}`);
    try {
      // Use the wildcard '*' field mask to get all available fields
      // This should work based on the error message we received
      
      const searchUrl = new URL('https://places.googleapis.com/v1/places:searchText');
      
      const requestBody = {
        textQuery: params.query,
        ...(params.language && { languageCode: params.language }),
        ...(params.region && { regionCode: params.region })
      };
      
      console.error(`Request body: ${JSON.stringify(requestBody)}`);
      console.error(`Fetching from URL: ${searchUrl.toString()}`);
      
      const finalUrl = `${searchUrl.toString()}?key=${this.apiKey}`;
      console.error('Final search URL (with key redacted):', finalUrl.replace(this.apiKey, 'REDACTED'));
      
      const response = await fetch(finalUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-FieldMask': '*' // Use wildcard to get all fields
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error: ${errorText}`);
        throw new Error(`Google Places API error: ${response.status} - ${errorText}`);
      }
      
      const data: any = await response.json();
      console.error(`Received places data: ${JSON.stringify(data).substring(0, 200)}...`);
      
      // Handle results and apply max_results limit if needed
      const places = data.places || [];
      const limitedPlaces = params.max_results && params.max_results > 0 
        ? places.slice(0, params.max_results) 
        : places;
      
      return {
        status: "success",
        candidates: limitedPlaces.map((place: any) => ({
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
      console.error(`GooglePlacesFetchClient.findPlace exception: ${e.message}`, e);
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
    console.error(`GooglePlacesFetchClient.getPlaceDetails called for place_id: ${params.place_id}`);
    try {
      // Use the wildcard '*' field mask to get all available fields
      // This should work based on the error message we received
      
      // For Places API v1, use the correct URL format
      const detailsUrl = new URL(`https://places.googleapis.com/v1/places/${params.place_id}`);
      const urlParams = new URLSearchParams();
      urlParams.append('key', this.apiKey);
      
      if (params.language) {
        urlParams.append('languageCode', params.language);
      }
      
      if (params.region) {
        urlParams.append('regionCode', params.region);
      }
            
      const finalUrl = `${detailsUrl.toString()}?${urlParams.toString()}`;
      console.error('Final URL (with key redacted):', finalUrl.replace(this.apiKey, 'REDACTED'));
      
      const response = await fetch(finalUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-FieldMask': '*' // Use wildcard to get all fields
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error: ${errorText}`);
        throw new Error(`Google Places API error: ${response.status} - ${errorText}`);
      }
      
      const place: any = await response.json();
      console.error(`Received place data: ${JSON.stringify(place).substring(0, 200)}...`);
      
      // Transform response to match the format expected by Claude
      return {
        status: "success",
        result: {
          place_id: place.id,
          name: place.displayName?.text,
          formatted_address: place.formattedAddress,
          types: place.types,
          rating: place.rating,
          user_ratings_total: place.userRatingCount,
          editorial_summary: place.editorialSummary?.text,
          formatted_phone_number: place.internationalPhoneNumber,
          website: place.websiteUri,
          url: place.googleMapsUri,
          business_status: place.businessStatus,
          // Handle opening hours
          opening_hours: place.regularOpeningHours ? {
            open_now: place.regularOpeningHours.openNow,
            weekday_text: place.regularOpeningHours.weekdayDescriptions
          } : undefined,
          // Handle photos
          photos: place.photos?.map((photo: any) => ({
            photo_reference: photo.name, // The photo name is used as the reference in Places API v1
            height: photo.heightPx,
            width: photo.widthPx
          }))
        }
      };
    } catch (e: any) {
      console.error(`GooglePlacesFetchClient.getPlaceDetails exception: ${e.message}`, e);
      return { status: "error", message: e.message };
    }
  }
  
  // Method to get place photo URL
  async getPlacePhotoUrl(params: {
    photo_reference: string;
    max_width?: number;
    max_height?: number;
  }): Promise<any> {
    console.error(`GooglePlacesFetchClient.getPlacePhotoUrl called for photo_reference: ${params.photo_reference}`);
    
    try {
      // For Places API v1, the photo_reference should be a resource path like 'places/ChIJN1t_tDeuEmsRUsoyG83frY4/photos/AWU5eFgsnF8iNkzV68qLPR8iZoA6OMEhH_ggxg2nG_u1TlQbUL4TLpF2boNct9VzPRIRRvJhqgcMnRF60NpWkxWzL_WB22IskQBrRXR9UTwHGcXTcB7lx6NCRk-1eTJhf1dKMGM7aRV3-PnMlGUW8QLvrLLl5p4QJ77xJA'
      let photoRef = params.photo_reference;
      
      // If it looks like a simple ID or path component, construct a full path
      if (!photoRef.includes('places/') && !photoRef.includes('photos/')) {
        photoRef = `photos/${photoRef}`;
      }
      
      // The URL format for Places API v1
      let photoUrl = `https://places.googleapis.com/v1/${photoRef}/media`;
      
      // Add URL parameters
      const urlParams = new URLSearchParams();
      urlParams.append('key', this.apiKey);
      
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
      
      const finalUrl = `${photoUrl}?${urlParams.toString()}`;
      console.error('Final photo URL (with key redacted):', finalUrl.replace(this.apiKey, 'REDACTED'));
      
      // Make the request to get the actual photo URL from the 302 redirect
      try {
        const response = await fetch(finalUrl, {
          method: 'GET',
          redirect: 'manual' // Don't follow redirects automatically
        });
        
        if (response.status === 302) {
          // Parse the response body to get the photoUri
          const responseData = await response.json();
          const actualPhotoUrl = responseData.photoUri;
          
          console.error('Got actual photo URL:', actualPhotoUrl);
          
          return {
            status: "success",
            url: finalUrl,
            direct_photo_url: actualPhotoUrl,
            instructions: "Use direct_photo_url for displaying images. Include proper headers: User-Agent and Referer for best compatibility.",
            headers_needed: {
              "User-Agent": "Mozilla/5.0 (compatible; MCP-GooglePlaces/1.0)",
              "Referer": "https://maps.google.com/"
            }
          };
        } else {
          // Fallback to original URL if no redirect
          return {
            status: "success",
            url: finalUrl,
            note: "This URL may require proper headers for access"
          };
        }
      } catch (fetchError: any) {
        // If fetch fails, still return the URL
        console.error('Fetch error for photo URL:', fetchError.message);
        return {
          status: "success",
          url: finalUrl,
          warning: "Could not resolve direct photo URL, but this URL should work with proper headers"
        };
      }
    } catch (e: any) {
      console.error(`GooglePlacesFetchClient.getPlacePhotoUrl exception: ${e.message}`, e);
      return { status: "error", message: e.message };
    }
  }
}
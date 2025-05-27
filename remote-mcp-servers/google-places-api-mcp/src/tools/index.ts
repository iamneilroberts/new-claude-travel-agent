import { GooglePlacesFetchClient } from '../googlePlacesFetchClient.js';

export interface Env {
  GOOGLE_MAPS_API_KEY: string;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface ToolHandler {
  (params: any): Promise<any>;
}

export interface ToolRegistry {
  tools: Tool[];
  handlers: Map<string, ToolHandler>;
}

export async function initializeTools(env: Env): Promise<ToolRegistry> {
  const registry: ToolRegistry = {
    tools: [],
    handlers: new Map()
  };
  
  // Create Google Places Client using Fetch API
  const placesClient = new GooglePlacesFetchClient(env.GOOGLE_MAPS_API_KEY);
  
  // Find Place Tool
  registry.tools.push({
    name: 'find_place',
    description: 'Searches for places based on a text query. Returns a list of candidates.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The text string to search for (e.g., "restaurants in Paris", "Eiffel Tower").'
        },
        language: {
          type: 'string',
          description: 'The language code (e.g., "en", "fr") to return results in.',
          enum: ["ar", "be", "bg", "bn", "ca", "cs", "da", "de", "el", "en", "en-Au", "en-GB", "es", "eu", "fa", "fi", "fil", "fr", "gl", "gu", "hi", "hr", "hu", "id", "it", "iw", "ja", "kk", "kn", "ko", "ky", "lt", "lv", "mk", "ml", "mr", "my", "nl", "no", "pa", "pl", "pt", "pt-BR", "pt-PT", "ro", "ru", "sk", "sl", "sq", "sr", "sv", "ta", "te", "th", "tl", "tr", "uk", "uz", "vi", "zh-CN", "zh-TW"]
        },
        region: {
          type: 'string',
          description: 'The region code (e.g., "us", "fr") to bias results towards.'
        },
        fields: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Fields to include in the response.'
        },
        max_results: {
          type: 'integer',
          description: 'Maximum number of place candidates to return (default 5, max 10).',
          default: 5,
          maximum: 10,
          minimum: 1
        }
      },
      required: ['query']
    }
  });
  
  registry.handlers.set('find_place', async (args) => {
    try {
      const result = await placesClient.findPlace({
        query: args.query,
        language: args.language,
        region: args.region,
        fields: args.fields,
        max_results: args.max_results || 5,
      });
      return result;
    } catch (error) {
      console.error(`Error in 'find_place' tool:`, error);
      return { status: "error", message: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
  
  // Get Place Details Tool
  registry.tools.push({
    name: 'get_place_details',
    description: 'Retrieves detailed information about a specific place using its Place ID.',
    inputSchema: {
      type: 'object',
      properties: {
        place_id: {
          type: 'string',
          description: 'The Place ID of the place.'
        },
        language: {
          type: 'string',
          description: 'The language code for the results.',
          enum: ["ar", "be", "bg", "bn", "ca", "cs", "da", "de", "el", "en", "en-Au", "en-GB", "es", "eu", "fa", "fi", "fil", "fr", "gl", "gu", "hi", "hr", "hu", "id", "it", "iw", "ja", "kk", "kn", "ko", "ky", "lt", "lv", "mk", "ml", "mr", "my", "nl", "no", "pa", "pl", "pt", "pt-BR", "pt-PT", "ro", "ru", "sk", "sl", "sq", "sr", "sv", "ta", "te", "th", "tl", "tr", "uk", "uz", "vi", "zh-CN", "zh-TW"]
        },
        region: {
          type: 'string',
          description: 'The region code for biasing results.'
        },
        fields: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Specific fields to request.'
        }
      },
      required: ['place_id']
    }
  });
  
  registry.handlers.set('get_place_details', async (args) => {
    try {
      const result = await placesClient.getPlaceDetails({
        place_id: args.place_id,
        language: args.language,
        region: args.region,
        fields: args.fields,
      });
      return result;
    } catch (error) {
      console.error(`Error in 'get_place_details' tool:`, error);
      return { status: "error", message: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
  
  // Get Place Photo URL Tool
  registry.tools.push({
    name: 'get_place_photo_url',
    description: 'Constructs and returns a direct URL to a place photo using its photo reference.',
    inputSchema: {
      type: 'object',
      properties: {
        photo_reference: {
          type: 'string',
          description: 'The reference string for the photo, obtained from get_place_details.'
        },
        max_width: {
          type: 'integer',
          description: 'Maximum desired width of the photo in pixels.'
        },
        max_height: {
          type: 'integer',
          description: 'Maximum desired height of the photo in pixels.'
        }
      },
      required: ['photo_reference']
    }
  });
  
  registry.handlers.set('get_place_photo_url', (args) => {
    try {
      const result = placesClient.getPlacePhotoUrl({
        photo_reference: args.photo_reference,
        max_width: args.max_width,
        max_height: args.max_height
      });
      return result;
    } catch (error) {
      console.error(`Error in 'get_place_photo_url' tool:`, error);
      return { status: "error", message: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
  
  return registry;
}
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GooglePlacesFetchClient } from "./googlePlacesFetchClient.js";

interface Env {
  GOOGLE_MAPS_API_KEY: string;
  MCP_AUTH_KEY: string;
}

export class GooglePlacesMCP extends McpAgent {
  server = new McpServer({
    name: "Google Places API MCP",
    version: "1.0.0",
  });

  async init() {
    const env = this.env as Env;
    
    try {
      // Create Google Places Client using Fetch API
      const placesClient = new GooglePlacesFetchClient(env.GOOGLE_MAPS_API_KEY);
      
      // Find Place Tool
      this.server.tool(
        'find_place',
        {
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
        },
        async (params) => {
          try {
            const result = await placesClient.findPlace({
              query: params.query,
              language: params.language,
              region: params.region,
              fields: params.fields,
              max_results: params.max_results || 5,
            });
            return {
              content: [{
                type: "text",
                text: JSON.stringify(result)
              }]
            };
          } catch (error) {
            console.error(`Error in 'find_place' tool:`, error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ status: "error", message: error instanceof Error ? error.message : 'Unknown error' })
              }]
            };
          }
        }
      );

      // Get Place Details Tool
      this.server.tool(
        'get_place_details',
        {
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
        },
        async (params) => {
          try {
            const result = await placesClient.getPlaceDetails({
              place_id: params.place_id,
              language: params.language,
              region: params.region,
              fields: params.fields,
            });
            return {
              content: [{
                type: "text",
                text: JSON.stringify(result)
              }]
            };
          } catch (error) {
            console.error(`Error in 'get_place_details' tool:`, error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ status: "error", message: error instanceof Error ? error.message : 'Unknown error' })
              }]
            };
          }
        }
      );

      // Get Place Photo URL Tool
      this.server.tool(
        'get_place_photo_url',
        {
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
        },
        async (params) => {
          try {
            const result = await placesClient.getPlacePhotoUrl({
              photo_reference: params.photo_reference,
              max_width: params.max_width,
              max_height: params.max_height
            });
            return {
              content: [{
                type: "text",
                text: JSON.stringify(result)
              }]
            };
          } catch (error) {
            console.error(`Error in 'get_place_photo_url' tool:`, error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ status: "error", message: error instanceof Error ? error.message : 'Unknown error' })
              }]
            };
          }
        }
      );
      
      console.log(`Registered 3 Google Places tools`);
    } catch (error) {
      console.error('Failed to initialize Google Places tools:', error);
      
      // Fallback to basic tools if initialization fails
      this.server.tool("test_connection", {}, async () => ({
        content: [{ 
          type: "text", 
          text: "Tool initialization failed. Please check Google Maps API key." 
        }],
        isError: true
      }));
    }
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    
    // Standard MCP HTTP endpoints
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return GooglePlacesMCP.serveSSE("/sse").fetch(request, env, ctx);
    }
    
    if (url.pathname === "/mcp") {
      return GooglePlacesMCP.serve("/mcp").fetch(request, env, ctx);
    }
    
    // Health check endpoint
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({
        status: "healthy",
        service: "Google Places API MCP",
        version: "1.0.0",
        timestamp: new Date().toISOString()
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    return new Response(JSON.stringify({
      error: "Not found",
      available_endpoints: ["/sse", "/mcp", "/health"]
    }), { 
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  },
};
// Environment interface
interface Env {
  MCP_AUTH_KEY: string;
  CP_CENTRAL_LOGIN?: string;
  CP_CENTRAL_PASSWORD?: string;
  CPMAXX_BASE_URL?: string;
}

// Import browser automation components
import { 
  CPMaxxBrowserAutomation, 
  type HotelSearchParams, 
  type CarSearchParams, 
  type PackageSearchParams,
  type BrowserConfig 
} from "./browser-automation.js";

// Direct JSON Schema definitions (no more Zod complexity!)
const toolSchemas = {
  cpmaxx_search_hotels: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'Hotel search location (city, region, or landmark)'
      },
      check_in: {
        type: 'string',
        description: 'Check-in date (YYYY-MM-DD format)'
      },
      check_out: {
        type: 'string',
        description: 'Check-out date (YYYY-MM-DD format)'
      },
      rooms: {
        type: 'number',
        minimum: 1,
        maximum: 10,
        description: 'Number of rooms (1-10)'
      },
      adults: {
        type: 'number',
        minimum: 1,
        maximum: 20,
        description: 'Number of adults (1-20)'
      },
      children: {
        type: 'number',
        minimum: 0,
        maximum: 10,
        description: 'Number of children (0-10)'
      },
      search_all_hotels: {
        type: 'boolean',
        description: 'Return ALL available hotels (default: true)'
      },
      include_commission_data: {
        type: 'boolean',
        description: 'Include real commission percentages (default: true)'
      }
    },
    required: ['location', 'check_in', 'check_out', 'rooms', 'adults']
  },
  cpmaxx_get_hotel_details: {
    type: 'object',
    properties: {
      hotel_name: {
        type: 'string',
        description: 'Name of hotel to get details for'
      },
      hotel_id: {
        type: 'string',
        description: 'Hotel ID from search results (optional alternative to name)'
      }
    },
    required: ['hotel_name']
  },
  cpmaxx_get_hotels_by_criteria: {
    type: 'object',
    properties: {
      criteria: {
        type: 'string',
        enum: ['commission', 'rating', 'price', 'balanced'],
        description: 'Sorting criteria for hotel results'
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 50,
        description: 'Maximum number of hotels to return (default: 20)'
      },
      min_commission: {
        type: 'number',
        minimum: 0,
        maximum: 100,
        description: 'Minimum commission percentage filter'
      },
      min_rating: {
        type: 'number',
        minimum: 1,
        maximum: 5,
        description: 'Minimum star rating filter'
      }
    },
    required: ['criteria']
  },
  cpmaxx_search_cars: {
    type: 'object',
    properties: {
      pickup_location: {
        type: 'string',
        description: 'Car pickup location'
      },
      dropoff_location: {
        type: 'string',
        description: 'Car dropoff location (can be same as pickup)'
      },
      pickup_date: {
        type: 'string',
        description: 'Pickup date (YYYY-MM-DD format)'
      },
      dropoff_date: {
        type: 'string',
        description: 'Dropoff date (YYYY-MM-DD format)'
      },
      pickup_time: {
        type: 'string',
        description: 'Pickup time (HH:MM format, default: 10:00)'
      },
      dropoff_time: {
        type: 'string',
        description: 'Dropoff time (HH:MM format, default: 10:00)'
      },
      driver_age: {
        type: 'number',
        minimum: 18,
        maximum: 99,
        description: 'Driver age (default: 30)'
      }
    },
    required: ['pickup_location', 'dropoff_location', 'pickup_date', 'dropoff_date']
  },
  cpmaxx_search_packages: {
    type: 'object',
    properties: {
      destination: {
        type: 'string',
        description: 'Package destination (city, country, or region)'
      },
      departure_date: {
        type: 'string',
        description: 'Departure date (YYYY-MM-DD format)'
      },
      return_date: {
        type: 'string',
        description: 'Return date (YYYY-MM-DD format)'
      },
      travelers: {
        type: 'number',
        minimum: 1,
        maximum: 20,
        description: 'Number of travelers (default: 2)'
      },
      package_type: {
        type: 'string',
        enum: ['air_hotel', 'air_car', 'air_hotel_car', 'cruise', 'tour'],
        description: 'Type of package to search for'
      },
      departure_city: {
        type: 'string',
        description: 'Departure city/airport (optional)'
      }
    },
    required: ['destination', 'departure_date', 'return_date', 'package_type']
  },
  cpmaxx_manage_session: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['login', 'logout', 'status', 'refresh'],
        description: 'Session management action'
      },
      force_new_session: {
        type: 'boolean',
        description: 'Force new login session (default: false)'
      }
    },
    required: ['action']
  },
  cpmaxx_test_automation: {
    type: 'object',
    properties: {
      test_type: {
        type: 'string',
        enum: ['login', 'navigation', 'hotel_search', 'data_extraction', 'full_workflow'],
        description: 'Type of automation test to run'
      },
      visible_browser: {
        type: 'boolean',
        description: 'Run browser in visible mode for debugging (default: false)'
      },
      test_location: {
        type: 'string',
        description: 'Test location for search tests (default: Miami)'
      }
    },
    required: ['test_type']
  },
  cpmaxx_download_hotel_photos: {
    type: 'object',
    properties: {
      hotel_name: {
        type: 'string',
        description: 'Name of hotel to download photos for'
      },
      hotel_id: {
        type: 'string',
        description: 'Hotel ID from search results (optional alternative to name)'
      },
      max_photos: {
        type: 'number',
        minimum: 1,
        maximum: 50,
        description: 'Maximum number of photos to download (default: 10)'
      },
      photo_categories: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['exterior', 'lobby', 'room', 'amenities', 'dining', 'pool', 'spa', 'all']
        },
        description: 'Categories of photos to download (default: all)'
      },
      store_in_r2: {
        type: 'boolean',
        description: 'Store photos in R2 storage (default: true)'
      }
    },
    required: ['hotel_name']
  },
  cpmaxx_health_check: {
    type: 'object',
    properties: {},
    required: []
  }
};

// Tool implementations - need to import these from the existing tools
import { searchHotels } from "./tools/search-hotels.js";
import { getHotelDetails } from "./tools/search-hotels.js";
import { getHotelsByCriteria } from "./tools/search-hotels.js";
import { searchCars } from "./tools/search-cars.js";
import { searchPackages } from "./tools/search-packages.js";
import { manageSession } from "./tools/session-management.js";
import { testBrowserAutomation } from "./tools/test-automation.js";
import { downloadHotelPhotos } from "./tools/download-hotel-photos.js";

class CPMaxxTools {
  private env: Env;
  
  constructor(env: Env) {
    this.env = env;
  }
  
  async cpmaxx_search_hotels(params: any) {
    try {
      console.log('cpmaxx_search_hotels called with:', params);
      const result = await searchHotels(params, this.env);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error: any) {
      console.error('Exception in cpmaxx_search_hotels:', error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ 
            status: "error", 
            message: error.message || 'Hotel search failed',
            timestamp: new Date().toISOString()
          }, null, 2)
        }],
        isError: true
      };
    }
  }
  
  async cpmaxx_get_hotel_details(params: any) {
    try {
      console.log('cpmaxx_get_hotel_details called with:', params);
      const result = await getHotelDetails(params);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error: any) {
      console.error('Exception in cpmaxx_get_hotel_details:', error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ 
            status: "error", 
            message: error.message || 'Hotel details retrieval failed',
            timestamp: new Date().toISOString()
          }, null, 2)
        }],
        isError: true
      };
    }
  }
  
  async cpmaxx_get_hotels_by_criteria(params: any) {
    try {
      console.log('cpmaxx_get_hotels_by_criteria called with:', params);
      const result = await getHotelsByCriteria(params);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error: any) {
      console.error('Exception in cpmaxx_get_hotels_by_criteria:', error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ 
            status: "error", 
            message: error.message || 'Hotels by criteria retrieval failed',
            timestamp: new Date().toISOString()
          }, null, 2)
        }],
        isError: true
      };
    }
  }
  
  async cpmaxx_search_cars(params: any) {
    try {
      console.log('cpmaxx_search_cars called with:', params);
      const result = await searchCars(params, this.env);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error: any) {
      console.error('Exception in cpmaxx_search_cars:', error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ 
            status: "error", 
            message: error.message || 'Car rental search failed',
            timestamp: new Date().toISOString()
          }, null, 2)
        }],
        isError: true
      };
    }
  }
  
  async cpmaxx_search_packages(params: any) {
    try {
      console.log('cpmaxx_search_packages called with:', params);
      const result = await searchPackages(params, this.env);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error: any) {
      console.error('Exception in cpmaxx_search_packages:', error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ 
            status: "error", 
            message: error.message || 'Package search failed',
            timestamp: new Date().toISOString()
          }, null, 2)
        }],
        isError: true
      };
    }
  }
  
  async cpmaxx_manage_session(params: any) {
    try {
      console.log('cpmaxx_manage_session called with:', params);
      const result = await manageSession(params, this.env);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error: any) {
      console.error('Exception in cpmaxx_manage_session:', error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ 
            status: "error", 
            message: error.message || 'Session management failed',
            timestamp: new Date().toISOString()
          }, null, 2)
        }],
        isError: true
      };
    }
  }
  
  async cpmaxx_test_automation(params: any) {
    try {
      console.log('cpmaxx_test_automation called with:', params);
      const result = await testBrowserAutomation(params);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error: any) {
      console.error('Exception in cpmaxx_test_automation:', error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ 
            status: "error", 
            message: error.message || 'Automation test failed',
            timestamp: new Date().toISOString()
          }, null, 2)
        }],
        isError: true
      };
    }
  }
  
  async cpmaxx_download_hotel_photos(params: any) {
    try {
      console.log('cpmaxx_download_hotel_photos called with:', params);
      const result = await downloadHotelPhotos(params, this.env);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error: any) {
      console.error('Exception in cpmaxx_download_hotel_photos:', error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ 
            status: "error", 
            message: error.message || 'Photo download failed',
            timestamp: new Date().toISOString()
          }, null, 2)
        }],
        isError: true
      };
    }
  }
  
  async cpmaxx_health_check() {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          status: "healthy",
          service: "CPMaxx Integration MCP",
          version: "2.0.0",
          timestamp: new Date().toISOString(),
          tools: [
            "cpmaxx_search_hotels",
            "cpmaxx_get_hotel_details",
            "cpmaxx_get_hotels_by_criteria",
            "cpmaxx_search_cars", 
            "cpmaxx_search_packages",
            "cpmaxx_manage_session",
            "cpmaxx_test_automation",
            "cpmaxx_download_hotel_photos",
            "cpmaxx_health_check"
          ],
          environment: {
            hasCredentials: !!(this.env.CP_CENTRAL_LOGIN && this.env.CP_CENTRAL_PASSWORD),
            authKeyConfigured: !!this.env.MCP_AUTH_KEY,
            baseUrl: this.env.CPMAXX_BASE_URL || "https://cpmaxx.cruiseplannersnet.com"
          },
          implementation_status: {
            server_structure: "completed",
            tool_definitions: "completed", 
            browser_automation: "completed",
            data_extraction: "completed",
            error_handling: "comprehensive",
            session_management: "completed",
            testing_framework: "completed"
          },
          features: {
            hotel_search: "OPTIMIZED: Returns ALL hotels with real commission data, comprehensive scoring, coordinates, OTA verification",
            hotel_details: "Complete hotel information retrieval with amenities, photos, booking URLs",
            hotel_filtering: "Sort hotels by commission, rating, price, or balanced scoring",
            car_search: "Real browser automation with data extraction", 
            package_search: "Real browser automation with data extraction",
            session_management: "Login, logout, status checking, authentication",
            automation_testing: "Comprehensive testing for all automation flows",
            photo_download: "Hotel photo download and R2 storage integration",
            error_handling: "Robust error handling and recovery",
            data_quality: "Real commission extraction (not calculated), anti-fallback implementation"
          }
        }, null, 2)
      }]
    };
  }
}

// Pure MCP JSON-RPC 2.0 Handler
class PureCPMaxxMCPServer {
  private tools: CPMaxxTools;
  
  constructor(env: Env) {
    this.tools = new CPMaxxTools(env);
  }
  
  async handleRequest(request: any): Promise<any> {
    const { method, params, id } = request;
    
    try {
      switch (method) {
        case 'initialize':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {}
              },
              serverInfo: {
                name: 'CPMaxx Integration MCP',
                version: '2.0.0'
              }
            }
          };
          
        case 'tools/list':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              tools: [
                {
                  name: 'cpmaxx_search_hotels',
                  description: 'Search for hotels using CPMaxx portal with real browser automation. Returns ALL hotels with essential data for Claude decision-making.',
                  inputSchema: toolSchemas.cpmaxx_search_hotels
                },
                {
                  name: 'cpmaxx_get_hotel_details',
                  description: 'Get complete detailed information for a specific hotel from the most recent search results',
                  inputSchema: toolSchemas.cpmaxx_get_hotel_details
                },
                {
                  name: 'cpmaxx_get_hotels_by_criteria',
                  description: 'Get hotels sorted by specific criteria (commission, rating, price) with full details from recent search',
                  inputSchema: toolSchemas.cpmaxx_get_hotels_by_criteria
                },
                {
                  name: 'cpmaxx_search_cars',
                  description: 'Search for car rentals using CPMaxx portal with real browser automation',
                  inputSchema: toolSchemas.cpmaxx_search_cars
                },
                {
                  name: 'cpmaxx_search_packages',
                  description: 'Search for travel packages using CPMaxx portal with real browser automation',
                  inputSchema: toolSchemas.cpmaxx_search_packages
                },
                {
                  name: 'cpmaxx_manage_session',
                  description: 'Manage CPMaxx session authentication and monitoring',
                  inputSchema: toolSchemas.cpmaxx_manage_session
                },
                {
                  name: 'cpmaxx_test_automation',
                  description: 'Test and debug CPMaxx browser automation with visible browser mode',
                  inputSchema: toolSchemas.cpmaxx_test_automation
                },
                {
                  name: 'cpmaxx_download_hotel_photos',
                  description: 'Download and store hotel photos to R2 storage for selected hotels',
                  inputSchema: toolSchemas.cpmaxx_download_hotel_photos
                },
                {
                  name: 'cpmaxx_health_check',
                  description: 'Check CPMaxx Integration MCP server health and status',
                  inputSchema: toolSchemas.cpmaxx_health_check
                }
              ]
            }
          };
          
        case 'tools/call':
          const toolName = params.name;
          const toolArgs = params.arguments || {};
          
          // Validate tool exists
          if (!(toolName in toolSchemas)) {
            throw new Error(`Unknown tool: ${toolName}`);
          }
          
          // Call the appropriate tool method
          const result = await (this.tools as any)[toolName](toolArgs);
          
          return {
            jsonrpc: '2.0',
            id,
            result
          };
          
        case 'ping':
          return {
            jsonrpc: '2.0',
            id,
            result: {}
          };
          
        default:
          throw new Error(`Unknown method: ${method}`);
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: 'Internal error',
          data: String(error)
        }
      };
    }
  }
}

// Cloudflare Worker Export
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // SSE endpoint for MCP protocol
    if (url.pathname === '/sse') {
      const server = new PureCPMaxxMCPServer(env);
      
      // Handle incoming messages
      if (request.method === 'POST') {
        try {
          const body = await request.json();
          const response = await server.handleRequest(body);
          
          // Return SSE-formatted response
          return new Response(
            `data: ${JSON.stringify(response)}\n\n`,
            {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                ...corsHeaders
              }
            }
          );
        } catch (error) {
          return new Response(
            `data: ${JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32700,
                message: 'Parse error',
                data: String(error)
              }
            })}\n\n`,
            {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                ...corsHeaders
              }
            }
          );
        }
      }
      
      // For GET requests, return a simple SSE connection
      return new Response(
        `data: {"jsonrpc":"2.0","method":"ping","result":{}}\n\n`,
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            ...corsHeaders
          }
        }
      );
    }
    
    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: "healthy",
        service: "Pure CPMaxx Integration MCP v2.0",
        version: "2.0.0",
        tools: [
          "cpmaxx_search_hotels",
          "cpmaxx_get_hotel_details",
          "cpmaxx_get_hotels_by_criteria",
          "cpmaxx_search_cars",
          "cpmaxx_search_packages",
          "cpmaxx_manage_session", 
          "cpmaxx_test_automation",
          "cpmaxx_download_hotel_photos",
          "cpmaxx_health_check"
        ],
        features: {
          browser_automation: "Full implementation with Playwright",
          data_extraction: "OPTIMIZED: Real commission extraction, ALL hotels returned, comprehensive scoring",
          session_management: "Authentication and session handling", 
          hotel_intelligence: "Multi-criteria scoring for Claude decision-making",
          anti_fallback: "No mock data or fallbacks - real data or clear errors",
          comprehensive_testing: "End-to-end testing framework"
        },
        timestamp: new Date().toISOString()
      }), {
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    
    // Default response
    return new Response(JSON.stringify({
      error: "Not found",
      available_endpoints: ["/sse", "/health"]
    }), {
      status: 404,
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
};
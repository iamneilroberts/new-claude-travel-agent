import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { 
  CPMaxxBrowserAutomation, 
  type HotelSearchParams, 
  type CarSearchParams, 
  type PackageSearchParams,
  type BrowserConfig 
} from "./browser-automation.js";

// Import all automation tools
import { 
  searchHotelsSchema,
  searchHotels,
  getHotelDetailsSchema,
  getHotelDetails,
  getHotelsByCriteriaSchema,
  getHotelsByCriteria
} from "./tools/search-hotels.js";
import { 
  searchCarsSchema,
  searchCars
} from "./tools/search-cars.js";
import { 
  searchPackagesSchema,
  searchPackages
} from "./tools/search-packages.js";
import { 
  manageSessionSchema,
  manageSession
} from "./tools/session-management.js";
import { 
  testBrowserAutomationSchema,
  testBrowserAutomation
} from "./tools/test-automation.js";
import { 
  downloadHotelPhotosSchema,
  downloadHotelPhotos
} from "./tools/download-hotel-photos.js";

interface Env {
  MCP_AUTH_KEY: string;
  CP_CENTRAL_LOGIN?: string;
  CP_CENTRAL_PASSWORD?: string;
  CPMAXX_BASE_URL?: string;
}

export class CPMaxxIntegrationMCP extends McpAgent {
  server = new McpServer({
    name: "CPMaxx Integration MCP",
    version: "1.0.0",
  });

  async init() {
    const env = (this as any).env as Env;

    try {
      console.log("Initializing CPMaxx Integration MCP server...");

      // Hotel Search Tool - OPTIMIZED Real Automation with ALL hotels returned
      this.server.tool(
        'cpmaxx_search_hotels',
        'Search for hotels using CPMaxx portal with real browser automation. Returns ALL hotels with essential data for Claude decision-making.',
        searchHotelsSchema.shape,
        async (params) => {
          try {
            console.log(`Hotel search request for: ${params.location}`);
            const result = await searchHotels(params, env);
            return {
              content: [{
                type: "text",
                text: JSON.stringify(result, null, 2)
              }]
            };
          } catch (error) {
            console.error(`Error in 'cpmaxx_search_hotels':`, error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ 
                  status: "error", 
                  message: error instanceof Error ? error.message : 'Hotel search failed',
                  timestamp: new Date().toISOString()
                }, null, 2)
              }]
            };
          }
        }
      );

      // Get Hotel Details Tool
      this.server.tool(
        'cpmaxx_get_hotel_details',
        'Get complete detailed information for a specific hotel from the most recent search results',
        getHotelDetailsSchema.shape,
        async (params) => {
          try {
            console.log(`Hotel details request for: ${params.hotel_name}`);
            const result = await getHotelDetails(params);
            return {
              content: [{
                type: "text",
                text: JSON.stringify(result, null, 2)
              }]
            };
          } catch (error) {
            console.error(`Error in 'cpmaxx_get_hotel_details':`, error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ 
                  status: "error", 
                  message: error instanceof Error ? error.message : 'Hotel details retrieval failed',
                  timestamp: new Date().toISOString()
                }, null, 2)
              }]
            };
          }
        }
      );

      // Get Hotels By Criteria Tool
      this.server.tool(
        'cpmaxx_get_hotels_by_criteria',
        'Get hotels sorted by specific criteria (commission, rating, price) with full details from recent search',
        getHotelsByCriteriaSchema.shape,
        async (params) => {
          try {
            console.log(`Hotels by criteria request: ${params.criteria}`);
            const result = await getHotelsByCriteria(params);
            return {
              content: [{
                type: "text",
                text: JSON.stringify(result, null, 2)
              }]
            };
          } catch (error) {
            console.error(`Error in 'cpmaxx_get_hotels_by_criteria':`, error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ 
                  status: "error", 
                  message: error instanceof Error ? error.message : 'Hotels by criteria retrieval failed',
                  timestamp: new Date().toISOString()
                }, null, 2)
              }]
            };
          }
        }
      );

      // Car Rental Search Tool - Real Automation
      this.server.tool(
        'cpmaxx_search_cars',
        'Search for car rentals using CPMaxx portal with real browser automation',
        searchCarsSchema.shape,
        async (params) => {
          try {
            console.log(`Car rental search request for: ${params.pickup_location}`);
            const result = await searchCars(params, env);
            return {
              content: [{
                type: "text",
                text: JSON.stringify(result, null, 2)
              }]
            };
          } catch (error) {
            console.error(`Error in 'cpmaxx_search_cars':`, error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ 
                  status: "error", 
                  message: error instanceof Error ? error.message : 'Car rental search failed',
                  timestamp: new Date().toISOString()
                }, null, 2)
              }]
            };
          }
        }
      );

      // Package Search Tool - Real Automation
      this.server.tool(
        'cpmaxx_search_packages',
        'Search for travel packages using CPMaxx portal with real browser automation',
        searchPackagesSchema.shape,
        async (params) => {
          try {
            console.log(`Package search request for: ${params.destination}`);
            const result = await searchPackages(params, env);
            return {
              content: [{
                type: "text",
                text: JSON.stringify(result, null, 2)
              }]
            };
          } catch (error) {
            console.error(`Error in 'cpmaxx_search_packages':`, error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ 
                  status: "error", 
                  message: error instanceof Error ? error.message : 'Package search failed',
                  timestamp: new Date().toISOString()
                }, null, 2)
              }]
            };
          }
        }
      );

      // Session Management Tool
      this.server.tool(
        'cpmaxx_manage_session',
        'Manage CPMaxx session authentication and monitoring',
        manageSessionSchema.shape,
        async (params) => {
          try {
            console.log(`Session management action: ${params.action}`);
            const result = await manageSession(params, env);
            return {
              content: [{
                type: "text",
                text: JSON.stringify(result, null, 2)
              }]
            };
          } catch (error) {
            console.error(`Error in 'cpmaxx_manage_session':`, error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ 
                  status: "error", 
                  message: error instanceof Error ? error.message : 'Session management failed',
                  timestamp: new Date().toISOString()
                }, null, 2)
              }]
            };
          }
        }
      );

      // Automation Testing Tool
      this.server.tool(
        'cpmaxx_test_automation',
        'Test and debug CPMaxx browser automation with visible browser mode',
        testBrowserAutomationSchema.shape,
        async (params) => {
          try {
            console.log(`Running automation test: ${params.test_type}`);
            const result = await testBrowserAutomation(params);
            return {
              content: [{
                type: "text",
                text: JSON.stringify(result, null, 2)
              }]
            };
          } catch (error) {
            console.error(`Error in 'cpmaxx_test_automation':`, error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ 
                  status: "error", 
                  message: error instanceof Error ? error.message : 'Automation test failed',
                  timestamp: new Date().toISOString()
                }, null, 2)
              }]
            };
          }
        }
      );

      // Hotel Photo Download Tool
      this.server.tool(
        'cpmaxx_download_hotel_photos',
        'Download and store hotel photos to R2 storage for selected hotels',
        downloadHotelPhotosSchema.shape,
        async (params) => {
          try {
            console.log(`Downloading photos for hotel: ${params.hotel_name}`);
            const result = await downloadHotelPhotos(params, env);
            return {
              content: [{
                type: "text",
                text: JSON.stringify(result, null, 2)
              }]
            };
          } catch (error) {
            console.error(`Error in 'cpmaxx_download_hotel_photos':`, error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ 
                  status: "error", 
                  message: error instanceof Error ? error.message : 'Photo download failed',
                  timestamp: new Date().toISOString()
                }, null, 2)
              }]
            };
          }
        }
      );

      // Health check tool
      this.server.tool(
        'cpmaxx_health_check',
        'Check CPMaxx Integration MCP server health and status',
        {},
        async () => {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "healthy",
                service: "CPMaxx Integration MCP",
                version: "1.0.0",
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
                  hasCredentials: !!(env.CP_CENTRAL_LOGIN && env.CP_CENTRAL_PASSWORD),
                  authKeyConfigured: !!env.MCP_AUTH_KEY,
                  baseUrl: env.CPMAXX_BASE_URL || "https://cpmaxx.cruiseplannersnet.com"
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
      );

      console.log("CPMaxx Integration MCP server initialized with all tools");
    } catch (error) {
      console.error("Failed to initialize CPMaxx MCP server:", error);
      
      // Fallback health check tool if initialization fails
      this.server.tool("cpmaxx_error_check", {}, async () => ({
        content: [{
          type: "text",
          text: `CPMaxx Integration MCP server is running but tool initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      }));
      
      throw error;
    }
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // Standard MCP HTTP endpoints
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return CPMaxxIntegrationMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    if (url.pathname === "/mcp") {
      return CPMaxxIntegrationMCP.serve("/mcp").fetch(request, env, ctx);
    }

    // Health check endpoint
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({
        status: "healthy",
        service: "CPMaxx Integration MCP",
        version: "1.0.0",
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
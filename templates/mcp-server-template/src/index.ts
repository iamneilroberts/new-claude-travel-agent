import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

interface Env {
  // Add your environment variables here
  API_KEY?: string;
  MCP_AUTH_KEY: string;
}

export class YourServiceMCP extends McpAgent {
  server = new McpServer({
    name: "Your Service MCP",
    version: "1.0.0",
  });

  async init() {
    const env = (this as any).env as Env;

    // Add missing MCP protocol method handlers - REQUIRED for Claude Desktop compatibility
    this.server.setRequestHandler(
      { method: "prompts/list" },
      async () => {
        return {
          prompts: [] // Return empty array - server has no prompts
        };
      }
    );

    this.server.setRequestHandler(
      { method: "resources/list" },
      async () => {
        return {
          resources: [] // Return empty array - server has no resources
        };
      }
    );

    this.server.setRequestHandler(
      { method: "resources/templates/list" },
      async () => {
        return {
          resourceTemplates: [] // Return empty array - server has no resource templates
        };
      }
    );

    try {
      console.log("Initializing Your Service MCP server...");

      // Example tool with inline Zod schema (PROVEN PATTERN)
      this.server.tool(
        'example_tool',
        {
          query: z.string().describe('Search query or input text'),
          limit: z.number().min(1).max(100).optional().describe('Maximum results to return'),
          format: z.enum(["json", "text"]).optional().describe('Output format')
        },
        async (params) => {
          try {
            // Your tool logic here
            const result = {
              query: params.query,
              limit: params.limit || 10,
              format: params.format || "json",
              timestamp: new Date().toISOString(),
              status: "success",
              message: "Example tool executed successfully"
            };
            
            return {
              content: [{
                type: "text",
                text: JSON.stringify(result, null, 2)
              }]
            };
          } catch (error) {
            console.error(`Error in 'example_tool':`, error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ 
                  status: "error", 
                  message: error instanceof Error ? error.message : 'Unknown error' 
                })
              }]
            };
          }
        }
      );

      // Health check tool
      this.server.tool(
        'health_check',
        {},
        async () => {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "healthy",
                service: "Your Service MCP",
                version: "1.0.0",
                timestamp: new Date().toISOString(),
                environment: {
                  hasApiKey: !!env.API_KEY,
                  authKeyConfigured: !!env.MCP_AUTH_KEY
                }
              }, null, 2)
            }]
          };
        }
      );

      console.log("MCP server initialized with all tools");
    } catch (error) {
      console.error("Failed to initialize MCP server:", error);
      
      // Fallback health check tool if initialization fails
      this.server.tool("error_check", {}, async () => ({
        content: [{
          type: "text",
          text: `Your Service MCP server is running but tool initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'Your Service MCP',
        version: '1.0.0',
        tools: ['example_tool', 'health_check'],
        endpoints: ['/health', '/sse', '/mcp'],
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // SSE endpoints (primary - used by mcp-use bridge)
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return YourServiceMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    // MCP endpoint (fallback - direct MCP protocol)
    if (url.pathname === "/mcp") {
      return YourServiceMCP.serve("/mcp").fetch(request, env, ctx);
    }

    // Default 404 response
    return new Response(JSON.stringify({
      error: "Not found",
      available_endpoints: ["/health", "/sse", "/mcp"],
      service: "Your Service MCP",
      version: "1.0.0"
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  },
};
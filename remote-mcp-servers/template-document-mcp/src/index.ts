import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { initializeTools } from "../tools/index.js";

export class TemplateDocumentMCP extends McpAgent {
  server = new McpServer({
    name: "Template Document MCP",
    version: "1.0.0",
  });

  async init() {
    try {
      console.log("Initializing Template Document MCP server...");

      const toolRegistry = await initializeTools();

      // Register all tools with the MCP server using proper schemas
      toolRegistry.tools.forEach(tool => {
        this.server.tool(
          tool.name,
          tool.description,
          tool.inputSchema,
          async (params: any) => {
            const handler = toolRegistry.handlers.get(tool.name);
            if (!handler) {
              throw new Error(`No handler found for tool: ${tool.name}`);
            }

            console.log(`Executing ${tool.name} with params:`, JSON.stringify(params, null, 2));
            const result = await handler(params);
            console.log(`Successfully executed ${tool.name}`);

            return result;
          }
        );
      });

      console.log(`Successfully registered ${toolRegistry.tools.length} template document tools:`);
      toolRegistry.tools.forEach(tool => {
        console.log(`  - ${tool.name}: ${tool.description}`);
      });

    } catch (error) {
      console.error('Failed to initialize Template Document MCP tools:', error);

      // Register a fallback health check tool
      this.server.tool(
        "health_check",
        "Check if the Template Document MCP server is running",
        {},
        async () => ({
          content: [{
            type: "text",
            text: `Template Document MCP server is running but tool initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        })
      );
    }
  }
}

// Default export for Cloudflare Worker
export default {
  fetch(request: Request, env: any, ctx: any) {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'Template Document MCP',
        version: '1.0.0',
        tools: [
          'generate_itinerary',
          'generate_packing_list',
          'generate_travel_budget',
          'generate_travel_checklist'
        ],
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // SSE endpoints (primary)
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return TemplateDocumentMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    // MCP endpoint (fallback)
    if (url.pathname === "/mcp") {
      return TemplateDocumentMCP.serve("/mcp").fetch(request, env, ctx);
    }

    // Default 404 response
    return new Response(JSON.stringify({
      error: "Not found",
      available_endpoints: ["/health", "/sse", "/mcp"]
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  },
};

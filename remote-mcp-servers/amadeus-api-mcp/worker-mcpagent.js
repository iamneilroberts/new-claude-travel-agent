// Amadeus MCP Server using McpAgent framework with modular tools
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { initializeTools } from "./tools/index.js";

export class AmadeusMCP extends McpAgent {
  server = new McpServer({
    name: "Amadeus Travel MCP",
    version: "2.0.0",
  });

  async init() {
    const env = this.env;
    
    try {
      // Initialize the tool registry
      const toolRegistry = await initializeTools(env);
      
      // Register all tools with the server
      toolRegistry.tools.forEach(tool => {
        this.server.tool(
          tool.name,
          tool.inputSchema.properties || {},
          async (params) => {
            const handler = toolRegistry.handlers.get(tool.name);
            if (!handler) {
              throw new Error(`No handler found for tool: ${tool.name}`);
            }
            return await handler(params);
          }
        );
      });
      
      console.log(`Registered ${toolRegistry.tools.length} tools`);
    } catch (error) {
      console.error('Failed to initialize tools:', error);
      
      // Fallback to basic tools if initialization fails
      this.server.tool("test_connection", {}, async () => ({
        content: [{ 
          type: "text", 
          text: "Tool initialization failed. Please check Amadeus API credentials." 
        }],
        isError: true
      }));
    }
  }
}

export default {
  fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'Amadeus API MCP',
        version: '2.0.0',
        framework: 'McpAgent',
        endpoints: ['/mcp', '/sse']
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // SSE endpoints
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return AmadeusMCP.serveSSE("/sse").fetch(request, env, ctx);
    }
    
    // MCP endpoint
    if (url.pathname === "/mcp") {
      return AmadeusMCP.serve("/mcp").fetch(request, env, ctx);
    }
    
    return new Response("Not found", { status: 404 });
  },
};
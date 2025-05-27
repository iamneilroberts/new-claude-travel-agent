// Amadeus MCP Server using McpAgent framework with modular tools
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { initializeTools } from "./tools/index.js";

export class AmadeusMCP extends McpAgent {
  server = new McpServer({
    name: "Amadeus Travel MCP",
    version: "2.0.0",
  });

  // Convert JSON Schema to Zod schema for McpAgent compatibility
  convertToZodSchema(jsonSchema) {
    if (!jsonSchema || !jsonSchema.properties) {
      return {};
    }

    const zodProps = {};
    for (const [key, prop] of Object.entries(jsonSchema.properties)) {
      if (prop.type === 'string') {
        if (prop.enum) {
          zodProps[key] = z.enum(prop.enum);
        } else {
          zodProps[key] = z.string();
        }
      } else if (prop.type === 'number') {
        zodProps[key] = z.number();
      }

      // Make optional if not in required array
      if (!jsonSchema.required || !jsonSchema.required.includes(key)) {
        zodProps[key] = zodProps[key].optional();
      }
    }

    return zodProps;
  }

  async init() {
    const env = this.env;

    try {
      // Initialize the tool registry
      const toolRegistry = await initializeTools(env);

      // Register search_flights tool with proper Zod schema
      this.server.tool(
        "search_flights",
        {
          origin: z.string(),
          destination: z.string(),
          date: z.string(),
          adults: z.number().optional(),
          returnDate: z.string().optional(),
          travelClass: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']).optional()
        },
        async (params) => {
          const handler = toolRegistry.handlers.get("search_flights");
          if (!handler) {
            throw new Error(`No handler found for tool: search_flights`);
          }
          return await handler(params, env);
        }
      );

      // Register other tools with basic schema for now
      toolRegistry.tools.forEach(tool => {
        if (tool.name !== "search_flights") {
          this.server.tool(
            tool.name,
            {},
            async (params) => {
              const handler = toolRegistry.handlers.get(tool.name);
              if (!handler) {
                throw new Error(`No handler found for tool: ${tool.name}`);
              }
              return await handler(params, env);
            }
          );
        }
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

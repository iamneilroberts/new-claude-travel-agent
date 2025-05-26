import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Define our MCP agent with tools - exact copy of d1 pattern
export class AmadeusMCP extends McpAgent {
	server = new McpServer({
		name: "Amadeus Travel MCP",
		version: "2.0.0",
	});

	async init() {
		// Test connection tool
		this.server.tool(
			"test_connection",
			{},
			async () => ({
				content: [{ type: "text", text: "Amadeus API connection test successful!" }],
			})
		);

		// Search flights tool  
		this.server.tool(
			"search_flights",
			{
				origin: { type: "string", description: "Departure IATA city/airport code" },
				destination: { type: "string", description: "Arrival IATA city/airport code" },
				date: { type: "string", description: "Departure date in YYYY-MM-DD format" },
			},
			async ({ origin, destination, date }) => ({
				content: [{
					type: "text",
					text: `Flight search: ${origin} to ${destination} on ${date}`
				}],
			})
		);
	}
}

export default {
	fetch(request, env, ctx) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return AmadeusMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return AmadeusMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
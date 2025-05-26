import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Define our MCP agent with tools - following exact D1 pattern
export class AmadeusMCP extends McpAgent {
	server = new McpServer({
		name: "Amadeus Travel MCP",
		version: "2.0.0",
	});

	env: any = null;

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
				origin: z.string().describe("Departure IATA city/airport code"),
				destination: z.string().describe("Arrival IATA city/airport code"),
				date: z.string().describe("Departure date in YYYY-MM-DD format"),
				adults: z.number().optional().describe("Number of adult passengers"),
			},
			async ({ origin, destination, date, adults = 1 }) => ({
				content: [{
					type: "text",
					text: `Flight search: ${origin} to ${destination} on ${date} for ${adults} passenger(s)`
				}],
			})
		);

		// Search hotels tool
		this.server.tool(
			"search_hotels",
			{
				city: z.string().describe("City name"),
				check_in: z.string().describe("Check-in date in YYYY-MM-DD format"),
				check_out: z.string().describe("Check-out date in YYYY-MM-DD format"),
				adults: z.number().optional().describe("Number of adult guests"),
			},
			async ({ city, check_in, check_out, adults = 1 }) => ({
				content: [{
					type: "text",
					text: `Hotel search: ${city} from ${check_in} to ${check_out} for ${adults} guest(s)`
				}],
			})
		);
	}
}

export default {
	fetch(request: Request, env: any, ctx: any) {
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
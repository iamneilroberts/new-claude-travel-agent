import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchHotels } from "../services/hotel-service";
import { searchFlights } from "../services/flight-service";
import { searchPOI, searchPOIByCoordinates, searchActivitiesByCoordinates } from "../services/poi-service";
import { getAmadeusClient } from "../services/amadeus-client";

// Use the global Env interface from worker-configuration.d.ts

// Define our Amadeus Travel MCP agent
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
			async () => {
				try {
					const env = this.env as Env;
					const amadeus = await getAmadeusClient(env);
					return {
						content: [{ type: "text", text: "✅ Amadeus API connection test successful!" }],
					};
				} catch (error: any) {
					return {
						content: [{ type: "text", text: `❌ Amadeus API connection failed: ${error.message}` }],
						isError: true
					};
				}
			}
		);

		// Search hotels tool
		this.server.tool(
			"search_hotels",
			{
				city: z.string().describe("City name (e.g., 'Paris' or 'Mobile AL')"),
				check_in: z.string().describe("Check-in date in YYYY-MM-DD format"),
				check_out: z.string().describe("Check-out date in YYYY-MM-DD format"),
				adults: z.number().optional().describe("Number of adult guests (default: 1)"),
				radius: z.number().optional().describe("Search radius in kilometers (default: 5)"),
				ratings: z.string().optional().describe("Comma-separated list of star ratings to filter by (e.g., '3,4,5')"),
				priceRange: z.string().optional().describe("Price range filter"),
			},
			async (params) => {
				try {
					const env = this.env as Env;
					const result = await searchHotels(params, env);
					return {
						content: [{
							type: "text",
							text: result
						}]
					};
				} catch (error: any) {
					console.error('Error in search_hotels tool:', error);
					return {
						content: [{
							type: "text",
							text: `Error searching hotels: ${error.message}`
						}],
						isError: true
					};
				}
			}
		);

		// Search hotels by city tool
		this.server.tool(
			"search_hotels_by_city",
			{
				cityCode: z.string().describe("City IATA code (e.g., 'PAR' for Paris)"),
				radius: z.number().optional().describe("Search radius in kilometers (default: 5)"),
				radiusUnit: z.enum(['KM', 'MILE']).optional().describe("Unit for radius (default: KM)"),
				ratings: z.string().optional().describe("Comma-separated list of star ratings"),
				amenities: z.string().optional().describe("Comma-separated list of amenities"),
			},
			async (params) => {
				try {
					const env = this.env as Env;
					const amadeus = await getAmadeusClient(env);

					// Search for hotels by city code
					const hotelListResponse = await amadeus.get('/v1/reference-data/locations/hotels/by-city', {
						cityCode: params.cityCode,
						radius: params.radius || 5,
						radiusUnit: params.radiusUnit || 'KM'
					});

					if (!hotelListResponse.data || hotelListResponse.data.length === 0) {
						return {
							content: [{
								type: "text",
								text: `No hotels found in city ${params.cityCode}`
							}]
						};
					}

					// Format the results
					const hotels = hotelListResponse.data.slice(0, 10).map((hotel: any, index: number) => {
						const name = hotel.name || 'Unknown Hotel';
						const address = hotel.address
							? `${hotel.address.lines?.join(', ') || ''}, ${hotel.address.cityName || ''}`
							: 'Location not available';

						return `${index + 1}. ${name}\n   ${address}`;
					});

					return {
						content: [{
							type: "text",
							text: `Found ${hotels.length} hotels in ${params.cityCode}:\n\n${hotels.join('\n\n')}`
						}]
					};
				} catch (error: any) {
					console.error('Error searching hotels by city:', error);
					return {
						content: [{
							type: "text",
							text: `Error searching hotels by city: ${error.message}`
						}],
						isError: true
					};
				}
			}
		);

		// Search flights tool
		this.server.tool(
			"search_flights",
			{
				origin: z.string().describe("Departure IATA city/airport code"),
				destination: z.string().describe("Arrival IATA city/airport code"),
				date: z.string().describe("Departure date in YYYY-MM-DD format"),
				adults: z.number().optional().describe("Number of adult passengers (default: 1)"),
				returnDate: z.string().optional().describe("Return date for round trip"),
				maxPrice: z.number().optional().describe("Maximum price filter"),
				direct: z.boolean().optional().describe("Direct flights only"),
			},
			async (params) => {
				try {
					const env = this.env as Env;
					const result = await searchFlights(params, env);
					return {
						content: [{
							type: "text",
							text: result
						}]
					};
				} catch (error: any) {
					console.error('Error in search_flights tool:', error);
					return {
						content: [{
							type: "text",
							text: `Error searching flights: ${error.message}`
						}],
						isError: true
					};
				}
			}
		);

		// Search POI tool
		this.server.tool(
			"search_poi",
			{
				keyword: z.string().describe("Search keyword for points of interest"),
				latitude: z.number().optional().describe("Latitude for location-based search"),
				longitude: z.number().optional().describe("Longitude for location-based search"),
				radius: z.number().optional().describe("Search radius in kilometers"),
				categories: z.string().optional().describe("Comma-separated list of POI categories"),
			},
			async (params) => {
				try {
					const env = this.env as Env;
					const result = await searchPOI(params, env);
					return {
						content: [{
							type: "text",
							text: result
						}]
					};
				} catch (error: any) {
					console.error('Error in search_poi tool:', error);
					return {
						content: [{
							type: "text",
							text: `Error searching POI: ${error.message}`
						}],
						isError: true
					};
				}
			}
		);

		// City search tool
		this.server.tool(
			"city_search",
			{
				keyword: z.string().describe("City name to search for"),
				countryCode: z.string().optional().describe("Country code to filter by"),
				max: z.number().optional().describe("Maximum number of results (default: 10)"),
			},
			async (params) => {
				try {
					const env = this.env as Env;
					const amadeus = await getAmadeusClient(env);

					const response = await amadeus.get('/v1/reference-data/locations/cities', {
						keyword: params.keyword,
						countryCode: params.countryCode,
						max: params.max || 10
					});

					if (!response.data || response.data.length === 0) {
						return {
							content: [{
								type: "text",
								text: `No cities found matching "${params.keyword}"`
							}]
						};
					}

					const cities = response.data.map((city: any, index: number) => {
						return `${index + 1}. ${city.name} (${city.iataCode}) - ${city.address?.countryName || 'Unknown country'}`;
					});

					return {
						content: [{
							type: "text",
							text: `Found ${cities.length} cities matching "${params.keyword}":\n\n${cities.join('\n')}`
						}]
					};
				} catch (error: any) {
					console.error('Error in city_search tool:', error);
					return {
						content: [{
							type: "text",
							text: `Error searching cities: ${error.message}`
						}],
						isError: true
					};
				}
			}
		);

		// Search POI by coordinates tool
		this.server.tool(
			"search_poi_by_coordinates",
			{
				latitude: z.number().describe("Latitude coordinate"),
				longitude: z.number().describe("Longitude coordinate"),
				radius: z.number().optional().describe("Search radius in kilometers (default: 1)"),
			},
			async (params) => {
				try {
					const env = this.env as Env;
					const result = await searchPOIByCoordinates(params, env);
					return {
						content: [{
							type: "text",
							text: result
						}]
					};
				} catch (error: any) {
					console.error('Error in search_poi_by_coordinates tool:', error);
					return {
						content: [{
							type: "text",
							text: `Error searching POI by coordinates: ${error.message}`
						}],
						isError: true
					};
				}
			}
		);

		// Search activities by coordinates tool
		this.server.tool(
			"search_activities_by_coordinates",
			{
				latitude: z.number().describe("Latitude coordinate"),
				longitude: z.number().describe("Longitude coordinate"),
				radius: z.number().optional().describe("Search radius in kilometers (default: 1)"),
			},
			async (params) => {
				try {
					const env = this.env as Env;
					const result = await searchActivitiesByCoordinates(params, env);
					return {
						content: [{
							type: "text",
							text: result
						}]
					};
				} catch (error: any) {
					console.error('Error in search_activities_by_coordinates tool:', error);
					return {
						content: [{
							type: "text",
							text: `Error searching activities by coordinates: ${error.message}`
						}],
						isError: true
					};
				}
			}
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: any) {
		const url = new URL(request.url);

		// Standard MCP HTTP endpoints
		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return AmadeusMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return AmadeusMCP.serve("/mcp").fetch(request, env, ctx);
		}

		// Health check endpoint
		if (url.pathname === "/health") {
			return new Response(JSON.stringify({
				status: "healthy",
				service: "Amadeus Travel MCP v2",
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

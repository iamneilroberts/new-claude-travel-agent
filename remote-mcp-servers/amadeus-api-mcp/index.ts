import { z } from "zod";
import { searchHotels } from "./services/hotel-service";
import { searchFlights } from "./services/flight-service";
import { searchPOI, searchPOIByCoordinates, searchActivitiesByCoordinates } from "./services/poi-service";
import { getAmadeusClient } from "./services/amadeus-client";

// Environment interface
interface Env {
	AMADEUS_API_KEY: string;
	AMADEUS_API_SECRET: string;
	CACHE: any;
}

// MCP Tool Schema Definition
const toolSchemas = {
	test_connection: z.object({}),
	search_hotels: z.object({
		city: z.string().describe("City name (e.g., 'Paris' or 'Mobile AL')"),
		check_in: z.string().describe("Check-in date in YYYY-MM-DD format"),
		check_out: z.string().describe("Check-out date in YYYY-MM-DD format"),
		adults: z.number().optional().describe("Number of adult guests (default: 1)"),
		radius: z.number().optional().describe("Search radius in kilometers (default: 5)"),
		ratings: z.string().optional().describe("Comma-separated list of star ratings to filter by (e.g., '3,4,5')"),
		priceRange: z.string().optional().describe("Price range filter"),
	}),
	search_hotels_by_city: z.object({
		cityCode: z.string().describe("City IATA code (e.g., 'PAR' for Paris)"),
		radius: z.number().optional().describe("Search radius in kilometers (default: 5)"),
		radiusUnit: z.enum(['KM', 'MILE']).optional().describe("Unit for radius (default: KM)"),
		ratings: z.string().optional().describe("Comma-separated list of star ratings"),
		amenities: z.string().optional().describe("Comma-separated list of amenities"),
	}),
	search_flights: z.object({
		origin: z.string().describe("Departure IATA city/airport code"),
		destination: z.string().describe("Arrival IATA city/airport code"),
		date: z.string().describe("Departure date in YYYY-MM-DD format"),
		adults: z.number().optional().describe("Number of adult passengers (default: 1)"),
		returnDate: z.string().optional().describe("Return date for round trip"),
		maxPrice: z.number().optional().describe("Maximum price filter"),
		direct: z.boolean().optional().describe("Direct flights only"),
	}),
	search_poi: z.object({
		keyword: z.string().describe("Search keyword for points of interest"),
		latitude: z.number().optional().describe("Latitude for location-based search"),
		longitude: z.number().optional().describe("Longitude for location-based search"),
		radius: z.number().optional().describe("Search radius in kilometers"),
		categories: z.string().optional().describe("Comma-separated list of POI categories"),
	}),
	city_search: z.object({
		keyword: z.string().describe("City name to search for"),
		countryCode: z.string().optional().describe("Country code to filter by"),
		max: z.number().optional().describe("Maximum number of results (default: 10)"),
	}),
	search_poi_by_coordinates: z.object({
		latitude: z.number().describe("Latitude coordinate"),
		longitude: z.number().describe("Longitude coordinate"),
		radius: z.number().optional().describe("Search radius in kilometers (default: 1)"),
	}),
	search_activities_by_coordinates: z.object({
		latitude: z.number().describe("Latitude coordinate"),
		longitude: z.number().describe("Longitude coordinate"),
		radius: z.number().optional().describe("Search radius in kilometers (default: 1)"),
	})
};

// Convert Zod schema to JSON Schema for MCP
function zodToJsonSchema(zodSchema: any): any {
	const shape = zodSchema._def?.shape;
	if (!shape) return { type: 'object', properties: {}, required: [] };
	
	const properties: any = {};
	const required: string[] = [];
	
	for (const [key, value] of Object.entries(shape)) {
		const field = value as any;
		
		if (field._def?.typeName === 'ZodString') {
			properties[key] = { 
				type: 'string',
				description: field._def.description || ''
			};
			if (!field._def.checks?.some((c: any) => c.kind === 'optional')) {
				required.push(key);
			}
		} else if (field._def?.typeName === 'ZodNumber') {
			properties[key] = { 
				type: 'number',
				description: field._def.description || ''
			};
			if (!field._def.checks?.some((c: any) => c.kind === 'optional')) {
				required.push(key);
			}
		} else if (field._def?.typeName === 'ZodBoolean') {
			properties[key] = { 
				type: 'boolean',
				description: field._def.description || ''
			};
			if (!field._def.checks?.some((c: any) => c.kind === 'optional')) {
				required.push(key);
			}
		} else if (field._def?.typeName === 'ZodEnum') {
			properties[key] = { 
				type: 'string',
				enum: field._def.values,
				description: field._def.description || ''
			};
		} else if (field._def?.typeName === 'ZodOptional') {
			const innerType = field._def.innerType;
			if (innerType._def?.typeName === 'ZodString') {
				properties[key] = { 
					type: 'string',
					description: innerType._def.description || ''
				};
			} else if (innerType._def?.typeName === 'ZodNumber') {
				properties[key] = { 
					type: 'number',
					description: innerType._def.description || ''
				};
			} else if (innerType._def?.typeName === 'ZodBoolean') {
				properties[key] = { 
					type: 'boolean',
					description: innerType._def.description || ''
				};
			} else if (innerType._def?.typeName === 'ZodEnum') {
				properties[key] = { 
					type: 'string',
					enum: innerType._def.values,
					description: innerType._def.description || ''
				};
			}
		}
	}
	
	return {
		type: 'object',
		properties,
		required
	};
}

// Tool implementations
class AmadeusAPITools {
	private env: Env;
	
	constructor(env: Env) {
		this.env = env;
	}
	
	async test_connection() {
		try {
			const amadeus = await getAmadeusClient(this.env);
			return {
				content: [{ type: "text", text: "✅ Amadeus API connection test successful!" }],
			};
		} catch (error: any) {
			return {
				content: [{ type: "text", text: `❌ Amadeus API connection failed: ${error.message}` }],
			};
		}
	}
	
	async search_hotels(params: any) {
		try {
			const result = await searchHotels(params, this.env);
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
				}]
			};
		}
	}
	
	async search_hotels_by_city(params: any) {
		try {
			const amadeus = await getAmadeusClient(this.env);

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
				}]
			};
		}
	}
	
	async search_flights(params: any) {
		try {
			const result = await searchFlights(params, this.env);
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
				}]
			};
		}
	}
	
	async search_poi(params: any) {
		try {
			const result = await searchPOI(params, this.env);
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
				}]
			};
		}
	}
	
	async city_search(params: any) {
		try {
			const amadeus = await getAmadeusClient(this.env);

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
				}]
			};
		}
	}
	
	async search_poi_by_coordinates(params: any) {
		try {
			const result = await searchPOIByCoordinates(params, this.env);
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
				}]
			};
		}
	}
	
	async search_activities_by_coordinates(params: any) {
		try {
			const result = await searchActivitiesByCoordinates(params, this.env);
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
				}]
			};
		}
	}
}

// Pure MCP JSON-RPC 2.0 Handler
class PureAmadeusAPIMCPServer {
	private tools: AmadeusAPITools;
	
	constructor(env: Env) {
		this.tools = new AmadeusAPITools(env);
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
								name: 'Amadeus Travel API',
								version: '3.0.0'
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
									name: 'test_connection',
									description: 'Test Amadeus API connectivity',
									inputSchema: zodToJsonSchema(toolSchemas.test_connection)
								},
								{
									name: 'search_hotels',
									description: 'Search for hotels by city with multiple criteria',
									inputSchema: zodToJsonSchema(toolSchemas.search_hotels)
								},
								{
									name: 'search_hotels_by_city',
									description: 'Search for hotels by city IATA code',
									inputSchema: zodToJsonSchema(toolSchemas.search_hotels_by_city)
								},
								{
									name: 'search_flights',
									description: 'Search for flights between destinations',
									inputSchema: zodToJsonSchema(toolSchemas.search_flights)
								},
								{
									name: 'search_poi',
									description: 'Search for points of interest',
									inputSchema: zodToJsonSchema(toolSchemas.search_poi)
								},
								{
									name: 'city_search',
									description: 'Search for cities and airports',
									inputSchema: zodToJsonSchema(toolSchemas.city_search)
								},
								{
									name: 'search_poi_by_coordinates',
									description: 'Search for POI by geographic coordinates',
									inputSchema: zodToJsonSchema(toolSchemas.search_poi_by_coordinates)
								},
								{
									name: 'search_activities_by_coordinates',
									description: 'Search for activities by geographic coordinates',
									inputSchema: zodToJsonSchema(toolSchemas.search_activities_by_coordinates)
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
			const server = new PureAmadeusAPIMCPServer(env);
			
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
				status: 'healthy',
				service: 'Pure Amadeus Travel API MCP v3',
				timestamp: new Date().toISOString()
			}), {
				headers: { 
					'Content-Type': 'application/json',
					...corsHeaders
				}
			});
		}
		
		// Default response
		return new Response(JSON.stringify({
			error: 'Not found',
			available_endpoints: ['/sse', '/health']
		}), {
			status: 404,
			headers: { 
				'Content-Type': 'application/json',
				...corsHeaders
			}
		});
	}
};
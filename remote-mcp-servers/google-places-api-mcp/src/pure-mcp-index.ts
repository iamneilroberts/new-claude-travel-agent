import { GooglePlacesFetchClient } from "./googlePlacesFetchClient.js";

// Environment interface
interface Env {
	GOOGLE_MAPS_API_KEY: string;
	MCP_AUTH_KEY: string;
}

// Direct JSON Schema definitions (much simpler!)
const toolSchemas = {
	find_place: {
		type: 'object',
		properties: {
			query: {
				type: 'string',
				description: 'The text string to search for (e.g., "restaurants in Paris", "Eiffel Tower").'
			},
			language: {
				type: 'string',
				enum: ["ar", "be", "bg", "bn", "ca", "cs", "da", "de", "el", "en", "en-Au", "en-GB", "es", "eu", "fa", "fi", "fil", "fr", "gl", "gu", "hi", "hr", "hu", "id", "it", "iw", "ja", "kk", "kn", "ko", "ky", "lt", "lv", "mk", "ml", "mr", "my", "nl", "no", "pa", "pl", "pt", "pt-BR", "pt-PT", "ro", "ru", "sk", "sl", "sq", "sr", "sv", "ta", "te", "th", "tl", "tr", "uk", "uz", "vi", "zh-CN", "zh-TW"],
				description: 'The language code (e.g., "en", "fr") to return results in.'
			},
			region: {
				type: 'string',
				description: 'The region code (e.g., "us", "fr") to bias results towards.'
			},
			fields: {
				type: 'array',
				items: { type: 'string' },
				description: 'Fields to include in the response.'
			},
			max_results: {
				type: 'number',
				minimum: 1,
				maximum: 10,
				description: 'Maximum number of place candidates to return (default 5, max 10).'
			}
		},
		required: ['query']
	},
	get_place_details: {
		type: 'object',
		properties: {
			place_id: {
				type: 'string',
				description: 'The Place ID of the place.'
			},
			language: {
				type: 'string',
				enum: ["ar", "be", "bg", "bn", "ca", "cs", "da", "de", "el", "en", "en-Au", "en-GB", "es", "eu", "fa", "fi", "fil", "fr", "gl", "gu", "hi", "hr", "hu", "id", "it", "iw", "ja", "kk", "kn", "ko", "ky", "lt", "lv", "mk", "ml", "mr", "my", "nl", "no", "pa", "pl", "pt", "pt-BR", "pt-PT", "ro", "ru", "sk", "sl", "sq", "sr", "sv", "ta", "te", "th", "tl", "tr", "uk", "uz", "vi", "zh-CN", "zh-TW"],
				description: 'The language code for the results.'
			},
			region: {
				type: 'string',
				description: 'The region code for biasing results.'
			},
			fields: {
				type: 'array',
				items: { type: 'string' },
				description: 'Specific fields to request.'
			}
		},
		required: ['place_id']
	},
	get_place_photo_url: {
		type: 'object',
		properties: {
			photo_reference: {
				type: 'string',
				description: 'The reference string for the photo, obtained from get_place_details.'
			},
			max_width: {
				type: 'number',
				description: 'Maximum desired width of the photo in pixels.'
			},
			max_height: {
				type: 'number',
				description: 'Maximum desired height of the photo in pixels.'
			}
		},
		required: ['photo_reference']
	}
};

// No conversion needed - we use direct JSON schemas!

// Tool implementations
class GooglePlacesTools {
	private env: Env;
	private placesClient: GooglePlacesFetchClient;
	
	constructor(env: Env) {
		this.env = env;
		this.placesClient = new GooglePlacesFetchClient(env.GOOGLE_MAPS_API_KEY);
	}
	
	async find_place(params: any) {
		try {
			const result = await this.placesClient.findPlace({
				query: params.query,
				language: params.language,
				region: params.region,
				fields: params.fields,
				max_results: params.max_results || 5,
			});
			return {
				content: [{
					type: "text",
					text: JSON.stringify(result, null, 2)
				}]
			};
		} catch (error: any) {
			console.error('Error in find_place tool:', error);
			return {
				content: [{
					type: "text",
					text: `Error finding place: ${error.message}`
				}]
			};
		}
	}
	
	async get_place_details(params: any) {
		try {
			const result = await this.placesClient.getPlaceDetails({
				place_id: params.place_id,
				language: params.language,
				region: params.region,
				fields: params.fields,
			});
			return {
				content: [{
					type: "text",
					text: JSON.stringify(result, null, 2)
				}]
			};
		} catch (error: any) {
			console.error('Error in get_place_details tool:', error);
			return {
				content: [{
					type: "text",
					text: `Error getting place details: ${error.message}`
				}]
			};
		}
	}
	
	async get_place_photo_url(params: any) {
		try {
			const result = await this.placesClient.getPlacePhotoUrl({
				photo_reference: params.photo_reference,
				max_width: params.max_width,
				max_height: params.max_height
			});
			return {
				content: [{
					type: "text",
					text: JSON.stringify(result, null, 2)
				}]
			};
		} catch (error: any) {
			console.error('Error in get_place_photo_url tool:', error);
			return {
				content: [{
					type: "text",
					text: `Error getting place photo URL: ${error.message}`
				}]
			};
		}
	}
}

// Pure MCP JSON-RPC 2.0 Handler
class PureGooglePlacesMCPServer {
	private tools: GooglePlacesTools;
	
	constructor(env: Env) {
		this.tools = new GooglePlacesTools(env);
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
								name: 'Google Places API MCP',
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
									name: 'find_place',
									description: 'Search for places using text query (e.g., "restaurants in Paris", "Eiffel Tower")',
									inputSchema: toolSchemas.find_place
								},
								{
									name: 'get_place_details',
									description: 'Get detailed information about a specific place using its Place ID',
									inputSchema: toolSchemas.get_place_details
								},
								{
									name: 'get_place_photo_url',
									description: 'Get photo URL for a place using photo reference from place details',
									inputSchema: toolSchemas.get_place_photo_url
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
					
				case 'resources/list':
					return {
						jsonrpc: '2.0',
						id,
						result: {
							resources: []
						}
					};
					
				case 'prompts/list':
					return {
						jsonrpc: '2.0',
						id,
						result: {
							prompts: []
						}
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
			const server = new PureGooglePlacesMCPServer(env);
			
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
				service: 'Pure Google Places API MCP v3',
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
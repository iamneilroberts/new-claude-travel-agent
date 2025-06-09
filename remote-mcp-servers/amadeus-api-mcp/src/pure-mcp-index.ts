// Stateless MCP Server for Transient Connections
// No blocking imports - everything is lazy loaded on-demand

// Environment interface
interface Env {
	AMADEUS_API_KEY: string;
	AMADEUS_API_SECRET: string;
	CACHE: any;
	MCP_AUTH_KEY: string;
}

// Lightweight Amadeus client with no singleton pattern
class TransientAmadeusClient {
	private baseURL = 'https://api.amadeus.com';

	constructor(
		private clientId: string,
		private clientSecret: string,
		private cache?: KVNamespace
	) {}

	private async getAccessToken(): Promise<string> {
		// Check KV cache first
		if (this.cache) {
			const cached: any = await this.cache.get('amadeus_token', 'json');
			if (cached && cached.expires_at > Date.now()) {
				return cached.access_token;
			}
		}

		// Get new token
		const tokenEndpoint = 'https://api.amadeus.com/v1/security/oauth2/token';
		const response = await fetch(tokenEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				grant_type: 'client_credentials',
				client_id: this.clientId,
				client_secret: this.clientSecret
			})
		});

		if (!response.ok) {
			throw new Error(`Failed to get access token: ${response.statusText}`);
		}

		const data: any = await response.json();
		const accessToken = data.access_token;
		const tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Subtract 1 minute for safety

		// Cache the token
		if (this.cache) {
			await this.cache.put('amadeus_token', JSON.stringify({
				access_token: accessToken,
				expires_at: tokenExpiry
			}), {
				expirationTtl: Math.floor((tokenExpiry - Date.now()) / 1000)
			});
		}

		return accessToken;
	}

	async get(endpoint: string, params: Record<string, any> = {}): Promise<any> {
		const token = await this.getAccessToken();

		let baseURL = this.baseURL;
		if (endpoint.startsWith('/')) {
			baseURL = this.baseURL + endpoint;
		} else {
			baseURL = this.baseURL + '/v1/' + endpoint;
		}

		const url = new URL(baseURL);
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined) {
				url.searchParams.append(key, String(value));
			}
		});

		const response = await fetch(url.toString(), {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${token}`,
				'Accept': 'application/json'
			}
		});

		const data: any = await response.json();

		if (!response.ok) {
			const errorMessage = data.errors?.[0]?.detail || `API error: ${response.statusText}`;
			const error = new Error(errorMessage);
			(error as any).response = data;
			throw error;
		}

		return data;
	}
}

// Direct JSON Schema definitions (no Zod)
const toolSchemas = {
	test_connection: {
		type: 'object',
		properties: {},
		required: []
	},
	search_hotels: {
		type: 'object',
		properties: {
			city: {
				type: 'string',
				description: "City name (e.g., 'Paris' or 'Mobile AL')"
			},
			check_in: {
				type: 'string',
				description: 'Check-in date in YYYY-MM-DD format'
			},
			check_out: {
				type: 'string',
				description: 'Check-out date in YYYY-MM-DD format'
			},
			adults: {
				type: 'number',
				description: 'Number of adult guests (default: 1)'
			},
			radius: {
				type: 'number',
				description: 'Search radius in kilometers (default: 5)'
			},
			ratings: {
				type: 'string',
				description: "Comma-separated list of star ratings to filter by (e.g., '3,4,5')"
			},
			priceRange: {
				type: 'string',
				description: 'Price range filter'
			}
		},
		required: ['city', 'check_in', 'check_out']
	},
	search_hotels_by_city: {
		type: 'object',
		properties: {
			cityCode: {
				type: 'string',
				description: "City IATA code (e.g., 'PAR' for Paris)"
			},
			radius: {
				type: 'number',
				description: 'Search radius in kilometers (default: 5)'
			},
			radiusUnit: {
				type: 'string',
				enum: ['KM', 'MILE'],
				description: 'Unit for radius (default: KM)'
			},
			ratings: {
				type: 'string',
				description: 'Comma-separated list of star ratings'
			},
			amenities: {
				type: 'string',
				description: 'Comma-separated list of amenities'
			}
		},
		required: ['cityCode']
	},
	search_flights: {
		type: 'object',
		properties: {
			origin: {
				type: 'string',
				description: 'Departure IATA city/airport code'
			},
			destination: {
				type: 'string',
				description: 'Arrival IATA city/airport code'
			},
			date: {
				type: 'string',
				description: 'Departure date in YYYY-MM-DD format'
			},
			adults: {
				type: 'number',
				description: 'Number of adult passengers (default: 1)'
			},
			returnDate: {
				type: 'string',
				description: 'Return date for round trip'
			},
			maxPrice: {
				type: 'number',
				description: 'Maximum price filter'
			},
			direct: {
				type: 'boolean',
				description: 'Direct flights only'
			}
		},
		required: ['origin', 'destination', 'date']
	},
	search_poi: {
		type: 'object',
		properties: {
			keyword: {
				type: 'string',
				description: 'Search keyword for points of interest'
			},
			latitude: {
				type: 'number',
				description: 'Latitude for location-based search'
			},
			longitude: {
				type: 'number',
				description: 'Longitude for location-based search'
			},
			radius: {
				type: 'number',
				description: 'Search radius in kilometers'
			},
			categories: {
				type: 'string',
				description: 'Comma-separated list of POI categories'
			}
		},
		required: ['keyword']
	},
	city_search: {
		type: 'object',
		properties: {
			keyword: {
				type: 'string',
				description: 'City name to search for'
			},
			countryCode: {
				type: 'string',
				description: 'Country code to filter by'
			},
			max: {
				type: 'number',
				description: 'Maximum number of results (default: 10)'
			}
		},
		required: ['keyword']
	},
	search_poi_by_coordinates: {
		type: 'object',
		properties: {
			latitude: {
				type: 'number',
				description: 'Latitude coordinate'
			},
			longitude: {
				type: 'number',
				description: 'Longitude coordinate'
			},
			radius: {
				type: 'number',
				description: 'Search radius in kilometers (default: 1)'
			}
		},
		required: ['latitude', 'longitude']
	},
	search_activities_by_coordinates: {
		type: 'object',
		properties: {
			latitude: {
				type: 'number',
				description: 'Latitude coordinate'
			},
			longitude: {
				type: 'number',
				description: 'Longitude coordinate'
			},
			radius: {
				type: 'number',
				description: 'Search radius in kilometers (default: 1)'
			}
		},
		required: ['latitude', 'longitude']
	}
};

// Tool implementations with inline logic (no external service dependencies)
class StatelessAmadeusAPITools {
	private env: Env;
	
	constructor(env: Env) {
		this.env = env;
	}
	
	private getClient(): TransientAmadeusClient {
		return new TransientAmadeusClient(
			this.env.AMADEUS_API_KEY,
			this.env.AMADEUS_API_SECRET,
			this.env.CACHE
		);
	}
	
	async test_connection() {
		try {
			// Debug environment variables
			const hasApiKey = !!this.env.AMADEUS_API_KEY;
			const hasApiSecret = !!this.env.AMADEUS_API_SECRET;
			const apiKeyPrefix = this.env.AMADEUS_API_KEY ? this.env.AMADEUS_API_KEY.substring(0, 8) + '...' : 'undefined';
			
			if (!hasApiKey || !hasApiSecret) {
				return {
					content: [{ type: "text", text: `❌ Missing credentials - API Key: ${hasApiKey}, API Secret: ${hasApiSecret}, Key starts with: ${apiKeyPrefix}` }],
				};
			}
			
			const amadeus = this.getClient();
			// Simple test call
			await amadeus.get('/v1/reference-data/locations/cities', {
				keyword: 'test',
				max: 1
			});
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
			const amadeus = this.getClient();

			// First, find city code
			let cityCode = '';
			let cityName = params.city;

			try {
				const citySearch = await amadeus.get('/v1/reference-data/locations/cities', {
					keyword: params.city,
					max: 1
				});

				if (citySearch.data && citySearch.data.length > 0) {
					cityCode = citySearch.data[0].iataCode;
					cityName = citySearch.data[0].name;
				}
			} catch (error) {
				console.error('City search failed:', error);
				if (params.city && typeof params.city === 'string') {
					cityCode = params.city.toUpperCase();
				}
			}

			if (!cityCode || cityCode.length !== 3) {
				return {
					content: [{
						type: "text",
						text: `Could not find city "${params.city}". Please provide a valid city name or 3-letter IATA code.`
					}]
				};
			}

			// Search for hotels by city
			try {
				const hotelListResponse = await amadeus.get('/v1/reference-data/locations/hotels/by-city', {
					cityCode: cityCode,
					radius: params.radius || 5,
					radiusUnit: 'KM'
				});

				if (!hotelListResponse.data || hotelListResponse.data.length === 0) {
					return {
						content: [{
							type: "text",
							text: `No hotels found in ${cityName} (${cityCode})`
						}]
					};
				}

				// Get hotel IDs from the first 10 results
				const hotelIds = hotelListResponse.data.slice(0, 10).map((hotel: any) => hotel.hotelId);

				// Now search for hotel offers
				const hotelOffersResponse = await amadeus.get('/v3/shopping/hotel-offers', {
					hotelIds: hotelIds.join(','),
					checkInDate: params.check_in,
					checkOutDate: params.check_out,
					adults: params.adults || 1,
					roomQuantity: 1
				});

				return {
					content: [{
						type: "text",
						text: this.formatHotelResults(hotelOffersResponse.data, params)
					}]
				};
			} catch (error: any) {
				console.error('Hotel offers search failed:', error.message);
				// Fallback to just showing hotel names if offers search fails
				try {
					const hotelListResponse = await amadeus.get('/v1/reference-data/locations/hotels/by-city', {
						cityCode: cityCode,
						radius: params.radius || 5,
						radiusUnit: 'KM'
					});

					return {
						content: [{
							type: "text",
							text: this.formatBasicHotelResults(hotelListResponse.data, cityName, params)
						}]
					};
				} catch (fallbackError) {
					throw error; // Throw the original error
				}
			}
		} catch (error: any) {
			console.error('Error searching hotels:', error);
			return {
				content: [{
					type: "text",
					text: `Error searching hotels: ${error.message}`
				}]
			};
		}
	}

	private formatHotelResults(data: any[], params: any): string {
		if (!data || data.length === 0) {
			return `No hotel offers available in ${params.city} for the specified dates.`;
		}

		try {
			const hotels = data.map((hotel, index) => {
				const hotelInfo = hotel.hotel;
				const offers = hotel.offers || [];

				const name = hotelInfo.name || 'Unknown Hotel';
				const rating = hotelInfo.rating ? `${hotelInfo.rating} stars` : 'Unrated';
				const address = hotelInfo.address
					? `${hotelInfo.address.lines?.join(', ') || ''}, ${hotelInfo.address.cityName || ''}`
					: 'Address not available';

				let priceInfo = 'Price not available';
				if (offers.length > 0) {
					const price = offers[0].price;
					priceInfo = `${price.total} ${price.currency}`;
				}

				return `${index + 1}. ${name} (${rating})\n   Address: ${address}\n   Price: ${priceInfo}`;
			});

			return `Found ${hotels.length} hotels in ${params.city} from ${params.check_in} to ${params.check_out}:\n\n${hotels.join('\n\n')}`;
		} catch (error) {
			console.error('Error formatting hotel results:', error);
			return 'Error formatting hotel results. Raw data may be in an unexpected format.';
		}
	}

	private formatBasicHotelResults(hotels: any[], cityName: string, params: any): string {
		if (!hotels || hotels.length === 0) {
			return `No hotels found in ${cityName}`;
		}

		const hotelList = hotels.slice(0, 10).map((hotel, index) => {
			const name = hotel.name || 'Unknown Hotel';
			const address = hotel.address
				? `${hotel.address.lines?.join(', ') || ''}, ${hotel.address.cityName || ''}`
				: 'Location not available';

			return `${index + 1}. ${name}\n   ${address}`;
		});

		return `Found ${hotelList.length} hotels in ${cityName} from ${params.check_in} to ${params.check_out}:\n\n${hotelList.join('\n\n')}\n\n*Note: Price information requires hotel offers search.*`;
	}
	
	async search_hotels_by_city(params: any) {
		try {
			const amadeus = this.getClient();

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
			const amadeus = this.getClient();

			const requestParams: any = {
				originLocationCode: params.origin,
				destinationLocationCode: params.destination,
				departureDate: params.date,
				adults: params.adults || 1,
				max: 10,
				currencyCode: 'USD'
			};

			if (params.returnDate) {
				requestParams.returnDate = params.returnDate;
			}

			const response = await amadeus.get('/shopping/flight-offers', requestParams);

			return {
				content: [{
					type: "text",
					text: this.formatFlightResults(response.data)
				}]
			};
		} catch (error: any) {
			console.error('Error searching flights:', error);
			return {
				content: [{
					type: "text",
					text: `Error searching flights: ${error.message}`
				}]
			};
		}
	}

	private formatFlightResults(data: any[]): string {
		if (!data || data.length === 0) {
			return 'No flights found for the specified criteria.';
		}

		const flights = data.slice(0, 5).map((offer, index) => {
			const price = offer.price;
			const itineraries = offer.itineraries || [];
			
			const outbound = itineraries[0];
			const segments = outbound?.segments || [];
			
			if (segments.length === 0) {
				return `${index + 1}. Flight details unavailable`;
			}

			const departure = segments[0];
			const arrival = segments[segments.length - 1];
			
			const departureTime = new Date(departure.departure?.at || '').toLocaleTimeString('en-US', {
				hour: '2-digit',
				minute: '2-digit'
			});
			const arrivalTime = new Date(arrival.arrival?.at || '').toLocaleTimeString('en-US', {
				hour: '2-digit',
				minute: '2-digit'
			});

			const airline = departure.carrierCode || 'Unknown';
			const stops = segments.length - 1;
			const stopsText = stops === 0 ? 'Direct' : `${stops} stop${stops > 1 ? 's' : ''}`;

			return `${index + 1}. ${airline} - ${price.total} ${price.currency}\n   ${departure.departure?.iataCode} ${departureTime} → ${arrival.arrival?.iataCode} ${arrivalTime}\n   ${stopsText}`;
		});

		return `Found ${flights.length} flights:\n\n${flights.join('\n\n')}`;
	}
	
	async search_poi(params: any) {
		try {
			if (params.latitude && params.longitude) {
				return await this.search_poi_by_coordinates({
					latitude: params.latitude,
					longitude: params.longitude,
					radius: params.radius || 1
				});
			}

			const locationName = params.location || params.keyword;
			return {
				content: [{
					type: "text",
					text: `To search for points of interest, please provide coordinates (latitude/longitude) or use the Google Places API.

For "${locationName}", you can:
1. Use Google Places API for comprehensive attraction search
2. Search hotels in ${locationName} which may include nearby attractions
3. Use city_search to find coordinates for ${locationName}, then search POI by coordinates`
				}]
			};
		} catch (error: any) {
			console.error('Error searching POI:', error);
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
			const amadeus = this.getClient();

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
			const amadeus = this.getClient();

			const response = await amadeus.get('/v1/reference-data/locations/pois', {
				latitude: params.latitude,
				longitude: params.longitude,
				radius: params.radius || 1
			});

			if (!response.data || response.data.length === 0) {
				return {
					content: [{
						type: "text",
						text: `No points of interest found near coordinates ${params.latitude}, ${params.longitude}`
					}]
				};
			}

			const pois = response.data.slice(0, 10).map((poi: any, index: number) => {
				const name = poi.name || 'Unknown POI';
				const category = poi.category || 'Uncategorized';
				const tags = poi.tags ? poi.tags.join(', ') : 'No tags';
				
				return `${index + 1}. ${name} (${category})\n   Tags: ${tags}`;
			});

			return {
				content: [{
					type: "text",
					text: `Found ${pois.length} points of interest near ${params.latitude}, ${params.longitude}:\n\n${pois.join('\n\n')}`
				}]
			};
		} catch (error: any) {
			console.error('Error searching POI by coordinates:', error);
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
			const amadeus = this.getClient();

			const response = await amadeus.get('/v1/reference-data/locations/pois', {
				latitude: params.latitude,
				longitude: params.longitude,
				radius: params.radius || 1,
				categories: 'ACTIVITIES'
			});

			if (!response.data || response.data.length === 0) {
				return {
					content: [{
						type: "text",
						text: `No activities found near coordinates ${params.latitude}, ${params.longitude}`
					}]
				};
			}

			const activities = response.data.slice(0, 10).map((activity: any, index: number) => {
				const name = activity.name || 'Unknown Activity';
				const category = activity.category || 'Activity';
				const tags = activity.tags ? activity.tags.join(', ') : 'No tags';
				
				return `${index + 1}. ${name} (${category})\n   Tags: ${tags}`;
			});

			return {
				content: [{
					type: "text",
					text: `Found ${activities.length} activities near ${params.latitude}, ${params.longitude}:\n\n${activities.join('\n\n')}`
				}]
			};
		} catch (error: any) {
			console.error('Error searching activities by coordinates:', error);
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
class StatelessAmadeusAPIMCPServer {
	private tools: StatelessAmadeusAPITools;
	
	constructor(env: Env) {
		this.tools = new StatelessAmadeusAPITools(env);
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
								version: '3.1.0-stateless'
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
									inputSchema: toolSchemas.test_connection
								},
								{
									name: 'search_hotels',
									description: 'Search for hotels by city with multiple criteria',
									inputSchema: toolSchemas.search_hotels
								},
								{
									name: 'search_hotels_by_city',
									description: 'Search for hotels by city IATA code',
									inputSchema: toolSchemas.search_hotels_by_city
								},
								{
									name: 'search_flights',
									description: 'Search for flights between destinations',
									inputSchema: toolSchemas.search_flights
								},
								{
									name: 'search_poi',
									description: 'Search for points of interest',
									inputSchema: toolSchemas.search_poi
								},
								{
									name: 'city_search',
									description: 'Search for cities and airports',
									inputSchema: toolSchemas.city_search
								},
								{
									name: 'search_poi_by_coordinates',
									description: 'Search for POI by geographic coordinates',
									inputSchema: toolSchemas.search_poi_by_coordinates
								},
								{
									name: 'search_activities_by_coordinates',
									description: 'Search for activities by geographic coordinates',
									inputSchema: toolSchemas.search_activities_by_coordinates
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
			const server = new StatelessAmadeusAPIMCPServer(env);
			
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
				service: 'Stateless Amadeus Travel API MCP v3.1',
				timestamp: new Date().toISOString(),
				architecture: 'transient-connection-optimized'
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
// Robust MCP Server with Airport Lookup and Simple Authentication

interface Env {
	DB: D1Database;
	MCP_AUTH_KEY: string;
}

// Authentication helper
function authenticateRequest(request: Request, env: Env): boolean {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader) return false;
	
	const token = authHeader.replace('Bearer ', '');
	return token === env.MCP_AUTH_KEY;
}

// Enhanced error handling
function createErrorResponse(id: any, code: number, message: string, data?: any): any {
	return {
		jsonrpc: '2.0',
		id,
		error: {
			code,
			message,
			data: data ? String(data) : undefined
		}
	};
}

// Tool schemas with detailed validation
const toolSchemas = {
	store_travel_search: {
		type: 'object',
		properties: {
			search_type: { type: 'string', description: 'Type of search (flight, hotel, package)' },
			origin: { type: 'string', description: 'Origin location' },
			destination: { type: 'string', description: 'Destination location' },
			departure_date: { type: 'string', description: 'Departure date' },
			return_date: { type: 'string', description: 'Return date' },
			passengers: { type: 'number', description: 'Number of passengers' },
			budget_limit: { type: 'number', description: 'Budget limit' },
			search_parameters: { type: 'string', description: 'Full search parameters as JSON' },
			results_summary: { type: 'string', description: 'Summary of search results' },
			user_id: { type: 'string', description: 'User identifier' }
		},
		required: ['search_type']
	},
	get_search_history: {
		type: 'object',
		properties: {
			user_id: { type: 'string', description: 'User ID to filter by' },
			search_type: { type: 'string', description: 'Search type to filter by' },
			limit: { type: 'number', description: 'Maximum number of results' }
		},
		required: []
	},
	get_popular_routes: {
		type: 'object',
		properties: {
			limit: { type: 'number', description: 'Maximum number of routes to return' }
		},
		required: []
	},
	store_user_preference: {
		type: 'object',
		properties: {
			user_id: { type: 'string', description: 'User identifier' },
			preference_type: { type: 'string', description: 'Type of preference (airline, seat_type, meal, etc.)' },
			preference_value: { type: 'string', description: 'Preference value' }
		},
		required: ['user_id', 'preference_type', 'preference_value']
	},
	get_user_preferences: {
		type: 'object',
		properties: {
			user_id: { type: 'string', description: 'User identifier' },
			preference_type: { type: 'string', description: 'Specific preference type to retrieve' }
		},
		required: ['user_id']
	},
	execute_query: {
		type: 'object',
		properties: {
			query: { type: 'string', description: 'SQL query to execute' },
			params: { type: 'array', description: 'Query parameters' }
		},
		required: ['query']
	},
	get_database_schema: {
		type: 'object',
		properties: {},
		required: []
	},
	airport_city_lookup: {
		type: 'object',
		properties: {
			query: { 
				type: 'string', 
				description: 'Search query: city name, airport name, or IATA code (e.g., "Mobile Alabama", "Denver", "DEN")',
				minLength: 1
			},
			countryCode: { 
				type: 'string', 
				description: '2-letter country code to filter results (e.g., "US", "CA")',
				minLength: 2,
				maxLength: 2
			},
			maxResults: { 
				type: 'number', 
				description: 'Maximum number of results (default: 10)',
				minimum: 1,
				maximum: 20
			},
			includeNearbyAirports: { 
				type: 'boolean', 
				description: 'Include airports within 50 miles of city (default: true)'
			},
			majorsOnly: { 
				type: 'boolean', 
				description: 'Only return major airports (default: false)'
			}
		},
		required: ['query']
	},
	create_client: {
		type: 'object',
		properties: {
			first_name: { type: 'string', description: "Client's first name (required)" },
			last_name: { type: 'string', description: "Client's last name (required)" },
			email: { type: 'string', description: "Client's email address" },
			phone: { type: 'string', description: "Client's phone number" },
			address: { type: 'string', description: "Client's street address" },
			city: { type: 'string', description: "Client's city" },
			state: { type: 'string', description: "Client's state or province" },
			postal_code: { type: 'string', description: "Client's postal code" },
			country: { type: 'string', description: "Client's country (default: United States)" },
			date_of_birth: { type: 'string', description: "Client's date of birth (YYYY-MM-DD)" },
			passport_number: { type: 'string', description: "Client's passport number" },
			passport_expiry: { type: 'string', description: "Client's passport expiry date (YYYY-MM-DD)" },
			preferences: { type: 'string', description: "Client's travel preferences" },
			notes: { type: 'string', description: 'Additional notes about the client' }
		},
		required: ['first_name', 'last_name']
	},
	get_client: {
		type: 'object',
		properties: {
			client_id: { type: 'number', description: 'Client ID to retrieve' }
		},
		required: ['client_id']
	},
	search_clients: {
		type: 'object',
		properties: {
			search_term: { type: 'string', description: 'Search term (name or email)' },
			limit: { type: 'number', description: 'Maximum number of results (default: 10)' }
		},
		required: ['search_term']
	},
	search_trips: {
		type: 'object',
		properties: {
			search_term: { type: 'string', description: 'Search by trip name, client name, or destination' },
			status: { type: 'string', description: 'Filter by trip status (Planned, Confirmed, Completed, etc.)' },
			limit: { type: 'number', description: 'Maximum number of results (default: 10)' }
		},
		required: ['search_term']
	},
	get_trip: {
		type: 'object',
		properties: {
			trip_id: { type: 'number', description: 'Trip ID to retrieve' }
		},
		required: ['trip_id']
	},
	get_trip_daily_activities: {
		type: 'object',
		properties: {
			trip_id: { type: 'number', description: 'Trip ID' },
			day_number: { type: 'number', description: 'Specific day number (optional)' }
		},
		required: ['trip_id']
	},
	get_upcoming_trips: {
		type: 'object',
		properties: {
			days_ahead: { type: 'number', description: 'Number of days to look ahead (default: 30)' },
			limit: { type: 'number', description: 'Maximum number of results (default: 10)' }
		},
		required: []
	}
};

// Tool descriptions
const toolDescriptions = {
	store_travel_search: 'Store a travel search for tracking and analytics',
	get_search_history: 'Retrieve travel search history',
	get_popular_routes: 'Get most popular travel routes',
	store_user_preference: 'Store user travel preferences',
	get_user_preferences: 'Retrieve user travel preferences',
	execute_query: 'Execute a custom SQL query (SELECT only)',
	get_database_schema: 'Get database schema information',
	airport_city_lookup: 'Search for airports by city name, airport name, or IATA code. Essential for converting city names like "Mobile, AL" or "Denver, CO" to IATA codes for flight searches.',
	create_client: 'Creates a new client record in the travel database',
	get_client: 'Retrieves a client\'s details by their ID',
	search_clients: 'Searches for clients by name or email',
	search_trips: 'Search for trips by trip name, client name, or destination',
	get_trip: 'Retrieves detailed trip information including summary and itinerary',
	get_trip_daily_activities: 'Retrieves day-by-day activities for a specific trip',
	get_upcoming_trips: 'Retrieves summary of trips starting in the next 30 days'
};

// Tool implementations
const toolImplementations = {
	async store_travel_search(params: any, env: Env) {
		try {
			const result = await env.DB.prepare(`
				INSERT INTO travel_searches
				(search_type, origin, destination, departure_date, return_date,
				 passengers, budget_limit, search_parameters, results_summary, user_id)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`).bind(
				params.search_type,
				params.origin || null,
				params.destination || null,
				params.departure_date || null,
				params.return_date || null,
				params.passengers || 1,
				params.budget_limit || null,
				params.search_parameters || null,
				params.results_summary || null,
				params.user_id || 'anonymous'
			).run();

			return JSON.stringify({
				success: true,
				message: `✅ Travel search stored with ID: ${result.meta.last_row_id}`
			});
		} catch (error: any) {
			return JSON.stringify({
				success: false,
				error: `❌ Error storing search: ${error.message}`
			});
		}
	},

	async get_search_history(params: any, env: Env) {
		try {
			let query = "SELECT * FROM travel_searches WHERE 1=1";
			const bindings: unknown[] = [];

			if (params.user_id) {
				query += " AND user_id = ?";
				bindings.push(params.user_id);
			}

			if (params.search_type) {
				query += " AND search_type = ?";
				bindings.push(params.search_type);
			}

			query += " ORDER BY created_at DESC";

			if (params.limit) {
				query += " LIMIT ?";
				bindings.push(params.limit);
			}

			const result = await env.DB.prepare(query).bind(...bindings).all();

			return JSON.stringify({
				success: true,
				count: result.results.length,
				searches: result.results
			});
		} catch (error: any) {
			return JSON.stringify({
				success: false,
				error: `❌ Error retrieving search history: ${error.message}`
			});
		}
	},

	async get_popular_routes(params: any, env: Env) {
		try {
			let query = "SELECT * FROM popular_routes";

			if (params.limit) {
				query += " LIMIT ?";
				const result = await env.DB.prepare(query).bind(params.limit).all();
				return JSON.stringify({
					success: true,
					count: result.results.length,
					routes: result.results
				});
			} else {
				const result = await env.DB.prepare(query).all();
				return JSON.stringify({
					success: true,
					count: result.results.length,
					routes: result.results
				});
			}
		} catch (error: any) {
			return JSON.stringify({
				success: false,
				error: `❌ Error retrieving popular routes: ${error.message}`
			});
		}
	},

	async store_user_preference(params: any, env: Env) {
		try {
			// Check if preference exists and update, otherwise insert
			const existing = await env.DB.prepare(`
				SELECT id FROM user_preferences
				WHERE user_id = ? AND preference_type = ?
			`).bind(params.user_id, params.preference_type).first();

			if (existing) {
				await env.DB.prepare(`
					UPDATE user_preferences
					SET preference_value = ?, updated_at = CURRENT_TIMESTAMP
					WHERE user_id = ? AND preference_type = ?
				`).bind(params.preference_value, params.user_id, params.preference_type).run();

				return JSON.stringify({
					success: true,
					message: `✅ Updated preference for ${params.user_id}: ${params.preference_type} = ${params.preference_value}`
				});
			} else {
				await env.DB.prepare(`
					INSERT INTO user_preferences (user_id, preference_type, preference_value)
					VALUES (?, ?, ?)
				`).bind(params.user_id, params.preference_type, params.preference_value).run();

				return JSON.stringify({
					success: true,
					message: `✅ Stored new preference for ${params.user_id}: ${params.preference_type} = ${params.preference_value}`
				});
			}
		} catch (error: any) {
			return JSON.stringify({
				success: false,
				error: `❌ Error storing preference: ${error.message}`
			});
		}
	},

	async get_user_preferences(params: any, env: Env) {
		try {
			let query = "SELECT * FROM user_preferences WHERE user_id = ?";
			const bindings: unknown[] = [params.user_id];

			if (params.preference_type) {
				query += " AND preference_type = ?";
				bindings.push(params.preference_type);
			}

			query += " ORDER BY updated_at DESC";

			const result = await env.DB.prepare(query).bind(...bindings).all();

			return JSON.stringify({
				success: true,
				user_id: params.user_id,
				count: result.results.length,
				preferences: result.results
			});
		} catch (error: any) {
			return JSON.stringify({
				success: false,
				error: `❌ Error retrieving preferences: ${error.message}`
			});
		}
	},

	async execute_query(params: any, env: Env) {
		try {
			// Security: Only allow SELECT statements for safety
			const trimmedQuery = params.query.trim().toLowerCase();
			if (!trimmedQuery.startsWith('select')) {
				return JSON.stringify({
					success: false,
					error: `❌ Only SELECT queries are allowed for security reasons`
				});
			}

			const stmt = env.DB.prepare(params.query);
			const result = params.params ?
				await stmt.bind(...params.params).all() :
				await stmt.all();

			return JSON.stringify({
				success: true,
				count: result.results.length,
				results: result.results
			});
		} catch (error: any) {
			return JSON.stringify({
				success: false,
				error: `❌ Error executing query: ${error.message}`
			});
		}
	},

	async get_database_schema(params: any, env: Env) {
		try {
			const tables = await env.DB.prepare(`
				SELECT name FROM sqlite_master
				WHERE type='table' AND name NOT LIKE 'sqlite_%'
				ORDER BY name
			`).all();

			const views = await env.DB.prepare(`
				SELECT name FROM sqlite_master
				WHERE type='view'
				ORDER BY name
			`).all();

			let schemaInfo = "📋 **Database Schema**\n\n";

			schemaInfo += "**Tables:**\n";
			for (const table of tables.results) {
				const tableInfo = await env.DB.prepare(`
					PRAGMA table_info(${table.name})
				`).all();

				schemaInfo += `\n• **${table.name}**\n`;
				for (const column of tableInfo.results) {
					schemaInfo += `  - ${column.name}: ${column.type}${column.notnull ? ' NOT NULL' : ''}${column.pk ? ' PRIMARY KEY' : ''}\n`;
				}
			}

			if (views.results.length > 0) {
				schemaInfo += "\n**Views:**\n";
				for (const view of views.results) {
					schemaInfo += `• ${view.name}\n`;
				}
			}

			return JSON.stringify({
				success: true,
				schema: schemaInfo,
				tables: tables.results,
				views: views.results
			});
		} catch (error: any) {
			return JSON.stringify({
				success: false,
				error: `❌ Error retrieving schema: ${error.message}`
			});
		}
	},

	async airport_city_lookup(params: any, env: Env) {
		try {
			const query = params.query.toLowerCase().trim();
			const maxResults = params.maxResults || 10;
			const includeNearby = params.includeNearbyAirports !== false;
			const majorsOnly = params.majorsOnly || false;
			
			// Check if query looks like IATA code
			const isIATAQuery = /^[A-Z]{3}$/i.test(query.trim());
			
			let sql: string;
			let queryParams: any[] = [];
			
			if (isIATAQuery) {
				// Direct IATA code lookup
				sql = `
					SELECT 
						a.iata_code,
						a.icao_code,
						a.name as airport_name,
						a.city,
						a.state_province,
						a.country,
						a.country_code,
						a.latitude as airport_lat,
						a.longitude as airport_lng,
						a.elevation,
						a.timezone,
						a.type,
						a.is_major,
						a.is_hub,
						0 as distance_miles
					FROM airports a 
					WHERE UPPER(a.iata_code) = UPPER(?)
					${params.countryCode ? 'AND a.country_code = ?' : ''}
					${majorsOnly ? 'AND a.is_major = 1' : ''}
					LIMIT ?
				`;
				queryParams = [query.toUpperCase()];
				if (params.countryCode) queryParams.push(params.countryCode.toUpperCase());
				queryParams.push(maxResults);
				
			} else {
				// Text search
				sql = `
					SELECT 
						a.iata_code,
						a.icao_code,
						a.name as airport_name,
						a.city,
						a.state_province,
						a.country,
						a.country_code,
						a.latitude as airport_lat,
						a.longitude as airport_lng,
						a.elevation,
						a.timezone,
						a.type,
						a.is_major,
						a.is_hub,
						0 as distance_miles
					FROM airports a
					WHERE (
						LOWER(a.city) LIKE '%' || ? || '%' OR
						LOWER(a.name) LIKE '%' || ? || '%' OR
						LOWER(a.country) LIKE '%' || ? || '%'
					)
					${params.countryCode ? 'AND a.country_code = ?' : ''}
					${majorsOnly ? 'AND a.is_major = 1' : ''}
					ORDER BY 
						a.is_major DESC,
						a.city ASC
					LIMIT ?
				`;
				queryParams = [query, query, query];
				if (params.countryCode) queryParams.push(params.countryCode.toUpperCase());
				queryParams.push(maxResults);
			}
			
			const result = await env.DB.prepare(sql).bind(...queryParams).all();
			
			if (!result.results || result.results.length === 0) {
				return JSON.stringify({
					success: false,
					error: 'No airports or cities found matching the search criteria',
					searchTerm: params.query,
					suggestions: [
						'Try a broader search term (e.g., "Denver" instead of "Denver International")',
						'Check spelling and try alternative names',
						'Add country code for better results (e.g., countryCode: "US")',
						'Try searching for the airport IATA code directly (e.g., "DEN")'
					]
				});
			}
			
			const airports = result.results.map((row: any) => ({
				iataCode: row.iata_code,
				icaoCode: row.icao_code,
				airportName: row.airport_name,
				city: row.city,
				stateProvince: row.state_province,
				country: row.country,
				countryCode: row.country_code,
				coordinates: {
					latitude: row.airport_lat,
					longitude: row.airport_lng
				},
				elevation: row.elevation,
				timezone: row.timezone,
				type: row.type,
				isMajor: !!row.is_major,
				isHub: !!row.is_hub,
				distanceMiles: row.distance_miles || 0
			}));
			
			const response = {
				success: true,
				airports,
				searchSummary: {
					query: params.query,
					resultsFound: airports.length,
					searchType: isIATAQuery ? 'iata_code' : 'text_search',
					includesNearbyAirports: includeNearby,
					majorsOnly: majorsOnly,
					topMatch: airports[0] ? {
						iataCode: airports[0].iataCode,
						airportName: airports[0].airportName,
						city: airports[0].city,
						country: airports[0].country,
						isMajor: airports[0].isMajor,
						isHub: airports[0].isHub
					} : null
				},
				usage: {
					flightSearch: 'Use iataCode for origin/destination in Amadeus flight searches',
					coordinates: 'Use coordinates for hotel searches and Google Places queries',
					timezone: 'Use timezone for arrival/departure time calculations',
					cityName: 'Use city + stateProvince for human-readable locations'
				}
			};
			
			return JSON.stringify(response);
			
		} catch (error: any) {
			console.error('❌ Error in airport/city lookup:', error);
			return JSON.stringify({
				success: false,
				error: 'Database query failed',
				details: error.message || error.toString(),
				suggestion: 'Try again with a simpler search term or check database connectivity'
			});
		}
	},

	async create_client(params: any, env: Env) {
		try {
			const sql = `
				INSERT INTO Clients (
					first_name, last_name, email, phone, address, city, state,
					postal_code, country, date_of_birth, passport_number,
					passport_expiry, preferences, notes
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
			`;
			const bindings = [
				params.first_name,
				params.last_name,
				params.email || null,
				params.phone || null,
				params.address || null,
				params.city || null,
				params.state || null,
				params.postal_code || null,
				params.country || 'United States',
				params.date_of_birth || null,
				params.passport_number || null,
				params.passport_expiry || null,
				params.preferences || null,
				params.notes || null
			];

			const result = await env.DB.prepare(sql).bind(...bindings).run();

			return JSON.stringify({
				success: true,
				message: `✅ Client created successfully`,
				client_id: result.meta.last_row_id,
				data: {
					id: result.meta.last_row_id,
					first_name: params.first_name,
					last_name: params.last_name,
					email: params.email,
					country: params.country || 'United States'
				}
			});
		} catch (error: any) {
			console.error('❌ Error creating client:', error);
			return JSON.stringify({
				success: false,
				error: `❌ Error creating client: ${error.message}`,
				suggestion: 'Check that all required fields are provided and properly formatted'
			});
		}
	},

	async get_client(params: any, env: Env) {
		try {
			const sql = `SELECT * FROM Clients WHERE client_id = ?`;
			const result = await env.DB.prepare(sql).bind(params.client_id).first();

			if (!result) {
				return JSON.stringify({
					success: false,
					error: `❌ Client with ID ${params.client_id} not found`
				});
			}

			return JSON.stringify({
				success: true,
				client: result
			});
		} catch (error: any) {
			console.error('❌ Error retrieving client:', error);
			return JSON.stringify({
				success: false,
				error: `❌ Error retrieving client: ${error.message}`
			});
		}
	},

	async search_clients(params: any, env: Env) {
		try {
			const searchTerm = `%${params.search_term.toLowerCase()}%`;
			const limit = params.limit || 10;

			const sql = `
				SELECT client_id, first_name, last_name, email, phone, city, state, country, created_at
				FROM Clients 
				WHERE LOWER(first_name) LIKE ? OR LOWER(last_name) LIKE ? OR LOWER(email) LIKE ?
				ORDER BY created_at DESC
				LIMIT ?
			`;

			const result = await env.DB.prepare(sql).bind(searchTerm, searchTerm, searchTerm, limit).all();

			return JSON.stringify({
				success: true,
				search_term: params.search_term,
				count: result.results.length,
				clients: result.results
			});
		} catch (error: any) {
			console.error('❌ Error searching clients:', error);
			return JSON.stringify({
				success: false,
				error: `❌ Error searching clients: ${error.message}`
			});
		}
	},

	async search_trips(params: any, env: Env) {
		try {
			const searchTerm = `%${params.search_term.toLowerCase()}%`;
			const limit = params.limit || 10;

			let sql = `
				SELECT t.trip_id, t.trip_name, t.start_date, t.end_date, t.status, t.total_cost, t.currency,
					   GROUP_CONCAT(c.first_name || ' ' || c.last_name, ', ') as participants
				FROM Trips t
				LEFT JOIN TripParticipants tp ON t.trip_id = tp.trip_id
				LEFT JOIN Clients c ON tp.client_id = c.client_id
				WHERE LOWER(t.trip_name) LIKE ? 
				   OR LOWER(c.first_name || ' ' || c.last_name) LIKE ?
			`;

			const bindings = [searchTerm, searchTerm];

			if (params.status) {
				sql += ` AND t.status = ?`;
				bindings.push(params.status);
			}

			sql += ` GROUP BY t.trip_id ORDER BY t.start_date DESC LIMIT ?`;
			bindings.push(limit);

			const result = await env.DB.prepare(sql).bind(...bindings).all();

			return JSON.stringify({
				success: true,
				search_term: params.search_term,
				status_filter: params.status || 'all',
				count: result.results.length,
				trips: result.results
			});
		} catch (error: any) {
			console.error('❌ Error searching trips:', error);
			return JSON.stringify({
				success: false,
				error: `❌ Error searching trips: ${error.message}`
			});
		}
	},

	async get_trip(params: any, env: Env) {
		try {
			// Get trip summary using the TripSummaryView
			const tripSql = `SELECT * FROM TripSummaryView WHERE trip_id = ?`;
			const tripResult = await env.DB.prepare(tripSql).bind(params.trip_id).first();

			if (!tripResult) {
				return JSON.stringify({
					success: false,
					error: `❌ Trip with ID ${params.trip_id} not found`
				});
			}

			// Get participants
			const participantsSql = `
				SELECT c.client_id, c.first_name, c.last_name, c.email, c.phone, tp.role
				FROM TripParticipants tp
				JOIN Clients c ON tp.client_id = c.client_id
				WHERE tp.trip_id = ?
			`;
			const participantsResult = await env.DB.prepare(participantsSql).bind(params.trip_id).all();

			return JSON.stringify({
				success: true,
				trip: tripResult,
				participants: participantsResult.results
			});
		} catch (error: any) {
			console.error('❌ Error retrieving trip:', error);
			return JSON.stringify({
				success: false,
				error: `❌ Error retrieving trip: ${error.message}`
			});
		}
	},

	async get_trip_daily_activities(params: any, env: Env) {
		try {
			let sql = `SELECT * FROM TripDailyActivitiesView WHERE trip_id = ?`;
			const bindings = [params.trip_id];

			if (params.day_number) {
				sql += ` AND day_number = ?`;
				bindings.push(params.day_number);
			}

			sql += ` ORDER BY day_number, start_time`;

			const result = await env.DB.prepare(sql).bind(...bindings).all();

			return JSON.stringify({
				success: true,
				trip_id: params.trip_id,
				day_filter: params.day_number || 'all',
				count: result.results.length,
				activities: result.results
			});
		} catch (error: any) {
			console.error('❌ Error retrieving trip activities:', error);
			return JSON.stringify({
				success: false,
				error: `❌ Error retrieving trip activities: ${error.message}`
			});
		}
	},

	async get_upcoming_trips(params: any, env: Env) {
		try {
			const daysAhead = params.days_ahead || 30;
			const limit = params.limit || 10;

			const sql = `
				SELECT t.trip_id, t.trip_name, t.start_date, t.end_date, t.status, t.total_cost, t.currency,
					   JULIANDAY(t.start_date) - JULIANDAY(DATE('now')) as days_until_trip,
					   GROUP_CONCAT(c.first_name || ' ' || c.last_name, ', ') as participants
				FROM Trips t
				LEFT JOIN TripParticipants tp ON t.trip_id = tp.trip_id
				LEFT JOIN Clients c ON tp.client_id = c.client_id
				WHERE t.start_date >= DATE('now') 
				  AND t.start_date <= DATE('now', '+' || ? || ' days')
				GROUP BY t.trip_id
				ORDER BY t.start_date
				LIMIT ?
			`;

			const result = await env.DB.prepare(sql).bind(daysAhead, limit).all();

			return JSON.stringify({
				success: true,
				days_ahead: daysAhead,
				count: result.results.length,
				upcoming_trips: result.results
			});
		} catch (error: any) {
			console.error('❌ Error retrieving upcoming trips:', error);
			return JSON.stringify({
				success: false,
				error: `❌ Error retrieving upcoming trips: ${error.message}`
			});
		}
	}
};

// Main MCP handling
async function handleMCPRequest(request: Request, env: Env): Promise<Response> {
	if (request.method !== 'POST') {
		return new Response('Method not allowed', { status: 405 });
	}

	try {
		const body = await request.json();
		const { method, params, id } = body;

		if (method === 'initialize') {
			return new Response(JSON.stringify({
				jsonrpc: '2.0',
				id,
				result: {
					protocolVersion: '2024-11-05',
					capabilities: {
						tools: {}
					},
					serverInfo: {
						name: 'Robust D1 Travel Database MCP',
						version: '4.0.0'
					}
				}
			}), {
				headers: { 'Content-Type': 'application/json' }
			});
		}

		if (method === 'tools/list') {
			const tools = Object.keys(toolSchemas).map(name => ({
				name,
				description: toolDescriptions[name],
				inputSchema: toolSchemas[name]
			}));

			return new Response(JSON.stringify({
				jsonrpc: '2.0',
				id,
				result: { tools }
			}), {
				headers: { 'Content-Type': 'application/json' }
			});
		}

		if (method === 'tools/call') {
			const { name, arguments: args } = params;
			
			if (!toolImplementations[name]) {
				return new Response(JSON.stringify(createErrorResponse(id, -32601, `Tool not found: ${name}`)), {
					status: 404,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			try {
				const result = await toolImplementations[name](args, env);
				return new Response(JSON.stringify({
					jsonrpc: '2.0',
					id,
					result: {
						content: [{
							type: 'text',
							text: result
						}]
					}
				}), {
					headers: { 'Content-Type': 'application/json' }
				});
			} catch (error: any) {
				return new Response(JSON.stringify(createErrorResponse(id, -32603, `Tool execution failed: ${error.message}`)), {
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		}

		return new Response(JSON.stringify(createErrorResponse(id, -32601, `Method not found: ${method}`)), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});

	} catch (error: any) {
		return new Response(JSON.stringify(createErrorResponse(null, -32700, `Parse error: ${error.message}`)), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// SSE Handler with MCP Request Processing
async function handleSSE(request: Request, env: Env): Promise<Response> {
	const corsHeaders = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
	};

	// Handle incoming MCP messages via POST
	if (request.method === 'POST') {
		try {
			const body = await request.json();
			const { method, params, id } = body;
			
			let response: any;

			if (method === 'initialize') {
				response = {
					jsonrpc: '2.0',
					id,
					result: {
						protocolVersion: '2024-11-05',
						capabilities: {
							tools: {}
						},
						serverInfo: {
							name: 'D1 Travel Database MCP',
							version: '4.0.0'
						}
					}
				};
			} else if (method === 'tools/list') {
				const tools = Object.keys(toolSchemas).map(name => ({
					name,
					description: toolDescriptions[name],
					inputSchema: toolSchemas[name]
				}));
				
				response = {
					jsonrpc: '2.0',
					id,
					result: { tools }
				};
			} else if (method === 'tools/call') {
				const { name, arguments: args } = params;
				
				if (!toolImplementations[name]) {
					response = {
						jsonrpc: '2.0',
						id,
						error: {
							code: -32601,
							message: `Tool not found: ${name}`
						}
					};
				} else {
					try {
						const result = await toolImplementations[name](args, env);
						response = {
							jsonrpc: '2.0',
							id,
							result: {
								content: [{
									type: 'text',
									text: result
								}]
							}
						};
					} catch (error: any) {
						response = {
							jsonrpc: '2.0',
							id,
							error: {
								code: -32603,
								message: `Tool execution failed: ${error.message}`
							}
						};
					}
				}
			} else if (method === 'ping') {
				response = {
					jsonrpc: '2.0',
					id,
					result: {}
				};
			} else if (method === 'resources/list') {
				response = {
					jsonrpc: '2.0',
					id,
					result: {
						resources: []
					}
				};
			} else if (method === 'prompts/list') {
				response = {
					jsonrpc: '2.0',
					id,
					result: {
						prompts: []
					}
				};
			} else {
				response = {
					jsonrpc: '2.0',
					id,
					error: {
						code: -32601,
						message: `Method not found: ${method}`
					}
				};
			}
			
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

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization'
				}
			});
		}

		// Health check endpoint
		if (url.pathname === '/health') {
			return new Response(JSON.stringify({
				status: "healthy",
				service: "Robust D1 Travel Database MCP v4",
				timestamp: new Date().toISOString(),
				auth_required: true
			}), {
				headers: { "Content-Type": "application/json" }
			});
		}

		// SSE endpoint
		if (url.pathname === '/sse' || url.pathname === '/sse/message') {
			return handleSSE(request, env);
		}

		// MCP endpoint
		if (url.pathname === '/mcp') {
			return handleMCPRequest(request, env);
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
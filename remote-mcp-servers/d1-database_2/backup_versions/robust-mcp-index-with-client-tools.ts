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
	initialize_travel_schema: {
		type: 'object',
		properties: {},
		required: []
	},
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
	create_client: {
		type: 'object',
		properties: {
			first_name: { type: 'string', description: 'Client\'s first name (required)' },
			last_name: { type: 'string', description: 'Client\'s last name (required)' },
			email: { type: 'string', description: 'Client\'s email address' },
			phone: { type: 'string', description: 'Client\'s phone number' },
			address: { type: 'string', description: 'Client\'s street address' },
			city: { type: 'string', description: 'Client\'s city' },
			state: { type: 'string', description: 'Client\'s state or province' },
			postal_code: { type: 'string', description: 'Client\'s postal code' },
			country: { type: 'string', description: 'Client\'s country' },
			date_of_birth: { type: 'string', description: 'Client\'s date of birth (YYYY-MM-DD)' },
			passport_number: { type: 'string', description: 'Client\'s passport number' },
			passport_expiry: { type: 'string', description: 'Client\'s passport expiry date (YYYY-MM-DD)' },
			preferences: { type: 'string', description: 'Client\'s travel preferences (JSON string or text)' },
			notes: { type: 'string', description: 'Additional notes about the client' }
		},
		required: ['first_name', 'last_name']
	},
	get_client: {
		type: 'object',
		properties: {
			client_id: { type: 'number', description: 'The unique ID of the client to retrieve' }
		},
		required: ['client_id']
	},
	update_client: {
		type: 'object',
		properties: {
			client_id: { type: 'number', description: 'The unique ID of the client to update' },
			first_name: { type: 'string', description: 'Client\'s first name' },
			last_name: { type: 'string', description: 'Client\'s last name' },
			email: { type: 'string', description: 'Client\'s email address' },
			phone: { type: 'string', description: 'Client\'s phone number' },
			address: { type: 'string', description: 'Client\'s street address' },
			city: { type: 'string', description: 'Client\'s city' },
			state: { type: 'string', description: 'Client\'s state or province' },
			postal_code: { type: 'string', description: 'Client\'s postal code' },
			country: { type: 'string', description: 'Client\'s country' },
			date_of_birth: { type: 'string', description: 'Client\'s date of birth (YYYY-MM-DD)' },
			passport_number: { type: 'string', description: 'Client\'s passport number' },
			passport_expiry: { type: 'string', description: 'Client\'s passport expiry date (YYYY-MM-DD)' },
			preferences: { type: 'string', description: 'Client\'s travel preferences (JSON string or text)' },
			notes: { type: 'string', description: 'Additional notes about the client' }
		},
		required: ['client_id']
	},
	delete_client: {
		type: 'object',
		properties: {
			client_id: { type: 'number', description: 'The unique ID of the client to delete' }
		},
		required: ['client_id']
	},
	create_trip: {
		type: 'object',
		properties: {
			trip_name: { type: 'string', description: 'Name of the trip' },
			start_date: { type: 'string', description: 'Start date of the trip (YYYY-MM-DD)' },
			end_date: { type: 'string', description: 'End date of the trip (YYYY-MM-DD)' },
			group_id: { type: 'number', description: 'Optional group ID associated with the trip' },
			duration: { type: 'number', description: 'Duration of the trip in days' },
			status: { type: 'string', description: 'Status of the trip (Planned, Booked, Completed)' },
			description: { type: 'string', description: 'A description of the trip' },
			total_cost: { type: 'number', description: 'Estimated or actual total cost of the trip' },
			currency: { type: 'string', description: 'Currency for the trip costs (USD, EUR)' },
			paid_amount: { type: 'number', description: 'Amount already paid for the trip' },
			balance_due: { type: 'number', description: 'Remaining balance due for the trip' },
			agent_name: { type: 'string', description: 'Name of the travel agent handling the trip' },
			agent_contact: { type: 'string', description: 'Contact information for the travel agent' },
			special_requests: { type: 'string', description: 'Any special requests for the trip' },
			notes: { type: 'string', description: 'Additional notes about the trip' }
		},
		required: ['trip_name', 'start_date', 'end_date']
	},
	get_trip: {
		type: 'object',
		properties: {
			trip_id: { type: 'number', description: 'The unique ID of the trip to retrieve' }
		},
		required: ['trip_id']
	},
	update_trip: {
		type: 'object',
		properties: {
			trip_id: { type: 'number', description: 'The unique ID of the trip to update' },
			trip_name: { type: 'string', description: 'Name of the trip' },
			start_date: { type: 'string', description: 'Start date of the trip (YYYY-MM-DD)' },
			end_date: { type: 'string', description: 'End date of the trip (YYYY-MM-DD)' },
			group_id: { type: 'number', description: 'Optional group ID associated with the trip' },
			duration: { type: 'number', description: 'Duration of the trip in days' },
			status: { type: 'string', description: 'Status of the trip (Planned, Booked, Completed)' },
			description: { type: 'string', description: 'A description of the trip' },
			total_cost: { type: 'number', description: 'Estimated or actual total cost of the trip' },
			currency: { type: 'string', description: 'Currency for the trip costs (USD, EUR)' },
			paid_amount: { type: 'number', description: 'Amount already paid for the trip' },
			balance_due: { type: 'number', description: 'Remaining balance due for the trip' },
			agent_name: { type: 'string', description: 'Name of the travel agent handling the trip' },
			agent_contact: { type: 'string', description: 'Contact information for the travel agent' },
			special_requests: { type: 'string', description: 'Any special requests for the trip' },
			notes: { type: 'string', description: 'Additional notes about the trip' }
		},
		required: ['trip_id']
	},
	delete_trip: {
		type: 'object',
		properties: {
			trip_id: { type: 'number', description: 'The unique ID of the trip to delete' }
		},
		required: ['trip_id']
	},
	search_clients: {
		type: 'object',
		properties: {
			name: { type: 'string', description: 'Full or partial name of the client to search for' },
			email: { type: 'string', description: 'Email address of the client to search for' }
		},
		required: []
	},
	search_trips: {
		type: 'object',
		properties: {
			client_name: { type: 'string', description: 'Full or partial name of a client associated with the trip' },
			client_id: { type: 'number', description: 'Unique ID of a client associated with the trip' },
			trip_name: { type: 'string', description: 'Full or partial name of the trip' },
			destination: { type: 'string', description: 'Full or partial name of a destination in the trip' }
		},
		required: []
	},
	add_activity_log_entry: {
		type: 'object',
		properties: {
			session_id: { type: 'string', description: 'The current session ID' },
			activity_type: { type: 'string', description: 'The type of activity' },
			details: { type: 'string', description: 'A brief description of the activity' },
			trip_id: { type: 'number', description: 'The ID of the trip related to the activity' },
			client_id: { type: 'number', description: 'The ID of the client related to the activity' }
		},
		required: ['session_id', 'activity_type', 'details']
	},
	get_recent_activities: {
		type: 'object',
		properties: {
			limit: { type: 'number', description: 'Number of recent activities to retrieve (default: 3)' },
			days_past: { type: 'number', description: 'How many days back to look for activities (default: 7)' }
		},
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
	}
};

// Tool descriptions
const toolDescriptions = {
	initialize_travel_schema: 'Initialize database schema for travel data',
	store_travel_search: 'Store a travel search for tracking and analytics',
	get_search_history: 'Retrieve travel search history',
	get_popular_routes: 'Get most popular travel routes',
	store_user_preference: 'Store user travel preferences',
	get_user_preferences: 'Retrieve user travel preferences',
	execute_query: 'Execute a custom SQL query (SELECT only)',
	get_database_schema: 'Get database schema information',
	create_client: 'Creates a new client record in the travel database',
	get_client: 'Retrieves a client\'s details by their ID',
	update_client: 'Updates specified fields for an existing client',
	delete_client: 'Deletes a client record by their ID',
	create_trip: 'Creates a new trip record in the travel database',
	get_trip: 'Retrieves a trip\'s summary details by its ID',
	update_trip: 'Updates specified fields for an existing trip',
	delete_trip: 'Deletes a trip record by its ID',
	search_clients: 'Searches for clients by name or email',
	search_trips: 'Searches for trips by client name, client ID, trip name, or destination',
	add_activity_log_entry: 'Adds a new entry to the ActivityLog',
	get_recent_activities: 'Retrieves recent activities from the ActivityLog',
	airport_city_lookup: 'Search for airports by city name, airport name, or IATA code. Essential for converting city names like "Mobile, AL" or "Denver, CO" to IATA codes for flight searches.'
};

// Tool implementations
const toolImplementations = {
	async initialize_travel_schema(params: any, env: Env) {
		try {
			// Create searches table
			await env.DB.prepare(`
				CREATE TABLE IF NOT EXISTS travel_searches (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					search_type TEXT NOT NULL,
					origin TEXT,
					destination TEXT,
					departure_date TEXT,
					return_date TEXT,
					passengers INTEGER DEFAULT 1,
					budget_limit REAL,
					search_parameters TEXT,
					results_summary TEXT,
					created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
					user_id TEXT DEFAULT 'anonymous'
				)
			`).run();

			// Create user preferences table
			await env.DB.prepare(`
				CREATE TABLE IF NOT EXISTS user_preferences (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					user_id TEXT NOT NULL,
					preference_type TEXT NOT NULL,
					preference_value TEXT,
					created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
					updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
				)
			`).run();

			// Create popular routes view
			await env.DB.prepare(`
				CREATE VIEW IF NOT EXISTS popular_routes AS
				SELECT
					origin,
					destination,
					COUNT(*) as search_count,
					AVG(budget_limit) as avg_budget,
					MAX(created_at) as last_searched
				FROM travel_searches
				WHERE origin IS NOT NULL AND destination IS NOT NULL
				GROUP BY origin, destination
				ORDER BY search_count DESC
			`).run();

			return JSON.stringify({
				success: true,
				message: '✅ Travel database schema initialized successfully'
			});
		} catch (error: any) {
			return JSON.stringify({
				success: false,
				error: `❌ Error initializing schema: ${error.message}`
			});
		}
	},

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

	async create_client(params: any, env: Env) {
		try {
			const sql = `
				INSERT INTO clients (
					first_name, last_name, email, phone, address, city, state,
					postal_code, country, date_of_birth, passport_number,
					passport_expiry, preferences, notes
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
			
			if (result.success && result.meta && result.meta.last_row_id) {
				return JSON.stringify({
					success: true,
					client_id: result.meta.last_row_id,
					message: 'Client created successfully'
				});
			} else {
				return JSON.stringify({
					success: false,
					error: 'Failed to create client - D1 operation error'
				});
			}
		} catch (error: any) {
			return JSON.stringify({
				success: false,
				error: `Error creating client: ${error.message}`
			});
		}
	},

	async get_client(params: any, env: Env) {
		try {
			const sql = 'SELECT * FROM clients WHERE client_id = ?';
			const result = await env.DB.prepare(sql).bind(params.client_id).first();
			
			if (result) {
				return JSON.stringify({
					success: true,
					client: result
				});
			} else {
				return JSON.stringify({
					success: false,
					error: `Client with ID ${params.client_id} not found`
				});
			}
		} catch (error: any) {
			return JSON.stringify({
				success: false,
				error: `Error retrieving client: ${error.message}`
			});
		}
	},

	async update_client(params: any, env: Env) {
		try {
			const { client_id, ...fieldsToUpdate } = params;
			
			if (Object.keys(fieldsToUpdate).length === 0) {
				return JSON.stringify({
					success: false,
					error: 'No fields provided to update'
				});
			}
			
			const setClauses: string[] = [];
			const bindings: any[] = [];
			
			for (const [key, value] of Object.entries(fieldsToUpdate)) {
				if (value !== undefined) {
					setClauses.push(`${key} = ?`);
					bindings.push(value);
				}
			}
			
			if (setClauses.length === 0) {
				return JSON.stringify({
					success: false,
					error: 'No valid fields provided to update'
				});
			}
			
			bindings.push(client_id);
			
			const sql = `UPDATE clients SET ${setClauses.join(', ')} WHERE client_id = ?`;
			const result = await env.DB.prepare(sql).bind(...bindings).run();
			
			if (result.success && result.meta && result.meta.changes > 0) {
				return JSON.stringify({
					success: true,
					message: `Client ID ${client_id} updated successfully`,
					changes: result.meta.changes
				});
			} else {
				return JSON.stringify({
					success: false,
					error: `Client ID ${client_id} not found or no changes made`
				});
			}
		} catch (error: any) {
			return JSON.stringify({
				success: false,
				error: `Error updating client: ${error.message}`
			});
		}
	},

	async delete_client(params: any, env: Env) {
		try {
			const sql = 'DELETE FROM clients WHERE client_id = ?';
			const result = await env.DB.prepare(sql).bind(params.client_id).run();
			
			if (result.success && result.meta && result.meta.changes > 0) {
				return JSON.stringify({
					success: true,
					message: `Client ID ${params.client_id} deleted successfully`,
					changes: result.meta.changes
				});
			} else {
				return JSON.stringify({
					success: false,
					error: `Client ID ${params.client_id} not found`
				});
			}
		} catch (error: any) {
			return JSON.stringify({
				success: false,
				error: `Error deleting client: ${error.message}`
			});
		}
	},

	async create_trip(params: any, env: Env) {
		try {
			const sql = `
				INSERT INTO trips (
					trip_name, start_date, end_date, group_id, duration, status,
					description, total_cost, currency, paid_amount, balance_due,
					agent_name, agent_contact, special_requests, notes
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`;
			const bindings = [
				params.trip_name,
				params.start_date,
				params.end_date,
				params.group_id || null,
				params.duration || null,
				params.status || 'Planned',
				params.description || null,
				params.total_cost || null,
				params.currency || 'USD',
				params.paid_amount || 0,
				params.balance_due || null,
				params.agent_name || null,
				params.agent_contact || null,
				params.special_requests || null,
				params.notes || null
			];
			
			const result = await env.DB.prepare(sql).bind(...bindings).run();
			
			if (result.success && result.meta && result.meta.last_row_id) {
				return JSON.stringify({
					success: true,
					trip_id: result.meta.last_row_id,
					message: 'Trip created successfully'
				});
			} else {
				return JSON.stringify({
					success: false,
					error: 'Failed to create trip - D1 operation error'
				});
			}
		} catch (error: any) {
			return JSON.stringify({
				success: false,
				error: `Error creating trip: ${error.message}`
			});
		}
	},

	async get_trip(params: any, env: Env) {
		try {
			const sql = 'SELECT * FROM trips WHERE trip_id = ?';
			const result = await env.DB.prepare(sql).bind(params.trip_id).first();
			
			if (result) {
				return JSON.stringify({
					success: true,
					trip: result
				});
			} else {
				return JSON.stringify({
					success: false,
					error: `Trip with ID ${params.trip_id} not found`
				});
			}
		} catch (error: any) {
			return JSON.stringify({
				success: false,
				error: `Error retrieving trip: ${error.message}`
			});
		}
	},

	async update_trip(params: any, env: Env) {
		try {
			const { trip_id, ...fieldsToUpdate } = params;
			
			if (Object.keys(fieldsToUpdate).length === 0) {
				return JSON.stringify({
					success: false,
					error: 'No fields provided to update'
				});
			}
			
			const setClauses: string[] = [];
			const bindings: any[] = [];
			
			for (const [key, value] of Object.entries(fieldsToUpdate)) {
				if (value !== undefined) {
					setClauses.push(`${key} = ?`);
					bindings.push(value);
				}
			}
			
			if (setClauses.length === 0) {
				return JSON.stringify({
					success: false,
					error: 'No valid fields provided to update'
				});
			}
			
			bindings.push(trip_id);
			
			const sql = `UPDATE trips SET ${setClauses.join(', ')} WHERE trip_id = ?`;
			const result = await env.DB.prepare(sql).bind(...bindings).run();
			
			if (result.success && result.meta && result.meta.changes > 0) {
				return JSON.stringify({
					success: true,
					message: `Trip ID ${trip_id} updated successfully`,
					changes: result.meta.changes
				});
			} else {
				return JSON.stringify({
					success: false,
					error: `Trip ID ${trip_id} not found or no changes made`
				});
			}
		} catch (error: any) {
			return JSON.stringify({
				success: false,
				error: `Error updating trip: ${error.message}`
			});
		}
	},

	async delete_trip(params: any, env: Env) {
		try {
			const sql = 'DELETE FROM trips WHERE trip_id = ?';
			const result = await env.DB.prepare(sql).bind(params.trip_id).run();
			
			if (result.success && result.meta && result.meta.changes > 0) {
				return JSON.stringify({
					success: true,
					message: `Trip ID ${params.trip_id} deleted successfully`,
					changes: result.meta.changes
				});
			} else {
				return JSON.stringify({
					success: false,
					error: `Trip ID ${params.trip_id} not found`
				});
			}
		} catch (error: any) {
			return JSON.stringify({
				success: false,
				error: `Error deleting trip: ${error.message}`
			});
		}
	},

	async search_clients(params: any, env: Env) {
		try {
			if (!params.name && !params.email) {
				return JSON.stringify({
					success: false,
					error: 'Either name or email must be provided for client search'
				});
			}
			
			let sql = 'SELECT * FROM clients WHERE ';
			const bindings: any[] = [];
			const conditions: string[] = [];
			
			if (params.name) {
				conditions.push('(first_name LIKE ? OR last_name LIKE ?)');
				bindings.push(`%${params.name}%`, `%${params.name}%`);
			}
			if (params.email) {
				conditions.push('email LIKE ?');
				bindings.push(`%${params.email}%`);
			}
			
			sql += conditions.join(' AND ');
			sql += ' ORDER BY last_name, first_name';
			
			const result = await env.DB.prepare(sql).bind(...bindings).all();
			
			return JSON.stringify({
				success: true,
				count: result.results?.length || 0,
				clients: result.results || []
			});
		} catch (error: any) {
			return JSON.stringify({
				success: false,
				error: `Error searching clients: ${error.message}`
			});
		}
	},

	async search_trips(params: any, env: Env) {
		try {
			if (!params.client_name && !params.client_id && !params.trip_name && !params.destination) {
				return JSON.stringify({
					success: false,
					error: 'At least one search parameter must be provided for trip search'
				});
			}
			
			let sql = 'SELECT * FROM trips WHERE 1=1 ';
			const bindings: any[] = [];
			
			if (params.trip_name) {
				sql += 'AND trip_name LIKE ? ';
				bindings.push(`%${params.trip_name}%`);
			}
			
			if (params.destination) {
				sql += 'AND (trip_name LIKE ? OR description LIKE ?) ';
				bindings.push(`%${params.destination}%`, `%${params.destination}%`);
			}
			
			sql += 'ORDER BY start_date DESC, trip_name';
			
			const result = await env.DB.prepare(sql).bind(...bindings).all();
			
			return JSON.stringify({
				success: true,
				count: result.results?.length || 0,
				trips: result.results || []
			});
		} catch (error: any) {
			return JSON.stringify({
				success: false,
				error: `Error searching trips: ${error.message}`
			});
		}
	},

	async add_activity_log_entry(params: any, env: Env) {
		try {
			const sql = `
				INSERT INTO ActivityLog (session_id, client_id, trip_id, activity_type, details)
				VALUES (?, ?, ?, ?, ?)
			`;
			const bindings = [
				params.session_id,
				params.client_id || null,
				params.trip_id || null,
				params.activity_type,
				params.details
			];
			
			const result = await env.DB.prepare(sql).bind(...bindings).run();
			
			if (result.success && result.meta && result.meta.last_row_id) {
				return JSON.stringify({
					success: true,
					activity_log_id: result.meta.last_row_id,
					message: 'Activity logged successfully'
				});
			} else {
				return JSON.stringify({
					success: false,
					error: 'Failed to log activity - D1 operation error'
				});
			}
		} catch (error: any) {
			return JSON.stringify({
				success: false,
				error: `Error logging activity: ${error.message}`
			});
		}
	},

	async get_recent_activities(params: any, env: Env) {
		try {
			const limit = params.limit || 3;
			const daysPast = params.days_past || 7;
			
			const sql = `
				SELECT a.*, t.trip_name, c.first_name, c.last_name
				FROM ActivityLog a
				LEFT JOIN trips t ON a.trip_id = t.trip_id
				LEFT JOIN clients c ON a.client_id = c.client_id
				WHERE a.activity_timestamp >= date('now', '-' || ? || ' days')
				ORDER BY a.activity_timestamp DESC
				LIMIT ?
			`;
			
			const result = await env.DB.prepare(sql).bind(daysPast.toString(), limit).all();
			
			return JSON.stringify({
				success: true,
				count: result.results?.length || 0,
				activities: result.results || []
			});
		} catch (error: any) {
			return JSON.stringify({
				success: false,
				error: `Error retrieving activities: ${error.message}`
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

// SSE Handler
async function handleSSE(request: Request, env: Env): Promise<Response> {
	const { readable, writable } = new TransformStream();
	const writer = writable.getWriter();

	// Send initial ping
	await writer.write(new TextEncoder().encode('data: {"jsonrpc":"2.0","method":"ping","result":{}}\n\n'));

	// Keep connection alive with periodic pings
	const pingInterval = setInterval(async () => {
		try {
			await writer.write(new TextEncoder().encode('data: {"jsonrpc":"2.0","method":"ping","result":{}}\n\n'));
		} catch (error) {
			clearInterval(pingInterval);
		}
	}, 30000);

	// Handle incoming messages (simplified for now)
	request.signal?.addEventListener('abort', () => {
		clearInterval(pingInterval);
		writer.close();
	});

	return new Response(readable, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization'
		}
	});
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
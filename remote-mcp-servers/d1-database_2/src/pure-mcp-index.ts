
// Environment interface
interface Env {
	DB: D1Database;
	MCP_AUTH_KEY: string;
}

// Direct JSON Schema definitions (no more Zod complexity!)
const toolSchemas = {
	initialize_travel_schema: {
		type: 'object',
		properties: {},
		required: []
	},
	store_travel_search: {
		type: 'object',
		properties: {
			search_type: {
				type: 'string',
				description: 'Type of search (flight, hotel, package)'
			},
			origin: {
				type: 'string',
				description: 'Origin location'
			},
			destination: {
				type: 'string',
				description: 'Destination location'
			},
			departure_date: {
				type: 'string',
				description: 'Departure date'
			},
			return_date: {
				type: 'string',
				description: 'Return date'
			},
			passengers: {
				type: 'number',
				description: 'Number of passengers'
			},
			budget_limit: {
				type: 'number',
				description: 'Budget limit'
			},
			search_parameters: {
				type: 'string',
				description: 'Full search parameters as JSON'
			},
			results_summary: {
				type: 'string',
				description: 'Summary of search results'
			},
			user_id: {
				type: 'string',
				description: 'User identifier'
			}
		},
		required: ['search_type']
	},
	get_search_history: {
		type: 'object',
		properties: {
			user_id: {
				type: 'string',
				description: 'User ID to filter by'
			},
			search_type: {
				type: 'string',
				description: 'Search type to filter by'
			},
			limit: {
				type: 'number',
				description: 'Maximum number of results'
			}
		},
		required: []
	},
	get_popular_routes: {
		type: 'object',
		properties: {
			limit: {
				type: 'number',
				description: 'Maximum number of routes to return'
			}
		},
		required: []
	},
	store_user_preference: {
		type: 'object',
		properties: {
			user_id: {
				type: 'string',
				description: 'User identifier'
			},
			preference_type: {
				type: 'string',
				description: 'Type of preference (airline, seat_type, meal, etc.)'
			},
			preference_value: {
				type: 'string',
				description: 'Preference value'
			}
		},
		required: ['user_id', 'preference_type', 'preference_value']
	},
	get_user_preferences: {
		type: 'object',
		properties: {
			user_id: {
				type: 'string',
				description: 'User identifier'
			},
			preference_type: {
				type: 'string',
				description: 'Specific preference type to retrieve'
			}
		},
		required: ['user_id']
	},
	execute_query: {
		type: 'object',
		properties: {
			query: {
				type: 'string',
				description: 'SQL query to execute'
			},
			params: {
				type: 'array',
				items: {},
				description: 'Query parameters'
			}
		},
		required: ['query']
	},
	get_database_schema: {
		type: 'object',
		properties: {},
		required: []
	}
};

// No conversion needed - we use direct JSON schemas!

// Tool implementations
class D1DatabaseTools {
	private env: Env;
	
	constructor(env: Env) {
		this.env = env;
	}
	
	async initialize_travel_schema() {
		try {
			// Create searches table
			await this.env.DB.prepare(`
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
			await this.env.DB.prepare(`
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
			await this.env.DB.prepare(`
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

			return {
				content: [{
					type: "text",
					text: "✅ Travel database schema initialized successfully"
				}]
			};
		} catch (error) {
			return {
				content: [{
					type: "text",
					text: `❌ Error initializing schema: ${error}`
				}]
			};
		}
	}
	
	async store_travel_search(params: any) {
		try {
			const result = await this.env.DB.prepare(`
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

			return {
				content: [{
					type: "text",
					text: `✅ Travel search stored with ID: ${result.meta.last_row_id}`
				}]
			};
		} catch (error) {
			return {
				content: [{
					type: "text",
					text: `❌ Error storing search: ${error}`
				}]
			};
		}
	}
	
	async get_search_history(params: any) {
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

			const result = await this.env.DB.prepare(query).bind(...bindings).all();

			return {
				content: [{
					type: "text",
					text: `📋 Found ${result.results.length} travel searches:\n\n${JSON.stringify(result.results, null, 2)}`
				}]
			};
		} catch (error) {
			return {
				content: [{
					type: "text",
					text: `❌ Error retrieving search history: ${error}`
				}]
			};
		}
	}
	
	async get_popular_routes(params: any) {
		try {
			let query = "SELECT * FROM popular_routes";

			if (params.limit) {
				query += " LIMIT ?";
				const result = await this.env.DB.prepare(query).bind(params.limit).all();

				return {
					content: [{
						type: "text",
						text: `🔥 Top ${result.results.length} popular routes:\n\n${JSON.stringify(result.results, null, 2)}`
					}]
				};
			} else {
				const result = await this.env.DB.prepare(query).all();

				return {
					content: [{
						type: "text",
						text: `🔥 All popular routes (${result.results.length} total):\n\n${JSON.stringify(result.results, null, 2)}`
					}]
				};
			}
		} catch (error) {
			return {
				content: [{
					type: "text",
					text: `❌ Error retrieving popular routes: ${error}`
				}]
			};
		}
	}
	
	async store_user_preference(params: any) {
		try {
			// Check if preference exists and update, otherwise insert
			const existing = await this.env.DB.prepare(`
				SELECT id FROM user_preferences
				WHERE user_id = ? AND preference_type = ?
			`).bind(params.user_id, params.preference_type).first();

			if (existing) {
				await this.env.DB.prepare(`
					UPDATE user_preferences
					SET preference_value = ?, updated_at = CURRENT_TIMESTAMP
					WHERE user_id = ? AND preference_type = ?
				`).bind(params.preference_value, params.user_id, params.preference_type).run();

				return {
					content: [{
						type: "text",
						text: `✅ Updated preference for ${params.user_id}: ${params.preference_type} = ${params.preference_value}`
					}]
				};
			} else {
				await this.env.DB.prepare(`
					INSERT INTO user_preferences (user_id, preference_type, preference_value)
					VALUES (?, ?, ?)
				`).bind(params.user_id, params.preference_type, params.preference_value).run();

				return {
					content: [{
						type: "text",
						text: `✅ Stored new preference for ${params.user_id}: ${params.preference_type} = ${params.preference_value}`
					}]
				};
			}
		} catch (error) {
			return {
				content: [{
					type: "text",
					text: `❌ Error storing preference: ${error}`
				}]
			};
		}
	}
	
	async get_user_preferences(params: any) {
		try {
			let query = "SELECT * FROM user_preferences WHERE user_id = ?";
			const bindings: unknown[] = [params.user_id];

			if (params.preference_type) {
				query += " AND preference_type = ?";
				bindings.push(params.preference_type);
			}

			query += " ORDER BY updated_at DESC";

			const result = await this.env.DB.prepare(query).bind(...bindings).all();

			return {
				content: [{
					type: "text",
					text: `👤 Preferences for ${params.user_id}:\n\n${JSON.stringify(result.results, null, 2)}`
				}]
			};
		} catch (error) {
			return {
				content: [{
					type: "text",
					text: `❌ Error retrieving preferences: ${error}`
				}]
			};
		}
	}
	
	async execute_query(params: any) {
		try {
			// Security: Only allow SELECT statements for safety
			const trimmedQuery = params.query.trim().toLowerCase();
			if (!trimmedQuery.startsWith('select')) {
				return {
					content: [{
						type: "text",
						text: `❌ Only SELECT queries are allowed for security reasons`
					}]
				};
			}

			const stmt = this.env.DB.prepare(params.query);
			const result = params.params ?
				await stmt.bind(...params.params).all() :
				await stmt.all();

			return {
				content: [{
					type: "text",
					text: `📊 Query results (${result.results.length} rows):\n\n${JSON.stringify(result.results, null, 2)}`
				}]
			};
		} catch (error) {
			return {
				content: [{
					type: "text",
					text: `❌ Error executing query: ${error}`
				}]
			};
		}
	}
	
	async get_database_schema() {
		try {
			const tables = await this.env.DB.prepare(`
				SELECT name FROM sqlite_master
				WHERE type='table' AND name NOT LIKE 'sqlite_%'
				ORDER BY name
			`).all();

			const views = await this.env.DB.prepare(`
				SELECT name FROM sqlite_master
				WHERE type='view'
				ORDER BY name
			`).all();

			let schemaInfo = "📋 **Database Schema**\n\n";

			schemaInfo += "**Tables:**\n";
			for (const table of tables.results) {
				const tableInfo = await this.env.DB.prepare(`
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

			return {
				content: [{
					type: "text",
					text: schemaInfo
				}]
			};
		} catch (error) {
			return {
				content: [{
					type: "text",
					text: `❌ Error retrieving schema: ${error}`
				}]
			};
		}
	}
}

// Pure MCP JSON-RPC 2.0 Handler
class PureMCPServer {
	private tools: D1DatabaseTools;
	
	constructor(env: Env) {
		this.tools = new D1DatabaseTools(env);
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
								name: 'D1 Travel Database',
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
									name: 'initialize_travel_schema',
									description: 'Initialize the travel database schema with tables and views',
									inputSchema: toolSchemas.initialize_travel_schema
								},
								{
									name: 'store_travel_search',
									description: 'Store a travel search in the database',
									inputSchema: toolSchemas.store_travel_search
								},
								{
									name: 'get_search_history',
									description: 'Retrieve travel search history',
									inputSchema: toolSchemas.get_search_history
								},
								{
									name: 'get_popular_routes',
									description: 'Get popular travel routes based on search history',
									inputSchema: toolSchemas.get_popular_routes
								},
								{
									name: 'store_user_preference',
									description: 'Store or update a user preference',
									inputSchema: toolSchemas.store_user_preference
								},
								{
									name: 'get_user_preferences',
									description: 'Retrieve user preferences',
									inputSchema: toolSchemas.get_user_preferences
								},
								{
									name: 'execute_query',
									description: 'Execute a custom SQL SELECT query',
									inputSchema: toolSchemas.execute_query
								},
								{
									name: 'get_database_schema',
									description: 'Get the database schema information',
									inputSchema: toolSchemas.get_database_schema
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
			const server = new PureMCPServer(env);
			
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
				service: 'Pure D1 Travel Database MCP v3',
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
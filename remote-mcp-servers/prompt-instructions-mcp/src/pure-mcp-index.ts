// Environment interface
interface Env {
	DB: D1Database;
	PROMPTS_CACHE?: KVNamespace;
	MCP_AUTH_KEY: string;
}

// Direct JSON Schema definitions (no more Zod complexity!)
const toolSchemas = {
	initialize_travel_assistant: {
		type: 'object',
		properties: {
			first_message: {
				type: 'string',
				description: 'The first message from the user to detect mode'
			}
		},
		required: ['first_message']
	},
	get_instruction_set: {
		type: 'object',
		properties: {
			instruction_set: {
				type: 'string',
				description: 'The instruction set name to retrieve'
			},
			include_examples: {
				type: 'boolean',
				description: 'Whether to include usage examples'
			}
		},
		required: ['instruction_set']
	},
	list_instruction_sets: {
		type: 'object',
		properties: {
			category: {
				type: 'string',
				description: 'Filter by category (mode, pricing, reference, workflow)'
			}
		},
		required: []
	},
	get_mode_indicator: {
		type: 'object',
		properties: {},
		required: []
	},
	switch_mode: {
		type: 'object',
		properties: {
			mode: {
				type: 'string',
				enum: ['mobile-mode', 'interactive-mode'],
				description: 'The mode to switch to'
			}
		},
		required: ['mode']
	}
};

// Tool implementations
class PromptInstructionsTools {
	private env: Env;
	
	constructor(env: Env) {
		this.env = env;
	}
	
	async initialize_travel_assistant(params: any) {
		try {
			console.log('initialize_travel_assistant called with params:', params);
			const firstMessage = params.first_message || '';
			
			// Detect mode from first message
			const isMobileMode = /\[MOBILE\]|just got off the phone|new lead:/i.test(firstMessage);
			const mode = isMobileMode ? 'mobile-mode' : 'interactive-mode';
			console.log('Detected mode:', mode);
			
			// Store current mode in KV for session tracking (if available)
			if (this.env.PROMPTS_CACHE) {
				await this.env.PROMPTS_CACHE.put('current_mode', mode);
			}
			
			// Setup mode variables
			const modeIndicator = isMobileMode ? '[🤖 AUTONOMOUS]' : '[💬 INTERACTIVE]';
			const modeDescription = isMobileMode ? '🤖 Mobile/Autonomous' : '💬 Interactive/Desktop';
			
			// Get the appropriate instruction set from database
			const instructionResult = await this.env.DB.prepare(
				'SELECT title, content FROM instruction_sets WHERE name = ? AND is_active = true'
			).bind(mode).first();
			
			let instructionContent = '';
			if (!instructionResult) {
				console.log(`No instruction set '${mode}' found in database, using fallback`);
				// Fallback instructions if database is empty
				instructionContent = mode === 'mobile-mode'
					? `# Mobile Mode - Autonomous Operation
**Work autonomously** without confirmations. Process leads immediately and generate trip proposals.
Include **[🤖 AUTONOMOUS]** at the end of responses.`
					: `# Interactive Mode - Desktop Collaboration  
**Collaborate with agent** through confirmations and detailed explanations.
Include **[💬 INTERACTIVE]** at the end of responses.`;
			} else {
				instructionContent = instructionResult.content as string;
			}
			
			const content = `# Travel Assistant Initialized

## Mode Detected: ${modeDescription}

## Core System:
- **Role**: Professional travel assistant for agent Kim Henderson (Somo Travel)
- **Three-tier proposals**: Classic (75%), Premium (110%), Luxury (175%) of budget  
- **Service markups never disclosed** in client documents
- **Session ID**: Generate Session-YYYYMMDD-Description for activity logs

## Current Mode Instructions:
${instructionContent}

## Available Instruction Sets:
Use get_instruction_set("name") to access:
- mobile-mode, interactive-mode, three-tier-pricing
- tool-reference, database-schema, workflows

## Response Format:
**Add this indicator to each response:**
${modeIndicator} - Include this at the end of every response to show current mode.

Ready to assist with travel planning!`;
			
			return {
				content: [{
					type: 'text',
					text: content
				}]
			};
		} catch (error: any) {
			console.error('Error in initialize_travel_assistant:', error);
			return {
				content: [{
					type: 'text',
					text: `Error initializing travel assistant: ${error.message || 'Unknown error'}`
				}]
			};
		}
	}
	
	async get_instruction_set(params: any) {
		try {
			const instructionResult = await this.env.DB.prepare(
				'SELECT name, title, content, description, category FROM instruction_sets WHERE name = ? AND is_active = true'
			).bind(params.instruction_set).first();
			
			if (!instructionResult) {
				// Get available instruction sets
				const availableSets = await this.env.DB.prepare(
					'SELECT name FROM instruction_sets WHERE is_active = true ORDER BY name'
				).all();
				const availableNames = availableSets.results.map((row: any) => row.name).join(', ');
				throw new Error(`Unknown instruction set: ${params.instruction_set}. Available sets: ${availableNames}`);
			}
			
			let content = `# ${instructionResult.title}\n\n${instructionResult.content}`;
			
			if (params.include_examples) {
				content += '\n\n## Usage Examples\n';
				content += 'Use this instruction set when:\n';
				switch (instructionResult.category) {
					case 'mode':
						if (instructionResult.name === 'mobile-mode') {
							content += '- Processing leads from mobile interactions\n- Working autonomously without confirmations\n- Creating initial trip structures from raw lead data';
						} else {
							content += '- Agent is using desktop interface\n- Collaborative planning sessions\n- Technical operations requiring approval';
						}
						break;
					case 'pricing':
						content += '- Creating client proposals\n- Calculating pricing strategies\n- Building competitive tier options';
						break;
					case 'reference':
						content += '- Looking up tool parameters or database schema\n- Understanding available operations\n- Debugging tool usage or data issues';
						break;
					case 'workflow':
						content += '- Following standard procedures\n- Managing complex operations\n- Error recovery scenarios';
						break;
					default:
						content += `- Working with ${instructionResult.category} related tasks`;
				}
			}
			
			return {
				content: [{
					type: 'text',
					text: content
				}]
			};
		} catch (error: any) {
			console.error('Error in get_instruction_set:', error);
			return {
				content: [{
					type: 'text',
					text: `Error getting instruction set: ${error.message || 'Unknown error'}`
				}]
			};
		}
	}
	
	async list_instruction_sets(params: any) {
		try {
			let query = 'SELECT name, title, description, category FROM instruction_sets WHERE is_active = true';
			const bindings: any[] = [];
			
			if (params.category) {
				query += ' AND category = ?';
				bindings.push(params.category);
			}
			query += ' ORDER BY category, name';
			
			const result = await this.env.DB.prepare(query).bind(...bindings).all();
			let content = '# Available Instruction Sets\n\n';
			
			// Group by category
			const categories: { [key: string]: any[] } = {};
			result.results.forEach((row: any) => {
				if (!categories[row.category]) {
					categories[row.category] = [];
				}
				categories[row.category].push(row);
			});
			
			Object.keys(categories).sort().forEach(category => {
				content += `## ${category.charAt(0).toUpperCase() + category.slice(1)} Instructions\n\n`;
				categories[category].forEach((instruction: any) => {
					content += `- **${instruction.name}**: ${instruction.title}\n`;
					if (instruction.description) {
						content += `  ${instruction.description}\n`;
					}
					content += '\n';
				});
			});
			
			content += '\nUse `get_instruction_set("name")` to retrieve specific instruction content.';
			
			return {
				content: [{
					type: 'text',
					text: content
				}]
			};
		} catch (error: any) {
			console.error('Error in list_instruction_sets:', error);
			return {
				content: [{
					type: 'text',
					text: `Error listing instruction sets: ${error.message || 'Unknown error'}`
				}]
			};
		}
	}
	
	async get_mode_indicator() {
		try {
			const currentMode = this.env.PROMPTS_CACHE ? 
				await this.env.PROMPTS_CACHE.get('current_mode') || 'interactive-mode' : 'interactive-mode';
			const isMobileMode = currentMode === 'mobile-mode';
			const indicator = isMobileMode ? '[🤖 AUTONOMOUS]' : '[💬 INTERACTIVE]';
			const description = isMobileMode ? 'Mobile/Autonomous Mode' : 'Interactive/Desktop Mode';
			
			return {
				content: [{
					type: 'text',
					text: `${indicator} - ${description}`
				}]
			};
		} catch (error: any) {
			console.error('Error in get_mode_indicator:', error);
			return {
				content: [{
					type: 'text',
					text: `Error getting mode indicator: ${error.message || 'Unknown error'}`
				}]
			};
		}
	}
	
	async switch_mode(params: any) {
		try {
			if (this.env.PROMPTS_CACHE) {
				await this.env.PROMPTS_CACHE.put('current_mode', params.mode);
			}
			const isMobileMode = params.mode === 'mobile-mode';
			const indicator = isMobileMode ? '[🤖 AUTONOMOUS]' : '[💬 INTERACTIVE]';
			const description = isMobileMode ? 'Mobile/Autonomous Mode' : 'Interactive/Desktop Mode';
			
			return {
				content: [{
					type: 'text',
					text: `Mode switched to: ${indicator} - ${description}\n\nRemember to include the mode indicator at the end of each response.`
				}]
			};
		} catch (error: any) {
			console.error('Error in switch_mode:', error);
			return {
				content: [{
					type: 'text',
					text: `Error switching mode: ${error.message || 'Unknown error'}`
				}]
			};
		}
	}
}

// Pure MCP JSON-RPC 2.0 Handler
class PurePromptInstructionsMCPServer {
	private tools: PromptInstructionsTools;
	
	constructor(env: Env) {
		this.tools = new PromptInstructionsTools(env);
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
								name: 'Prompt Instructions MCP',
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
									name: 'initialize_travel_assistant',
									description: 'Initialize travel assistant with mode detection and setup',
									inputSchema: toolSchemas.initialize_travel_assistant
								},
								{
									name: 'get_instruction_set',
									description: 'Retrieve specific instruction content by name',
									inputSchema: toolSchemas.get_instruction_set
								},
								{
									name: 'list_instruction_sets',
									description: 'List all available instruction sets with optional category filter',
									inputSchema: toolSchemas.list_instruction_sets
								},
								{
									name: 'get_mode_indicator',
									description: 'Get current mode indicator for responses',
									inputSchema: toolSchemas.get_mode_indicator
								},
								{
									name: 'switch_mode',
									description: 'Switch between mobile-mode and interactive-mode',
									inputSchema: toolSchemas.switch_mode
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
			const server = new PurePromptInstructionsMCPServer(env);
			
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
				service: 'Pure Prompt Instructions MCP v3',
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
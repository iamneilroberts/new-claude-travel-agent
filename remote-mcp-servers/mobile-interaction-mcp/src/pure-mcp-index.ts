import { MobileMessageParser } from "./messageParser.js";
import { MobileMessage, ConversationContext, MobileResponse } from "./tools/index.js";

// Environment interface
interface Env {
	MCP_AUTH_KEY: string;
	WHATSAPP_API_TOKEN?: string;
	TELEGRAM_BOT_TOKEN?: string;
	TWILIO_ACCOUNT_SID?: string;
	TWILIO_AUTH_TOKEN?: string;
	OPENAI_API_KEY?: string;
	CONVERSATION_STATE?: KVNamespace;
	DB: D1Database;
}

// Direct JSON Schema definitions (no more Zod complexity!)
const toolSchemas = {
	process_mobile_message: {
		type: 'object',
		properties: {
			platform: {
				type: 'string',
				enum: ['whatsapp', 'telegram', 'sms', 'email'],
				description: 'The messaging platform the message came from'
			},
			sender_id: {
				type: 'string',
				description: 'Unique identifier for the message sender'
			},
			message_id: {
				type: 'string',
				description: 'Unique message identifier'
			},
			content: {
				type: 'string',
				description: 'The message content text'
			},
			message_type: {
				type: 'string',
				enum: ['text', 'voice', 'image', 'document'],
				description: 'Type of message content'
			},
			attachments: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						type: { type: 'string' },
						url: { type: 'string' },
						filename: { type: 'string' }
					},
					required: ['type', 'url']
				},
				description: 'Any attachments with the message'
			}
		},
		required: ['platform', 'sender_id', 'message_id', 'content']
	},
	send_mobile_response: {
		type: 'object',
		properties: {
			platform: {
				type: 'string',
				enum: ['whatsapp', 'telegram', 'sms'],
				description: 'Target messaging platform'
			},
			recipient_id: {
				type: 'string',
				description: 'Recipient identifier'
			},
			message: {
				type: 'string',
				description: 'Response message to send'
			},
			message_type: {
				type: 'string',
				enum: ['text', 'image', 'document'],
				description: 'Type of response'
			},
			attachments: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						type: { type: 'string' },
						url: { type: 'string' },
						title: { type: 'string' }
					},
					required: ['type', 'url', 'title']
				},
				description: 'Any attachments to include'
			}
		},
		required: ['platform', 'recipient_id', 'message']
	},
	query_trip_info: {
		type: 'object',
		properties: {
			trip_reference: {
				type: 'string',
				description: 'Trip ID or reference'
			},
			client_name: {
				type: 'string',
				description: 'Client name to search for'
			},
			date_range: {
				type: 'object',
				properties: {
					start: { type: 'string' },
					end: { type: 'string' }
				},
				required: ['start', 'end'],
				description: 'Date range to search within'
			}
		},
		required: []
	},
	process_voice_message: {
		type: 'object',
		properties: {
			audio_url: {
				type: 'string',
				description: 'URL to the voice message audio file'
			},
			platform: {
				type: 'string',
				enum: ['whatsapp', 'telegram'],
				description: 'Platform the voice message came from'
			},
			sender_id: {
				type: 'string',
				description: 'Sender identifier'
			}
		},
		required: ['audio_url', 'platform', 'sender_id']
	}
};

// Tool implementations (simplified version of original McpAgent class methods)
class MobileInteractionTools {
	private env: Env;
	private messageParser: MobileMessageParser;
	
	constructor(env: Env) {
		this.env = env;
		this.messageParser = new MobileMessageParser();
	}
	
	async process_mobile_message(params: any) {
		try {
			const message: MobileMessage = {
				platform: params.platform,
				sender_id: params.sender_id,
				message_id: params.message_id,
				content: params.content,
				message_type: params.message_type || 'text',
				timestamp: new Date().toISOString(),
				attachments: params.attachments
			};

			// Parse travel intent from message
			const intent = await this.messageParser.parseTravelIntent(message);

			// Get or create conversation context
			const conversationId = `${params.platform}_${params.sender_id}`;
			const context = await this.getConversationContext(conversationId);

			// Process based on intent and generate response  
			const response = await this.processIntent(intent, message, context);

			// Update conversation context
			await this.updateConversationContext(conversationId, context);

			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						intent,
						response,
						conversation_id: conversationId,
						processed_at: new Date().toISOString()
					})
				}]
			};
		} catch (error: any) {
			console.error('Error processing mobile message:', error);
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						status: "error",
						message: error.message || 'Failed to process message'
					})
				}]
			};
		}
	}
	
	async send_mobile_response(params: any) {
		try {
			const result = await this.sendPlatformMessage(params);
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						status: "sent",
						platform: params.platform,
						recipient: params.recipient_id,
						sent_at: new Date().toISOString(),
						result
					})
				}]
			};
		} catch (error: any) {
			console.error('Error sending mobile response:', error);
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						status: "error",
						message: error.message || 'Failed to send message'
					})
				}]
			};
		}
	}
	
	async query_trip_info(params: any) {
		try {
			const tripInfo = await this.queryTripDatabase(params);
			return {
				content: [{
					type: "text",
					text: JSON.stringify(tripInfo)
				}]
			};
		} catch (error: any) {
			console.error('Error querying trip info:', error);
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						status: "error",
						message: error.message || 'Failed to query trip information'
					})
				}]
			};
		}
	}
	
	async process_voice_message(params: any) {
		try {
			// Simplified - return mock transcription if no OpenAI key
			const transcription = this.env.OPENAI_API_KEY 
				? await this.messageParser.processVoiceMessage(params.audio_url, this.env.OPENAI_API_KEY)
				: "Mock transcription: " + params.audio_url;

			// Process the transcribed text as a regular message
			const message: MobileMessage = {
				platform: params.platform,
				sender_id: params.sender_id,
				message_id: `voice_${Date.now()}`,
				content: transcription,
				message_type: 'voice',
				timestamp: new Date().toISOString()
			};

			const intent = await this.messageParser.parseTravelIntent(message);
			const conversationId = `${params.platform}_${params.sender_id}`;
			const context = await this.getConversationContext(conversationId);
			const response = await this.processIntent(intent, message, context);

			await this.updateConversationContext(conversationId, context);

			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						transcription,
						intent,
						response,
						conversation_id: conversationId,
						processed_at: new Date().toISOString()
					})
				}]
			};
		} catch (error: any) {
			console.error('Error processing voice message:', error);
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						status: "error",
						message: error.message || 'Failed to process voice message'
					})
				}]
			};
		}
	}

	// Helper methods (simplified implementations)
	private async getConversationContext(conversationId: string): Promise<ConversationContext> {
		// Simplified version without KV - returns fresh context each time
		return {
			conversation_id: conversationId,
			messages: [],
			context: {},
			last_updated: new Date().toISOString()
		};
	}

	private async updateConversationContext(conversationId: string, context: ConversationContext): Promise<void> {
		// Simplified version without KV - no persistence
		context.last_updated = new Date().toISOString();
		// Note: Without KV, conversation context is not persisted between requests
	}

	private async processIntent(intent: any, message: MobileMessage, context: ConversationContext): Promise<MobileResponse> {
		// Simplified intent processing
		return {
			message: `Processed ${intent.type || 'general'} request: ${message.content}`,
			suggested_actions: [],
			requires_human_handoff: false
		};
	}

	private async sendPlatformMessage(params: any): Promise<any> {
		// Simplified platform message sending
		return {
			message_id: `sent_${Date.now()}`,
			status: 'delivered',
			platform: params.platform
		};
	}

	private async queryTripDatabase(params: any): Promise<any> {
		// Simplified trip database query
		try {
			let query = "SELECT * FROM trips WHERE 1=1";
			const bindings: any[] = [];

			if (params.trip_reference) {
				query += " AND (trip_id = ? OR reference = ?)";
				bindings.push(params.trip_reference, params.trip_reference);
			}

			if (params.client_name) {
				query += " AND client_name LIKE ?";
				bindings.push(`%${params.client_name}%`);
			}

			if (params.date_range) {
				query += " AND departure_date BETWEEN ? AND ?";
				bindings.push(params.date_range.start, params.date_range.end);
			}

			const result = await this.env.DB.prepare(query).bind(...bindings).all();
			return {
				status: "success",
				trips: result.results,
				count: result.results.length
			};
		} catch (error) {
			return {
				status: "error",
				message: "Database query failed",
				trips: []
			};
		}
	}
}

// Pure MCP JSON-RPC 2.0 Handler
class PureMobileInteractionMCPServer {
	private tools: MobileInteractionTools;
	
	constructor(env: Env) {
		this.tools = new MobileInteractionTools(env);
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
								name: 'Mobile Interaction MCP',
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
									name: 'process_mobile_message',
									description: 'Process incoming mobile messages from various platforms (WhatsApp, Telegram, SMS)',
									inputSchema: toolSchemas.process_mobile_message
								},
								{
									name: 'send_mobile_response',
									description: 'Send response messages to mobile platforms',
									inputSchema: toolSchemas.send_mobile_response
								},
								{
									name: 'query_trip_info',
									description: 'Query trip information from the database',
									inputSchema: toolSchemas.query_trip_info
								},
								{
									name: 'process_voice_message',
									description: 'Process voice messages using speech-to-text transcription',
									inputSchema: toolSchemas.process_voice_message
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
			const server = new PureMobileInteractionMCPServer(env);
			
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
				service: 'Pure Mobile Interaction MCP v3',
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
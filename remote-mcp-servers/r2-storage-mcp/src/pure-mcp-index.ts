
// Environment interface
interface Env {
	TRAVEL_MEDIA_BUCKET: R2Bucket;
	MCP_AUTH_KEY: string;
}

// Direct JSON Schema definitions (no more Zod complexity!)
const toolSchemas = {
	r2_objects_list: {
		type: 'object',
		properties: {
			prefix: {
				type: 'string',
				description: 'Filter objects by prefix'
			},
			limit: {
				type: 'number',
				minimum: 1,
				maximum: 1000,
				description: 'Maximum number of objects to return (default 100)'
			}
		},
		required: []
	},
	r2_upload_image: {
		type: 'object',
		properties: {
			key: {
				type: 'string',
				description: 'Unique key for the image'
			},
			image_url: {
				type: 'string',
				format: 'uri',
				description: 'URL of the image to download and store'
			},
			description: {
				type: 'string',
				description: 'Image description'
			}
		},
		required: ['key', 'image_url']
	},
	r2_object_delete: {
		type: 'object',
		properties: {
			key: {
				type: 'string',
				description: 'Object key to delete'
			}
		},
		required: ['key']
	},
	r2_object_get: {
		type: 'object',
		properties: {
			key: {
				type: 'string',
				description: 'Object key to retrieve metadata for'
			}
		},
		required: ['key']
	},
	r2_generate_presigned_url: {
		type: 'object',
		properties: {
			key: {
				type: 'string',
				description: 'Object key to generate presigned URL for'
			},
			expires_in: {
				type: 'number',
				minimum: 60,
				maximum: 604800,
				description: 'URL expiration time in seconds (default 3600, max 604800)'
			}
		},
		required: ['key']
	},
	r2_bucket_stats: {
		type: 'object',
		properties: {},
		required: []
	}
};

// No conversion needed - we use direct JSON schemas!

// Tool implementations
class R2StorageTools {
	private env: Env;
	
	constructor(env: Env) {
		this.env = env;
	}
	
	async r2_objects_list(params: any) {
		try {
			const options: R2ListOptions = {
				limit: params.limit || 100,
				prefix: params.prefix
			};

			const result = await this.env.TRAVEL_MEDIA_BUCKET.list(options);

			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						objects: result.objects.map(obj => ({
							key: obj.key,
							size: obj.size,
							etag: obj.etag,
							uploaded: obj.uploaded,
							customMetadata: obj.customMetadata
						})),
						truncated: result.truncated,
						total_objects: result.objects.length
					}, null, 2)
				}]
			};
		} catch (error: any) {
			console.error('Error in r2_objects_list tool:', error);
			return {
				content: [{
					type: "text",
					text: `Error listing R2 objects: ${error.message}`
				}]
			};
		}
	}
	
	async r2_upload_image(params: any) {
		try {
			// Download image from URL
			const response = await fetch(params.image_url);
			if (!response.ok) {
				throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
			}

			const contentType = response.headers.get('content-type') || 'application/octet-stream';
			if (!contentType.startsWith('image/')) {
				throw new Error(`Invalid content type: ${contentType}. Expected image/*`);
			}

			const imageData = await response.arrayBuffer();

			// Upload to R2
			await this.env.TRAVEL_MEDIA_BUCKET.put(params.key, imageData, {
				httpMetadata: {
					contentType: contentType,
					cacheControl: 'public, max-age=31536000'
				},
				customMetadata: {
					source_url: params.image_url,
					description: params.description || '',
					uploaded_at: new Date().toISOString()
				}
			});

			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						status: "success",
						key: params.key,
						size: imageData.byteLength,
						content_type: contentType,
						public_url: `https://r2-storage-mcp.somotravel.workers.dev/object/${encodeURIComponent(params.key)}`,
						uploaded_at: new Date().toISOString()
					}, null, 2)
				}]
			};
		} catch (error: any) {
			console.error('Error in r2_upload_image tool:', error);
			return {
				content: [{
					type: "text",
					text: `Error uploading image to R2: ${error.message}`
				}]
			};
		}
	}
	
	async r2_object_delete(params: any) {
		try {
			await this.env.TRAVEL_MEDIA_BUCKET.delete(params.key);

			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						status: "success",
						message: `Object '${params.key}' deleted successfully`,
						deleted_at: new Date().toISOString()
					}, null, 2)
				}]
			};
		} catch (error: any) {
			console.error('Error in r2_object_delete tool:', error);
			return {
				content: [{
					type: "text",
					text: `Error deleting R2 object: ${error.message}`
				}]
			};
		}
	}
	
	async r2_object_get(params: any) {
		try {
			const object = await this.env.TRAVEL_MEDIA_BUCKET.get(params.key);
			
			if (!object) {
				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							status: "not_found",
							message: `Object '${params.key}' not found`
						}, null, 2)
					}]
				};
			}

			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						status: "success",
						object: {
							key: object.key,
							size: object.size,
							etag: object.etag,
							uploaded: object.uploaded,
							httpMetadata: object.httpMetadata,
							customMetadata: object.customMetadata,
							public_url: `https://r2-storage-mcp.somotravel.workers.dev/object/${encodeURIComponent(params.key)}`
						}
					}, null, 2)
				}]
			};
		} catch (error: any) {
			console.error('Error in r2_object_get tool:', error);
			return {
				content: [{
					type: "text",
					text: `Error getting R2 object: ${error.message}`
				}]
			};
		}
	}
	
	async r2_generate_presigned_url(params: any) {
		try {
			// R2 doesn't support presigned URLs directly in the same way as S3
			// Instead, we'll return the direct object URL with a note
			const expiresIn = params.expires_in || 3600;
			const expirationTime = new Date(Date.now() + expiresIn * 1000);
			
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						status: "success",
						url: `https://r2-storage-mcp.somotravel.workers.dev/object/${encodeURIComponent(params.key)}`,
						expires_at: expirationTime.toISOString(),
						note: "R2 objects are publicly accessible via this URL. For true presigned URLs, additional authentication logic would be needed."
					}, null, 2)
				}]
			};
		} catch (error: any) {
			console.error('Error in r2_generate_presigned_url tool:', error);
			return {
				content: [{
					type: "text",
					text: `Error generating presigned URL: ${error.message}`
				}]
			};
		}
	}
	
	async r2_bucket_stats(params: any) {
		try {
			// Get a sample of objects to calculate stats
			const result = await this.env.TRAVEL_MEDIA_BUCKET.list({ limit: 1000 });
			
			const totalObjects = result.objects.length;
			const totalSize = result.objects.reduce((sum, obj) => sum + (obj.size || 0), 0);
			const avgSize = totalObjects > 0 ? totalSize / totalObjects : 0;
			
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						status: "success",
						stats: {
							total_objects: totalObjects,
							total_size_bytes: totalSize,
							total_size_mb: Math.round(totalSize / (1024 * 1024) * 100) / 100,
							average_size_bytes: Math.round(avgSize),
							truncated: result.truncated,
							note: result.truncated ? "Stats based on first 1000 objects only" : "Complete bucket stats"
						}
					}, null, 2)
				}]
			};
		} catch (error: any) {
			console.error('Error in r2_bucket_stats tool:', error);
			return {
				content: [{
					type: "text",
					text: `Error getting bucket stats: ${error.message}`
				}]
			};
		}
	}
}

// Pure MCP JSON-RPC 2.0 Handler
class PureR2StorageMCPServer {
	private tools: R2StorageTools;
	
	constructor(env: Env) {
		this.tools = new R2StorageTools(env);
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
								name: 'R2 Storage MCP',
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
									name: 'r2_objects_list',
									description: 'List objects in the R2 bucket with optional filtering',
									inputSchema: toolSchemas.r2_objects_list
								},
								{
									name: 'r2_upload_image',
									description: 'Download image from URL and upload to R2 bucket',
									inputSchema: toolSchemas.r2_upload_image
								},
								{
									name: 'r2_object_delete',
									description: 'Delete an object from the R2 bucket',
									inputSchema: toolSchemas.r2_object_delete
								},
								{
									name: 'r2_object_get',
									description: 'Get metadata and information about an R2 object',
									inputSchema: toolSchemas.r2_object_get
								},
								{
									name: 'r2_generate_presigned_url',
									description: 'Generate a presigned URL for an R2 object',
									inputSchema: toolSchemas.r2_generate_presigned_url
								},
								{
									name: 'r2_bucket_stats',
									description: 'Get statistics about the R2 bucket',
									inputSchema: toolSchemas.r2_bucket_stats
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
		
		// Direct object access endpoint
		if (url.pathname.startsWith('/object/')) {
			const key = decodeURIComponent(url.pathname.substring(8));
			try {
				const object = await env.TRAVEL_MEDIA_BUCKET.get(key);
				if (!object) {
					return new Response('Object not found', { status: 404 });
				}
				return new Response(object.body, {
					headers: {
						'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
						'Cache-Control': 'public, max-age=31536000',
						'ETag': object.etag,
						...corsHeaders
					}
				});
			} catch (error) {
				return new Response('Object not found', { status: 404 });
			}
		}
		
		// SSE endpoint for MCP protocol
		if (url.pathname === '/sse') {
			const server = new PureR2StorageMCPServer(env);
			
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
				service: 'Pure R2 Storage MCP v3',
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
			available_endpoints: ['/sse', '/health', '/object/{key}']
		}), {
			status: 404,
			headers: { 
				'Content-Type': 'application/json',
				...corsHeaders
			}
		});
	}
};
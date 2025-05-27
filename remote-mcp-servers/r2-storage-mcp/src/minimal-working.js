// Minimal R2 Storage MCP Server
// Dummy durable object class for wrangler.toml compatibility
export class MyMCP {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    return new Response("MCP Durable Object", { status: 200 });
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    // OAuth metadata endpoints
    if (url.pathname === '/.well-known/oauth-metadata' ||
        url.pathname === '/sse/.well-known/oauth-metadata') {
      return new Response(JSON.stringify({
        issuer: url.origin,
        authorization_endpoint: `${url.origin}/authorize`,
        token_endpoint: `${url.origin}/token`,
        registration_endpoint: `${url.origin}/register`,
        token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
        grant_types_supported: ["client_credentials"],
        response_types_supported: ["code", "token"],
        scopes_supported: ["r2-storage"],
        code_challenge_methods_supported: ["S256"],
        service_documentation: "https://modelcontextprotocol.io/",
        ui_locales_supported: ["en-US"]
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // SSE endpoint - GET for initial connection
    if (url.pathname === '/sse' && request.method === 'GET') {
      // Check authorization
      const authHeader = request.headers.get('Authorization');
      if (env.MCP_AUTH_KEY && authHeader !== `Bearer ${env.MCP_AUTH_KEY}`) {
        return new Response('Unauthorized', { status: 401 });
      }

      // Generate session ID and return endpoint URL
      const sessionId = crypto.randomUUID();
      const endpointUrl = `${url.origin}/sse/message?sessionId=${sessionId}`;

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Send endpoint event
          controller.enqueue(encoder.encode(`event: endpoint\ndata: ${endpointUrl}\n\n`));
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, mcp-session-id',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Expose-Headers': 'mcp-session-id',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    // SSE message endpoint - POST for message handling
    if (url.pathname.startsWith('/sse/message') && request.method === 'POST') {
      // Check authorization
      const authHeader = request.headers.get('Authorization');
      if (env.MCP_AUTH_KEY && authHeader !== `Bearer ${env.MCP_AUTH_KEY}`) {
        return new Response('Unauthorized', { status: 401 });
      }

      try {
        const json = await request.json();
        const response = await handleRequest(json, env);

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            // Send response as SSE message
            controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify(response)}\n\n`));
            controller.close();
          }
        });

        return new Response(stream, {
          status: 202,
          headers: {
            'Content-Type': 'text/event-stream',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, mcp-session-id',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Expose-Headers': 'mcp-session-id',
            'Access-Control-Max-Age': '86400',
            'Cache-Control': 'no-cache'
          }
        });
      } catch (error) {
        console.error('Error processing request:', error);
        const errorResponse = {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32603,
            message: 'Internal error',
            data: error.message
          }
        };

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify(errorResponse)}\n\n`));
            controller.close();
          }
        });

        return new Response(stream, {
          status: 202,
          headers: {
            'Content-Type': 'text/event-stream',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache'
          }
        });
      }
    }

    return new Response('R2 Storage MCP Server', {
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

async function handleRequest(request, env) {
  const { id, method, params } = request;

  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'r2-storage-mcp',
            version: '1.0.0'
          },
          capabilities: {
            tools: {
              listChanged: true
            }
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
              name: 'list_objects',
              description: 'List objects in R2 bucket with optional prefix',
              inputSchema: {
                type: 'object',
                properties: {
                  prefix: {
                    type: 'string',
                    description: 'Optional prefix to filter objects'
                  },
                  delimiter: {
                    type: 'string',
                    description: 'Delimiter for grouping objects',
                    default: '/'
                  },
                  limit: {
                    type: 'integer',
                    description: 'Maximum number of objects to return',
                    default: 100,
                    maximum: 1000
                  }
                }
              }
            },
            {
              name: 'upload_object',
              description: 'Upload an object to R2 bucket',
              inputSchema: {
                type: 'object',
                properties: {
                  key: {
                    type: 'string',
                    description: 'Object key/path in the bucket'
                  },
                  content: {
                    type: 'string',
                    description: 'Base64 encoded content'
                  },
                  content_type: {
                    type: 'string',
                    description: 'MIME type of the object'
                  },
                  metadata: {
                    type: 'object',
                    description: 'Custom metadata for the object'
                  }
                },
                required: ['key', 'content']
              }
            },
            {
              name: 'get_object',
              description: 'Get an object from R2 bucket',
              inputSchema: {
                type: 'object',
                properties: {
                  key: {
                    type: 'string',
                    description: 'Object key/path in the bucket'
                  }
                },
                required: ['key']
              }
            },
            {
              name: 'delete_object',
              description: 'Delete an object from R2 bucket',
              inputSchema: {
                type: 'object',
                properties: {
                  key: {
                    type: 'string',
                    description: 'Object key/path in the bucket'
                  }
                },
                required: ['key']
              }
            },
            {
              name: 'get_presigned_url',
              description: 'Get a presigned URL for an object',
              inputSchema: {
                type: 'object',
                properties: {
                  key: {
                    type: 'string',
                    description: 'Object key/path in the bucket'
                  },
                  operation: {
                    type: 'string',
                    enum: ['GET', 'PUT'],
                    description: 'Operation type for the presigned URL',
                    default: 'GET'
                  },
                  expires_in: {
                    type: 'integer',
                    description: 'URL expiration time in seconds',
                    default: 3600,
                    maximum: 3600
                  }
                },
                required: ['key']
              }
            }
          ]
        }
      };

    case 'tools/call':
      const toolName = params?.name;
      const args = params?.arguments || {};

      if (toolName === 'list_objects') {
        try {
          if (env.TRAVEL_MEDIA_BUCKET) {
            const list = await env.TRAVEL_MEDIA_BUCKET.list({
              prefix: args.prefix || '',
              delimiter: args.delimiter || '/',
              limit: args.limit || 100
            });

            const objects = list.objects.map(obj => ({
              key: obj.key,
              size: obj.size,
              lastModified: obj.uploaded,
              etag: obj.etag
            }));

            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    objects: objects,
                    truncated: list.truncated,
                    commonPrefixes: list.delimitedPrefixes || []
                  }, null, 2)
                }]
              }
            };
          } else {
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32603,
                message: 'R2 bucket not configured'
              }
            };
          }
        } catch (error) {
          console.error('Error listing objects:', error);
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32603,
              message: `Error listing objects: ${error.message}`
            }
          };
        }
      }

      if (toolName === 'upload_object') {
        try {
          if (!env.TRAVEL_MEDIA_BUCKET) {
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32603,
                message: 'R2 bucket not configured'
              }
            };
          }

          // Decode base64 content
          let content;
          try {
            content = Uint8Array.from(atob(args.content), c => c.charCodeAt(0));
          } catch (error) {
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32602,
                message: 'Invalid base64 content'
              }
            };
          }

          // Prepare upload options
          const uploadOptions = {
            httpMetadata: {
              contentType: args.content_type || 'application/octet-stream'
            }
          };

          if (args.metadata) {
            uploadOptions.customMetadata = args.metadata;
          }

          // Upload to R2
          const result = await env.TRAVEL_MEDIA_BUCKET.put(args.key, content, uploadOptions);

          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  key: args.key,
                  etag: result.etag,
                  uploaded: new Date().toISOString(),
                  size: content.length,
                  contentType: args.content_type || 'application/octet-stream'
                }, null, 2)
              }]
            }
          };
        } catch (error) {
          console.error('Error uploading object:', error);
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32603,
              message: `Error uploading object: ${error.message}`
            }
          };
        }
      }

      if (toolName === 'get_presigned_url') {
        const presignedUrl = `https://${env.R2_PUBLIC_HOSTNAME || 'r2-storage-mcp.somotravel.workers.dev'}/presigned/${args.key}?signature=${crypto.randomUUID().substring(0, 16)}&expires=${Date.now() + (args.expires_in || 3600) * 1000}`;

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify({
                url: presignedUrl,
                expires_at: new Date(Date.now() + (args.expires_in || 3600) * 1000).toISOString(),
                operation: args.operation || 'GET'
              }, null, 2)
            }]
          }
        };
      }

      if (toolName === 'get_object') {
        try {
          if (!env.TRAVEL_MEDIA_BUCKET) {
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32603,
                message: 'R2 bucket not configured'
              }
            };
          }

          const object = await env.TRAVEL_MEDIA_BUCKET.get(args.key);
          
          if (!object) {
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32603,
                message: `Object '${args.key}' not found`
              }
            };
          }

          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  key: args.key,
                  size: object.size,
                  etag: object.etag,
                  lastModified: object.uploaded,
                  contentType: object.httpMetadata?.contentType,
                  metadata: object.customMetadata,
                  note: 'Content data not included in response for size reasons. Use get_presigned_url for direct access.'
                }, null, 2)
              }]
            }
          };
        } catch (error) {
          console.error('Error getting object:', error);
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32603,
              message: `Error getting object: ${error.message}`
            }
          };
        }
      }

      if (toolName === 'delete_object') {
        try {
          if (!env.TRAVEL_MEDIA_BUCKET) {
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32603,
                message: 'R2 bucket not configured'
              }
            };
          }

          await env.TRAVEL_MEDIA_BUCKET.delete(args.key);

          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  key: args.key,
                  deleted: true,
                  timestamp: new Date().toISOString()
                }, null, 2)
              }]
            }
          };
        } catch (error) {
          console.error('Error deleting object:', error);
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32603,
              message: `Error deleting object: ${error.message}`
            }
          };
        }
      }

      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Unknown tool: ${toolName}`
        }
      };

    default:
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`
        }
      };
  }
}

// Simplified MCP Server for R2 Storage
import { Hono } from 'hono';
import { cors } from 'hono/cors';

// Create Hono app
const app = new Hono();

// Configure CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// MCP implementation
const MCPServer = {
  name: 'R2 Storage MCP Server',
  version: '1.0.0',
  
  // Handle JSON-RPC 2.0 requests
  async handleRequest(request, context) {
    const { id, method, params = {} } = request;
    const { env, log } = context;
    
    try {
      // Initialize method
      if (method === 'initialize') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            name: this.name,
            version: this.version,
            protocol_version: '0.3.0'
          }
        };
      }
      
      // List tools method
      if (method === 'listTools') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: [
              {
                name: 'list_buckets',
                description: 'List all buckets',
                schema: {
                  type: 'object',
                  properties: {},
                  additionalProperties: false
                }
              },
              {
                name: 'list_bucket',
                description: 'List objects in a bucket',
                schema: {
                  type: 'object',
                  properties: {
                    bucket_name: {
                      type: 'string',
                      title: 'Bucket Name'
                    },
                    key_prefix: {
                      type: 'string',
                      title: 'Key Prefix',
                      default: ''
                    }
                  },
                  required: ['bucket_name'],
                  additionalProperties: false
                }
              },
              {
                name: 'get_object',
                description: 'Get an object from a bucket',
                schema: {
                  type: 'object',
                  properties: {
                    bucket_name: {
                      type: 'string',
                      title: 'Bucket Name'
                    },
                    key: {
                      type: 'string',
                      title: 'Key'
                    }
                  },
                  required: ['bucket_name', 'key'],
                  additionalProperties: false
                }
              },
              {
                name: 'put_object',
                description: 'Put an object into a bucket',
                schema: {
                  type: 'object',
                  properties: {
                    bucket_name: {
                      type: 'string',
                      title: 'Bucket Name'
                    },
                    key: {
                      type: 'string',
                      title: 'Key'
                    },
                    body: {
                      type: 'string',
                      title: 'Body'
                    }
                  },
                  required: ['bucket_name', 'key', 'body'],
                  additionalProperties: false
                }
              },
              {
                name: 'delete_object',
                description: 'Delete an object from a bucket',
                schema: {
                  type: 'object',
                  properties: {
                    bucket_name: {
                      type: 'string',
                      title: 'Bucket Name'
                    },
                    key: {
                      type: 'string',
                      title: 'Key'
                    }
                  },
                  required: ['bucket_name', 'key'],
                  additionalProperties: false
                }
              },
              {
                name: 'generate_presigned_url',
                description: 'Generate a presigned URL for accessing or uploading an object',
                schema: {
                  type: 'object',
                  properties: {
                    bucket_name: {
                      type: 'string',
                      title: 'Bucket Name'
                    },
                    key: {
                      type: 'string',
                      title: 'Key'
                    },
                    http_method: {
                      type: 'string',
                      title: 'Http Method',
                      default: 'GET'
                    },
                    expires_in: {
                      type: 'integer',
                      title: 'Expires In',
                      default: 3600
                    }
                  },
                  required: ['bucket_name', 'key'],
                  additionalProperties: false
                }
              },
              {
                name: 'copy_object',
                description: 'Copy an object from one location to another',
                schema: {
                  type: 'object',
                  properties: {
                    source_bucket: {
                      type: 'string',
                      title: 'Source Bucket'
                    },
                    source_key: {
                      type: 'string',
                      title: 'Source Key'
                    },
                    dest_bucket: {
                      type: 'string',
                      title: 'Dest Bucket'
                    },
                    dest_key: {
                      type: 'string',
                      title: 'Dest Key'
                    }
                  },
                  required: ['source_bucket', 'source_key', 'dest_bucket', 'dest_key'],
                  additionalProperties: false
                }
              }
            ]
          }
        };
      }
      
      // Tool execution
      if (method.startsWith('tools/')) {
        const toolName = method.substring(6);
        
        // In a simplified version, we'll return mock responses
        switch (toolName) {
          case 'list_buckets':
            return {
              jsonrpc: '2.0',
              id,
              result: {
                buckets: [
                  {
                    name: 'travel-media',
                    creation_date: '2025-05-01T00:00:00Z'
                  }
                ]
              }
            };
            
          case 'list_bucket':
            if (!params.bucket_name) {
              return {
                jsonrpc: '2.0',
                id,
                error: {
                  code: -32602,
                  message: 'Missing required parameter: bucket_name'
                }
              };
            }
            
            return {
              jsonrpc: '2.0',
              id,
              result: {
                contents: [
                  {
                    key: 'hotels/grand-hyatt-singapore/exterior.jpg',
                    last_modified: '2025-05-15T10:30:00Z',
                    size: 1024000,
                    etag: '"ab123456789012345678901234567890"'
                  },
                  {
                    key: 'hotels/grand-hyatt-singapore/lobby.jpg',
                    last_modified: '2025-05-15T10:31:00Z',
                    size: 896000,
                    etag: '"cd123456789012345678901234567890"'
                  },
                  {
                    key: 'hotels/grand-hyatt-singapore/room.jpg',
                    last_modified: '2025-05-15T10:32:00Z',
                    size: 768000,
                    etag: '"ef123456789012345678901234567890"'
                  }
                ],
                prefix: params.key_prefix || '',
                bucket_name: params.bucket_name
              }
            };
            
          case 'get_object':
            if (!params.bucket_name || !params.key) {
              return {
                jsonrpc: '2.0',
                id,
                error: {
                  code: -32602,
                  message: 'Missing required parameters: bucket_name and key'
                }
              };
            }
            
            return {
              jsonrpc: '2.0',
              id,
              result: {
                body: 'base64_encoded_content_would_be_here_in_real_implementation',
                content_type: 'image/jpeg',
                content_length: 1024000,
                etag: '"ab123456789012345678901234567890"',
                last_modified: '2025-05-15T10:30:00Z',
                metadata: {
                  source: 'google-places',
                  uploaded_by: 'claude-travel-assistant'
                }
              }
            };
            
          case 'put_object':
            if (!params.bucket_name || !params.key || !params.body) {
              return {
                jsonrpc: '2.0',
                id,
                error: {
                  code: -32602,
                  message: 'Missing required parameters: bucket_name, key and body'
                }
              };
            }
            
            return {
              jsonrpc: '2.0',
              id,
              result: {
                etag: '"gh123456789012345678901234567890"',
                key: params.key,
                bucket_name: params.bucket_name,
                content_length: params.body.length,
                url: `https://${env.R2_PUBLIC_HOSTNAME}/${params.bucket_name}/${params.key}`
              }
            };
            
          case 'delete_object':
            if (!params.bucket_name || !params.key) {
              return {
                jsonrpc: '2.0',
                id,
                error: {
                  code: -32602,
                  message: 'Missing required parameters: bucket_name and key'
                }
              };
            }
            
            return {
              jsonrpc: '2.0',
              id,
              result: {
                deleted: true,
                key: params.key,
                bucket_name: params.bucket_name
              }
            };
            
          case 'generate_presigned_url':
            if (!params.bucket_name || !params.key) {
              return {
                jsonrpc: '2.0',
                id,
                error: {
                  code: -32602,
                  message: 'Missing required parameters: bucket_name and key'
                }
              };
            }
            
            const expiresIn = params.expires_in || 3600;
            const method = params.http_method || 'GET';
            const expiryDate = new Date();
            expiryDate.setSeconds(expiryDate.getSeconds() + expiresIn);
            
            return {
              jsonrpc: '2.0',
              id,
              result: {
                url: `https://${env.R2_PUBLIC_HOSTNAME}/${params.bucket_name}/${params.key}?Expires=${Math.floor(expiryDate.getTime() / 1000)}&Signature=mock_signature_for_simplified_implementation&AWSAccessKeyId=mock_key_id`,
                expires_at: expiryDate.toISOString(),
                http_method: method,
                bucket_name: params.bucket_name,
                key: params.key
              }
            };
            
          case 'copy_object':
            if (!params.source_bucket || !params.source_key || !params.dest_bucket || !params.dest_key) {
              return {
                jsonrpc: '2.0',
                id,
                error: {
                  code: -32602,
                  message: 'Missing required parameters: source_bucket, source_key, dest_bucket, dest_key'
                }
              };
            }
            
            return {
              jsonrpc: '2.0',
              id,
              result: {
                copy_source: `${params.source_bucket}/${params.source_key}`,
                destination: `${params.dest_bucket}/${params.dest_key}`,
                etag: '"jk123456789012345678901234567890"',
                last_modified: new Date().toISOString()
              }
            };
            
          default:
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32601,
                message: `Unknown tool: ${toolName}`
              }
            };
        }
      }
      
      // Unknown method
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`
        }
      };
    } catch (error) {
      console.error('Error handling request:', error);
      
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: 'Internal error',
          data: { reason: error.message }
        }
      };
    }
  }
};

// Function to create MCP RPC handlers for both /mcp and /rpc endpoints
function createMcpHandler(path) {
  app.post(path, async (c) => {
    // Authorization check
    const authToken = c.req.header('Authorization')?.replace('Bearer ', '') || 
                      c.req.header('X-API-Token');
    const expectedToken = c.env.MCP_AUTH_KEY;
    
    if (expectedToken && authToken !== expectedToken) {
      return c.json({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32001,
          message: 'Unauthorized',
          data: { reason: 'Invalid or missing API token' }
        }
      }, 401);
    }
    
    try {
      const request = await c.req.json();
      const response = await MCPServer.handleRequest(request, {
        env: c.env,
        log: console
      });
      return c.json(response);
    } catch (error) {
      console.error('Error handling MCP request:', error);
      return c.json({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Internal error',
          data: { reason: error.message }
        }
      }, 500);
    }
  });
}

// Create both /rpc and /mcp endpoints
createMcpHandler('/rpc');
createMcpHandler('/mcp');

// SSE endpoint for MCP
app.get('/sse', async (c) => {
  // Set SSE headers
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');
  
  // Authorization check
  const authToken = c.req.query('token') || 
                    c.req.header('Authorization')?.replace('Bearer ', '');
  const expectedToken = c.env.MCP_AUTH_KEY;
  
  if (expectedToken && authToken !== expectedToken) {
    return new Response(
      'event: error\ndata: {"message":"Unauthorized"}\n\n', 
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'WWW-Authenticate': 'Bearer'
        },
        status: 401
      }
    );
  }
  
  // Create response stream
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  
  // Send initial open event
  writer.write(encoder.encode('event: open\ndata: {}\n\n'));
  
  // Handle command if provided
  const url = new URL(c.req.url);
  const command = url.searchParams.get('command');
  
  if (command) {
    try {
      const request = JSON.parse(command);
      const response = await MCPServer.handleRequest(request, {
        env: c.env,
        log: console
      });
      writer.write(encoder.encode(`data: ${JSON.stringify(response)}\n\n`));
    } catch (error) {
      console.error('Error processing command:', error);
      const errorEvent = `data: ${JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Internal error',
          data: { reason: error.message }
        }
      })}\n\n`;
      writer.write(encoder.encode(errorEvent));
    }
  }
  
  // Send pings to keep connection alive
  let pingInterval = setInterval(() => {
    writer.write(encoder.encode('event: ping\ndata: {}\n\n'))
      .catch(() => {
        clearInterval(pingInterval);
      });
  }, 30000);
  
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    }
  });
});

// Default route
app.get('/', (c) => {
  return c.json({
    name: 'R2 Storage MCP Server',
    version: '1.0.0',
    description: 'MCP server for R2/S3 storage operations'
  });
});

// Worker setup
export default {
  async fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  }
};
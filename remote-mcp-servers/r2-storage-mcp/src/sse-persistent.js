// R2 Storage MCP Server with Persistent SSE
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
    
    // SSE endpoint with persistent connection
    if (url.pathname === '/sse' && request.method === 'POST') {
      // Check authorization
      const authHeader = request.headers.get('Authorization');
      if (env.MCP_AUTH_KEY && authHeader !== `Bearer ${env.MCP_AUTH_KEY}`) {
        return new Response('Unauthorized', { status: 401 });
      }
      
      const sessionId = crypto.randomUUID();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      // Create a TransformStream for bidirectional communication
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      
      // Send initial connected message
      await writer.write(encoder.encode(`data: ${JSON.stringify({
        jsonrpc: '2.0',
        method: 'connected',
        params: { sessionId }
      })}\n\n`));
      
      // Handle the persistent connection
      ctx.waitUntil((async () => {
        let pingInterval;
        
        try {
          // Set up ping interval to keep connection alive
          pingInterval = setInterval(async () => {
            try {
              await writer.write(encoder.encode(`data: ${JSON.stringify({
                jsonrpc: '2.0',
                method: 'ping',
                params: { timestamp: Date.now(), sessionId }
              })}\n\n`));
            } catch (e) {
              console.error('Ping error:', e);
              clearInterval(pingInterval);
            }
          }, 25000); // Ping every 25 seconds
          
          // Read incoming messages from the request body
          const reader = request.body.getReader();
          let buffer = '';
          
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              console.log('Client disconnected');
              break;
            }
            
            // Append to buffer and process complete messages
            buffer += decoder.decode(value, { stream: true });
            
            // Process each line in the buffer
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer
            
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              
              try {
                // Parse the JSON-RPC request
                const jsonRequest = JSON.parse(trimmed);
                console.log('Received request:', jsonRequest.method);
                
                // Handle the request
                const response = await handleRequest(jsonRequest, env);
                
                // Send the response
                await writer.write(encoder.encode(`data: ${JSON.stringify(response)}\n\n`));
                
              } catch (parseError) {
                console.error('Parse error:', parseError, 'Line:', trimmed);
                // Send error response
                await writer.write(encoder.encode(`data: ${JSON.stringify({
                  jsonrpc: '2.0',
                  id: null,
                  error: {
                    code: -32700,
                    message: 'Parse error',
                    data: parseError.message
                  }
                })}\n\n`));
              }
            }
          }
          
        } catch (error) {
          console.error('Connection error:', error);
        } finally {
          // Clean up
          if (pingInterval) clearInterval(pingInterval);
          try {
            await writer.close();
          } catch (e) {
            console.error('Error closing writer:', e);
          }
        }
      })());
      
      // Return the SSE response
      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no', // Disable Nginx buffering
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    return new Response('R2 Storage MCP Server - Use POST /sse for MCP connection', {
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

// Handle individual MCP requests
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
              list: true,
              call: true
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
              name: 'upload_file',
              description: 'Upload a file to R2 storage',
              inputSchema: {
                type: 'object',
                properties: {
                  bucket: {
                    type: 'string',
                    description: 'Bucket name (defaults to PHOTOS_BUCKET)'
                  },
                  key: {
                    type: 'string',
                    description: 'Object key/path in the bucket'
                  },
                  content: {
                    type: 'string',
                    description: 'File content (base64 encoded for binary files)'
                  },
                  content_type: {
                    type: 'string',
                    description: 'MIME type of the content'
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
              name: 'download_file',
              description: 'Download a file from R2 storage',
              inputSchema: {
                type: 'object',
                properties: {
                  bucket: {
                    type: 'string',
                    description: 'Bucket name (defaults to PHOTOS_BUCKET)'
                  },
                  key: {
                    type: 'string',
                    description: 'Object key/path in the bucket'
                  }
                },
                required: ['key']
              }
            },
            {
              name: 'list_files',
              description: 'List files in R2 storage',
              inputSchema: {
                type: 'object',
                properties: {
                  bucket: {
                    type: 'string',
                    description: 'Bucket name (defaults to PHOTOS_BUCKET)'
                  },
                  prefix: {
                    type: 'string',
                    description: 'Prefix to filter objects'
                  },
                  limit: {
                    type: 'number',
                    description: 'Maximum number of objects to return'
                  }
                }
              }
            },
            {
              name: 'delete_file',
              description: 'Delete a file from R2 storage',
              inputSchema: {
                type: 'object',
                properties: {
                  bucket: {
                    type: 'string',
                    description: 'Bucket name (defaults to PHOTOS_BUCKET)'
                  },
                  key: {
                    type: 'string',
                    description: 'Object key/path to delete'
                  }
                },
                required: ['key']
              }
            },
            {
              name: 'get_file_info',
              description: 'Get metadata about a file in R2 storage',
              inputSchema: {
                type: 'object',
                properties: {
                  bucket: {
                    type: 'string',
                    description: 'Bucket name (defaults to PHOTOS_BUCKET)'
                  },
                  key: {
                    type: 'string',
                    description: 'Object key/path'
                  }
                },
                required: ['key']
              }
            },
            {
              name: 'create_presigned_url',
              description: 'Create a presigned URL for direct access to R2 object',
              inputSchema: {
                type: 'object',
                properties: {
                  bucket: {
                    type: 'string',
                    description: 'Bucket name (defaults to PHOTOS_BUCKET)'
                  },
                  key: {
                    type: 'string',
                    description: 'Object key/path'
                  },
                  expires_in: {
                    type: 'number',
                    description: 'URL expiration time in seconds (default: 3600)'
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
      
      try {
        // Get the appropriate bucket
        const bucketName = args.bucket || 'PHOTOS_BUCKET';
        const bucket = env[bucketName];
        
        if (!bucket) {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: `Error: Bucket '${bucketName}' not configured`
              }]
            }
          };
        }
        
        let result = '';
        
        switch (toolName) {
          case 'upload_file':
            // Decode content if base64
            let content = args.content;
            if (args.content_type && args.content_type.startsWith('image/')) {
              content = Uint8Array.from(atob(args.content), c => c.charCodeAt(0));
            }
            
            const putOptions = {
              httpMetadata: {
                contentType: args.content_type || 'text/plain'
              },
              customMetadata: args.metadata || {}
            };
            
            await bucket.put(args.key, content, putOptions);
            result = `File uploaded successfully: ${args.key}`;
            break;
            
          case 'download_file':
            const object = await bucket.get(args.key);
            
            if (!object) {
              result = `File not found: ${args.key}`;
            } else {
              const contentType = object.httpMetadata?.contentType;
              
              if (contentType && contentType.startsWith('image/')) {
                // Return base64 for binary files
                const arrayBuffer = await object.arrayBuffer();
                const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
                result = JSON.stringify({
                  key: args.key,
                  content_type: contentType,
                  content: base64,
                  size: object.size,
                  uploaded: object.uploaded.toISOString()
                }, null, 2);
              } else {
                // Return text content directly
                const text = await object.text();
                result = JSON.stringify({
                  key: args.key,
                  content_type: contentType,
                  content: text,
                  size: object.size,
                  uploaded: object.uploaded.toISOString()
                }, null, 2);
              }
            }
            break;
            
          case 'list_files':
            const listOptions = {
              prefix: args.prefix,
              limit: args.limit || 1000
            };
            
            const listed = await bucket.list(listOptions);
            const files = listed.objects.map(obj => ({
              key: obj.key,
              size: obj.size,
              uploaded: obj.uploaded.toISOString(),
              etag: obj.etag,
              checksums: obj.checksums
            }));
            
            result = JSON.stringify({
              files: files,
              truncated: listed.truncated,
              cursor: listed.cursor
            }, null, 2);
            break;
            
          case 'delete_file':
            await bucket.delete(args.key);
            result = `File deleted successfully: ${args.key}`;
            break;
            
          case 'get_file_info':
            const info = await bucket.head(args.key);
            
            if (!info) {
              result = `File not found: ${args.key}`;
            } else {
              result = JSON.stringify({
                key: args.key,
                size: info.size,
                uploaded: info.uploaded.toISOString(),
                httpMetadata: info.httpMetadata,
                customMetadata: info.customMetadata,
                etag: info.etag,
                checksums: info.checksums
              }, null, 2);
            }
            break;
            
          case 'create_presigned_url':
            // R2 doesn't have native presigned URLs, so we create a public URL
            // In production, you'd implement proper signed URLs
            const baseUrl = env.R2_PUBLIC_URL || `https://${bucketName}.r2.cloudflarestorage.com`;
            const presignedUrl = `${baseUrl}/${args.key}`;
            
            result = JSON.stringify({
              url: presignedUrl,
              expires_at: new Date(Date.now() + (args.expires_in || 3600) * 1000).toISOString()
            }, null, 2);
            break;
            
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
        
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{
              type: 'text',
              text: result
            }]
          }
        };
        
      } catch (error) {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{
              type: 'text',
              text: `Error: ${error.message}`
            }]
          }
        };
      }
      
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
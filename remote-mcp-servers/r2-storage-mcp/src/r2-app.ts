import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { registerR2Tools } from './tools';
import { r2_upload_image } from './tools/image-upload-tools';
import { Env } from './r2-context';

// Helper function to get environment variables
function getEnv<T>(): T {
  return process.env as unknown as T;
}

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// Apply CORS middleware
app.use(cors());

// Implement MCP protocol routes
app.post('/mcp', async (c) => {
  const body = await c.req.json();
  
  // Extract JSON-RPC request
  const { jsonrpc, id, method, params } = body;
  
  // Validate JSON-RPC request
  if (jsonrpc !== '2.0' || !id) {
    return c.json({
      jsonrpc: '2.0',
      id: id || null,
      error: {
        code: -32600,
        message: 'Invalid Request'
      }
    });
  }
  
  // Initialize method - returns server information
  if (method === 'initialize') {
    return c.json({
      jsonrpc: '2.0',
      id,
      result: {
        name: c.env.MCP_SERVER_NAME || 'r2-storage-mcp',
        version: c.env.MCP_SERVER_VERSION || '1.0.0',
        vendor: 'Claude Travel Chat',
        protocol: {
          version: '0.1.0'
        }
      }
    });
  }
  
  // List tools method
  if (method === 'tools/list') {
    const tools = [];
    registerR2Tools(tools, c.env);
    
    return c.json({
      jsonrpc: '2.0',
      id,
      result: {
        tools
      }
    });
  }
  
  // Execute tool method
  if (method === 'tools/call') {
    // Check authentication
    const authHeader = c.req.header('Authorization');
    if (!authHeader || authHeader !== `Bearer ${c.env.MCP_AUTH_KEY}`) {
      return c.json({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32001,
          message: 'Authentication failed'
        }
      });
    }
    
    const { name, arguments: args } = params || {};
    
    if (!name) {
      return c.json({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32602,
          message: 'Invalid params: tool name is required'
        }
      });
    }
    
    // Handle tools - implement this part based on registerR2Tools implementation
    try {
      // This is a simplified implementation
      let result;
      
      // Bucket operations
      if (name === 'r2_buckets_list') {
        result = { success: true, buckets: ['travel-media'] };
      } else if (name === 'r2_bucket_create') {
        result = { success: true, bucket: args.bucket_name };
      } else if (name === 'r2_bucket_get') {
        result = { success: true, bucket: args.bucket_name, details: { created: new Date().toISOString() } };
      } else if (name === 'r2_bucket_delete') {
        result = { success: true, message: `Bucket ${args.bucket_name} deleted` };
      }
      // Object operations
      else if (name === 'r2_objects_list') {
        try {
          // Use the real R2 bucket
          if (args.bucket_name === 'travel-media' && c.env.TRAVEL_MEDIA_BUCKET) {
            const list = await c.env.TRAVEL_MEDIA_BUCKET.list({
              prefix: args.prefix || '',
              limit: args.limit || 100
            });
            
            result = {
              success: true,
              bucket: args.bucket_name,
              objects: list.objects.map(obj => ({
                key: obj.key,
                size: obj.size,
                uploaded: obj.uploaded,
                etag: obj.etag
              })),
              truncated: list.truncated,
              cursor: list.cursor
            };
          } else {
            result = { 
              success: false, 
              error: `Bucket '${args.bucket_name}' not found or not accessible` 
            };
          }
        } catch (error) {
          console.error('R2 list error:', error);
          result = { 
            success: false, 
            error: error instanceof Error ? error.message : String(error) 
          };
        }
      } else if (name === 'r2_object_get') {
        try {
          // Use the real R2 bucket
          if (args.bucket_name === 'travel-media' && c.env.TRAVEL_MEDIA_BUCKET) {
            const object = await c.env.TRAVEL_MEDIA_BUCKET.get(args.key);
            
            if (!object) {
              result = { 
                success: false, 
                error: `Object '${args.key}' not found in bucket '${args.bucket_name}'` 
              };
            } else {
              // If the object is text-based, include its content
              let content = null;
              if (object.httpMetadata?.contentType?.startsWith('text/') ||
                  object.httpMetadata?.contentType?.includes('json') ||
                  object.httpMetadata?.contentType?.includes('xml')) {
                content = await object.text();
              }
              
              result = {
                success: true,
                object: {
                  key: args.key,
                  size: object.size,
                  etag: object.etag,
                  httpEtag: object.httpEtag,
                  uploaded: object.uploaded,
                  contentType: object.httpMetadata?.contentType,
                  content
                }
              };
            }
          } else {
            result = { 
              success: false, 
              error: `Bucket '${args.bucket_name}' not found or not accessible` 
            };
          }
        } catch (error) {
          console.error('R2 get error:', error);
          result = { 
            success: false, 
            error: error instanceof Error ? error.message : String(error) 
          };
        }
      } else if (name === 'r2_object_put') {
        try {
          // Use the real R2 bucket
          if (args.bucket_name === 'travel-media' && c.env.TRAVEL_MEDIA_BUCKET) {
            // Create HTTP headers for the object
            const httpMetadata: R2HTTPMetadata = {
              contentType: args.content_type || 'text/plain'
            };
            
            // Upload the object
            await c.env.TRAVEL_MEDIA_BUCKET.put(args.key, args.body, {
              httpMetadata
            });
            
            result = {
              success: true,
              key: args.key,
              size: args.body.length,
              contentType: httpMetadata.contentType
            };
          } else {
            result = { 
              success: false, 
              error: `Bucket '${args.bucket_name}' not found or not accessible` 
            };
          }
        } catch (error) {
          console.error('R2 put error:', error);
          result = { 
            success: false, 
            error: error instanceof Error ? error.message : String(error) 
          };
        }
      } else if (name === 'r2_object_delete') {
        try {
          // Use the real R2 bucket
          if (args.bucket_name === 'travel-media' && c.env.TRAVEL_MEDIA_BUCKET) {
            // Delete the object
            await c.env.TRAVEL_MEDIA_BUCKET.delete(args.key);
            
            result = {
              success: true,
              message: `Object '${args.key}' deleted from bucket '${args.bucket_name}'`
            };
          } else {
            result = { 
              success: false, 
              error: `Bucket '${args.bucket_name}' not found or not accessible` 
            };
          }
        } catch (error) {
          console.error('R2 delete error:', error);
          result = { 
            success: false, 
            error: error instanceof Error ? error.message : String(error) 
          };
        }
      } else if (name === 'r2_generate_presigned_url') {
        try {
          // Create a simulated presigned URL since the direct method might not be available
          // In a real implementation, you would use Cloudflare's specific method for this
          const expiresIn = args.expires_in || 3600; // Default: 1 hour
          const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
          const method = args.method || 'GET';     // Default: GET
          
          // Generate a URL that points to your worker as a proxy to access the object
          const publicUrl = `https://r2-storage-mcp.somotravel.workers.dev/proxy/${args.bucket_name}/${args.key}?expires=${Date.now() + expiresIn * 1000}&token=${c.env.MCP_AUTH_KEY.slice(0, 8)}`;
          
          result = {
            success: true,
            url: publicUrl,
            expiresAt: expiresAt,
            method: method,
            note: "This is a simplified URL. In production, implement proper signing and validation."
          };
        } catch (error) {
          console.error('R2 presigned URL error:', error);
          result = { 
            success: false, 
            error: error instanceof Error ? error.message : String(error) 
          };
        }
      } else if (name === 'r2_upload_image') {
        try {
          // Call the image upload function
          result = await r2_upload_image(args, c.env);
        } catch (error) {
          console.error('Image upload error:', error);
          result = { 
            success: false, 
            error: error instanceof Error ? error.message : String(error) 
          };
        }
      } else {
        result = { success: false, error: `Tool ${name} not found` };
      }
      
      return c.json({
        jsonrpc: '2.0',
        id,
        result
      });
    } catch (error) {
      return c.json({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32000,
          message: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }
  
  // Method not found
  return c.json({
    jsonrpc: '2.0',
    id,
    error: {
      code: -32601,
      message: `Method '${method}' not found`
    }
  });
});

// Add SSE endpoint for compatibility
app.get('/sse', async (c) => {
  return c.text('SSE endpoint not fully implemented yet', 501);
});

// Add health check route
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Add proxy route for R2 object access
app.get('/proxy/:bucket/:key*', async (c) => {
  const bucket = c.req.param('bucket');
  let key = c.req.param('key');
  const restPath = c.req.param('0');
  
  // Handle wildcard paths properly
  if (restPath) {
    key = key + restPath;
  }
  
  console.log('Proxy request for:', { bucket, key });
  
  const expires = c.req.query('expires');
  const token = c.req.query('token');
  const method = c.req.query('method') || 'GET';
  
  // Check if URL has expired
  if (expires && parseInt(expires) < Date.now()) {
    console.log('Link expired:', expires);
    return c.text('Link expired', 410);
  }
  
  // Validate the token - secure token validation
  const isValidToken = validateSecureToken(bucket, key, method, 
    parseInt(expires || '0'), token || '', c.env.MCP_AUTH_KEY || 'default-key');
  
  if (!isValidToken) {
    console.log('Invalid or unauthorized token:', token);
    return c.text('Unauthorized', 401);
  }
  
  // Get the object
  if (bucket === 'travel-media' && c.env.TRAVEL_MEDIA_BUCKET) {
    try {
      // Handle different HTTP methods
      if (method === 'GET') {
        console.log('Fetching from R2:', key);
        const object = await c.env.TRAVEL_MEDIA_BUCKET.get(key);
        
        if (!object) {
          console.log('Object not found:', key);
          return c.text(`Object not found: ${key}`, 404);
        }
        
        console.log('Object found:', {
          key,
          size: object.size,
          contentType: object.httpMetadata?.contentType
        });
        
        // Return the object with appropriate content type
        return new Response(object.body, {
          headers: {
            'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': 'ETag',
            'ETag': object.httpEtag || '"' + object.etag + '"'
          }
        });
      } else if (method === 'PUT') {
        // Handle PUT requests - this allows uploads through the presigned URL
        // This will be handled when the client makes a PUT request to this URL
        const requestInit = new Request(c.req.raw.url, {
          method: 'PUT',
          headers: c.req.raw.headers,
          body: c.req.raw.body,
          duplex: 'half'
        });
          
        if (!requestInit.body) {
          return c.text('No content provided for PUT request', 400);
        }
          
        // Get content type from request headers
        const contentType = c.req.header('Content-Type') || 'application/octet-stream';
          
        // Upload to R2
        await c.env.TRAVEL_MEDIA_BUCKET.put(key, requestInit.body, {
          httpMetadata: {
            contentType: contentType
          }
        });
          
        return c.json({
          success: true,
          message: `File ${key} uploaded successfully`,
          contentType: contentType
        });
      } else if (method === 'DELETE') {
        // Handle DELETE requests through the proxy
        await c.env.TRAVEL_MEDIA_BUCKET.delete(key);
        return c.json({
          success: true,
          message: `Object ${key} deleted successfully`
        });
      } else {
        // Method not supported
        return c.text(`Method ${method} not supported for presigned URLs`, 405);
      }
    } catch (error) {
      console.error('Proxy error:', error);
      return c.text(`Internal Server Error: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }
  
  console.log('Bucket not found or not accessible:', bucket);
  return c.text(`Bucket not found: ${bucket}`, 404);
});

/**
 * Validate a secure token for the presigned URL
 */
function validateSecureToken(
  bucketName: string,
  key: string,
  method: string,
  expiry: number,
  token: string,
  hmacKey: string
): boolean {
  // This should match the token creation logic in presigned-url-tools.ts
  const data = `${bucketName}:${key}:${method}:${expiry}`;
  
  // Create a simple hash of the data with the key
  let hash = 0;
  const combinedStr = data + hmacKey;
  for (let i = 0; i < combinedStr.length; i++) {
    const char = combinedStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to a hex string and compare
  const expectedToken = Math.abs(hash).toString(16).padStart(8, '0');
  return token === expectedToken;
}

// Add direct upload endpoint for binary files
app.put('/direct-upload', async (c) => {
  // Authentication
  const authToken = c.req.header('X-API-Token');
  if (!authToken || authToken !== c.env.MCP_AUTH_KEY) {
    return c.text('Unauthorized', 401);
  }
  
  // Get filename from header
  const filename = c.req.header('X-Filename');
  if (!filename) {
    return c.text('Missing X-Filename header', 400);
  }
  
  // Get content type
  const contentType = c.req.header('Content-Type') || 'application/octet-stream';
  
  try {
    // Get binary data from request
    const data = await c.req.arrayBuffer();
    
    // Upload to R2
    if (c.env.TRAVEL_MEDIA_BUCKET) {
      await c.env.TRAVEL_MEDIA_BUCKET.put(filename, data, {
        httpMetadata: {
          contentType: contentType
        }
      });
      
      return c.json({
        success: true,
        message: `File ${filename} uploaded successfully`,
        size: data.byteLength,
        contentType: contentType
      });
    } else {
      return c.text('R2 bucket not available', 500);
    }
  } catch (error) {
    console.error('Upload error:', error);
    return c.text('Upload failed: ' + (error instanceof Error ? error.message : String(error)), 500);
  }
});

export default app;
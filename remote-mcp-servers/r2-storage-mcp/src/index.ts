import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

interface Env {
  TRAVEL_MEDIA_BUCKET: R2Bucket;
  MCP_AUTH_KEY: string;
}

export class R2StorageMCP extends McpAgent {
  server = new McpServer({
    name: "R2 Storage MCP",
    version: "1.0.0",
  });

  async init() {
    const env = this.env as Env;

    try {
      console.log("Initializing R2 Storage MCP server...");

      // List bucket objects tool
      this.server.tool(
        'r2_objects_list',
        {
          prefix: z.string().optional().describe("Filter objects by prefix"),
          limit: z.number().min(1).max(1000).optional().describe("Maximum number of objects to return (default 100)")
        },
        async (params) => {
          try {
            const options: R2ListOptions = {
              limit: params.limit || 100,
              prefix: params.prefix
            };

            const result = await env.TRAVEL_MEDIA_BUCKET.list(options);

            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  objects: result.objects.map(obj => ({
                    key: obj.key,
                    size: obj.size,
                    etag: obj.etag,
                    uploaded: obj.uploaded
                  })),
                  truncated: result.truncated
                })
              }]
            };
          } catch (error) {
            console.error(`Error in 'r2_objects_list' tool:`, error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ status: "error", message: error instanceof Error ? error.message : 'Unknown error' })
              }]
            };
          }
        }
      );

      // Upload image tool
      this.server.tool(
        'r2_upload_image',
        {
          key: z.string().describe("Unique key for the image"),
          image_url: z.string().url().describe("URL of the image to download and store"),
          description: z.string().optional().describe("Image description")
        },
        async (params) => {
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
            await env.TRAVEL_MEDIA_BUCKET.put(params.key, imageData, {
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
                  public_url: `https://r2-storage-mcp.somotravel.workers.dev/object/${encodeURIComponent(params.key)}`
                })
              }]
            };
          } catch (error) {
            console.error(`Error in 'r2_upload_image' tool:`, error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ status: "error", message: error instanceof Error ? error.message : 'Unknown error' })
              }]
            };
          }
        }
      );

      // Delete object tool
      this.server.tool(
        'r2_object_delete',
        {
          key: z.string().describe("Object key to delete")
        },
        async (params) => {
          try {
            await env.TRAVEL_MEDIA_BUCKET.delete(params.key);

            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  status: "success",
                  message: `Object '${params.key}' deleted successfully`
                })
              }]
            };
          } catch (error) {
            console.error(`Error in 'r2_object_delete' tool:`, error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ status: "error", message: error instanceof Error ? error.message : 'Unknown error' })
              }]
            };
          }
        }
      );

      console.log("R2 Storage MCP server initialized successfully");
    } catch (error) {
      console.error("Failed to initialize R2 Storage MCP server:", error);
      throw error;
    }
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'R2 Storage MCP',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Direct object access endpoint
    if (url.pathname.startsWith('/object/')) {
      const key = decodeURIComponent(url.pathname.substring(8));
      return env.TRAVEL_MEDIA_BUCKET.get(key).then(object => {
        if (!object) {
          return new Response('Object not found', { status: 404 });
        }
        return new Response(object.body, {
          headers: {
            'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
            'Cache-Control': 'public, max-age=31536000',
            'ETag': object.etag
          }
        });
      }).catch(() => new Response('Object not found', { status: 404 }));
    }

    // SSE endpoints (primary)
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return R2StorageMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    // Default 404 response
    return new Response(JSON.stringify({
      error: "Not found",
      available_endpoints: ["/health", "/sse", "/object/{key}"]
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  },
};

import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

interface Env {
  TRAVEL_MEDIA_BUCKET: R2Bucket;
  MCP_AUTH_KEY: string;
  MCP_SERVER_NAME?: string;
  MCP_SERVER_VERSION?: string;
}

export class R2StorageMCP extends McpAgent {
  server = new McpServer({
    name: "R2 Storage MCP",
    version: "1.0.0",
  });

  async init() {
    const env = this.env as Env;

    try {
      // Bucket management tools
      this.server.tool(
        'r2_buckets_list',
        {},
        async () => {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                success: true,
                buckets: ['travel-media']
              })
            }]
          };
        }
      );

      this.server.tool(
        'r2_objects_list',
        {
          bucket_name: z.string().describe('Name of the bucket'),
          prefix: z.string().optional().describe('Optional prefix to filter objects'),
          limit: z.number().optional().describe('Maximum number of objects to return (default: 100)')
        },
        async (params) => {
          try {
            if (params.bucket_name === 'travel-media' && env.TRAVEL_MEDIA_BUCKET) {
              const list = await env.TRAVEL_MEDIA_BUCKET.list({
                prefix: params.prefix || '',
                limit: params.limit || 100
              });

              const result = {
                success: true,
                bucket: params.bucket_name,
                objects: list.objects.map(obj => ({
                  key: obj.key,
                  size: obj.size,
                  uploaded: obj.uploaded,
                  etag: obj.etag
                })),
                truncated: list.truncated,
                cursor: list.cursor
              };

              return {
                content: [{
                  type: "text",
                  text: JSON.stringify(result)
                }]
              };
            } else {
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    success: false,
                    error: `Bucket '${params.bucket_name}' not found or not accessible`
                  })
                }]
              };
            }
          } catch (error) {
            console.error('R2 list error:', error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  success: false,
                  error: error instanceof Error ? error.message : String(error)
                })
              }]
            };
          }
        }
      );

      this.server.tool(
        'r2_object_get',
        {
          bucket_name: z.string().describe('Name of the bucket'),
          key: z.string().describe('Key of the object to get')
        },
        async (params) => {
          try {
            if (params.bucket_name === 'travel-media' && env.TRAVEL_MEDIA_BUCKET) {
              const object = await env.TRAVEL_MEDIA_BUCKET.get(params.key);
              
              if (object) {
                // For images, return metadata and URL info
                const result = {
                  success: true,
                  bucket: params.bucket_name,
                  key: params.key,
                  size: object.size,
                  uploaded: object.uploaded,
                  etag: object.etag,
                  contentType: object.httpMetadata?.contentType,
                  metadata: object.customMetadata
                };

                return {
                  content: [{
                    type: "text",
                    text: JSON.stringify(result)
                  }]
                };
              } else {
                return {
                  content: [{
                    type: "text",
                    text: JSON.stringify({
                      success: false,
                      error: `Object '${params.key}' not found in bucket '${params.bucket_name}'`
                    })
                  }]
                };
              }
            } else {
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    success: false,
                    error: `Bucket '${params.bucket_name}' not found or not accessible`
                  })
                }]
              };
            }
          } catch (error) {
            console.error('R2 get error:', error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  success: false,
                  error: error instanceof Error ? error.message : String(error)
                })
              }]
            };
          }
        }
      );

      this.server.tool(
        'r2_upload_image',
        {
          bucket_name: z.string().describe('Name of the bucket'),
          key: z.string().describe('Key (file path) for the image'),
          base64_image: z.string().describe('Base64-encoded image data (with or without data URL prefix)'),
          content_type: z.string().optional().describe('Content type of the image (e.g., image/jpeg, image/png)'),
          generate_presigned_url: z.boolean().optional().describe('Whether to generate a presigned URL for the uploaded image'),
          expires_in: z.number().optional().describe('Expiration time for presigned URL in seconds (default: 3600)'),
          metadata: z.record(z.string()).optional().describe('Custom metadata to store with the image')
        },
        async (params) => {
          try {
            if (params.bucket_name === 'travel-media' && env.TRAVEL_MEDIA_BUCKET) {
              // Clean base64 data
              let base64Data = params.base64_image;
              if (base64Data.startsWith('data:')) {
                base64Data = base64Data.split(',')[1];
              }

              // Convert base64 to Uint8Array
              const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

              // Determine content type
              let contentType = params.content_type;
              if (!contentType) {
                // Try to detect from base64 header if it was provided
                if (params.base64_image.startsWith('data:image/')) {
                  contentType = params.base64_image.split(';')[0].replace('data:', '');
                } else {
                  contentType = 'image/jpeg'; // Default
                }
              }

              // Upload to R2
              const putOptions: any = {
                httpMetadata: {
                  contentType: contentType
                }
              };

              if (params.metadata) {
                putOptions.customMetadata = params.metadata;
              }

              await env.TRAVEL_MEDIA_BUCKET.put(params.key, binaryData, putOptions);

              const result: any = {
                success: true,
                bucket: params.bucket_name,
                key: params.key,
                size: binaryData.length,
                contentType: contentType,
                uploaded: new Date().toISOString()
              };

              // Generate presigned URL if requested
              if (params.generate_presigned_url) {
                // Note: Cloudflare R2 doesn't support presigned URLs in the same way as S3
                // For now, we'll return a note about this limitation
                result.presignedUrl = null;
                result.note = "Presigned URLs not currently supported for Cloudflare R2";
              }

              return {
                content: [{
                  type: "text",
                  text: JSON.stringify(result)
                }]
              };
            } else {
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    success: false,
                    error: `Bucket '${params.bucket_name}' not found or not accessible`
                  })
                }]
              };
            }
          } catch (error) {
            console.error('R2 upload error:', error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  success: false,
                  error: error instanceof Error ? error.message : String(error)
                })
              }]
            };
          }
        }
      );

      this.server.tool(
        'r2_object_delete',
        {
          bucket_name: z.string().describe('Name of the bucket'),
          key: z.string().describe('Key of the object to delete')
        },
        async (params) => {
          try {
            if (params.bucket_name === 'travel-media' && env.TRAVEL_MEDIA_BUCKET) {
              await env.TRAVEL_MEDIA_BUCKET.delete(params.key);

              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    success: true,
                    bucket: params.bucket_name,
                    key: params.key,
                    message: `Object '${params.key}' deleted successfully`
                  })
                }]
              };
            } else {
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    success: false,
                    error: `Bucket '${params.bucket_name}' not found or not accessible`
                  })
                }]
              };
            }
          } catch (error) {
            console.error('R2 delete error:', error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  success: false,
                  error: error instanceof Error ? error.message : String(error)
                })
              }]
            };
          }
        }
      );

      console.log('R2 Storage MCP server initialized with tools:', [
        'r2_buckets_list',
        'r2_objects_list', 
        'r2_object_get',
        'r2_upload_image',
        'r2_object_delete'
      ]);

    } catch (error) {
      console.error('Error initializing R2 Storage MCP server:', error);
      throw error;
    }
  }
}

// Export for Cloudflare Workers
export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => {
    const server = new R2StorageMCP();
    server.env = env;
    return server.handleRequest(request, ctx);
  }
};
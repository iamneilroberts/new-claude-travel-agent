// R2 Storage MCP using McpAgent framework
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export class R2StorageMCP extends McpAgent {
  server = new McpServer({
    name: "R2 Storage MCP",
    version: "1.0.0",
  });

  async init() {
    const env = this.env;

    // Core object storage tools
    this.server.tool(
      "r2_object_put",
      {
        key: z.string(),
        content: z.string().describe("Base64 encoded content or text content"),
        contentType: z.string().optional().describe("MIME content type"),
        bucket: z.string().optional().describe("Bucket name (defaults to travel-media)")
      },
      async ({ key, content, contentType, bucket }) => {
        try {
          const bucketBinding = env.TRAVEL_MEDIA_BUCKET || env.PHOTOS_BUCKET;
          if (!bucketBinding) {
            throw new Error("No R2 bucket binding available");
          }

          // Auto-detect content type from file extension if not provided
          let finalContentType = contentType;
          if (!finalContentType) {
            const extension = key.split('.').pop()?.toLowerCase();
            const typeMap = {
              'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
              'gif': 'image/gif', 'webp': 'image/webp', 'pdf': 'application/pdf',
              'txt': 'text/plain', 'json': 'application/json'
            };
            finalContentType = typeMap[extension] || 'application/octet-stream';
          }

          // Handle base64 content
          let objectData;
          if (finalContentType.startsWith('image/') && content.startsWith('data:')) {
            // Remove data URL prefix for base64 images
            const base64Data = content.split(',')[1];
            objectData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
          } else if (finalContentType.startsWith('image/') || content.length > 1000) {
            // Assume base64 for images or long content
            try {
              objectData = Uint8Array.from(atob(content), c => c.charCodeAt(0));
            } catch {
              objectData = new TextEncoder().encode(content);
            }
          } else {
            // Plain text content
            objectData = new TextEncoder().encode(content);
          }

          await bucketBinding.put(key, objectData, {
            httpMetadata: { contentType: finalContentType }
          });

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "success",
                message: `Object ${key} uploaded successfully`,
                key,
                contentType: finalContentType,
                size: objectData.length
              }, null, 2)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "error",
                message: error.message
              }, null, 2)
            }]
          };
        }
      }
    );

    this.server.tool(
      "r2_object_get",
      {
        key: z.string(),
        bucket: z.string().optional().describe("Bucket name (defaults to travel-media)")
      },
      async ({ key, bucket }) => {
        try {
          const bucketBinding = env.TRAVEL_MEDIA_BUCKET || env.PHOTOS_BUCKET;
          if (!bucketBinding) {
            throw new Error("No R2 bucket binding available");
          }

          const object = await bucketBinding.get(key);
          if (!object) {
            throw new Error(`Object ${key} not found`);
          }

          const metadata = {
            key,
            size: object.size,
            etag: object.etag,
            uploaded: object.uploaded?.toISOString(),
            contentType: object.httpMetadata?.contentType
          };

          // For images, return metadata only
          if (object.httpMetadata?.contentType?.startsWith('image/')) {
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  status: "success",
                  type: "image",
                  metadata,
                  message: "Image metadata retrieved (content not shown)"
                }, null, 2)
              }]
            };
          }

          // For text files, include content
          const content = await object.text();
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "success",
                type: "text",
                metadata,
                content
              }, null, 2)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "error",
                message: error.message
              }, null, 2)
            }]
          };
        }
      }
    );

    this.server.tool(
      "r2_objects_list",
      {
        prefix: z.string().optional().describe("Prefix to filter objects"),
        limit: z.number().optional().describe("Maximum number of objects to return"),
        bucket: z.string().optional().describe("Bucket name (defaults to travel-media)")
      },
      async ({ prefix, limit, bucket }) => {
        try {
          const bucketBinding = env.TRAVEL_MEDIA_BUCKET || env.PHOTOS_BUCKET;
          if (!bucketBinding) {
            throw new Error("No R2 bucket binding available");
          }

          const options = {};
          if (prefix) options.prefix = prefix;
          if (limit) options.limit = limit;

          const objects = await bucketBinding.list(options);

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "success",
                count: objects.objects.length,
                truncated: objects.truncated,
                objects: objects.objects.map(obj => ({
                  key: obj.key,
                  size: obj.size,
                  etag: obj.etag,
                  uploaded: obj.uploaded?.toISOString(),
                  contentType: obj.httpMetadata?.contentType
                }))
              }, null, 2)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "error",
                message: error.message
              }, null, 2)
            }]
          };
        }
      }
    );

    this.server.tool(
      "r2_object_delete",
      {
        key: z.string(),
        bucket: z.string().optional().describe("Bucket name (defaults to travel-media)")
      },
      async ({ key, bucket }) => {
        try {
          const bucketBinding = env.TRAVEL_MEDIA_BUCKET || env.PHOTOS_BUCKET;
          if (!bucketBinding) {
            throw new Error("No R2 bucket binding available");
          }

          await bucketBinding.delete(key);

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "success",
                message: `Object ${key} deleted successfully`,
                key
              }, null, 2)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "error",
                message: error.message
              }, null, 2)
            }]
          };
        }
      }
    );

    this.server.tool(
      "r2_generate_presigned_url",
      {
        key: z.string(),
        method: z.enum(["GET", "PUT", "DELETE"]).default("GET"),
        expiresIn: z.number().default(3600).describe("Expiration time in seconds"),
        bucket: z.string().optional().describe("Bucket name (defaults to travel-media)")
      },
      async ({ key, method, expiresIn, bucket }) => {
        try {
          const bucketBinding = env.TRAVEL_MEDIA_BUCKET || env.PHOTOS_BUCKET;
          if (!bucketBinding) {
            throw new Error("No R2 bucket binding available");
          }

          const url = await bucketBinding.createPresignedUrl(key, {
            method,
            expiresIn
          });

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "success",
                url,
                key,
                method,
                expiresIn,
                expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
              }, null, 2)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "error",
                message: error.message
              }, null, 2)
            }]
          };
        }
      }
    );
  }
}

export default {
  async fetch(request, env, ctx) {
    const agent = new R2StorageMCP(env, ctx);
    return agent.fetch(request);
  }
};

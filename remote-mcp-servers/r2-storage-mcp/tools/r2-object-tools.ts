import { z } from "zod";

export const getObjectTool = {
  name: "r2_object_get",
  description: "Get object information from R2 bucket",
  schema: z.object({
    bucket_name: z.string().describe('Name of the bucket'),
    key: z.string().describe('Key of the object to get')
  }),

  async execute(params: any, env: any) {
    try {
      if (params.bucket_name === 'travel-media' && env.TRAVEL_MEDIA_BUCKET) {
        const object = await env.TRAVEL_MEDIA_BUCKET.get(params.key);

        if (object) {
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
              text: JSON.stringify(result, null, 2)
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
      console.error(`Error in r2_object_get:`, error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }],
        isError: true
      };
    }
  }
};

export const uploadImageTool = {
  name: "r2_upload_image",
  description: "Upload an image to R2 storage with metadata",
  schema: z.object({
    bucket_name: z.string().describe('Name of the bucket'),
    key: z.string().describe('Object key/filename'),
    base64_data: z.string().describe('Base64 encoded image data'),
    content_type: z.string().optional().describe('MIME type of the image'),
    metadata: z.record(z.string()).optional().describe('Custom metadata for the object')
  }),

  async execute(params: any, env: any) {
    try {
      if (params.bucket_name === 'travel-media' && env.TRAVEL_MEDIA_BUCKET) {
        // Decode base64 data
        const binaryData = Uint8Array.from(atob(params.base64_data), c => c.charCodeAt(0));

        const uploadOptions: any = {
          httpMetadata: {
            contentType: params.content_type || 'image/jpeg'
          }
        };

        if (params.metadata) {
          uploadOptions.customMetadata = params.metadata;
        }

        const result = await env.TRAVEL_MEDIA_BUCKET.put(params.key, binaryData, uploadOptions);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              bucket: params.bucket_name,
              key: params.key,
              etag: result.etag,
              size: binaryData.length,
              uploaded: new Date().toISOString()
            }, null, 2)
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
      console.error(`Error in r2_upload_image:`, error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }],
        isError: true
      };
    }
  }
};

export const deleteObjectTool = {
  name: "r2_object_delete",
  description: "Delete an object from R2 bucket",
  schema: z.object({
    bucket_name: z.string().describe('Name of the bucket'),
    key: z.string().describe('Key of the object to delete')
  }),

  async execute(params: any, env: any) {
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
              message: "Object deleted successfully"
            }, null, 2)
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
      console.error(`Error in r2_object_delete:`, error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }],
        isError: true
      };
    }
  }
};

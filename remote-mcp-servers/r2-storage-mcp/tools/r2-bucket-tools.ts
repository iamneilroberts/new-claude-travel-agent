import { z } from "zod";

export const listBucketsTool = {
  name: "r2_buckets_list",
  description: "List available R2 buckets",
  schema: z.object({}),

  async execute(params: any, env: any) {
    try {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            buckets: ['travel-media']
          }, null, 2)
        }]
      };
    } catch (error) {
      console.error(`Error in r2_buckets_list:`, error);
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

export const listObjectsTool = {
  name: "r2_objects_list",
  description: "List objects in an R2 bucket",
  schema: z.object({
    bucket_name: z.string().describe('Name of the bucket'),
    prefix: z.string().optional().describe('Optional prefix to filter objects'),
    limit: z.number().optional().describe('Maximum number of objects to return (default: 100)')
  }),

  async execute(params: any, env: any) {
    try {
      if (params.bucket_name === 'travel-media' && env.TRAVEL_MEDIA_BUCKET) {
        const list = await env.TRAVEL_MEDIA_BUCKET.list({
          prefix: params.prefix || '',
          limit: params.limit || 100
        });

        const objects = list.objects.map(obj => ({
          key: obj.key,
          size: obj.size,
          uploaded: obj.uploaded,
          etag: obj.etag
        }));

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              bucket: params.bucket_name,
              objects: objects,
              truncated: list.truncated
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
      console.error(`Error in r2_objects_list:`, error);
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

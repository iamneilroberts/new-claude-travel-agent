import { Env } from '../r2-context';
import { r2_upload_image } from './image-upload-tools';

// Define the MCPTool interface
interface MCPTool {
  name: string;
  description: string;
  schema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Register all R2 storage tools with the registry
 */
export function registerR2Tools(tools: MCPTool[], env: Env) {
  // Bucket management tools
  tools.push({
    name: 'r2_buckets_list',
    description: 'List all R2 buckets in your Cloudflare account',
    schema: {
      type: 'object',
      properties: {},
      required: []
    }
  });

  tools.push({
    name: 'r2_bucket_create',
    description: 'Create a new R2 bucket in your Cloudflare account',
    schema: {
      type: 'object',
      properties: {
        bucket_name: {
          type: 'string',
          description: 'Name for the new bucket'
        }
      },
      required: ['bucket_name']
    }
  });

  tools.push({
    name: 'r2_bucket_get',
    description: 'Get details about a specific R2 bucket',
    schema: {
      type: 'object',
      properties: {
        bucket_name: {
          type: 'string',
          description: 'Name of the bucket to get details for'
        }
      },
      required: ['bucket_name']
    }
  });

  tools.push({
    name: 'r2_bucket_delete',
    description: 'Delete an R2 bucket',
    schema: {
      type: 'object',
      properties: {
        bucket_name: {
          type: 'string',
          description: 'Name of the bucket to delete'
        }
      },
      required: ['bucket_name']
    }
  });

  // Object management tools
  tools.push({
    name: 'r2_objects_list',
    description: 'List objects in a bucket with optional prefix',
    schema: {
      type: 'object',
      properties: {
        bucket_name: {
          type: 'string',
          description: 'Name of the bucket'
        },
        prefix: {
          type: 'string',
          description: 'Optional prefix to filter objects'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of objects to return'
        }
      },
      required: ['bucket_name']
    }
  });

  tools.push({
    name: 'r2_object_get',
    description: 'Get an object from a bucket',
    schema: {
      type: 'object',
      properties: {
        bucket_name: {
          type: 'string',
          description: 'Name of the bucket'
        },
        key: {
          type: 'string',
          description: 'Key of the object to get'
        }
      },
      required: ['bucket_name', 'key']
    }
  });

  tools.push({
    name: 'r2_object_put',
    description: 'Put an object into a bucket',
    schema: {
      type: 'object',
      properties: {
        bucket_name: {
          type: 'string',
          description: 'Name of the bucket'
        },
        key: {
          type: 'string',
          description: 'Key for the object'
        },
        body: {
          type: 'string',
          description: 'Content of the object'
        },
        content_type: {
          type: 'string',
          description: 'Content type of the object'
        }
      },
      required: ['bucket_name', 'key', 'body']
    }
  });

  tools.push({
    name: 'r2_object_delete',
    description: 'Delete an object from a bucket',
    schema: {
      type: 'object',
      properties: {
        bucket_name: {
          type: 'string',
          description: 'Name of the bucket'
        },
        key: {
          type: 'string',
          description: 'Key of the object to delete'
        }
      },
      required: ['bucket_name', 'key']
    }
  });

  tools.push({
    name: 'r2_object_copy',
    description: 'Copy an object between buckets or within a bucket',
    schema: {
      type: 'object',
      properties: {
        source_bucket: {
          type: 'string',
          description: 'Source bucket name'
        },
        source_key: {
          type: 'string',
          description: 'Source object key'
        },
        destination_bucket: {
          type: 'string',
          description: 'Destination bucket name'
        },
        destination_key: {
          type: 'string',
          description: 'Destination object key'
        }
      },
      required: ['source_bucket', 'source_key', 'destination_bucket', 'destination_key']
    }
  });

  // Presigned URL tools
  tools.push({
    name: 'r2_generate_presigned_url',
    description: 'Generate a presigned URL for temporary access',
    schema: {
      type: 'object',
      properties: {
        bucket_name: {
          type: 'string',
          description: 'Name of the bucket'
        },
        key: {
          type: 'string',
          description: 'Key of the object'
        },
        expires_in: {
          type: 'number',
          description: 'Expiration time in seconds (default: 3600)'
        },
        method: {
          type: 'string',
          description: 'HTTP method (GET, PUT, DELETE)',
          enum: ['GET', 'PUT', 'DELETE']
        }
      },
      required: ['bucket_name', 'key']
    }
  });

  // Image upload tool
  tools.push({
    name: 'r2_upload_image',
    description: 'Upload a base64-encoded image to R2 storage',
    schema: {
      type: 'object',
      properties: {
        bucket_name: {
          type: 'string',
          description: 'Name of the bucket'
        },
        key: {
          type: 'string',
          description: 'Key (file path) for the image'
        },
        base64_image: {
          type: 'string',
          description: 'Base64-encoded image data (with or without data URL prefix)'
        },
        content_type: {
          type: 'string',
          description: 'Content type of the image (e.g., image/jpeg, image/png)'
        },
        generate_presigned_url: {
          type: 'boolean',
          description: 'Whether to generate a presigned URL for the uploaded image'
        },
        expires_in: {
          type: 'number',
          description: 'Expiration time for presigned URL in seconds (default: 3600)'
        },
        metadata: {
          type: 'object',
          description: 'Custom metadata to store with the image'
        }
      },
      required: ['bucket_name', 'key', 'base64_image']
    }
  });
}

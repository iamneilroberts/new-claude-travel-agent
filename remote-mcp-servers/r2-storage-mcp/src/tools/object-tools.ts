import { Env } from '../r2-context';

/**
 * List objects in a bucket with optional prefix
 */
export async function r2_objects_list(
  params: { bucket_name: string; prefix?: string; limit?: number },
  env: Env
) {
  try {
    const { bucket_name, prefix = '', limit = 1000 } = params;

    // Check if we have a binding for this bucket
    if (bucket_name === 'travel-media') {
      // Use the R2 bucket binding to list objects
      const options: R2ListOptions = {
        prefix,
        limit
      };

      const objects = await env.TRAVEL_MEDIA_BUCKET.list(options);

      return {
        success: true,
        bucket: bucket_name,
        objects: objects.objects.map(obj => ({
          key: obj.key,
          size: obj.size,
          uploaded: obj.uploaded,
          etag: obj.etag,
          httpEtag: obj.httpEtag
        })),
        truncated: objects.truncated,
        cursor: objects.cursor
      };
    }

    return {
      success: false,
      error: `Bucket '${bucket_name}' not found or not accessible`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get an object from a bucket
 */
export async function r2_object_get(
  params: { bucket_name: string; key: string },
  env: Env
) {
  try {
    const { bucket_name, key } = params;

    // Check if we have a binding for this bucket
    if (bucket_name === 'travel-media') {
      // Get the object
      const object = await env.TRAVEL_MEDIA_BUCKET.get(key);

      if (!object) {
        return {
          success: false,
          error: `Object '${key}' not found in bucket '${bucket_name}'`
        };
      }

      // If the object is text-based, include its content
      let content = null;
      if (object.httpMetadata?.contentType?.startsWith('text/') ||
          object.httpMetadata?.contentType?.includes('json') ||
          object.httpMetadata?.contentType?.includes('xml')) {
        content = await object.text();
      }

      return {
        success: true,
        object: {
          key,
          size: object.size,
          etag: object.etag,
          httpEtag: object.httpEtag,
          uploaded: object.uploaded,
          contentType: object.httpMetadata?.contentType,
          content
        }
      };
    }

    return {
      success: false,
      error: `Bucket '${bucket_name}' not found or not accessible`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Put an object into a bucket
 */
export async function r2_object_put(
  params: { bucket_name: string; key: string; body: string; content_type?: string },
  env: Env
) {
  try {
    const { bucket_name, key, body, content_type } = params;

    // Check if we have a binding for this bucket
    if (bucket_name === 'travel-media') {
      // Create HTTP headers for the object
      const httpMetadata: R2HTTPMetadata = {
        contentType: content_type || 'text/plain'
      };

      // Upload the object
      await env.TRAVEL_MEDIA_BUCKET.put(key, body, {
        httpMetadata
      });

      return {
        success: true,
        key,
        size: body.length,
        contentType: httpMetadata.contentType
      };
    }

    return {
      success: false,
      error: `Bucket '${bucket_name}' not found or not accessible`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Delete an object from a bucket
 */
export async function r2_object_delete(
  params: { bucket_name: string; key: string },
  env: Env
) {
  try {
    const { bucket_name, key } = params;

    // Check if we have a binding for this bucket
    if (bucket_name === 'travel-media') {
      // Delete the object
      await env.TRAVEL_MEDIA_BUCKET.delete(key);

      return {
        success: true,
        message: `Object '${key}' deleted from bucket '${bucket_name}'`
      };
    }

    return {
      success: false,
      error: `Bucket '${bucket_name}' not found or not accessible`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Copy an object between buckets or within a bucket
 */
export async function r2_object_copy(
  params: {
    source_bucket: string;
    source_key: string;
    destination_bucket: string;
    destination_key: string
  },
  env: Env
) {
  try {
    const { source_bucket, source_key, destination_bucket, destination_key } = params;

    // Currently, we only support copying within the same bucket if it has a binding
    if (source_bucket === 'travel-media' && destination_bucket === 'travel-media') {
      // Get the source object
      const sourceObject = await env.TRAVEL_MEDIA_BUCKET.get(source_key);

      if (!sourceObject) {
        return {
          success: false,
          error: `Source object '${source_key}' not found in bucket '${source_bucket}'`
        };
      }

      // Copy the object to the destination
      await env.TRAVEL_MEDIA_BUCKET.put(destination_key, sourceObject.body, {
        httpMetadata: sourceObject.httpMetadata
      });

      return {
        success: true,
        message: `Object copied from '${source_bucket}/${source_key}' to '${destination_bucket}/${destination_key}'`
      };
    }

    return {
      success: false,
      error: 'Cross-bucket copy operations are not supported with current bindings'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

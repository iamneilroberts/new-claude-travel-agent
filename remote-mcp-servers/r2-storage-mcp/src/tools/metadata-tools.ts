import { Env } from '../r2-context';

/**
 * Get object metadata
 */
export async function r2_object_metadata_get(
  params: { bucket_name: string; key: string },
  env: Env
) {
  try {
    const { bucket_name, key } = params;
    
    // Check if we have a binding for this bucket
    if (bucket_name === 'travel-media') {
      // Get the object metadata only (head request)
      const object = await env.TRAVEL_MEDIA_BUCKET.head(key);
      
      if (!object) {
        return {
          success: false,
          error: `Object '${key}' not found in bucket '${bucket_name}'`
        };
      }
      
      return {
        success: true,
        metadata: {
          key,
          size: object.size,
          etag: object.etag,
          httpEtag: object.httpEtag,
          uploaded: object.uploaded,
          httpMetadata: object.httpMetadata,
          customMetadata: object.customMetadata
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
 * Set object metadata
 */
export async function r2_object_metadata_put(
  params: { 
    bucket_name: string; 
    key: string; 
    metadata: {
      contentType?: string;
      contentLanguage?: string;
      contentDisposition?: string;
      contentEncoding?: string;
      cacheControl?: string;
      customMetadata?: Record<string, string>;
    } 
  },
  env: Env
) {
  try {
    const { bucket_name, key, metadata } = params;
    
    // Check if we have a binding for this bucket
    if (bucket_name === 'travel-media') {
      // First, get the existing object
      const existingObject = await env.TRAVEL_MEDIA_BUCKET.get(key);
      
      if (!existingObject) {
        return {
          success: false,
          error: `Object '${key}' not found in bucket '${bucket_name}'`
        };
      }
      
      // Prepare HTTP metadata
      const httpMetadata: R2HTTPMetadata = {
        contentType: metadata.contentType || existingObject.httpMetadata?.contentType,
        contentLanguage: metadata.contentLanguage || existingObject.httpMetadata?.contentLanguage,
        contentDisposition: metadata.contentDisposition || existingObject.httpMetadata?.contentDisposition,
        contentEncoding: metadata.contentEncoding || existingObject.httpMetadata?.contentEncoding,
        cacheControl: metadata.cacheControl || existingObject.httpMetadata?.cacheControl,
      };
      
      // Prepare custom metadata
      const customMetadata = {
        ...(existingObject.customMetadata || {}),
        ...(metadata.customMetadata || {})
      };
      
      // Update the object with new metadata
      await env.TRAVEL_MEDIA_BUCKET.put(key, existingObject.body, {
        httpMetadata,
        customMetadata
      });
      
      return {
        success: true,
        message: `Metadata updated for object '${key}' in bucket '${bucket_name}'`,
        metadata: {
          httpMetadata,
          customMetadata
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
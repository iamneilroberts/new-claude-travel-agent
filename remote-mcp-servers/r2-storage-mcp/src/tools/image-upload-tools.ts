import { Env } from '../r2-context';

/**
 * Uploads a base64-encoded image to R2 storage
 */
export async function r2_upload_image(
  params: { 
    bucket_name: string; 
    key: string; 
    base64_image: string;
    content_type?: string;
    generate_presigned_url?: boolean;
    expires_in?: number;
    metadata?: Record<string, string>;
  },
  env: Env
) {
  try {
    const { 
      bucket_name, 
      key, 
      base64_image,
      content_type,
      generate_presigned_url = false,
      expires_in = 3600, // Default: 1 hour
      metadata = {}
    } = params;
    
    // Validate base64 input
    if (!base64_image || typeof base64_image !== 'string') {
      return {
        success: false,
        error: 'Invalid base64 image data'
      };
    }
    
    // Handle different base64 formats
    let imageData: string = base64_image;
    
    // If the string includes a data URL prefix, extract the base64 part
    if (base64_image.startsWith('data:')) {
      const matches = base64_image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      
      if (!matches || matches.length !== 3) {
        return {
          success: false,
          error: 'Invalid base64 image format'
        };
      }
      
      // Extract the actual base64 data and content type if not provided
      const detectedContentType = matches[1];
      imageData = matches[2];
      
      // Use detected content type if none was explicitly provided
      if (!content_type) {
        content_type = detectedContentType;
      }
    }
    
    // Decode base64 to binary
    let binaryData: ArrayBuffer;
    try {
      binaryData = Uint8Array.from(atob(imageData), c => c.charCodeAt(0)).buffer;
    } catch (e) {
      return {
        success: false,
        error: 'Failed to decode base64 data: ' + (e instanceof Error ? e.message : String(e))
      };
    }
    
    // Check if we have a binding for this bucket
    if (bucket_name === 'travel-media') {
      // Determine content type if still not set
      if (!content_type) {
        // Try to detect from key extension
        if (key.endsWith('.jpg') || key.endsWith('.jpeg')) {
          content_type = 'image/jpeg';
        } else if (key.endsWith('.png')) {
          content_type = 'image/png';
        } else if (key.endsWith('.gif')) {
          content_type = 'image/gif';
        } else if (key.endsWith('.webp')) {
          content_type = 'image/webp';
        } else if (key.endsWith('.svg')) {
          content_type = 'image/svg+xml';
        } else {
          content_type = 'image/jpeg'; // Default content type
        }
      }
      
      // Upload image to R2
      try {
        // Create HTTP metadata
        const httpMetadata: R2HTTPMetadata = {
          contentType: content_type
        };
        
        // Upload the object
        await env.TRAVEL_MEDIA_BUCKET.put(key, binaryData, {
          httpMetadata,
          customMetadata: metadata
        });
        
        // Create result
        const result: any = {
          success: true,
          bucket: bucket_name,
          key: key,
          size: binaryData.byteLength,
          content_type: content_type
        };
        
        // Generate a presigned URL if requested
        if (generate_presigned_url) {
          // Create a presigned URL for the uploaded image
          try {
            const url = await env.TRAVEL_MEDIA_BUCKET.createPresignedUrl(key, {
              expiresIn: expires_in
            });
            
            result.presigned_url = url.toString();
            result.expires_at = new Date(Date.now() + expires_in * 1000).toISOString();
          } catch (err) {
            // If native presigned URL fails, create a proxy URL
            const expiry = Date.now() + expires_in * 1000;
            const hmacKey = env.MCP_AUTH_KEY || 'default-key';
            const token = createSecureToken(bucket_name, key, 'GET', expiry, hmacKey);
            
            // Generate proxy URL
            const host = env.R2_PUBLIC_HOSTNAME || 'r2-storage-mcp.somotravel.workers.dev';
            const publicUrl = `https://${host}/proxy/${bucket_name}/${key}?expires=${expiry}&method=GET&token=${token}`;
            
            result.presigned_url = publicUrl;
            result.expires_at = new Date(expiry).toISOString();
          }
        }
        
        return result;
      } catch (error) {
        return {
          success: false,
          error: `Failed to upload image: ${error instanceof Error ? error.message : String(error)}`
        };
      }
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
 * Create a secure token for the presigned URL
 * This should match the implementation in presigned-url-tools.ts
 */
function createSecureToken(
  bucketName: string,
  key: string,
  method: string,
  expiry: number,
  hmacKey: string
): string {
  // In a real implementation, use crypto.subtle to create an HMAC
  // This is a simplified placeholder that concatenates values and does a basic encoding
  const data = `${bucketName}:${key}:${method}:${expiry}`;
  
  // Create a simple hash of the data with the key
  // Note: In production, use a proper HMAC function
  let hash = 0;
  const combinedStr = data + hmacKey;
  for (let i = 0; i < combinedStr.length; i++) {
    const char = combinedStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to a hex string and return
  return Math.abs(hash).toString(16).padStart(8, '0');
}
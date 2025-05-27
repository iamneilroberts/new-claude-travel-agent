import { Env } from '../r2-context';

/**
 * Generate a presigned URL for temporary access
 */
export async function r2_generate_presigned_url(
  params: { 
    bucket_name: string; 
    key: string; 
    expires_in?: number; 
    method?: 'GET' | 'PUT' | 'DELETE' 
  },
  env: Env
) {
  try {
    const { 
      bucket_name, 
      key, 
      expires_in = 3600, // Default: 1 hour
      method = 'GET'     // Default: GET
    } = params;
    
    // Check if we have a binding for this bucket
    if (bucket_name === 'travel-media') {
      // For GET requests, try to use the native R2 createPresignedUrl
      if (method === 'GET' || method === 'PUT') {
        try {
          // Create a proper presigned URL using the native R2 method first
          const url = await env.TRAVEL_MEDIA_BUCKET.createPresignedUrl(key, {
            expiresIn: expires_in,
            method: method
          });

          return {
            success: true,
            url: url.toString(),
            expiresAt: new Date(Date.now() + expires_in * 1000).toISOString(),
            method
          };
        } catch (err) {
          console.error('Native presigned URL failed, using proxy approach:', err);
          // Fall back to proxy approach if native method fails
        }
      }
      
      // Fall back to creating a proxy URL through our worker
      // Create a secure token that includes necessary info and is signed
      const expiry = Date.now() + expires_in * 1000;
      const hmacKey = env.MCP_AUTH_KEY || 'default-key';  
      const token = createSecureToken(bucket_name, key, method, expiry, hmacKey);
      
      // Generate a URL that points to your worker as a proxy to access the object
      const host = env.R2_PUBLIC_HOSTNAME || 'r2-storage-mcp.somotravel.workers.dev';
      const publicUrl = `https://${host}/proxy/${bucket_name}/${key}?expires=${expiry}&method=${method}&token=${token}`;
      
      return {
        success: true,
        url: publicUrl,
        expiresAt: new Date(expiry).toISOString(),
        method
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
 * Create a secure token for the presigned URL
 * This is a simplified version - in production use a proper crypto library
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
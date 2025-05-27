// Environment interface for the R2 Storage MCP Worker
export interface Env {
  // R2 bucket bindings - add more as needed
  TRAVEL_MEDIA_BUCKET?: R2Bucket;

  // D1 database for gallery and image data
  GALLERY_DB?: D1Database;

  // KV namespace for caching
  CACHE: KVNamespace;

  // OAuth credentials
  CLOUDFLARE_CLIENT_ID: string;
  CLOUDFLARE_CLIENT_SECRET: string;

  // MCP server authentication
  MCP_AUTH_KEY: string;

  // Server metadata
  MCP_SERVER_NAME: string;
  MCP_SERVER_VERSION: string;

  // R2 public hostname for presigned URLs
  R2_PUBLIC_HOSTNAME?: string;

  // Gallery UI hostname
  GALLERY_HOSTNAME?: string;

  // Google Places API key (for image search)
  GOOGLE_PLACES_API_KEY?: string;

  // Optional metrics endpoint
  MCP_METRICS?: string;
}

// R2 bucket details for listing
export type R2BucketDetails = {
  name: string;
  createdAt: Date;
  objects?: number;
  size?: number;
};

// R2 object metadata
export type R2ObjectMetadata = {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
  customMetadata?: Record<string, string>;
};

// Options for presigned URL generation
export type PresignedUrlOptions = {
  bucketName: string;
  key: string;
  expiresIn: number;
  method: 'GET' | 'PUT' | 'DELETE';
};

// Shared state for the MCP session
export type R2MCPState = {
  activeBucket: string | null;
};

// MCP request props from authentication
export interface AuthProps {
  user: {
    id: string;
    email: string;
  };
  accessToken: string;
  scopes: string[];
}

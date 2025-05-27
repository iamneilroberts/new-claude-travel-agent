# Presigned URL Implementation for R2 Storage MCP

This document details the implementation of enhanced presigned URL functionality in the R2 Storage MCP.

## Overview

The presigned URL implementation provides secure, time-limited access to objects stored in R2 buckets without requiring MCP authentication. This allows for direct browser access to stored assets, easy distribution of content, and secure temporary upload capabilities.

## Implementation Details

### 1. Dual-Strategy Approach

The implementation uses a dual-strategy approach:

1. **Native R2 Presigned URLs** - When available, we first try to use Cloudflare's native `createPresignedUrl()` method
2. **Proxy-Based Fallback** - If native URLs aren't available, we generate a custom proxy URL through our worker

This approach ensures maximum compatibility across deployment environments.

### 2. Token-Based Authentication

For the proxy-based approach, we've implemented a secure token authentication system:

- **Token Generation**: Creates a token based on bucket name, key, method, expiry time, and a secret key
- **Token Validation**: Server-side validation of the token with the same algorithm
- **Time-Limited Access**: Every URL has an expiration time after which it becomes invalid
- **Method-Specific URLs**: Different presigned URLs for GET, PUT, and DELETE operations

### 3. Proxy Route Implementation

The `/proxy/:bucket/:key*` route handles all presigned URL requests:

- **Authentication**: Validates the token to ensure the request is legitimate
- **Expiration Check**: Verifies the URL hasn't expired
- **Method Handling**: Supports different HTTP methods:
  - `GET`: Retrieves and returns the object with proper headers
  - `PUT`: Accepts uploaded content and stores it in R2
  - `DELETE`: Removes the specified object

### 4. Security Considerations

- **Expiration Time**: Default expiry is 1 hour, customizable up to a maximum (configured on the server)
- **Token Protection**: Tokens are generated using a simple hash function (in production, should use HMAC)
- **Method Restriction**: URLs are specific to a particular HTTP method (GET/PUT/DELETE)
- **Cross-Origin Support**: Headers configured for proper CORS to allow browser access
- **Cache Control**: Appropriate caching headers to optimize performance

## Configuration Options

Added environment variables to support the implementation:

- **R2_PUBLIC_HOSTNAME**: The public hostname to use for presigned URL generation (defaults to the worker's domain)
- **MCP_AUTH_KEY**: Used in token generation/validation

## Usage Examples

```javascript
// Generate a presigned URL for GET access (1 hour expiry)
const getUrlResult = await callTool('r2_generate_presigned_url', {
  bucket_name: 'travel-media',
  key: 'images/photo.jpg',
  expires_in: 3600,
  method: 'GET'
});

// Generate a presigned URL for PUT (upload) with 5-minute expiry
const putUrlResult = await callTool('r2_generate_presigned_url', {
  bucket_name: 'travel-media',
  key: 'uploads/new-file.txt',
  expires_in: 300,
  method: 'PUT'
});
```

## Testing

A dedicated test script (`test-presigned-url.js`) is provided to test both GET and PUT presigned URL operations in both local and deployed environments:

```bash
# Test locally
./test-presigned-url.js local

# Test against deployed worker
./test-presigned-url.js deployed
```

## Future Improvements

Potential enhancements for the future:

1. **HMAC-Based Tokens**: Replace the simple hash with a cryptographically secure HMAC
2. **Content Type Restriction**: Allow specifying acceptable content types for uploads
3. **Size Limits**: Add maximum file size restrictions for uploads
4. **Access Policies**: More granular control over who can access presigned URLs
5. **Analytics**: Track usage of presigned URLs for monitoring and billing
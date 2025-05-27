# Image Upload Feature for R2 Storage MCP

This document describes the image upload feature implemented for the R2 Storage MCP, allowing Claude Desktop to directly upload images to Cloudflare R2 storage.

## Overview

The image upload feature enhances the R2 Storage MCP with the ability to upload base64-encoded images directly from Claude Desktop. It supports both plain base64 strings and data URLs (`data:image/jpeg;base64,...`), making it versatile for different input formats.

## Usage from Claude Desktop

Claude Desktop can call this tool when users want to upload images:

```typescript
// Example tool call from Claude Desktop
const result = await mcpClient.callTool('r2-storage', 'r2_upload_image', {
  bucket_name: 'travel-media',
  key: 'user-uploads/vacation-photo.jpg',
  base64_image: base64EncodedImage,
  generate_presigned_url: true
});

// Access the uploaded image URL
if (result.success) {
  const imageUrl = result.presigned_url;
  // Use the image URL in a response to the user
}
```

## Tool Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bucket_name` | string | Yes | Name of the R2 bucket to upload to |
| `key` | string | Yes | Destination path/filename in the bucket |
| `base64_image` | string | Yes | Base64-encoded image data (with or without data URL prefix) |
| `content_type` | string | No | MIME type of the image (auto-detected if not provided) |
| `generate_presigned_url` | boolean | No | Whether to return a presigned URL for the uploaded image |
| `expires_in` | number | No | Expiration time for presigned URL in seconds (default: 3600) |
| `metadata` | object | No | Custom metadata to store with the image |

## Example Tool Response

```json
{
  "success": true,
  "bucket": "travel-media",
  "key": "user-uploads/vacation-photo.jpg",
  "size": 24680,
  "content_type": "image/jpeg",
  "presigned_url": "https://r2-storage-mcp.somotravel.workers.dev/proxy/travel-media/user-uploads/vacation-photo.jpg?expires=1620000000&method=GET&token=abc123def",
  "expires_at": "2023-05-03T12:00:00.000Z"
}
```

## Content Type Detection

The tool attempts to detect the content type through several methods:

1. From the `content_type` parameter if provided
2. From the data URL prefix if present (e.g., `data:image/jpeg;base64,`)
3. From the file extension in the `key` parameter (e.g., `.jpg`, `.png`)
4. Defaults to `image/jpeg` if none of the above methods succeed

## Error Handling

Common error scenarios that the tool handles:

- Invalid base64 data format
- Decoding errors
- Missing required parameters
- Bucket access issues
- Storage failures

Each error returns a clear error message to guide the user.

## Testing

A dedicated test script (`test-image-upload.js`) is provided to verify the functionality:

```bash
# Test locally
./test-image-upload.js local /path/to/image.jpg

# Test against deployed worker
./test-image-upload.js deployed /path/to/image.jpg
```

## Implementation Notes

- The tool uses native JavaScript Buffer/ArrayBuffer for efficient binary conversion
- For large images, consider adding size limits to prevent excessive resource usage
- The current implementation relies on token-based authentication for presigned URLs
- In production, implement proper HMAC signing for enhanced security

## Future Enhancements

Possible improvements for future versions:

1. Image resizing/optimization options
2. Multiple image upload in a single request
3. Image conversion between formats
4. Content type validation
5. Folder organization options
6. Image metadata extraction
# R2 Storage MCP (Cloudflare Worker)

This is a Cloudflare Worker that implements the Model Context Protocol (MCP) for Cloudflare R2 storage operations. It provides a direct interface for Claude and other MCP clients to interact with R2 storage using Workers bindings.

## Features

- Complete S3-compatible storage functionality
- Direct binding to R2 buckets in Cloudflare Workers
- Built-in authentication via Cloudflare OAuth 
- Enhanced presigned URL generation for GET, PUT, and DELETE operations
- Secure token-based authentication for presigned URLs
- Proxy route for direct file access with expiry validation
- Efficient file management operations
- JSON-RPC 2.0 implementation of the MCP protocol

## Available Tools

| Category | Tool | Description |
|----------|------|-------------|
| **Buckets** | `r2_buckets_list` | List all R2 buckets in your Cloudflare account |
| | `r2_bucket_create` | Create a new R2 bucket |
| | `r2_bucket_get` | Get details about a specific R2 bucket |
| | `r2_bucket_delete` | Delete an R2 bucket |
| **Objects** | `r2_objects_list` | List objects in a bucket with optional prefix |
| | `r2_object_get` | Get an object from a bucket |
| | `r2_object_put` | Put an object into a bucket |
| | `r2_object_delete` | Delete an object from a bucket |
| | `r2_object_copy` | Copy an object between buckets or within a bucket |
| **Presigned URLs** | `r2_generate_presigned_url` | Generate a presigned URL for temporary access (GET, PUT, DELETE) |
| **Image Upload** | `r2_upload_image` | Upload a base64-encoded image to R2 storage with optional presigned URL generation |
| **Metadata** | `r2_object_metadata_get` | Get object metadata |
| | `r2_object_metadata_put` | Set object metadata |

## Separation of Concerns

This MCP server is focused on R2 storage operations only. It doesn't handle:

- D1 database operations (handled by `d1-database-mcp`)
- General Cloudflare Workers features (handled by other MCPs)

This separation ensures:

1. **Focused functionality**: Each MCP server has a clear, specific purpose
2. **Simplified maintenance**: Changes to one component don't affect others
3. **Independent scaling**: Each service can be scaled based on its specific needs
4. **Clearer security boundaries**: Auth scopes are more specific to actual needs

## Testing

### Local Testing

Test the MCP server locally with:

```bash
# Start the local development server
npm run dev

# In another terminal, run the test script
./test-r2-operations.js local
```

### Deployment Testing

Test the deployed MCP server with:

```bash
# Set your API token
export MCP_AUTH_KEY=your_api_token_here

# Run the test against the deployed worker
./test-r2-operations.js deployed
```

### Comprehensive Testing

The `test-r2-operations.js` script tests all aspects of the R2 Storage MCP:

1. Server initialization
2. Tools availability
3. Bucket operations
4. Object operations (CRUD)
5. Object copying
6. Metadata management
7. Presigned URL generation

For testing presigned URLs specifically, use the dedicated test script:

```bash
# Test presigned URL functionality locally
./test-presigned-url.js local

# Test presigned URL functionality on deployed worker
./test-presigned-url.js deployed
```

This script tests both GET and PUT operations through presigned URLs.

## Setup Instructions

For detailed setup and deployment instructions, see [README-DEPLOYMENT.md](./README-DEPLOYMENT.md).

## Usage with Claude

Once deployed, you can access the R2 MCP Worker from Claude Desktop by adding it to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "r2-storage": {
      "command": "npx",
      "args": ["mcp-remote", "https://r2-storage-mcp.somotravel.workers.dev/sse"]
    }
  }
}
```

Example prompts:
- "List my R2 buckets"
- "Create a new R2 bucket called 'images-bucket'"
- "Upload this file to my R2 bucket"
- "Generate a presigned URL for accessing the logo.png file"
- "List all objects in my 'documents' bucket with the prefix 'reports/'"
- "Upload this image to R2 storage and give me a URL I can share"
- "Store this screenshot in R2 and generate a link that expires in 24 hours"

## License

MIT
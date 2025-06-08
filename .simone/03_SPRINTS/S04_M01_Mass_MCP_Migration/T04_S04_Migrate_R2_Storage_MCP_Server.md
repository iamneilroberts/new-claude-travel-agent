---
task_id: T04_S04
sprint_id: S04
milestone_id: M01
name: Migrate R2 Storage MCP Server
status: pending
priority: high
estimated_hours: 2.5
actual_hours: 0
dependencies: [T03_S04]
---

# T04_S04: Migrate R2 Storage MCP Server

## Objective
Migrate the R2 Storage MCP server from mcp-use proxy pattern to pure MCP JSON-RPC 2.0 implementation, maintaining all 6 image gallery and file storage tools.

## Scope
- Analyze existing R2 Storage MCP implementation
- Create pure MCP JSON-RPC 2.0 server
- Implement all 6 R2 storage tools with proper schemas
- Deploy to Cloudflare Workers with SSE endpoint
- Test image gallery, file operations, and presigned URL generation

## Current Implementation Analysis
**Location**: `/remote-mcp-servers/r2-storage-mcp/`
**Framework**: McpAgent (mcp-use proxy)
**Tools Count**: 6 tools
**Authentication**: Cloudflare R2 credentials from environment

### Existing Tools to Migrate:
1. `upload-image` - Upload images to R2 with metadata
2. `list-images` - List images in gallery with filtering
3. `get-image-metadata` - Retrieve image metadata and details
4. `delete-image` - Delete images from R2 storage
5. `generate-presigned-url` - Generate presigned URLs for uploads
6. `create-image-gallery` - Create organized image galleries

## Technical Requirements
- **Protocol**: Pure MCP JSON-RPC 2.0 over SSE
- **Deployment**: Cloudflare Workers
- **Authentication**: Cloudflare R2 credentials from environment
- **Schema**: Zod schemas converted to JSON Schema
- **Endpoint**: `/sse` for MCP communication
- **Special**: Binary file handling and presigned URL generation

## Implementation Steps

### Phase 1: Analysis (30 min)
- [ ] Examine current McpAgent implementation
- [ ] Catalog all tool schemas and parameters
- [ ] Review R2 API integration patterns
- [ ] Document authentication and binary handling requirements

### Phase 2: Pure MCP Implementation (1.5 hours)
- [ ] Create pure MCP server class structure
- [ ] Implement JSON-RPC 2.0 protocol handlers
- [ ] Convert all 6 tools to pure MCP format
- [ ] Implement Zod to JSON Schema conversion
- [ ] Add SSE endpoint support
- [ ] Handle binary file uploads and presigned URLs

### Phase 3: Deployment (30 min)
- [ ] Configure wrangler.toml for deployment
- [ ] Set up R2 bucket bindings
- [ ] Deploy to Cloudflare Workers
- [ ] Test SSE endpoint connectivity
- [ ] Validate tool discovery response

### Phase 4: Integration Testing (30 min)
- [ ] Update Claude Desktop configuration
- [ ] Test image upload functionality
- [ ] Test image listing and metadata
- [ ] Test presigned URL generation
- [ ] Test gallery creation and organization
- [ ] Validate all 6 tools working correctly

## Migration Template Application
Following the proven D1 pattern:

```typescript
// Pure MCP Server Structure
class R2StorageMCPServer {
  private tools: R2StorageTools;
  
  constructor(env: Env) {
    this.tools = new R2StorageTools(env);
  }
  
  async handleRequest(request: any): Promise<any> {
    // JSON-RPC 2.0 protocol handling
    // Tool discovery and execution
  }
}

// SSE Endpoint with R2 integration
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // SSE endpoint for MCP communication
    // R2 bucket operations
    // Presigned URL generation
  }
}
```

## Expected Deployment URL
`https://pure-r2-storage-mcp.somotravel.workers.dev/sse`

## Claude Desktop Configuration Target
```json
"r2-storage": {
  "command": "npx",
  "args": ["mcp-remote", "https://pure-r2-storage-mcp.somotravel.workers.dev/sse"]
}
```

## Acceptance Criteria
- [ ] All 6 R2 storage tools migrated to pure MCP
- [ ] SSE endpoint responding correctly
- [ ] Tool discovery returns all 6 tools with proper schemas
- [ ] Image upload functionality validated
- [ ] Image listing and metadata retrieval working
- [ ] Presigned URL generation functional
- [ ] Gallery creation and organization working
- [ ] Claude Desktop integration working
- [ ] Performance equivalent or better than mcp-use proxy

## Testing Validation
- Test image upload with metadata
- Test image listing with filters
- Test image metadata retrieval
- Test presigned URL generation and usage
- Test gallery creation and organization
- Verify R2 bucket authentication working
- Confirm integration with Google Places photo workflow

## Special Considerations
- **Binary Handling**: Proper file upload and streaming
- **Presigned URLs**: Secure URL generation with appropriate expiration
- **Metadata**: Proper image metadata storage and retrieval
- **Gallery Organization**: Folder structure and categorization
- **Error Handling**: Proper error responses for upload failures
- **Integration**: Workflow with Google Places for photo downloads

## Wrangler Configuration Requirements
```toml
[[r2_buckets]]
binding = "IMAGE_BUCKET"
bucket_name = "travel-agent-images"
```

## References
- D1 migration success pattern: `/remote-mcp-servers/d1-database_2/src/pure-mcp-index.ts`
- Current implementation: `/remote-mcp-servers/r2-storage-mcp/`
- R2 API documentation and credentials in project .env
- Integration with Google Places photo download workflow
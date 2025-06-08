---
task_id: T03_S04
sprint_id: S04
milestone_id: M01
name: Migrate Google Places API MCP Server
status: pending
priority: high
estimated_hours: 2
actual_hours: 0
dependencies: [T02_S04]
---

# T03_S04: Migrate Google Places API MCP Server

## Objective
Migrate the Google Places API MCP server from mcp-use proxy pattern to pure MCP JSON-RPC 2.0 implementation, maintaining all 3 location services tools.

## Scope
- Analyze existing Google Places MCP implementation
- Create pure MCP JSON-RPC 2.0 server
- Implement all 3 Google Places tools with proper schemas
- Deploy to Cloudflare Workers with SSE endpoint
- Test place search, photo downloads, and place details

## Current Implementation Analysis
**Location**: `/remote-mcp-servers/google-places-api-mcp/`
**Framework**: McpAgent (mcp-use proxy)
**Tools Count**: 3 tools
**Authentication**: Google Places API key from environment

### Existing Tools to Migrate:
1. `search-places` - Place search with text queries and filters
2. `get-place-details` - Detailed place information by place ID
3. `download-place-photos` - Photo downloads from Google Places

## Technical Requirements
- **Protocol**: Pure MCP JSON-RPC 2.0 over SSE
- **Deployment**: Cloudflare Workers
- **Authentication**: Google Places API key from environment
- **Schema**: Zod schemas converted to JSON Schema
- **Endpoint**: `/sse` for MCP communication

## Implementation Steps

### Phase 1: Analysis (20 min)
- [ ] Examine current McpAgent implementation
- [ ] Catalog all tool schemas and parameters
- [ ] Review Google Places API integration patterns
- [ ] Document authentication and photo handling requirements

### Phase 2: Pure MCP Implementation (1.5 hours)
- [ ] Create pure MCP server class structure
- [ ] Implement JSON-RPC 2.0 protocol handlers
- [ ] Convert all 3 tools to pure MCP format
- [ ] Implement Zod to JSON Schema conversion
- [ ] Add SSE endpoint support
- [ ] Handle photo download streaming

### Phase 3: Deployment (20 min)
- [ ] Configure wrangler.toml for deployment
- [ ] Deploy to Cloudflare Workers
- [ ] Test SSE endpoint connectivity
- [ ] Validate tool discovery response

### Phase 4: Integration Testing (20 min)
- [ ] Update Claude Desktop configuration
- [ ] Test place search functionality
- [ ] Test place details retrieval
- [ ] Test photo download capability
- [ ] Validate all 3 tools working correctly

## Migration Template Application
Following the proven D1 pattern:

```typescript
// Pure MCP Server Structure
class GooglePlacesAPIMCPServer {
  private tools: GooglePlacesAPITools;
  
  constructor(env: Env) {
    this.tools = new GooglePlacesAPITools(env);
  }
  
  async handleRequest(request: any): Promise<any> {
    // JSON-RPC 2.0 protocol handling
    // Tool discovery and execution
  }
}

// SSE Endpoint with photo handling
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // SSE endpoint for MCP communication
    // Special handling for photo downloads
  }
}
```

## Expected Deployment URL
`https://pure-google-places-api-mcp.somotravel.workers.dev/sse`

## Claude Desktop Configuration Target
```json
"google-places-api": {
  "command": "npx",
  "args": ["mcp-remote", "https://pure-google-places-api-mcp.somotravel.workers.dev/sse"]
}
```

## Acceptance Criteria
- [ ] All 3 Google Places tools migrated to pure MCP
- [ ] SSE endpoint responding correctly
- [ ] Tool discovery returns all 3 tools with proper schemas
- [ ] Place search functionality validated
- [ ] Place details retrieval working
- [ ] Photo download capability functional
- [ ] Claude Desktop integration working
- [ ] Performance equivalent or better than mcp-use proxy

## Testing Validation
- Test place search for "restaurants in Miami"
- Test place details for a specific place ID
- Test photo download for a place with photos
- Verify API authentication working
- Confirm all tool schemas properly converted
- Test integration with R2 storage for photo workflow

## Special Considerations
- **Photo Downloads**: Ensure proper streaming and file handling
- **API Quotas**: Respect Google Places API rate limits
- **Error Handling**: Proper error responses for invalid place IDs
- **Integration**: Consider workflow with R2 storage for photo management

## References
- D1 migration success pattern: `/remote-mcp-servers/d1-database_2/src/pure-mcp-index.ts`
- Current implementation: `/remote-mcp-servers/google-places-api-mcp/`
- Google Places API documentation and credentials in project .env
- Photo workflow integration with R2 storage MCP
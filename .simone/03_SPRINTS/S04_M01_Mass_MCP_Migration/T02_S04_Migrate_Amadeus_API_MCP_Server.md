---
task_id: T02_S04
sprint_id: S04
milestone_id: M01
name: Migrate Amadeus API MCP Server
status: pending
priority: high
estimated_hours: 3
actual_hours: 0
dependencies: [T01_S04]
---

# T02_S04: Migrate Amadeus API MCP Server

## Objective
Migrate the Amadeus API MCP server from mcp-use proxy pattern to pure MCP JSON-RPC 2.0 implementation, maintaining all 8 travel search tools.

## Scope
- Analyze existing Amadeus MCP implementation
- Create pure MCP JSON-RPC 2.0 server
- Implement all 8 Amadeus tools with proper schemas
- Deploy to Cloudflare Workers with SSE endpoint
- Test flight search, hotel search, and POI functionality

## Current Implementation Analysis
**Location**: `/remote-mcp-servers/amadeus-api-mcp/`
**Framework**: McpAgent (mcp-use proxy)
**Tools Count**: 8 tools
**Authentication**: Amadeus API key from environment

### Existing Tools to Migrate:
1. `search-flights` - Flight search with multiple criteria
2. `search-hotels` - Hotel search by location and dates
3. `search-hotels-by-city` - City-based hotel search
4. `search-poi` - Points of interest search
5. `search-poi-by-coordinates` - POI search by lat/lng
6. `get-travel-recommendations` - Travel recommendations
7. `city-search` - City and airport search
8. `test-connection` - API connectivity test

## Technical Requirements
- **Protocol**: Pure MCP JSON-RPC 2.0 over SSE
- **Deployment**: Cloudflare Workers
- **Authentication**: Amadeus API credentials from environment
- **Schema**: Zod schemas converted to JSON Schema
- **Endpoint**: `/sse` for MCP communication

## Implementation Steps

### Phase 1: Analysis (30 min)
- [ ] Examine current McpAgent implementation
- [ ] Catalog all tool schemas and parameters
- [ ] Review Amadeus API integration patterns
- [ ] Document authentication requirements

### Phase 2: Pure MCP Implementation (2 hours)
- [ ] Create pure MCP server class structure
- [ ] Implement JSON-RPC 2.0 protocol handlers
- [ ] Convert all 8 tools to pure MCP format
- [ ] Implement Zod to JSON Schema conversion
- [ ] Add SSE endpoint support

### Phase 3: Deployment (30 min)
- [ ] Configure wrangler.toml for deployment
- [ ] Deploy to Cloudflare Workers
- [ ] Test SSE endpoint connectivity
- [ ] Validate tool discovery response

### Phase 4: Integration Testing (30 min)
- [ ] Update Claude Desktop configuration
- [ ] Test flight search functionality
- [ ] Test hotel search functionality
- [ ] Test POI and recommendations
- [ ] Validate all 8 tools working

## Migration Template Application
Following the proven D1 pattern:

```typescript
// Pure MCP Server Structure
class AmadeusAPIMCPServer {
  private tools: AmadeusAPITools;
  
  constructor(env: Env) {
    this.tools = new AmadeusAPITools(env);
  }
  
  async handleRequest(request: any): Promise<any> {
    // JSON-RPC 2.0 protocol handling
    // Tool discovery and execution
  }
}

// SSE Endpoint
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // SSE endpoint for MCP communication
  }
}
```

## Expected Deployment URL
`https://pure-amadeus-api-mcp.somotravel.workers.dev/sse`

## Claude Desktop Configuration Target
```json
"amadeus-api": {
  "command": "npx",
  "args": ["mcp-remote", "https://pure-amadeus-api-mcp.somotravel.workers.dev/sse"]
}
```

## Acceptance Criteria
- [ ] All 8 Amadeus tools migrated to pure MCP
- [ ] SSE endpoint responding correctly
- [ ] Tool discovery returns all 8 tools with proper schemas
- [ ] Flight search functionality validated
- [ ] Hotel search functionality validated
- [ ] POI search functionality validated
- [ ] Claude Desktop integration working
- [ ] Performance equivalent or better than mcp-use proxy

## Testing Validation
- Test flight search NYC→LAX
- Test hotel search in Miami
- Test POI search for restaurants in destination
- Test travel recommendations
- Verify API authentication working
- Confirm all tool schemas properly converted

## References
- D1 migration success pattern: `/remote-mcp-servers/d1-database_2/src/pure-mcp-index.ts`
- Current implementation: `/remote-mcp-servers/amadeus-api-mcp/`
- Amadeus API documentation and credentials in project .env
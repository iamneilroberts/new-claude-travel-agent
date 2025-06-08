---
task_id: T05_S04
sprint_id: S04
milestone_id: M01
name: Migrate Template Document MCP Server
status: pending
priority: medium
estimated_hours: 2
actual_hours: 0
dependencies: [T04_S04]
---

# T05_S04: Migrate Template Document MCP Server

## Objective
Migrate the Template Document MCP server from mcp-use proxy pattern to pure MCP JSON-RPC 2.0 implementation, maintaining all 4 travel document generation tools.

## Scope
- Analyze existing Template Document MCP implementation
- Create pure MCP JSON-RPC 2.0 server
- Implement all 4 document generation tools with proper schemas
- Deploy to Cloudflare Workers with SSE endpoint
- Test itinerary, packing list, budget, and checklist generation

## Current Implementation Analysis
**Location**: `/remote-mcp-servers/template-document-mcp/`
**Framework**: McpAgent (mcp-use proxy)
**Tools Count**: 4 tools
**Authentication**: No external APIs (template-based generation)

### Existing Tools to Migrate:
1. `generate-itinerary` - Create detailed travel itineraries
2. `generate-packing-list` - Generate packing lists by destination/activity
3. `generate-travel-budget` - Create budget breakdowns and estimates
4. `generate-travel-checklist` - Generate pre-travel checklists

## Technical Requirements
- **Protocol**: Pure MCP JSON-RPC 2.0 over SSE
- **Deployment**: Cloudflare Workers
- **Authentication**: None required (template-based)
- **Schema**: Zod schemas converted to JSON Schema
- **Endpoint**: `/sse` for MCP communication
- **Templates**: Structured document generation logic

## Implementation Steps

### Phase 1: Analysis (20 min)
- [ ] Examine current McpAgent implementation
- [ ] Catalog all tool schemas and parameters
- [ ] Review document generation templates
- [ ] Document template logic and formatting requirements

### Phase 2: Pure MCP Implementation (1.5 hours)
- [ ] Create pure MCP server class structure
- [ ] Implement JSON-RPC 2.0 protocol handlers
- [ ] Convert all 4 tools to pure MCP format
- [ ] Implement Zod to JSON Schema conversion
- [ ] Add SSE endpoint support
- [ ] Migrate document generation templates

### Phase 3: Deployment (20 min)
- [ ] Configure wrangler.toml for deployment
- [ ] Deploy to Cloudflare Workers
- [ ] Test SSE endpoint connectivity
- [ ] Validate tool discovery response

### Phase 4: Integration Testing (20 min)
- [ ] Update Claude Desktop configuration
- [ ] Test itinerary generation
- [ ] Test packing list generation
- [ ] Test budget calculation
- [ ] Test checklist generation
- [ ] Validate all 4 tools working correctly

## Migration Template Application
Following the proven D1 pattern:

```typescript
// Pure MCP Server Structure
class TemplateDocumentMCPServer {
  private tools: TemplateDocumentTools;
  
  constructor(env: Env) {
    this.tools = new TemplateDocumentTools(env);
  }
  
  async handleRequest(request: any): Promise<any> {
    // JSON-RPC 2.0 protocol handling
    // Tool discovery and execution
  }
}

// SSE Endpoint with template processing
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // SSE endpoint for MCP communication
    // Document template processing
  }
}
```

## Expected Deployment URL
`https://pure-template-document-mcp.somotravel.workers.dev/sse`

## Claude Desktop Configuration Target
```json
"template-document": {
  "command": "npx",
  "args": ["mcp-remote", "https://pure-template-document-mcp.somotravel.workers.dev/sse"]
}
```

## Acceptance Criteria
- [ ] All 4 template document tools migrated to pure MCP
- [ ] SSE endpoint responding correctly
- [ ] Tool discovery returns all 4 tools with proper schemas
- [ ] Itinerary generation functionality validated
- [ ] Packing list generation working
- [ ] Budget calculation functional
- [ ] Checklist generation working
- [ ] Claude Desktop integration working
- [ ] Performance equivalent or better than mcp-use proxy

## Testing Validation
- Test itinerary generation for NYC→LAX trip
- Test packing list for beach vacation
- Test budget calculation for 7-day trip
- Test travel checklist generation
- Verify template formatting and structure
- Confirm document quality and completeness

## Special Considerations
- **Template Quality**: Ensure document templates are comprehensive
- **Formatting**: Maintain proper markdown and structure
- **Customization**: Support for trip-specific customizations
- **Error Handling**: Graceful handling of incomplete input data
- **Integration**: Consider integration with trip data from D1 database

## Document Templates to Migrate
- **Itinerary Template**: Day-by-day activity planning
- **Packing Template**: Destination and activity-based items
- **Budget Template**: Cost categories and estimation logic
- **Checklist Template**: Pre-travel preparation items

## References
- D1 migration success pattern: `/remote-mcp-servers/d1-database_2/src/pure-mcp-index.ts`
- Current implementation: `/remote-mcp-servers/template-document-mcp/`
- Document template examples and formatting standards
- Integration opportunities with D1 database trip data
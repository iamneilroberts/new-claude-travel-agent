---
task_id: T11_S04
sprint_id: S04
name: Refactor Zod Schema Conversion to Direct JSON Schemas
status: in_progress
priority: high
complexity: medium
estimated_effort: 3 hours
actual_effort: 1 hour
assignee: claude-code
dependencies: [T02_S04, T03_S04, T04_S04, T05_S04]
start_date: 2025-06-07
target_completion: 2025-06-07
---

# Task T11_S04: Refactor Zod Schema Conversion to Direct JSON Schemas

## Problem Statement

During the MCP server migration (T02-T05), we discovered that all migrated servers are using a complex and unreliable Zod-to-JSON-Schema conversion pattern that results in empty schemas being returned to Claude Desktop. This breaks tool parameter validation and makes tools appear without proper input specifications.

**Current Issue**: 
- `zodToJsonSchema()` function fails to extract field definitions from Zod internal structure
- Tool schemas appear empty: `{"type":"object","properties":{},"required":[]}`
- Claude Desktop receives incomplete tool specifications
- Parameter validation is broken

**Root Cause**: 
- Zod internal `_def.shape` structure access is unreliable across different contexts
- Complex conversion logic trying to parse Zod internals instead of using direct schemas

## Solution Approach

Replace the complex Zod schema conversion with direct JSON Schema definitions, following the proven pattern from Google Places MCP refactor.

### Before (Problematic Pattern):
```typescript
// Complex Zod definition
const toolSchemas = {
  search_hotels: z.object({
    city: z.string().describe("City name"),
    check_in: z.string().describe("Check-in date")
  })
};

// Unreliable conversion
function zodToJsonSchema(zodSchema) {
  // Complex internal structure parsing...
  const shape = zodSchema._def?.shape; // Often fails
}
```

### After (Simplified Pattern):
```typescript
// Direct JSON Schema definition
const toolSchemas = {
  search_hotels: {
    type: 'object',
    properties: {
      city: {
        type: 'string',
        description: 'City name'
      },
      check_in: {
        type: 'string', 
        description: 'Check-in date'
      }
    },
    required: ['city', 'check_in']
  }
};
```

## Affected Servers

All 4 remaining migrated servers need this refactoring:

1. **amadeus-api-mcp** - 8 tools with complex schemas
2. **d1-database_2** - 7 tools with database operations
3. **r2-storage-mcp** - 6 tools with file operations
4. **template-document-mcp** - 4 tools with document generation

## Implementation Steps

### Phase 1: Schema Conversion (1.5 hours)
- [ ] **T11.1**: Convert amadeus-api-mcp schemas to direct JSON
- [ ] **T11.2**: Convert d1-database_2 schemas to direct JSON
- [ ] **T11.3**: Convert r2-storage-mcp schemas to direct JSON  
- [ ] **T11.4**: Convert template-document-mcp schemas to direct JSON

### Phase 2: Code Cleanup (1 hour)
- [ ] **T11.5**: Remove `zodToJsonSchema()` functions from all servers
- [ ] **T11.6**: Remove Zod imports where no longer needed
- [ ] **T11.7**: Update tools/list handlers to use direct schemas

### Phase 3: Testing & Deployment (0.5 hours)
- [ ] **T11.8**: Deploy all 4 servers with new schemas
- [ ] **T11.9**: Test tool discovery and parameter validation
- [ ] **T11.10**: Verify schemas appear correctly in Claude Desktop

## Benefits

- ✅ **Reliable Schemas**: Direct JSON schemas always work
- ✅ **Simpler Code**: No complex conversion logic
- ✅ **Smaller Bundle**: Reduced Zod dependency
- ✅ **Easier Debugging**: Clear, readable schema definitions
- ✅ **Better Performance**: No conversion overhead
- ✅ **Standards Compliance**: Direct MCP JSON Schema format

## Success Criteria

- [ ] All tool schemas show complete property definitions in tools/list responses
- [ ] Claude Desktop displays proper parameter forms for all tools
- [ ] All 25+ tools across 4 servers have working parameter validation
- [ ] Bundle sizes reduced by removing unnecessary Zod complexity
- [ ] Code is more maintainable and easier to understand

## Risk Assessment

**Low Risk**: This is a proven pattern already working in Google Places MCP.

**Mitigation**: 
- Google Places server serves as reference implementation
- Direct JSON schemas are simpler and more reliable than Zod conversion
- No functionality changes, only schema definition method

## References

- **Working Example**: `google-places-api-mcp/src/pure-mcp-index.ts`
- **MCP Specification**: https://modelcontextprotocol.io/docs/specification/
- **JSON Schema Standard**: https://json-schema.org/

## Notes

This task addresses a critical blocker preventing proper tool parameter validation across all migrated MCP servers. The Google Places refactor proved this approach works perfectly and results in properly formatted schemas that Claude Desktop can use effectively.
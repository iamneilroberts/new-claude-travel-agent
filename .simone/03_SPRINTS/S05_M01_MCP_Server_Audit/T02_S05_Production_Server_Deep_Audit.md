# Task T02_S05: Production Server Deep Audit

## Task Overview
**Sprint**: S05 - MCP Server Audit and Tool Enablement  
**Priority**: High  
**Estimated Effort**: 3-4 hours  
**Status**: Planned  
**Depends On**: T01_S05  

## Objective
Perform detailed diagnostic testing on production-critical MCP servers, focusing on travel agent functionality and identifying root causes of tool disabling issues.

## Scope
Focus on core travel functionality servers:
- amadeus-api-mcp (flight/hotel search)
- google-places-api-mcp (place search, photos)
- d1-database-mcp (client data, activity logs)
- r2-storage-mcp (image gallery, file storage)
- template-document-mcp (travel documents)

## Task Steps

### Phase 1: Server Connectivity Testing (60 min)
1. Test each server startup process independently
2. Verify environment variables and API keys
3. Check server logs for initialization errors
4. Validate MCP protocol handshake completion

### Phase 2: Tool-by-Tool Analysis (120 min)
For each production server:
1. List all available tools via MCP protocol
2. Test individual tool execution with valid parameters
3. Identify which specific tools are disabled and why
4. Check tool schema validation and parameter requirements

### Phase 3: Configuration Deep Dive (60 min)
1. Analyze claude_desktop_config.json server entries
2. Verify executable paths and working directories
3. Check environment variable resolution
4. Validate server command line arguments

### Phase 4: Integration Testing (60 min)
1. Test cross-server tool combinations
2. Verify data flow between servers (e.g., places → R2 storage)
3. Check for server conflicts or resource contention
4. Test travel workflow end-to-end scenarios

## Expected Deliverables
1. **Detailed Server Reports** - Individual analysis for each production server
2. **Tool Enablement Matrix** - Which tools work/fail for each server
3. **Root Cause Analysis** - Specific reasons for tool disabling
4. **Integration Test Results** - Cross-server functionality verification

## Diagnostic Checklist
### Per Server:
- [ ] Server starts without errors
- [ ] MCP handshake completes successfully
- [ ] All tools appear in Claude Desktop
- [ ] Environment variables resolve correctly
- [ ] API credentials are valid and accessible
- [ ] Tool schemas validate properly
- [ ] Sample tool calls execute successfully
- [ ] Error handling works as expected

### Integration Tests:
- [ ] Google Places → R2 Storage photo workflow
- [ ] Amadeus search → D1 Database activity logging
- [ ] Template documents → R2 Storage file operations
- [ ] Multiple servers can run simultaneously

## Tools Required
- Claude Desktop for testing
- Server logs and debugging tools
- Environment variable verification
- MCP protocol testing utilities

## Success Criteria
- [ ] Root causes identified for all tool disabling issues
- [ ] Detailed diagnostic reports for each production server
- [ ] Integration testing completed and documented
- [ ] Actionable fix recommendations provided

## Dependencies
- Completion of T01_S05 baseline assessment
- Access to server source code and configurations
- Valid API credentials for all services
- Working MCP development environment

## Notes
- Focus on production impact and user-facing functionality
- Document exact error conditions and reproduction steps
- Test with realistic travel agent use cases
- Prioritize fixes that restore critical travel tools
---
task_id: T02_S03
sprint_id: S03
milestone_id: M01
name: Configure Claude Desktop with mcp-remote
status: pending
priority: critical
estimated_hours: 2
actual_hours: 0
dependencies: [T01_S03]
---

# T02_S03: Configure Claude Desktop with mcp-remote

## Objective
Configure Claude Desktop to use the pure MCP D1 server via official mcp-remote client, replacing the mcp-use proxy pattern.

## Scope
- Update Claude Desktop configuration
- Replace mcp-use entry with mcp-remote command
- Test connection and tool discovery
- Validate all 8 D1 tools are accessible

## Technical Requirements
- Update ~/.config/Claude/claude_desktop_config.json
- Use npx mcp-remote command with deployed server URL
- Ensure proper authentication if needed
- Validate JSON-RPC 2.0 communication

## Current Configuration
The existing config likely uses mcp-use pattern like:
```json
{
  "mcpServers": {
    "d1-database": {
      "command": "npx",
      "args": ["mcp-use", "http", "--host", "localhost", "--port", "3000"]
    }
  }
}
```

## Target Configuration
New mcp-remote pattern:
```json
{
  "mcpServers": {
    "d1-database": {
      "command": "npx", 
      "args": ["mcp-remote", "https://pure-d1-mcp.somotravel.workers.dev/sse"]
    }
  }
}
```

## Acceptance Criteria
- [ ] Claude Desktop config updated with mcp-remote
- [ ] Server URL pointing to deployed pure MCP server
- [ ] Connection established successfully
- [ ] All 8 D1 tools visible in Claude Desktop
- [ ] Tool calls working correctly

## Validation Steps
1. Update configuration file
2. Restart Claude Desktop
3. Check MCP server status in Claude Desktop
4. Verify tool discovery
5. Test sample tool calls

## Risks and Mitigation
- Risk: Authentication issues → Test with deployed URL
- Risk: Connection timeouts → Validate server stability
- Risk: Tool schema issues → Verify JSON schema conversion
---
task_id: T09_S04
sprint_id: S04
milestone_id: M01
name: Update Claude Desktop Configuration for All Servers
status: pending
priority: high
estimated_hours: 1
actual_hours: 0
dependencies: [T05_S04, T06_S04, T07_S04, T08_S04]
---

# T09_S04: Update Claude Desktop Configuration for All Servers

## Objective
Update Claude Desktop configuration to use mcp-remote for all migrated pure MCP servers, completing the transition from mcp-use proxy pattern to unified pure MCP architecture.

## Scope
- Update ~/.config/Claude/claude_desktop_config.json
- Replace all mcp-use entries with mcp-remote commands
- Validate configuration syntax and structure
- Test Claude Desktop startup and MCP server discovery
- Document the final unified architecture

## Current Configuration Analysis
**File**: `~/.config/Claude/claude_desktop_config.json`
**Pattern**: Mixed mcp-use proxy and mcp-remote (D1 already migrated)

### Servers to Update from mcp-use to mcp-remote:
1. **amadeus-api** → `https://pure-amadeus-api-mcp.somotravel.workers.dev/sse`
2. **google-places-api** → `https://pure-google-places-api-mcp.somotravel.workers.dev/sse`
3. **r2-storage** → `https://pure-r2-storage-mcp.somotravel.workers.dev/sse`
4. **template-document** → `https://pure-template-document-mcp.somotravel.workers.dev/sse`
5. **mobile-interaction** → `https://pure-mobile-interaction-mcp.somotravel.workers.dev/sse`
6. **prompt-instructions** → `https://pure-prompt-instructions-mcp.somotravel.workers.dev/sse`
7. **sequential-thinking** → `https://pure-sequential-thinking-mcp.somotravel.workers.dev/sse`

### Already Migrated (Reference):
- ✅ **d1-database** → `https://pure-d1-mcp.somotravel.workers.dev/sse`

## Configuration Update Steps

### Phase 1: Backup Current Configuration (5 min)
- [ ] Create backup of current claude_desktop_config.json
- [ ] Document current working state
- [ ] Note any custom configurations to preserve

### Phase 2: Update Server Configurations (30 min)
- [ ] Replace amadeus-api mcp-use with mcp-remote
- [ ] Replace google-places-api mcp-use with mcp-remote
- [ ] Replace r2-storage mcp-use with mcp-remote
- [ ] Replace template-document mcp-use with mcp-remote
- [ ] Replace mobile-interaction mcp-use with mcp-remote
- [ ] Replace prompt-instructions mcp-use with mcp-remote
- [ ] Replace sequential-thinking mcp-use with mcp-remote

### Phase 3: Validation (15 min)
- [ ] Validate JSON syntax and structure
- [ ] Check all server URLs are correct
- [ ] Ensure no mcp-use entries remain
- [ ] Verify unified mcp-remote pattern

### Phase 4: Testing (10 min)
- [ ] Restart Claude Desktop application
- [ ] Verify all 8 MCP servers load successfully
- [ ] Test tool discovery for each server
- [ ] Validate end-to-end functionality

## Target Configuration Structure
```json
{
  "mcpServers": {
    "d1-database": {
      "command": "npx",
      "args": ["mcp-remote", "https://pure-d1-mcp.somotravel.workers.dev/sse"]
    },
    "amadeus-api": {
      "command": "npx",
      "args": ["mcp-remote", "https://pure-amadeus-api-mcp.somotravel.workers.dev/sse"]
    },
    "google-places-api": {
      "command": "npx",
      "args": ["mcp-remote", "https://pure-google-places-api-mcp.somotravel.workers.dev/sse"]
    },
    "r2-storage": {
      "command": "npx",
      "args": ["mcp-remote", "https://pure-r2-storage-mcp.somotravel.workers.dev/sse"]
    },
    "template-document": {
      "command": "npx",
      "args": ["mcp-remote", "https://pure-template-document-mcp.somotravel.workers.dev/sse"]
    },
    "mobile-interaction": {
      "command": "npx",
      "args": ["mcp-remote", "https://pure-mobile-interaction-mcp.somotravel.workers.dev/sse"]
    },
    "prompt-instructions": {
      "command": "npx",
      "args": ["mcp-remote", "https://pure-prompt-instructions-mcp.somotravel.workers.dev/sse"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["mcp-remote", "https://pure-sequential-thinking-mcp.somotravel.workers.dev/sse"]
    }
  }
}
```

## Acceptance Criteria
- [ ] All 8 MCP servers using mcp-remote configuration
- [ ] No mcp-use proxy entries remaining
- [ ] Claude Desktop starts successfully with new configuration
- [ ] All servers discovered and loaded
- [ ] Tool discovery working for all 29+ tools
- [ ] End-to-end functionality validated
- [ ] Configuration backup created and documented

## Validation Tests
1. **Server Discovery**: All 8 servers appear in Claude Desktop
2. **Tool Count**: 29+ tools total across all servers
3. **Core Functions**: Flight search, hotel search, database operations
4. **File Operations**: R2 storage and photo downloads
5. **Document Generation**: Templates and travel documents
6. **Communication**: Mobile interaction tools
7. **System Functions**: Prompt instructions and thinking tools

## Expected Benefits After Migration
- **Unified Architecture**: All servers using pure MCP JSON-RPC 2.0
- **Improved Performance**: Direct protocol communication, no proxy overhead
- **Simplified Configuration**: Single pattern for all servers
- **Better Reliability**: Fewer moving parts and dependencies
- **Standards Compliance**: Official MCP protocol across the board

## Rollback Plan
If issues arise:
1. Restore backup configuration
2. Restart Claude Desktop
3. Validate previous working state
4. Debug individual server issues
5. Migrate servers one by one if needed

## References
- D1 migration success as template
- Current working configuration backup
- Pure MCP server deployment URLs
- MCP JSON-RPC 2.0 protocol documentation
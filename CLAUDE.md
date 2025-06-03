# Claude Code Instructions

> This file contains critical instructions for Claude Code. Include the entire contents in responses except for trivial interactions.

## MCP Servers Status ✅ ALL WORKING

### All 8 Servers Successfully Loading (30+ tools total)
**Last Updated**: 2025-06-03 - All servers now using proven McpAgent framework pattern with proper schema handling

### Working Servers
- ✅ **amadeus-api-mcp** - Flight search, hotel search, POI recommendations (8 tools)
- ✅ **google-places-api-mcp** - Place search, photo downloads, details (3 tools)
- ✅ **d1-database** - Client data, activity logging, database operations (4 tools)
- ✅ **r2-storage** - Image gallery, file storage, presigned URLs (6 tools)
- ✅ **template-document** - Itinerary, packing lists, budget documents (4 tools)
- ✅ **mobile-interaction** - WhatsApp, Telegram, SMS integration (4 tools) 
- ✅ **prompt-server** - Dynamic instructions, mode detection (5 tools)
- ✅ **sequential-thinking** - Step-by-step reasoning chains (1 tool)

### Critical Implementation Notes
- **PROVEN PATTERN**: All servers use McpAgent framework (direct implementations FAIL)
- **Environment Access**: Must use `const env = (this as any).env as Env;` pattern
  - ⚠️ **CRITICAL**: Using `this.env` causes timeout failures
  - ✅ **CORRECT**: `const env = (this as any).env as Env;`
  - This pattern is REQUIRED for all McpAgent servers to access Cloudflare Worker environment
- **Schema Handling**: McpAgent framework automatically converts Zod schemas to proper JSON schemas
  - ⚠️ **BROKEN**: Custom SSE implementations serialize Zod objects as `{"_def": {"typeName": "ZodObject"}}` 
  - ✅ **WORKING**: McpAgent converts Zod to valid JSON schema that Claude Desktop can parse
  - Broken schemas cause tools to appear "disabled" in Claude Desktop despite server working
- **SSE Endpoint Testing**: When testing `/sse` endpoints with curl, a "timeout" is EXPECTED behavior
  - ✅ **WORKING**: `curl ... /sse` shows `100 111` (receives bytes) then hangs = successful SSE connection
  - ❌ **BROKEN**: Returns HTML error page or immediate failure
  - SSE connections stay open for streaming, so curl timing out after receiving initial data is normal
- **Compatibility Date**: Use `compatibility_date = "2024-09-23"` for McpAgent servers
- **NO MORE mcp-remote**: System uses mcp-use proxy for all connections
- **Template Updated**: `/doc/MCP_SERVER_TEMPLATE.md` has comprehensive working patterns
- **Ready for Testing**: All servers loading without errors, system ready for end-to-end testing

### ⚠️ CRITICAL WARNING - DO NOT REPEAT THIS MISTAKE
**NEVER replace working McpAgent implementations with custom SSE implementations**

**What happened**: Commits ea927e3 and e41fb57 replaced working McpAgent framework servers with broken custom SSE implementations, causing 60+ second timeouts and complete failures.

**Root cause**: 
- Abandoned proven McpAgent framework for manual JSON-RPC handling
- Lost critical `(this as any).env` environment access pattern
- Custom SSE stream handling causes connection timeouts
- Manual protocol implementation missing async initialization
- **Zod Schema Corruption**: Custom implementations serialize Zod objects incorrectly, causing tools to show as "disabled" in Claude Desktop

**Servers broken by this**: amadeus-api, template-document, r2-storage, prompt-server, sequential-thinking

**Fix**: Revert to commit 8f17c57 (working McpAgent implementations)

**Rule**: If an MCP server is working with McpAgent framework, NEVER convert it to custom implementation. Only add missing method handlers within the existing McpAgent structure.

### Claude Desktop Config
- **Config folder**: `~/.config/Claude/claude_desktop_config.json`
- **Log folder**: `~/.config/Claude/logs`
- **Process Management**: Don't restart claude-desktop when testing. Check for running claude-desktop processes and offer to kill them, then ask the user to start claude-desktop (Careful! Don't kill your own claude code process!)

### Repository Management
- Don't allow embedded git repository. Warn the user and exclude the offending sub-repository

[... rest of the file remains unchanged ...]
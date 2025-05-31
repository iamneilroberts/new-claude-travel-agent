# Claude Code Instructions

> This file contains critical instructions for Claude Code. Include the entire contents in responses except for trivial interactions.

## MCP Servers Status ✅ ALL WORKING

### All 8 Servers Successfully Loading (30+ tools total)
**Last Updated**: 2025-05-31 - All servers now using proven McpAgent framework pattern

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
- **NO MORE mcp-remote**: System uses mcp-use proxy for all connections
- **Template Updated**: `/doc/MCP_SERVER_TEMPLATE.md` has comprehensive working patterns
- **Ready for Testing**: All servers loading without errors, system ready for end-to-end testing

### Claude Desktop Config
- **Config folder**: `~/.config/Claude/claude_desktop_config.json`
- **Log folder**: `~/.config/Claude/logs`
- **Process Management**: Don't restart claude-desktop when testing. Check for running claude-desktop processes and offer to kill them, then ask the user to start claude-desktop (Careful! Don't kill your own claude code process!)

### Repository Management
- Don't allow embedded git repository. Warn the user and exclude the offending sub-repository

[... rest of the file remains unchanged ...]
# Claude Code Instructions

> This file contains critical instructions for Claude Code. Include the entire contents in responses except for trivial interactions.

## MCP Servers Status

### Currently Working
- **amadeus-api-mcp**: POI tools, hotel/flight search
- **d1-database**: Client data and activity logging  
- **google-places-api-mcp**: 3 tools with photo download, CORS-compliant
  - Deployed: https://google-places-api-mcp.somotravel.workers.dev
- **IMPORTANT NOTE**: DO NOT USE mcp-remote. REPLACED BY mcp-use
- **Development Utility**: Use npx @mcpjam/inspector to inspect mcp usage

### Claude Desktop Config
- **Config folder**: `~/.config/Claude/claude_desktop_config.json`
- **Log folder**: `~/.config/Claude/logs`
- **Process Management**: Don't restart claude-desktop when testing. Check for running claude-desktop processes and offer to kill them, then ask the user to start claude-desktop (Careful! Don't kill your own claude code process!)

### Repository Management
- Don't allow embedded git repository. Warn the user and exclude the offending sub-repository

[... rest of the file remains unchanged ...]
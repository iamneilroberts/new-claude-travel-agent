# Claude Code Instructions

> This file contains critical instructions for Claude Code. Include the entire contents in responses except for trivial interactions.

## Claude Code Definitions
- "claude-code" means you (claude) running as a terminal based coding assistant
- "basic-memory" = the basic-memory MCP server (same thing, use interchangeably)

## 🧠 Basic Memory System - CRITICAL FOR ALL SESSIONS!
**MANDATORY: USE THIS MCP TO ACCESS STORED PROJECT KNOWLEDGE**

The **basic-memory MCP server** is your primary knowledge source. It contains:
- Project configurations and secrets
- MCP server setup instructions  
- Troubleshooting guides
- Implementation patterns
- Previous session insights

### MCP Tools Available:
- `mcp__basic-memory__search_notes` - Search all stored knowledge
- `mcp__basic-memory__read_note` - Read specific note by ID
- `mcp__basic-memory__recent_activity` - Get recent activity
- `mcp__basic-memory__write_note` - Store new knowledge
- `mcp__basic-memory__project_info` - Get project overview

### 🚨 CRITICAL WORKFLOW - START EVERY SESSION:
1. **ALWAYS** run `mcp__basic-memory__search_notes` for relevant topics FIRST
2. **NEVER** ask user for project details without checking basic-memory
3. **ALWAYS** consult project `.env` file for real API keys/credentials
4. **NEVER** use mock/placeholder data - use real values from `.env`

### Common searches to run:
- Search "configuration" - Config info and API keys
- Search "mcp setup" - MCP server setup procedures
- Search "claude-code" - Claude Code specific instructions
- Search "troubleshooting" - Known issues and solutions
- Search "environment" - .env file and secrets management

### ⚠️ Security & Configuration Protocol:
- **ALWAYS check `/home/neil/dev/new-claude-travel-agent/.env`** for real credentials
- **NEVER create config files with secrets in git repo**
- **USE real API keys** from project .env, not placeholders
- **ADD sensitive files to .gitignore immediately**

**BASIC-MEMORY IS YOUR KNOWLEDGE BASE - USE IT!**

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
- **🚫 NO MOCK DATA EVER**: NEVER use mock, sample, fake, or test data unless explicitly instructed by user. Mock data wastes development time and provides false test results. All implementations must return real data or clear error messages stating real implementation is needed.

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

### Claude Code vs Claude Desktop Config - CRITICAL DISTINCTION
- **Claude Code MCP Config**: `.claude/settings.local.json` 
- **Claude Desktop MCP Config**: `~/.config/Claude/claude_desktop_config.json`
- **NEVER update Claude Desktop config for Claude Code MCP servers!**
- **Process Management**: Don't restart claude-desktop when testing. Check for running claude-desktop processes and offer to kill them, then ask the user to start claude-desktop (Careful! Don't kill your own claude code process!)

### Additional MCP Servers Available
**Cloudflare MCP Server**
- **Installation**: Globally installed at `/usr/local/lib/node_modules/@cloudflare/mcp-server-cloudflare/`
- **Executable**: `/usr/local/lib/node_modules/@cloudflare/mcp-server-cloudflare/dist/index.js`
- **Account ID**: `5c2997e723bf93da998a627e799cd443`
- **Tools**: KV, R2, D1, Workers, Durable Objects, Queues, Workers AI management
- **Authentication**: Uses existing Wrangler auth

**Browserbase MCP Server**
- **Installation**: Local at `/home/neil/dev/new-claude-travel-agent/mcp-server-browserbase/browserbase/`
- **Executable**: `/home/neil/dev/new-claude-travel-agent/mcp-server-browserbase/browserbase/cli.js`
- **Tools**: Browser automation, web scraping, screenshots, form filling
- **Credentials**: ✅ Added to .env (API key: bb_live_hJLBDt2edGv-ld0eBVNgoNlF-Go, Project ID: c78f3700-e7d7-4792-af8b-271d5b738062)

**MCP Omnisearch Server**
- **Installation**: Local at `/home/neil/dev/new-claude-travel-agent/mcp-omnisearch-claude-code/`
- **Executable**: `/home/neil/dev/new-claude-travel-agent/mcp-omnisearch-claude-code/dist/index.js`
- **Tools**: Tavily, Brave, Kagi search; Perplexity AI; Kagi summarizer & enrichment
- **Credentials**: ✅ All major providers configured from .env

**WhatsApp MCP Server**
- **Installation**: Partial at `/home/neil/dev/new-claude-travel-agent/whatsapp-mcp/`
- **Architecture**: Go bridge + Python MCP server (dual process)
- **Requirements**: Go (needs fixing), UV ✅, QR code authentication
- **Status**: 🟡 Repository cloned, needs dependency completion

Ready servers can be added to `.claude/settings.local.json` when needed.

### Repository Management
- Don't allow embedded git repository. Warn the user and exclude the offending sub-repository
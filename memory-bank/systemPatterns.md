# System Architecture & Patterns

## MCP Server Changes
(Automatically tracked when remote-mcp-servers/ files change)

## Key Architectural Decisions
- Using McpAgent framework for all MCP servers (proven pattern)
- Environment access via `const env = this.env as Env;` pattern
- Zod schema validation for all tool parameters

## Critical Patterns to Remember
- ✅ McpAgent framework - reliable, handles schema conversion
- ❌ Custom SSE implementations - cause timeouts and break schemas
# System Architecture & Patterns

## MCP Server Changes
(Automatically tracked when remote-mcp-servers/ files change)

## Key Architectural Decisions
- Using McpAgent framework for all MCP servers (proven pattern)
- Environment access via `const env = this.env as Env;` pattern
- Zod schema validation for all tool parameters

## Critical Patterns to Remember
- ✅ McpAgent framework - reliable, handles schema conversion
- ❌ Custom SSE implementations - cause timeouts and break schemas**MCP Server Changes Detected** (2025-06-05 07:22)
- Modified: remote-mcp-servers/cpmaxx-integration-mcp/cpmaxx-after-extended-wait.png,remote-mcp-servers/cpmaxx-integration-mcp/cpmaxx-after-initial-wait.png,remote-mcp-servers/cpmaxx-integration-mcp/cpmaxx-after-search-submit.png,remote-mcp-servers/cpmaxx-integration-mcp/cpmaxx-autocomplete.png,remote-mcp-servers/cpmaxx-integration-mcp/cpmaxx-back-to-page-1.png,remote-mcp-servers/cpmaxx-integration-mcp/cpmaxx-before-extraction.png,remote-mcp-servers/cpmaxx-integration-mcp/cpmaxx-error.png,remote-mcp-servers/cpmaxx-integration-mcp/cpmaxx-final-results.png,remote-mcp-servers/cpmaxx-integration-mcp/cpmaxx-no-results.png,remote-mcp-servers/cpmaxx-integration-mcp/cpmaxx-page-2.png,remote-mcp-servers/cpmaxx-integration-mcp/cpmaxx-post-login.png,remote-mcp-servers/cpmaxx-integration-mcp/cpmaxx-search-results.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-17-00-358Z-01-after-navigation-to-login.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-17-02-651Z-02-login-page-loaded.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-17-02-870Z-03-credentials-filled.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-17-03-148Z-04-after-login-click.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-17-06-404Z-05-after-login-wait.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-17-07-008Z-06-dashboard-loaded.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-17-07-506Z-07-before-hotel-link-click.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-17-10-517Z-08-hotel-search-form.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-20-48-624Z-01-after-navigation-to-login.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-20-50-918Z-02-login-page-loaded.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-20-51-127Z-03-credentials-filled.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-20-51-367Z-04-after-login-click.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-20-54-512Z-05-after-login-wait.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-20-55-059Z-06-dashboard-loaded.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-20-55-557Z-07-before-hotel-link-click.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-20-58-516Z-08-hotel-search-form.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-22-07-196Z-01-after-navigation-to-login.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-22-09-457Z-02-login-page-loaded.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-22-09-668Z-03-credentials-filled.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-22-09-889Z-04-after-login-click.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-22-13-057Z-05-after-login-wait.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-22-13-580Z-06-dashboard-loaded.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-22-14-100Z-07-before-hotel-link-click.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-22-17-019Z-08-hotel-search-form.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-22-21-589Z-09-before-search-submit.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-22-21-912Z-10-after-search-submit.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-22-22-354Z-11-error-dialog.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-23-29-094Z-01-after-navigation-to-login.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-23-31-373Z-02-login-page-loaded.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-23-31-677Z-03-credentials-filled.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-23-31-937Z-04-after-login-click.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-23-35-253Z-05-after-login-wait.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-23-35-967Z-06-dashboard-loaded.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-23-36-498Z-07-before-hotel-link-click.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-23-39-550Z-08-hotel-search-form.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-23-47-724Z-09-before-search-submit.png,remote-mcp-servers/cpmaxx-integration-mcp/debug-2025-06-04T19-23-47-988Z-10-after-search-submit.png,remote-mcp-servers/cpmaxx-integration-mcp/selector-discovery-no-results.png,
- Context: refactor: clean up repository and update documentation

- Remove obsolete cpmaxx debugging artifacts (40+ test screenshots)
- Delete deprecated mcp-remote directory
- Update CLAUDE.md with current MCP server status
- Refresh memory-bank documentation with latest progress

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>

**MCP Server Changes Detected** (2025-06-08 12:06)
- Modified: remote-mcp-servers/amadeus-api-mcp/index.ts,remote-mcp-servers/amadeus-api-mcp/tsconfig.json,remote-mcp-servers/prompt-instructions-mcp/src/index.ts,
- Context: feat: major project infrastructure and documentation overhaul

- Add Claude-Simone project management framework with sprint-based planning
- Implement comprehensive memory management system with CLI --quiet flag
- Add quick note shortcuts system (/note, /idea, /decision) for enhanced documentation
- Clean up OAuth MCP server database connection handling
- Update MCP server implementations with pure-MCP patterns
- Establish clear protocols for auto-documentation and session management
- Add project configuration directories (.claude/, .simone/) for better organization

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>


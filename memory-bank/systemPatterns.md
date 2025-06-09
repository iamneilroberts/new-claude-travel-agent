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

**MCP Server Changes Detected** (2025-06-09 10:48)
- Modified: remote-mcp-servers/amadeus-api-mcp/package-lock.json,remote-mcp-servers/amadeus-api-mcp/package.json,remote-mcp-servers/amadeus-api-mcp/src/pure-mcp-index-fixed.ts,remote-mcp-servers/amadeus-api-mcp/src/pure-mcp-index.ts,remote-mcp-servers/amadeus-api-mcp/wrangler.pure-mcp.toml,remote-mcp-servers/amadeus-api-mcp/wrangler.toml,remote-mcp-servers/basic-memory-mcp/src/pure-mcp-index.ts,remote-mcp-servers/basic-memory-mcp/wrangler.minimal.toml,remote-mcp-servers/basic-memory-mcp/wrangler.pure-mcp.toml,remote-mcp-servers/cpmaxx-integration-mcp/src/pure-mcp-index.ts,remote-mcp-servers/cpmaxx-integration-mcp/wrangler.pure-mcp.toml,remote-mcp-servers/d1-database_2/debug-build/pure-mcp-index.js,remote-mcp-servers/d1-database_2/package-lock.json,remote-mcp-servers/d1-database_2/package.json,remote-mcp-servers/d1-database_2/src/pure-mcp-index.ts,remote-mcp-servers/d1-database_2/test-schemas.js,remote-mcp-servers/d1-database_2/tsconfig.json,remote-mcp-servers/d1-database_2/wrangler.pure-mcp.toml,remote-mcp-servers/github-mcp/src/pure-mcp-index.js,remote-mcp-servers/github-mcp/wrangler.pure-mcp.toml,remote-mcp-servers/google-places-api-mcp/src/pure-mcp-index.ts,remote-mcp-servers/google-places-api-mcp/wrangler.pure-mcp.toml,remote-mcp-servers/mcp-remote,remote-mcp-servers/mobile-interaction-mcp/src/pure-mcp-index.ts,remote-mcp-servers/mobile-interaction-mcp/wrangler.minimal.toml,remote-mcp-servers/mobile-interaction-mcp/wrangler.pure-mcp.toml,remote-mcp-servers/prompt-instructions-mcp/knowledge/index.db,remote-mcp-servers/prompt-instructions-mcp/knowledge/s03-testing-and-validation---complete-success.md,remote-mcp-servers/prompt-instructions-mcp/migrations/001_add_chain_execution_and_templates.sql,remote-mcp-servers/prompt-instructions-mcp/package-lock.json,remote-mcp-servers/prompt-instructions-mcp/package.json,remote-mcp-servers/prompt-instructions-mcp/src/chain-executor.ts,remote-mcp-servers/prompt-instructions-mcp/src/pure-mcp-index.ts,remote-mcp-servers/prompt-instructions-mcp/src/template-engine.ts,remote-mcp-servers/prompt-instructions-mcp/src/travel-workflows.ts,remote-mcp-servers/prompt-instructions-mcp/test-deployment.js,remote-mcp-servers/prompt-instructions-mcp/test-simple-validation.js,remote-mcp-servers/prompt-instructions-mcp/test-template-engine.js,remote-mcp-servers/prompt-instructions-mcp/test-travel-workflows.js,remote-mcp-servers/prompt-instructions-mcp/wrangler.pure-mcp.toml,remote-mcp-servers/r2-storage-mcp/src/pure-mcp-index.ts,remote-mcp-servers/r2-storage-mcp/wrangler.pure-mcp.toml,remote-mcp-servers/sequential-thinking-mcp/package-lock.json,remote-mcp-servers/sequential-thinking-mcp/package.json,remote-mcp-servers/sequential-thinking-mcp/src/pure-mcp-index.ts,remote-mcp-servers/sequential-thinking-mcp/wrangler.pure-mcp.toml,remote-mcp-servers/template-document-mcp/src/pure-mcp-index.ts,remote-mcp-servers/template-document-mcp/wrangler.pure-mcp.toml,remote-mcp-servers/travel-document-generator-mcp/src/pure-mcp-index.ts,remote-mcp-servers/travel-document-generator-mcp/wrangler.pure-mcp.toml,
- Context: feat: establish baseline for MCP infrastructure evaluation

## Summary
- Complete Sprint S05 MCP remote evaluation with systematic analysis
- Document current mcp-remote issues and alternative solutions
- Prepare foundation for MetaMCP migration

## Key Changes
- Add comprehensive Sprint S05 documentation in .simone/
- Document DNS resolution issues and 27+ process overhead with mcp-remote
- Create pure MCP implementations for all servers
- Add evaluation infrastructure for mcpo and MetaMCP alternatives
- Update basic-memory knowledge base with troubleshooting insights

## Infrastructure Updates
- All MCP servers now have pure-mcp-index.ts implementations
- Add wrangler.pure-mcp.toml configurations
- Update package.json files for latest MCP SDK compatibility
- Create systematic testing and validation framework

## Documentation
- MCP_TIMEOUT_ANALYSIS_AND_FIX.md: Root cause analysis
- Sprint S05 task documentation with evaluation results
- Basic-memory knowledge entries for future troubleshooting

This commit establishes the baseline before MetaMCP migration testing.

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>


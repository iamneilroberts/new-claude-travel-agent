- Do not modify the ~/.config/Claude/claude_desktop_config file. I will maintain it manually. Make changes to a local claude_desktop_config and inform me

## Remote MCP Server Fix Memory - 2025-05-26
**Critical Learning**: When remote MCP servers fail with HTTP 500/SSE errors, DO NOT modify working servers.

** mcp-use with bridge cliente for all MCP servers **

**If ANY MCP server stops working**:
1. First check: Did I modify wrangler.toml or delete durable objects? 
2. If yes: `git stash` to revert ALL changes
3. Redeploy working servers: `npm run deploy`
4. DO NOT attempt to "fix" servers that are already working

**Successfully Working**: 
- amadeus-api-mcp (with POI tools)
- d1-database 
- google-places-api-mcp (with photo download capabilities)

**Google Places MCP Features**:
- 3 tools: find_place, get_place_details, get_place_photo_url
- CORS-compliant photo downloads with proper headers
- Base64 conversion ready for R2 storage integration
- Deployed at: https://google-places-api-mcp.somotravel.workers.dev

**Do not remove servers with errors without user approval. Try to fix them**

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
ALWAYS commit and push changes to GitHub repo after any major change.
ALWAYS create CHANGELOG.md entries for major changes (never truncate or delete the file, make it an inclusive log until the user specifies to prune or archive).
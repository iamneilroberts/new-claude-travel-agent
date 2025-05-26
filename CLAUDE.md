- Do not modify the ~/.config/Claude/claude_desktop_config file. I will maintain it manually. Make changes to a local claude_desktop_config and inform me

## Amadeus MCP Server - Critical Fix Memory
If Amadeus MCP server hangs during initialization or fails SSE connection:
1. Check wrangler.toml is using `main = "worker-minimal.js"` (NOT worker-simple.js)
2. Ensure durable objects use `new_sqlite_classes = [ "AmadeusMCP" ]` for free plan
3. Deploy with: `cd remote-mcp-servers/amadeus-api-mcp && npm run deploy`
4. See config/AMADEUS_MCP_SUCCESS_SUMMARY.md for complete fix details
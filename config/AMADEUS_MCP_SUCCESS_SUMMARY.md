# Amadeus MCP Server - Success Summary

## Final Working Solution

**Date:** May 26, 2025  
**Status:** ✅ SUCCESS - Both d1-database and amadeus-api MCP servers working in Claude Desktop

## What Finally Worked

### 1. Updated Agents Package (Critical Fix)
- **Problem:** Using agents@0.0.90 which had "Invalid binding" errors with McpAgent framework
- **Solution:** Updated to agents@0.0.93 via `npm install agents@latest`
- **Key Insight:** GitHub issue #294 in cloudflare/agents repo identified this exact problem and fix

### 2. Used McpAgent Framework Instead of Manual SSE
- **Problem:** Manual SSE implementation couldn't complete MCP protocol handshake with mcp-remote
- **Solution:** Switched to `McpAgent.serveSSE("/sse").fetch(request, env, ctx)` pattern
- **Key Insight:** Working d1-database server uses McpAgent, not manual SSE implementation

### 3. Proper Cloudflare Workers Configuration
- **Required:** nodejs_compat compatibility flag
- **Required:** Durable object bindings for McpAgent framework
- **Working Config:**
  ```toml
  main = "worker-minimal.js"
  compatibility_flags = ["nodejs_compat"]
  
  [durable_objects]
  bindings = [
    { class_name = "AmadeusMCP", name = "MCP_OBJECT" }
  ]
  ```

### 4. Simplified Claude Desktop Configuration
- **Removed:** `--debug` and `--transport sse-only` flags
- **Removed:** Unnecessary KV namespace bindings
- **Final config:**
  ```json
  "amadeus-api": {
    "command": "npx",
    "args": [
      "mcp-remote",
      "https://amadeus-api-mcp.somotravel.workers.dev/sse"
    ],
    "env": {
      "MCP_AUTH_TOKEN": "NkYJjz86DTJ8ciEjALmX4OqGrUBsKPsUeATY_0Cu"
    }
  }
  ```

## Final Working Implementation

**File:** `/remote-mcp-servers/amadeus-api-mcp/worker-minimal.js`

```javascript
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export class AmadeusMCP extends McpAgent {
  server = new McpServer({
    name: "Amadeus Travel MCP",
    version: "2.0.0",
  });

  async init() {
    this.server.tool("test_connection", {}, async () => ({
      content: [{ type: "text", text: "Amadeus API connection test successful!" }],
    }));
    
    this.server.tool("search_flights", {
      origin: { type: "string", description: "Departure IATA city/airport code" },
      destination: { type: "string", description: "Arrival IATA city/airport code" },
      date: { type: "string", description: "Departure date in YYYY-MM-DD format" },
    }, async ({ origin, destination, date }) => ({
      content: [{ type: "text", text: `Flight search: ${origin} to ${destination} on ${date}` }],
    }));
  }
}

export default {
  fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return AmadeusMCP.serveSSE("/sse").fetch(request, env, ctx);
    }
    if (url.pathname === "/mcp") {
      return AmadeusMCP.serve("/mcp").fetch(request, env, ctx);
    }
    return new Response("Not found", { status: 404 });
  },
};
```

## Key Failed Approaches

### 1. Manual SSE Implementation (7 Different Attempts)
- **Problem:** Could establish SSE connection but failed MCP handshake
- **Why Failed:** Manual callback URL handling doesn't match mcp-remote's protocol expectations
- **Files Tried:** worker.js, worker-simple.js, worker-deploy.js

### 2. Outdated Agents Package
- **Problem:** agents@0.0.90 had binding validation bugs
- **Error:** "Invalid binding" when trying to use McpAgent framework
- **Fixed By:** agents@0.0.93 (released May 23, 2025)

### 3. Missing Cloudflare Workers Configuration
- **Problem:** TypeScript McpAgent threw runtime exceptions
- **Missing:** nodejs_compat flag and durable object bindings
- **Solution:** Proper wrangler.toml configuration for agents framework

## Success Metrics

### Connection Logs (Working)
```
[232061] Using transport strategy: http-first
[232061] Received error: Error POSTing to endpoint (HTTP 404): Not found
[232061] Recursively reconnecting for reason: falling-back-to-alternate-transport
[232061] Using transport strategy: sse-only
[232061] Connected to remote server using SSEClientTransport
[232061] Local STDIO server running
[232061] Proxy established successfully between local STDIO and remote SSEClientTransport
```

### Claude Desktop Status
- ✅ **d1-database:** 2 tools (add, calculate)
- ✅ **amadeus-api:** 2 tools (test_connection, search_flights)
- ✅ Both servers show "connected successfully" in logs
- ✅ Tools are usable within Claude conversations

## Critical Learning

**The key insight:** The Cloudflare agents framework exists specifically to handle the complex MCP protocol coordination that manual implementations struggle with. When the agents package had binding bugs, manual SSE seemed like the solution, but the real fix was updating the agents package and using the framework as intended.

**GitHub Issue Reference:** https://github.com/cloudflare/agents/issues/294 - Identified exact binding validation fix in agents@0.0.93

## Next Steps for Expansion

1. Add actual Amadeus API integration (currently mock responses)
2. Add more travel tools (search_hotels, book_flight, etc.)
3. Add proper error handling and validation
4. Consider adding authentication for API endpoints

## Files Updated
- `/remote-mcp-servers/amadeus-api-mcp/package.json` - Updated agents to 0.0.93
- `/remote-mcp-servers/amadeus-api-mcp/wrangler.toml` - Added durable objects and nodejs_compat
- `/remote-mcp-servers/amadeus-api-mcp/worker-minimal.js` - Final working implementation
- `~/.config/Claude/claude_desktop_config.json` - Simplified configuration
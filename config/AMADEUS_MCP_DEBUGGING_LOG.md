# Amadeus MCP Server Debugging Log

## Current State
**Status**: Partially working - SSE connection establishes but MCP handshake incomplete  
**Date**: 2025-05-26  
**Worker URL**: https://amadeus-api-mcp.somotravel.workers.dev  
**Current Implementation**: Manual SSE with callback URL support (`worker-simple.js`)

## Problem Description
The Amadeus MCP server connects via SSE but fails to complete the MCP protocol handshake. The d1-database server works perfectly with the same configuration, but amadeus-api hangs after initial connection.

**Logs show**:
```
[210488] Using transport strategy: sse-only
[210488] Using automatically selected callback port: 22469
[210488] [210488] Connecting to remote server: https://amadeus-api-mcp.somotravel.workers.dev/sse
[210488] Using transport strategy: sse-only
```

## Attempted Solutions & Why They Failed

### 1. Initial Manual SSE Implementation
**Path**: `worker-simple.js` with basic SSE handling  
**Status**: ❌ Failed  
**Issue**: Missing bidirectional communication - only sent SSE events but couldn't receive responses from `mcp-remote`  
**Root Cause**: No `/sse/message` endpoint for callback communication

### 2. Added `/sse/message` Endpoint  
**Path**: Enhanced `worker-simple.js` with POST handler  
**Status**: ❌ Failed  
**Issue**: Still hanging after SSE connection  
**Root Cause**: Missing proper callback URL parameter handling

### 3. Callback URL Parameter Extraction
**Path**: Modified SSE handler to extract `?callback=` parameter  
**Status**: ❌ Failed  
**Issue**: Worker received callback URL but didn't use it correctly  
**Root Cause**: `mcp-remote` expects specific callback URL format and usage pattern

### 4. TypeScript + MCP Agent Framework (First Attempt)
**Path**: Converted to TypeScript using `McpAgent` from `agents` package  
**Status**: ❌ Failed  
**Issue**: "Invalid binding" errors  
**Root Cause**: Environment bindings not properly configured for MCP Agent framework

### 5. Fixed Environment Access in MCP Agent
**Path**: Added proper environment variable access patterns  
**Status**: ❌ Failed  
**Issue**: Still "Invalid binding" errors  
**Root Cause**: MCP Agent framework incompatible with Cloudflare Workers environment

### 6. Cloudflare OAuthProvider Approach
**Path**: Attempted to use `@cloudflare/workers-oauth-provider`  
**Status**: ❌ Failed  
**Issue**: Package doesn't exist  
**Root Cause**: Documentation referenced non-existent package

### 7. Manual SSE with Callback URL Forwarding (Current)
**Path**: `worker-simple.js` with callback URL forwarding in `/sse/message`  
**Status**: 🟡 Partial - SSE connects but MCP handshake incomplete  
**Current Issue**: Response routing via callback URL not working as expected

## Technical Analysis

### Working D1 Server Pattern
- Uses `MyMCP.serveSSE("/sse")` from agents framework
- Handles both `/sse` and `/sse/message` automatically
- Proper callback URL coordination built-in

### Current Amadeus Implementation
```javascript
// SSE GET - extracts callback URL
const callbackUrl = url.searchParams.get('callback');

// SSE/message POST - forwards responses to callback
if (callbackUrl) {
  await fetch(callbackUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(response)
  });
}
```

### Identified Gap
The manual callback URL forwarding doesn't match the exact protocol that `mcp-remote` expects. The D1 server's built-in handling likely includes:
- Specific callback URL format validation
- Proper response routing mechanisms
- Session management between SSE and callback endpoints

## Configuration Files

### Working Claude Desktop Config
```json
{
  "mcpServers": {
    "amadeus-api": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://amadeus-api-mcp.somotravel.workers.dev/sse",
        "--debug",
        "--transport",
        "sse-only"
      ],
      "env": {
        "MCP_AUTH_TOKEN": "NkYJjz86DTJ8ciEjALmX4OqGrUBsKPsUeATY_0Cu"
      }
    }
  }
}
```

### Cloudflare Worker Configuration
```toml
name = "amadeus-api-mcp"
main = "worker-simple.js"
compatibility_date = "2025-05-25"

[vars]
MCP_AUTH_KEY = "amadeus-mcp-auth-key-2025"

[[kv_namespaces]]
binding = "CACHE"
id = "5f5697b8ad8b40edb38409bd9500f4ee"
```

### Environment Bindings (Cloudflare Dashboard)
- **Secrets**: `AMADEUS_API_KEY`, `AMADEUS_API_SECRET` 
- **Variables**: `MCP_AUTH_KEY = "amadeus-mcp-auth-key-2025"`
- **KV Namespace**: `CACHE`

## Next Steps

### Option A: Fix Manual Implementation
1. Study exact callback URL protocol from `mcp-remote` source
2. Implement precise callback timing and response format
3. Add proper session management between SSE and callbacks

### Option B: Resolve MCP Agent Framework Issues  
1. Investigate why `agents` package causes "Invalid binding" 
2. Find correct environment binding configuration for Cloudflare Workers
3. Use proper `McpAgent.serveSSE()` like D1 server

### Option C: Alternative Framework
1. Research other MCP server frameworks compatible with Cloudflare Workers
2. Consider using the older working amadeus implementation as reference
3. Implement OAuth-compliant server following Cloudflare's recommended patterns

## Debugging Tools Available
- **mcp-remote debug logs**: `~/.mcp-auth/{hash}_debug.log` (currently empty)
- **Claude Desktop logs**: `~/.config/Claude/logs/`
- **Cloudflare Worker logs**: Real-time via `wrangler tail`
- **Direct API testing**: `curl` commands to test endpoints

## Key Insight
The fundamental issue is that manual SSE implementation requires precise protocol coordination that the MCP Agent framework handles automatically. The "Invalid binding" errors suggest the framework needs specific Cloudflare Workers configuration that we haven't identified yet.
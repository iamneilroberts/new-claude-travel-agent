# Amadeus API MCP Worker - Authentication Update Guide

## Overview
This guide explains how to update the Amadeus API MCP worker to use the same authentication method as the D1 database worker, making the configuration simpler and more consistent.

## Understanding the Authentication
When `mcp-remote` is configured with `MCP_AUTH_TOKEN` in the environment variables, it automatically sends the token as:
```
Authorization: Bearer <your-token>
```

The current Amadeus worker expects OAuth verification for Bearer tokens, which causes the "HTTP 401 trying to load well-known OAuth metadata" error.

## The Fix
The modification allows the worker to accept the MCP_AUTH_KEY directly as a Bearer token without OAuth verification. This matches how the D1 worker handles authentication.

## Deployment Steps

1. **Deploy the updated worker:**
   ```bash
   cd /home/neil/dev/new-claude-travel-agent/remote-mcp-servers/amadeus-api-mcp
   wrangler deploy worker-deploy.js --name amadeus-api-mcp
   ```
   
   Note: `worker-deploy.js` is the clean version without multipart boundaries.

2. **Update your Claude Desktop configuration:**
   ```json
   {
     "mcpServers": {
       "d1-database": {
         "command": "npx",
         "args": [
           "mcp-remote",
           "https://clean-d1-mcp.somotravel.workers.dev/sse"
         ],
         "env": {
           "MCP_AUTH_TOKEN": "NkYJjz86DTJ8ciEjALmX4OqGrUBsKPsUeATY_0Cu"
         }
       },
       "amadeus-api": {
         "command": "npx",
         "args": [
           "mcp-remote",
           "https://amadeus-api-mcp.somotravel.workers.dev/sse"
         ],
         "env": {
           "MCP_AUTH_TOKEN": "amadeus-mcp-auth-key-2025"
         }
       }
     }
   }
   ```

3. **Restart Claude Desktop**

## Testing
Test the connection:
```bash
MCP_AUTH_TOKEN="amadeus-mcp-auth-key-2025" npx mcp-remote https://amadeus-api-mcp.somotravel.workers.dev/sse
```

## Benefits
- Consistent authentication method across all MCP servers
- Simpler configuration (no --header flag needed)
- No OAuth discovery issues
- No space escaping workarounds needed
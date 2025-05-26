# Amadeus API MCP Worker - Authentication Update Guide

## Overview
This guide explains how to update the Amadeus API MCP worker to use the same authentication method as the D1 database worker, making the configuration simpler and more consistent.

## Deployment Status
✅ **Successfully deployed on May 25, 2025**
- Worker Version: 855dafc4-e6b2-4467-8b48-dd2a56ea3c6a
- OAuth metadata endpoint modified to return 404 (forces simple Bearer token auth)
- Environment variables and KV namespace configured

## Understanding the Authentication
When `mcp-remote` is configured with `MCP_AUTH_TOKEN` in the environment variables, it automatically sends the token as:
```
Authorization: Bearer <your-token>
```

The current Amadeus worker expects OAuth verification for Bearer tokens, which causes the "HTTP 401 trying to load well-known OAuth metadata" error.

## The Fix
The modification allows the worker to accept the MCP_AUTH_KEY directly as a Bearer token without OAuth verification. This matches how the D1 worker handles authentication.

## Current Authentication Methods

Both authentication methods are now working:

1. **Using --header flag (original method):**
   ```json
   "amadeus-api": {
     "command": "npx",
     "args": [
       "mcp-remote",
       "https://amadeus-api-mcp.somotravel.workers.dev/sse",
       "--header",
       "Authorization:${AMADEUS_AUTH_HEADER}"
     ],
     "env": {
       "AMADEUS_AUTH_HEADER": "Bearer amadeus-mcp-auth-key-2025"
     }
   }
   ```

2. **Using MCP_AUTH_TOKEN (simplified method - recommended):**
   ```json
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
   ```

## Deployment Steps (Already Completed)

1. **Deploy the updated worker:**
   ```bash
   cd /home/neil/dev/new-claude-travel-agent/remote-mcp-servers/amadeus-api-mcp
   wrangler deploy
   ```
   
   Note: Uses `wrangler.toml` for configuration.

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

## Future Improvements
- **TODO**: Refactor worker to remove unused OAuth infrastructure (currently ~170KB)
- **TODO**: Follow D1 worker's simpler pattern (no OAuth metadata endpoints)
- **TODO**: Reduce file size by removing unnecessary OAuth code
- Current solution works by returning 404 for OAuth metadata, forcing simple auth
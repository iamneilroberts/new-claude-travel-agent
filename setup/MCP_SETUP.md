# MCP Server Setup Guide

## D1 Database MCP Server

Your D1 MCP server is already deployed at: `https://clean-d1-mcp.somotravel.workers.dev/sse`

## Claude Desktop Configuration

The configuration file `claude-desktop-config.json` contains the setup for connecting to your MCP servers through mcp-remote.

### Installation Steps

1. **Copy the configuration to Claude Desktop config directory:**

   **macOS:**
   ```bash
   cp claude-desktop-config.json ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

   **Windows:**
   ```bash
   copy claude-desktop-config.json %APPDATA%\Claude\claude_desktop_config.json
   ```

   **Linux:**
   ```bash
   cp claude-desktop-config.json ~/.config/Claude/claude_desktop_config.json
   ```

2. **Restart Claude Desktop** for the changes to take effect.

3. **Test the connection** by asking Claude to interact with your D1 database.

## Authentication Methods

MCP servers on Cloudflare Workers can use different authentication methods:

### 1. MCP_AUTH_TOKEN (Environment Variable)
Used when the worker expects the token in the `MCP_AUTH_TOKEN` environment variable:
```json
{
  "d1-database": {
    "command": "npx",
    "args": [
      "mcp-remote",
      "https://clean-d1-mcp.somotravel.workers.dev/sse"
    ],
    "env": {
      "MCP_AUTH_TOKEN": "your-auth-token"
    }
  }
}
```

### 2. Bearer Token (Custom Header)
Used when the worker expects a Bearer token in the Authorization header. This bypasses OAuth discovery:
```json
{
  "amadeus-api": {
    "command": "npx",
    "args": [
      "mcp-remote",
      "https://amadeus-api-mcp.somotravel.workers.dev/sse",
      "--header",
      "Authorization:${AMADEUS_AUTH_HEADER}"
    ],
    "env": {
      "AMADEUS_AUTH_HEADER": "Bearer your-auth-token"
    }
  }
}
```

**Important Notes for Bearer Token Authentication:**
- Use `--header` (singular), not `--headers`
- No space after the colon: `Authorization:${VAR}` not `Authorization: ${VAR}`
- Use environment variables to work around space escaping bugs in Claude Desktop/Cursor
- The `--header` flag bypasses OAuth metadata discovery, which is necessary for simple Bearer token auth

## Adding More MCP Servers

To add additional Cloudflare Worker MCP servers, first determine the authentication method your worker uses, then add the appropriate configuration to `claude-desktop-config.json`.

## Troubleshooting

1. **OAuth Discovery Errors**: If you see "HTTP 401 trying to load well-known OAuth metadata":
   - Your worker likely uses simple Bearer token authentication
   - Use the `--header` flag approach described above to bypass OAuth discovery
   - Make sure to include the full Bearer token in the header value

2. **Timeout Issues**: The mcp-remote proxy handles reconnections automatically. If you still experience timeouts, check:
   - Your Cloudflare Worker is responding correctly
   - The API token has proper permissions
   - The worker URL is correct
   - Try using the `/sse` endpoint instead of `/mcp` or vice versa

3. **Testing Connection**: You can test the connection manually:
   
   For MCP_AUTH_TOKEN authentication:
   ```bash
   MCP_AUTH_TOKEN=your-token npx mcp-remote https://your-worker.workers.dev/sse
   ```
   
   For Bearer token authentication:
   ```bash
   npx mcp-remote https://your-worker.workers.dev/sse --header "Authorization:Bearer your-token"
   ```

4. **Logs**: Check Claude Desktop logs for connection issues:
   - macOS: `~/Library/Logs/Claude/`
   - Windows: `%APPDATA%\Claude\logs\`
   - Linux: `~/.config/Claude/logs/`
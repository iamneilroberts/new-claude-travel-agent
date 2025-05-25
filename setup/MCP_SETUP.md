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

## Adding More MCP Servers

To add additional Cloudflare Worker MCP servers, edit `claude-desktop-config.json`:

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
        "MCP_AUTH_TOKEN": "your-cloudflare-api-token"
      }
    },
    "your-new-server": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://your-new-mcp.workers.dev/sse"
      ],
      "env": {
        "MCP_AUTH_TOKEN": "your-cloudflare-api-token"
      }
    }
  }
}
```

## Troubleshooting

1. **Timeout Issues**: The mcp-remote proxy handles reconnections automatically. If you still experience timeouts, check:
   - Your Cloudflare Worker is responding correctly
   - The API token has proper permissions
   - The worker URL is correct

2. **Testing Connection**: You can test the connection manually:
   ```bash
   MCP_AUTH_TOKEN=your-token npx mcp-remote https://your-worker.workers.dev/sse
   ```

3. **Logs**: Check Claude Desktop logs for connection issues:
   - macOS: `~/Library/Logs/Claude/`
   - Windows: `%APPDATA%\Claude\logs\`
   - Linux: `~/.config/Claude/logs/`
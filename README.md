# Claude Travel Agent

A Claude Desktop-based travel agent assistant with Cloudflare Worker MCP (Model Context Protocol) servers for enhanced functionality.

## Overview

This project provides a travel agent assistant powered by Claude Desktop, utilizing remote MCP servers deployed on Cloudflare Workers. The architecture allows for scalable, serverless tools that Claude can access through the MCP protocol.

## Features

- **D1 Database Integration**: Direct access to Cloudflare D1 database through MCP
- **Scalable Architecture**: Easy to add multiple MCP servers
- **Secure Authentication**: API key-based authentication for all MCP servers
- **Local Proxy Support**: Uses `mcp-remote` for reliable connections

## Project Structure

```
new-claude-travel-agent/
├── remote-mcp-servers/     # Cloudflare Worker MCP servers
│   └── d1-mcp-server/      # D1 database MCP server
├── setup/                  # Setup guides and documentation
│   └── MCP_SETUP.md        # Detailed MCP setup instructions
├── cloudflare_developer_reference/  # Cloudflare documentation
├── claude-desktop-config.example.json  # Example config for Claude Desktop
└── README.md              # This file
```

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/new-claude-travel-agent.git
   cd new-claude-travel-agent
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Cloudflare API token
   ```

3. **Configure Claude Desktop**
   ```bash
   # Copy and customize the example config
   cp claude-desktop-config.example.json claude-desktop-config.json
   # Add your API token to the config
   ```

4. **Install Claude Desktop configuration**
   - macOS: `cp claude-desktop-config.json ~/Library/Application\ Support/Claude/claude_desktop_config.json`
   - Windows: `copy claude-desktop-config.json %APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `cp claude-desktop-config.json ~/.config/Claude/claude_desktop_config.json`

5. **Restart Claude Desktop**

## MCP Servers

### D1 Database MCP
- **Endpoint**: `https://clean-d1-mcp.somotravel.workers.dev/sse`
- **Tools**: Query, Execute, List Tables, Describe Table
- **Authentication**: Cloudflare API Token

### Adding New MCP Servers

1. Deploy your MCP server to Cloudflare Workers
2. Add configuration to `claude-desktop-config.json`:
   ```json
   "your-server-name": {
     "command": "npx",
     "args": ["mcp-remote", "https://your-server.workers.dev/sse"],
     "env": {
       "MCP_AUTH_TOKEN": "your-api-token"
     }
   }
   ```

## Development

### Prerequisites
- Node.js 18+
- Cloudflare account
- Claude Desktop app

### Local Development
See [setup/MCP_SETUP.md](setup/MCP_SETUP.md) for detailed development instructions.

## Security

- Never commit API tokens or sensitive data
- Use environment variables for all secrets
- Keep `claude-desktop-config.json` in `.gitignore`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
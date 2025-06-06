# Technical Context & Infrastructure

## Database Schema Evolution
(Automatically tracked when database files change)

## Current Tech Stack
- **MCP Servers**: 8 working (Amadeus, Google Places, D1, R2 Storage, etc.)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 for images/files
- **Framework**: McpAgent for all MCP implementations
- **Environment**: Cloudflare Workers

## Integration Points
- Amadeus API for flight/hotel search
- Google Places API for location data
- WhatsApp/Telegram for client communication
- CPMAXX for hotel booking integration**Database Schema Update** (2025-06-05 13:04)
- feat: implement D1-powered OAuth MCP server for direct Claude Desktop connections

- Convert PostgreSQL-based OAuth server to use Cloudflare D1 database
- Enable direct Claude Desktop → remote MCP server connections via HTTP
- Add OAuth 2.0 authentication with RFC 8252 support (urn:ietf:wg:oauth:2.0:oob)
- Integrate mcp-remote proxy for OAuth client registration and PKCE flow
- Deploy sequential-thinking MCP server with D1 backend at somotravel.workers.dev
- Eliminate need for mcp-use bridge by using Cloudflare boilerplate pattern

This breakthrough enables Claude Desktop to connect directly to remote Cloudflare
Workers MCP servers, providing a scalable foundation for all future MCP deployments.

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>


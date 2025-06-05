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
- CPMAXX for hotel booking integration
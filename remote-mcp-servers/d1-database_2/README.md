# D1 Travel Database MCP Server v2

A Model Context Protocol (MCP) server for managing travel data in Cloudflare D1 database with standard HTTP endpoints.

## Overview

This server provides tools for:
- 🗄️ Managing travel search history  
- 👤 Storing user preferences
- 📊 Analytics on popular routes
- 🔍 Custom database queries
- 📋 Database schema management

## Key Differences from v1

- ✅ **Standard HTTP endpoints**: No 404 workarounds needed
- ✅ **Works with mcp-use**: Direct compatibility with mcp-use library
- ✅ **Proper error handling**: JSON error responses
- ✅ **Health check endpoint**: `/health` for monitoring
- ✅ **Comprehensive travel tools**: 8 database tools for travel data

## Endpoints

- `GET /health` - Health check
- `POST /sse` - Server-Sent Events endpoint for MCP
- `POST /mcp` - Standard MCP protocol endpoint

## Available Tools

### Database Management
- `initialize_travel_schema` - Set up database tables and views
- `get_database_schema` - View current database structure

### Travel Searches  
- `store_travel_search` - Save flight/hotel search details
- `get_search_history` - Retrieve past searches
- `get_popular_routes` - Analyze trending destinations

### User Preferences
- `store_user_preference` - Save user preferences (airlines, seats, etc.)
- `get_user_preferences` - Retrieve user preference profiles

### Advanced
- `execute_query` - Run custom SELECT queries (read-only for security)

## Database Schema

### Tables

**travel_searches**
- `id` - Auto-increment primary key
- `search_type` - flight, hotel, package
- `origin` - Departure location
- `destination` - Arrival location  
- `departure_date` - Travel start date
- `return_date` - Return date (optional)
- `passengers` - Number of travelers
- `budget_limit` - Price ceiling
- `search_parameters` - Full search JSON
- `results_summary` - Search results summary
- `user_id` - User identifier
- `created_at` - Timestamp

**user_preferences**
- `id` - Auto-increment primary key
- `user_id` - User identifier
- `preference_type` - airline, seat_type, meal, etc.
- `preference_value` - Preference details
- `created_at/updated_at` - Timestamps

### Views

**popular_routes**
- Aggregated view of most searched routes
- Shows search count, average budget, last searched

## Deployment

```bash
# Install dependencies
npm install

# Deploy to Cloudflare
npm run deploy
```

## Configuration

The server uses:
- **D1 Database**: `travel-assistant-db` 
- **Durable Objects**: For MCP session management
- **Auth Key**: `d1-travel-auth-2025` (environment variable)

## Usage with mcp-use

```python
config = {
    "mcpServers": {
        "d1_travel": {
            "url": "https://d1-database-2.somotravel.workers.dev/sse"
        }
    }
}

client = MCPClient.from_dict(config)
agent = MCPAgent(llm=llm, client=client)

# Example: Store a flight search
result = await agent.run(
    "Store this flight search: LAX to JFK on 2025-06-15, 2 passengers, $800 budget"
)
```

## Migration from v1

This server replaces the problematic d1-database server that returned 404 for mcp-remote compatibility. The new version:

1. Uses standard HTTP status codes
2. Provides proper JSON error responses  
3. Works directly with mcp-use library
4. Includes comprehensive travel-specific tools
5. Has better error handling and logging

No data migration needed - uses the same D1 database with enhanced schema.
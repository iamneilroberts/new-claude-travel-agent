# D1 Database MCP Server

Enhanced travel management MCP server with comprehensive client, trip, and airport lookup functionality.

## 🚀 Production Deployment

**Live Server**: https://d1-database-pure.somotravel.workers.dev  
**Status**: ✅ Active with 15 functional tools

## 📁 Project Structure

```
src/
├── index.ts              # Main MCP server implementation (15 tools)
├── 
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript configuration
├── wrangler.pure-mcp.toml # Production deployment config
├── test-d1-connection.js # Comprehensive test suite
├── node_modules/         # Dependencies
└── backup_versions/      # Historical versions and artifacts
    ├── README.md         # Backup organization guide
    ├── old_source/       # Previous source implementations
    ├── build_artifacts/  # Compiled outputs
    ├── data_scripts/     # Database seeding scripts
    └── configurations/   # Alternative configs
```

## 🛠️ Available Tools (15 Total)

### Core Travel Management
- `store_travel_search` - Track search history and analytics
- `get_search_history` - Retrieve past searches with filtering
- `get_popular_routes` - Most searched travel routes
- `store_user_preference` / `get_user_preferences` - User travel preferences
- `execute_query` - Custom SQL queries (SELECT only for security)
- `get_database_schema` - Database structure information

### ✈️ Airport & Location Services  
- `airport_city_lookup` - **Critical tool**: Convert city names to IATA codes
  - Example: "Mobile, Alabama" → MOB, "Denver, CO" → DEN
  - Essential for flight API integration

### 👥 Client Management
- `create_client` - Create new travel clients
- `get_client` - Retrieve client details by ID
- `search_clients` - Search clients by name or email

### 🗺️ Trip Management
- `search_trips` - Search trips by name, client, or destination  
- `get_trip` - Detailed trip information with participants
- `get_trip_daily_activities` - Day-by-day trip activities
- `get_upcoming_trips` - Trips starting in next 30 days

## 🗄️ Database Integration

Connects to comprehensive travel database with 46 tables:
- **Clients** (22 existing records)
- **Trips** with full itinerary management
- **TripActivities** - Daily activity tracking  
- **Accommodations** - Hotel/lodging details
- **Transportation** - Flight/travel arrangements
- **TripParticipants** - Multi-traveler support
- **Airports** & **Cities** - Geographic/transportation data

## 🧪 Testing

```bash
# Test server connectivity and all tools
node test-d1-connection.js

# Expected output:
# ✅ Health check passed: healthy
# ✅ MCP response received  
# ✅ Tools list received
# 📊 Found 15 tools available
# 🎉 D1 Database MCP Server is working!
```

## 📡 Claude Desktop Integration

Add to your Claude Desktop config (`~/.claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "d1-travel-database": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-remote",
        "https://d1-database-pure.somotravel.workers.dev/sse"
      ]
    }
  }
}
```

## 🚀 Deployment

```bash
# Deploy to Cloudflare Workers
wrangler deploy --config wrangler.pure-mcp.toml

# Test deployment
curl https://d1-database-pure.somotravel.workers.dev/health
```

## 🔧 Development

```bash
# Install dependencies
npm install

# Local development
wrangler dev --config wrangler.pure-mcp.toml

# Type checking
npx tsc --noEmit
```

## 🔒 Security Features

- Authentication framework with MCP_AUTH_KEY
- SQL injection protection (SELECT-only queries)
- CORS headers for secure browser access
- Comprehensive error handling and logging

## 📝 Recent Enhancements

- **Fixed SSE Handler**: Proper MCP JSON-RPC request processing
- **Added 7 New Tools**: Comprehensive client and trip management
- **Database Integration**: Leverages existing 46-table schema
- **Airport Lookup**: Essential IATA code conversion for APIs
- **Error Handling**: Robust error responses and validation
- **Testing Suite**: Comprehensive tool validation

## 🎯 Mission Critical

This server serves as the backbone of the travel management system, providing:
1. **Client Management** - Travel agent CRM functionality
2. **Trip Planning** - Complete itinerary management  
3. **Airport Lookup** - Bridge between user input and travel APIs
4. **Data Analytics** - Search patterns and popular routes

Essential for connecting human-readable locations ("Mobile, Alabama") to machine-readable codes (MOB) required by travel APIs.
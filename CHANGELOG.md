# Changelog

All notable changes to this project will be documented in this file.

## [2025-05-27] - MCP Server Fixes and Google Places Integration

### Fixed
- **R2 Storage MCP Server** - Fixed initialization timeout by correcting protocol version
  - Changed protocol version from "2025-03-26" to "2024-11-05" for MCP client compatibility
  - Added dummy `MyMCP` class to satisfy wrangler.toml configuration
  - Server now deploys successfully at: `https://r2-storage-mcp.somotravel.workers.dev`
  - Ready for Google Places photo integration workflow

- **GitHub MCP Server** - Fixed initialization timeout by correcting protocol version
  - Changed protocol version from "2025-03-26" to "2024-11-05" for MCP client compatibility
  - Fixed SSE timeout issues during initialization
  - Server now deploys successfully at: `https://github-mcp.somotravel.workers.dev`
  - All 7 GitHub tools are working (create/update files, push files, branch management, commit tracking)

### Added
- **Google Places API MCP Server** - Added to Claude desktop configuration
  - Already deployed and working with 3 tools: `find_place`, `get_place_details`, `get_place_photo_url`
  - Added to both `production_config.json` and `claude_desktop_config_new.json`
  - Complete photo search and download workflow now available
  - Includes Google Places provider in R2 storage for full photo → R2 upload pipeline

### Verified Working
- **D1 Database MCP** - Confirmed working with 18 tools at `clean-d1-mcp.somotravel.workers.dev`
- **Template Document MCP** - Working with 4 tools (schema issues noted but functional)
- **Amadeus API MCP** - Working with 19 tools including POI capabilities

## [2025-05-27] - Amadeus MCP Server POI Tools Fix

### Fixed
- **Amadeus MCP Server** - Fixed missing POI tool imports causing server initialization issues
  - Added missing imports for `getPOIByIdTool`, `searchPOIByCoordinatesTool`, and `searchPOIBySquareTool` 
  - All 19 Amadeus tools now properly registered and available
  - Server successfully redeployed at: `https://amadeus-api-mcp.somotravel.workers.dev`
  - Health endpoint confirms McpAgent framework v2.0.0 operational

### Technical Details
- Root cause: POI tool files existed but were not imported in `tools/index.ts`
- Fixed imports and tool registration in the tools array
- No changes to existing tool functionality or schemas
- Deployment completed successfully with all durable objects intact

## [2025-05-27] - Google Places MCP Server Implementation

### Added
- **Google Places API MCP Server** with complete photo download capabilities
  - `find_place` tool: Search for places by text query using Google Places API v1
  - `get_place_details` tool: Get detailed place information including photos, ratings, contact info
  - `get_place_photo_url` tool: Generate photo URLs with enhanced CORS handling
  - Enhanced photo URL resolution with 302 redirect support and direct Google photo URLs
  - Proper CORS header handling (`User-Agent` and `Referer`) for Google's photo URLs
  - Base64 conversion capabilities ready for R2 storage integration
  - McpAgent framework implementation with durable objects for reliability
  - Comprehensive error handling and fallback mechanisms
  - Successfully deployed at: `https://google-places-api-mcp.somotravel.workers.dev`

### Enhanced
- **Amadeus MCP Server** improvements:
  - Added POI (Points of Interest) tools:
    - `get-poi-by-id`: Get specific POI details by ID
    - `search-poi-by-coordinates`: Search POIs near geographic coordinates  
    - `search-poi-by-square`: Search POIs within a geographic bounding box
  - Enhanced `search_flights` tool with proper Zod schema validation
  - Improved McpAgent compatibility and error handling
  - Fixed parameter passing to tool handlers

### Fixed
- **CORS/Cross-Domain Issues**: Resolved Google Places photo access restrictions
  - Added proper HTTP headers for photo URL requests
  - Implemented 302 redirect handling for actual photo URLs
  - Successfully tested photo downloads from major landmarks (Times Square, Eiffel Tower, Golden Gate Bridge)

### Technical Improvements
- TypeScript implementation with proper type safety across all new tools
- Enhanced async/await patterns for photo URL resolution
- Improved error handling with detailed logging
- Updated McpAgent framework integration patterns
- Added comprehensive test suites for photo download workflow

### Deployment
- Google Places MCP server successfully deployed and tested
- All three tools verified working with real-world locations
- Photo download pipeline tested end-to-end (find → details → photos → download → base64)
- Ready for integration with R2 storage for complete photo management workflow

## Previous Changes
- [2025-05-26] Amadeus MCP server implementations and fixes
- [2025-05-25] Initial MCP server framework setup
- Various D1 database, R2 storage, and other MCP server implementations
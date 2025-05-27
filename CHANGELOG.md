# Changelog

All notable changes to this project will be documented in this file.

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
# CPMaxx Integration MCP Server

A Model Context Protocol (MCP) server that provides browser automation integration with the CPMaxx travel agent portal for hotel search, car rental search, and vacation package coordination.

## Overview

This MCP server leverages browser automation to search the CPMaxx (Apple Vacations) portal and extract structured travel data including hotels, car rentals, and vacation packages. It's designed to integrate with Claude Desktop via the mcp-use bridge for seamless travel planning assistance.

## Features

### 🏨 Hotel Search (`cpmaxx_search_hotels`)
- Search hotels by destination and dates
- Filter by price range and star rating
- Extract pricing, amenities, and availability
- Support for multiple rooms and guests

### 🚗 Car Rental Search (`cpmaxx_search_cars`) 
- Search car rentals by pickup/dropoff location and dates
- Filter by car category (economy, compact, SUV, luxury, etc.)
- Extract pricing, features, and insurance options
- Support for different pickup/dropoff locations

### 🎯 Package Search (`cpmaxx_search_packages`)
- Search complete vacation packages (flight + hotel + car)
- Apple Vacations exclusive deals and pricing
- Compare bundled vs. individual booking savings
- Flexible package component selection

### 💊 Health Check (`cpmaxx_health_check`)
- Server status and tool availability
- Environment configuration verification
- Implementation progress tracking

## Implementation Status

✅ **Completed**
- MCP server framework using proven McpAgent pattern
- Tool definitions with comprehensive Zod schemas
- Cloudflare Worker deployment configuration
- Error handling and logging infrastructure

🚧 **In Progress**
- Browser automation implementation (Playwright/Puppeteer)
- Data extraction and parsing logic
- Session management and rate limiting

📋 **Planned**
- CPMaxx website navigation automation
- Form handling and search execution
- Results parsing and data normalization
- Comprehensive error recovery

## Architecture

### Browser Automation Strategy
- **Playwright**: Primary browser automation framework
- **Session Management**: Persistent login sessions with CPMaxx portal
- **Rate Limiting**: Respectful scraping to avoid blocking
- **Error Recovery**: Robust handling of website changes

### Legacy Code Integration
Based on proven patterns from existing implementations:
- `/claude-travel-chat/hotel-search-mcp.js` - Hotel search automation
- `/claude-travel-chat/browser-automation/cruise-planners/` - Navigation modules
- Form handling, data extraction, and filter management patterns

## Deployment

### Prerequisites
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build
```

### Environment Variables
Set these via `wrangler secret put`:

```bash
wrangler secret put CP_CENTRAL_LOGIN    # CPMaxx login username
wrangler secret put CP_CENTRAL_PASSWORD # CPMaxx login password  
wrangler secret put MCP_AUTH_KEY        # MCP authentication key
```

### Deploy to Cloudflare Workers
```bash
npm run deploy
```

### Local Development
```bash
npm run dev
```

## Integration with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cpmaxx-integration": {
      "command": "node",
      "args": ["/path/to/mcp-use", "http://your-worker-url.workers.dev/sse"],
      "env": {}
    }
  }
}
```

## Usage Examples

### Hotel Search
```typescript
// Search hotels in Cork, Ireland
await cpmaxx_search_hotels({
  location: "Cork, Ireland",
  checkInDate: "05/15/2025", 
  checkOutDate: "05/20/2025",
  rooms: 1,
  adults: 2,
  priceRange: "200-299",
  starRating: 4
});
```

### Car Rental Search
```typescript
// Search car rentals at Cork Airport
await cpmaxx_search_cars({
  pickupLocation: "ORK", // Cork Airport
  pickupDate: "05/15/2025",
  dropoffDate: "05/20/2025", 
  carType: "compact",
  driverAge: 35
});
```

### Package Search
```typescript
// Search vacation packages to Ireland
await cpmaxx_search_packages({
  destination: "Dublin, Ireland",
  departureCity: "New York",
  departureDate: "05/15/2025",
  returnDate: "05/22/2025",
  travelers: 2,
  includeHotel: true,
  includeCar: true,
  budgetRange: "mid-range"
});
```

## Business Value

### Client Benefits
- **Exclusive Deals**: Access to Apple Vacations member pricing
- **Package Savings**: Bundled pricing often beats individual bookings
- **One-Stop Shopping**: Hotels, flights, and cars from single provider
- **Travel Protection**: Comprehensive insurance and support options

### Agency Benefits  
- **Commission Structure**: Apple Vacations agent commission program
- **Competitive Pricing**: Strengthens client relationships
- **Booking Efficiency**: Streamlined reservation process
- **Support Network**: Established vendor relationship

## Technical Implementation

### Browser Automation Modules
- **Navigation**: CPMaxx portal navigation and authentication
- **Form Handling**: Search form completion and submission
- **Data Extraction**: Results parsing and normalization
- **Filter Management**: Price, rating, and amenity filtering

### Data Processing
- **Price Parsing**: Extract and normalize pricing information
- **Availability Processing**: Interpret booking availability and restrictions
- **Package Bundling**: Combine hotel, flight, and car rental options
- **Comparison Logic**: Rank options by value and preferences

## Error Handling

- **Website Changes**: Monitor for CPMaxx structure changes
- **Rate Limiting**: Respectful scraping practices
- **Session Management**: Handle login timeouts and reconnection
- **Data Validation**: Verify extracted data accuracy

## Legal and Compliance

- **Terms of Service**: Ensure compliance with CPMaxx usage terms
- **Rate Limiting**: Respectful scraping practices
- **Data Usage**: Appropriate use of extracted pricing data
- **Attribution**: Proper crediting of CPMaxx as source

## Support

For issues or questions:
1. Check the health check endpoint: `/health`
2. Review server logs in Cloudflare Workers dashboard
3. Verify environment variables are correctly set
4. Test individual tools using the MCP inspector

## License

MIT License - See LICENSE file for details
# Google Places API MCP Server

A Cloudflare Worker MCP server for integrating Google Places API with Claude.

## Overview

This MCP (Model Context Protocol) server provides Claude with access to the Google Places API, allowing it to search for places, retrieve detailed information, and access photos. The implementation uses the official `@googlemaps/places` library for the Places API v1.

## Features

- **find_place**: Search for places based on text queries
- **get_place_details**: Get detailed information about a specific place
- **get_place_photo_url**: Get a direct URL to a place photo

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.dev.vars` file with your Google API key:
   ```
   GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

## Local Development

```bash
npm run dev
```

## Deployment

```bash
npm run deploy
```

## Testing

Several test scripts are included to verify the functionality of the MCP server:

- `test-minimal.cjs`: Tests basic connectivity and field format compatibility
- `test-hotel-photo.cjs`: Tests the photo workflow for hotels
- `test-v1-final.cjs`: Tests the full workflow using Places API v1

To run tests:

```bash
node test-minimal.cjs
node test-hotel-photo.cjs
node test-v1-final.cjs
```

## Environment Variables

- `MCP_AUTH_KEY`: Authentication key for the MCP server (required)
- `GOOGLE_MAPS_API_KEY`: Google Maps API key (required)

## Integration with Claude

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "google-places-api": {
      "command": "npx",
      "args": ["mcp-remote", "https://google-places-api-mcp.somotravel.workers.dev/sse"]
    }
  }
}
```

## License

MIT
# MCP CPMaxx Unified Server

## Overview

The mcp-cpmaxx-unified server is an orchestrated MCP (Model Context Protocol) server that provides travel search capabilities through CPMaxx. It uses a delegation pattern where this server generates Chrome automation instructions that Claude Desktop executes via the mcp-chrome tool.

## Architecture

This server implements an **orchestrated architecture**:
1. **mcp-cpmaxx-unified** generates step-by-step Chrome automation instructions
2. **Claude Desktop** executes these instructions using mcp-chrome
3. **mcp-cpmaxx-unified** processes the resulting HTML to extract travel data

## Supported Providers

- **Delta Vacations** (`delta`) - Flight + hotel packages
- **American Airlines Vacations** (`american`) - Flight + hotel packages  
- **Hotels** (`hotel`) - Hotel-only searches via CPMaxx
- **Car Rentals** (`carrental` or `cpmaxx-car`) - Vehicle searches with autocomplete fix
- **All-Inclusive** (`all-inclusive`) - Resort packages
- **Cruises** (`cruise`) - Cruise searches
- **Tours** (`tour`) - Tour packages

## Tools

### 1. `start_cpmaxx_search`
Initiates a search and returns Chrome automation instructions.

**Parameters:**
- `provider` (required): The travel provider to search
- `origin`: Origin city/airport (for flights)
- `destination`: Destination location
- `departDate`/`checkInDate`/`pickupDate`: Start date
- `returnDate`/`checkOutDate`/`dropoffDate`: End date
- `adults`: Number of adults (default: 2)
- `children`: Number of children (default: 0)
- Additional provider-specific parameters

**Returns:** Search ID and Chrome MCP instructions to execute

### 2. `complete_cpmaxx_search`
Processes the HTML after Chrome automation completes.

**Parameters:**
- `searchId`: The search ID from start_cpmaxx_search
- `html`: The HTML content from chrome_get_web_content
- `error` (optional): Error message if search failed

**Returns:** Parsed search results with prices and availability

### 3. `check_cpmaxx_search_status`
Checks the status of an ongoing search.

**Parameters:**
- `searchId`: The search ID to check

**Returns:** Current search status and results if available

## Example Workflow

1. Start a Delta Vacations search:
```json
{
  "tool": "start_cpmaxx_search",
  "args": {
    "provider": "delta",
    "origin": "ATL",
    "destination": "CUN",
    "departDate": "2025-08-15",
    "returnDate": "2025-08-20",
    "adults": 2
  }
}
```

2. Execute the returned Chrome instructions in order
3. Complete the search with the HTML:
```json
{
  "tool": "complete_cpmaxx_search",
  "args": {
    "searchId": "delta-1234567-abc123",
    "html": "<html>...</html>"
  }
}
```

## Special Features

### Car Rental Autocomplete Fix
The car rental provider includes a special single-script autocomplete fix that:
- Types location character by character
- Triggers proper autocomplete events
- Selects the first dropdown item automatically

### File-Based Storage
Search states and results are stored in `.search-results/` directory for persistence and debugging.

## Recovery Information

This server was restored from the June 28, 2025 session and tagged as `mcp-cpmaxx-unified-restored-v1.0` for easy recovery.

To restore to this point:
```bash
git checkout mcp-cpmaxx-unified-restored-v1.0
```
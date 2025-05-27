# Unified Image Gallery Architecture

This document outlines the architecture for the Unified Image Gallery MCP, designed to provide image selection capabilities for Claude Desktop.

## System Overview

The Unified Image Gallery MCP is a Cloudflare Worker-based service that:

1. Allows Claude to fetch images from various sources
2. Presents these images to users in a web-based gallery
3. Captures user selections
4. Stores selected images in R2 storage
5. Provides Claude with references to selected images

## Architecture Components

```
┌───────────────┐    ┌──────────────────┐    ┌────────────────────┐
│  Claude       │◄───┤ Unified Image    │◄───┤ External Image     │
│  Desktop      │    │ Gallery MCP      │    │ Services (Google)  │
└───────┬───────┘    └────────┬─────────┘    └────────────────────┘
        │                     │
        │                     │
┌───────▼───────┐    ┌────────▼─────────┐    ┌────────────────────┐
│  User         │    │  Image Gallery   │    │ R2 Storage         │
│  (Browser)    │◄───┤  Web Interface   │    │ (Selected Images)  │
└───────────────┘    └────────┬─────────┘    └────────┬───────────┘
                              │                       │
                     ┌────────▼─────────┐             │
                     │  D1 Database     │◄────────────┘
                     │  (Metadata)      │
                     └──────────────────┘
```

## Component Details

### 1. Cloudflare Worker (`unified-image-gallery-worker.js`)
- Implements MCP protocol for Claude
- Serves the gallery web interface
- Handles gallery session management
- Provides API endpoints for the gallery UI
- Manages storage in R2 and D1

### 2. Gallery Web Interface (`gallery-ui/`)
- HTML/CSS/JavaScript for the gallery UI
- Responsive design for all devices
- Selection UI with primary/secondary designation
- Attribution display
- Submission handling

### 3. Database Schema (`schema.sql`)
- Gallery sessions table
- Image selections table
- Entity metadata table
- R2 path mappings table

### 4. Image Providers (`providers/`)
- Google Places provider (`google-places-provider.js`)
- Adapter pattern for future providers
- Cache layer for API results

### 5. R2 Storage Management (`storage/`)
- Image saving module
- Path generation
- Metadata handling
- Presigned URL generation

## Workflow Sequence

### Gallery Creation Flow
1. Claude calls `create_image_gallery` MCP tool
2. Worker fetches images from Google Places API
3. Worker creates gallery session in D1
4. Worker returns gallery URL to Claude
5. Claude provides URL to user
6. User opens URL in browser
7. Gallery UI loads and displays images

### Image Selection Flow
1. User selects images in gallery UI
2. User submits selections
3. Gallery UI sends selections to Worker API
4. Worker stores selected images in R2
5. Worker updates selection records in D1
6. Worker sets gallery status to "completed"

### Selection Retrieval Flow
1. Claude calls `get_selected_images` MCP tool
2. If `wait_for_selection` is true, Worker polls until selection is complete
3. Worker retrieves R2 paths and URLs for selected images
4. Worker returns selection data to Claude
5. Claude updates trip database with selected images

## Database Schema

### Gallery Sessions Table
```sql
CREATE TABLE gallery_sessions (
  id TEXT PRIMARY KEY,
  created_at INTEGER,
  updated_at INTEGER,
  status TEXT,
  query TEXT,
  entity_type TEXT,
  entity_id TEXT,
  entity_name TEXT,
  trip_id TEXT,
  expires_at INTEGER,
  image_count INTEGER
);
```

### Gallery Images Table
```sql
CREATE TABLE gallery_images (
  id TEXT PRIMARY KEY,
  gallery_id TEXT,
  index INTEGER,
  source TEXT,
  source_id TEXT,
  url TEXT,
  thumbnail_url TEXT,
  title TEXT,
  description TEXT,
  attribution TEXT,
  FOREIGN KEY (gallery_id) REFERENCES gallery_sessions(id)
);
```

### Image Selections Table
```sql
CREATE TABLE image_selections (
  id TEXT PRIMARY KEY,
  gallery_id TEXT,
  image_id TEXT,
  is_primary BOOLEAN,
  selected_at INTEGER,
  r2_path TEXT,
  r2_url TEXT,
  FOREIGN KEY (gallery_id) REFERENCES gallery_sessions(id),
  FOREIGN KEY (image_id) REFERENCES gallery_images(id)
);
```

## API Endpoints

### MCP Endpoints
- `POST /mcp` - JSON-RPC 2.0 endpoint for Claude
  - `initialize` - Server info
  - `tools/list` - List available tools
  - `tools/call` - Execute tool

### Gallery UI Endpoints
- `GET /gallery/:id` - Serve gallery UI
- `GET /api/gallery/:id` - Get gallery data
- `POST /api/gallery/:id/selections` - Submit selections

### Asset Endpoints
- `GET /static/*` - Static assets for gallery UI
- `GET /thumbnails/:id` - Cached image thumbnails

## R2 Storage Structure

```
travel-media/
├── galleries/
│   └── {gallery_id}/
│       ├── source/
│       │   ├── {image_id}-1.jpg
│       │   ├── {image_id}-2.jpg
│       │   └── ...
│       └── selected/
│           ├── {image_id}-primary.jpg
│           ├── {image_id}-2.jpg
│           └── ...
└── trips/
    └── {trip_id}/
        ├── hotels/
        │   └── {hotel_id}/
        │       ├── primary.jpg
        │       ├── image-2.jpg
        │       └── ...
        ├── activities/
        │   └── {activity_id}/
        │       ├── primary.jpg
        │       ├── image-2.jpg
        │       └── ...
        └── ...
```

## Security Considerations

### Authentication
- MCP endpoints require authentication token
- Gallery sessions use secure session tokens

### Access Control
- Gallery URLs include expiry times
- Validate gallery ownership

### Data Protection
- No sensitive data in gallery sessions
- Proper CORS configuration for gallery UI

## Implementation Plan

### Phase 1: Core Infrastructure
1. Set up Cloudflare Worker project structure
2. Implement MCP protocol handling
3. Create D1 database schema
4. Set up R2 bucket structure

### Phase 2: Image Provider
1. Implement Google Places provider
2. Add caching layer
3. Image fetch and processing

### Phase 3: Gallery UI
1. Design and implement responsive UI
2. Selection mechanism
3. Submit functionality

### Phase 4: Selection Management
1. Selection storage in R2
2. Metadata management
3. Claude integration

### Phase 5: Testing and Optimization
1. End-to-end testing
2. Performance optimization
3. Documentation
# Unified Image Gallery MCP

This component provides a web-based image gallery and selection interface for Claude Desktop. It allows selecting images for travel entities (hotels, activities, etc.) from multiple sources and storing them in R2 storage.

## Features

- Interactive image selection interface
- Google Places image search
- Primary image designation
- R2 storage integration
- Claude Desktop MCP integration

## MCP Tools

### `create_image_gallery`

Creates a new image gallery session and returns a URL to share with the user.

**Parameters:**
- `query` (string, required): Search query for images (e.g., "Grand Hyatt Singapore exterior")
- `sources` (array, optional): Image sources to search from. Currently supports `googlePlaces`. Default: `["googlePlaces"]`
- `count` (integer, optional): Number of images to display (1-30). Default: 12
- `entity_type` (string, optional): Type of entity (hotel, activity, etc.). Default: "generic"
- `entity_id` (string, optional): ID of the entity in the database
- `entity_name` (string, optional): Name of the entity
- `trip_id` (string, optional): ID of the trip the entity belongs to

**Returns:**
```json
{
  "success": true,
  "galleryId": "gallery_1658341234567_abc123",
  "galleryUrl": "https://r2-storage-mcp.somotravel.workers.dev/gallery/gallery_1658341234567_abc123",
  "query": "Grand Hyatt Singapore",
  "sources": ["googlePlaces"],
  "expiresAt": "2025-05-21T10:00:00Z"
}
```

### `get_selected_images`

Retrieves the images selected by the user, optionally waiting for the selection process to complete.

**Parameters:**
- `galleryId` (string, required): ID of the gallery session
- `waitForSelection` (boolean, optional): Whether to wait for the user to make a selection. Default: true
- `timeoutSeconds` (integer, optional): How long to wait for selection in seconds (10-600). Default: 60

**Returns:**
```json
{
  "success": true,
  "galleryId": "gallery_1658341234567_abc123",
  "selections": [
    {
      "id": "selection_1",
      "is_primary": true,
      "url": "https://r2-storage-mcp.somotravel.workers.dev/proxy/travel-media/hotels/hotel_123/primary.jpg",
      "thumbnail_url": "https://r2-storage-mcp.somotravel.workers.dev/proxy/travel-media/hotels/hotel_123/thumbnails/primary.jpg",
      "title": "Grand Hyatt Singapore - Exterior",
      "attribution": "Google Places"
    },
    {
      "id": "selection_2",
      "is_primary": false,
      "url": "https://r2-storage-mcp.somotravel.workers.dev/proxy/travel-media/hotels/hotel_123/image2.jpg",
      "thumbnail_url": "https://r2-storage-mcp.somotravel.workers.dev/proxy/travel-media/hotels/hotel_123/thumbnails/image2.jpg",
      "title": "Grand Hyatt Singapore - Lobby",
      "attribution": "Google Places"
    }
  ],
  "completed": true
}
```

## Gallery UI

The gallery UI is a web-based interface that allows users to:

1. View images related to their travel entity
2. Select a primary/featured image
3. Select additional supporting images
4. Submit their selections
5. Return to Claude conversation

### User Flow

1. Claude provides the user with a gallery URL
2. User opens the URL in their browser
3. User selects images in the gallery
4. User submits their selections
5. User returns to Claude conversation
6. Claude retrieves the selected images and continues the conversation

## Database Schema

### Gallery Sessions Table
```sql
CREATE TABLE gallery_sessions (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  status TEXT NOT NULL,
  query TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT NOT NULL,
  trip_id TEXT,
  expires_at INTEGER NOT NULL,
  image_count INTEGER NOT NULL DEFAULT 0
);
```

### Gallery Images Table
```sql
CREATE TABLE gallery_images (
  id TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL,
  index INTEGER NOT NULL,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  attribution TEXT,
  FOREIGN KEY (gallery_id) REFERENCES gallery_sessions(id)
);
```

### Image Selections Table
```sql
CREATE TABLE image_selections (
  id TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL,
  image_id TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT 0,
  selected_at INTEGER NOT NULL,
  r2_path TEXT,
  r2_url TEXT,
  FOREIGN KEY (gallery_id) REFERENCES gallery_sessions(id),
  FOREIGN KEY (image_id) REFERENCES gallery_images(id)
);
```

## R2 Storage Structure

```
travel-media/
├── galleries/
│   └── {gallery_id}/
│       ├── source/
│       │   ├── {image_id}-1.jpg
│       │   └── ...
│       └── selected/
│           ├── {image_id}-primary.jpg
│           └── ...
└── trips/
    └── {trip_id}/
        ├── hotels/
        │   └── {hotel_id}/
        │       ├── primary.jpg
        │       └── ...
        ├── activities/
        │   └── {activity_id}/
        │       ├── primary.jpg
        │       └── ...
        └── ...
```

## Setup Instructions

### 1. D1 Database Setup

```bash
# Create a new D1 database (if not already created)
npx wrangler d1 create travel_gallery

# Apply the schema migration
npx wrangler d1 execute travel_gallery --file=migrations/0001_create_gallery_tables.sql
```

### 2. Environment Variables

Set the following secrets:

```bash
# Set Google Places API key
npx wrangler secret put GOOGLE_PLACES_API_KEY

# Set MCP authentication key
npx wrangler secret put MCP_AUTH_KEY
```

### 3. Deployment

```bash
# Deploy to Cloudflare Workers
npm run deploy
```

## Testing

```bash
# Start local development server
npm run dev

# Run test script
node test-gallery-integration.cjs
```

## Integration with Claude Desktop

Update your Claude Desktop configuration to include the Unified Image Gallery MCP:

```json
{
  "mcps": [
    {
      "name": "unified-image-gallery",
      "type": "http",
      "url": "https://r2-storage-mcp.somotravel.workers.dev/mcp",
      "auth": {
        "type": "header",
        "headerName": "X-API-Token",
        "headerValue": "YOUR_MCP_AUTH_KEY"
      }
    }
  ]
}
```

## Usage in Claude Prompts

```
To create an image gallery for a hotel, use the create_image_gallery tool:

Example:
create_image_gallery(
  query="Grand Hyatt Singapore exterior",
  entity_type="hotel",
  entity_id="hotel_123",
  entity_name="Grand Hyatt Singapore"
)

This will return a URL that you can share with the user. After the user selects images,
use get_selected_images to retrieve their selections:

get_selected_images(
  galleryId="gallery_id_from_previous_step",
  waitForSelection=true
)
```
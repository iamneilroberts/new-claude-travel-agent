# Unified Image Gallery MCP Implementation Plan

This document outlines the implementation plan for the Unified Image Gallery MCP, detailing endpoints, tools, and the development roadmap.

## MCP Protocol Implementation

### 1. Core JSON-RPC 2.0 Endpoints

#### `initialize` Method
```json
// Request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "0.1.0"
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "serverInfo": {
      "name": "unified-image-gallery-mcp",
      "version": "1.0.0",
      "vendor": "SomoTravel",
      "capabilities": ["create_image_gallery", "get_selected_images"]
    },
    "protocolVersion": "0.1.0"
  }
}
```

#### `tools/list` Method
```json
// Request
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}

// Response
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "create_image_gallery",
        "description": "Create a gallery for selecting travel images from multiple sources",
        "schema": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "Search query for images (e.g. \"Grand Hyatt Singapore exterior\")"
            },
            "count": {
              "type": "integer",
              "description": "Number of images to display in the gallery (max 30)",
              "default": 12,
              "minimum": 1,
              "maximum": 30
            },
            "sources": {
              "type": "array",
              "description": "Image sources to search (googlePlaces)",
              "items": {
                "type": "string",
                "enum": ["googlePlaces"]
              },
              "default": ["googlePlaces"]
            },
            "entity_type": {
              "type": "string",
              "description": "Type of entity the images represent",
              "enum": ["accommodation", "activity", "destination", "dining", "transportation"]
            },
            "entity_id": {
              "type": "string",
              "description": "Database ID of the entity if available"
            },
            "entity_name": {
              "type": "string",
              "description": "Display name of the entity"
            },
            "trip_id": {
              "type": "string",
              "description": "ID of the associated trip"
            }
          },
          "required": ["query"]
        }
      },
      {
        "name": "get_selected_images",
        "description": "Get the images selected by the user from a gallery, optionally waiting for selection.",
        "schema": {
          "type": "object",
          "properties": {
            "gallery_id": {
              "type": "string",
              "description": "ID of the gallery to get selections from"
            },
            "wait_for_selection": {
              "type": "boolean",
              "description": "Whether to wait for the user to make a selection",
              "default": true
            },
            "timeout_seconds": {
              "type": "integer",
              "description": "How long to wait for selection in seconds (10-600)",
              "default": 60,
              "minimum": 10,
              "maximum": 600
            }
          },
          "required": ["gallery_id"]
        }
      }
    ]
  }
}
```

#### `tools/call` Method (with create_image_gallery)
```json
// Request
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "create_image_gallery",
    "arguments": {
      "query": "The Shelbourne Hotel Dublin",
      "count": 12,
      "sources": ["googlePlaces"],
      "entity_type": "accommodation",
      "entity_id": "shelbourne-dublin",
      "entity_name": "The Shelbourne Hotel",
      "trip_id": "dublin-trip-2025"
    }
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "success": true,
    "gallery_id": "3f0e7dfa-3b4a-4ef2-9d7a-f4bdca94c3a9",
    "url": "https://gallery.somotravel.us/g/3f0e7dfa-3b4a-4ef2-9d7a-f4bdca94c3a9",
    "expires_at": "2025-05-21T15:30:45Z",
    "status": "created",
    "image_count": 12
  }
}
```

#### `tools/call` Method (with get_selected_images)
```json
// Request
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "get_selected_images",
    "arguments": {
      "gallery_id": "3f0e7dfa-3b4a-4ef2-9d7a-f4bdca94c3a9",
      "wait_for_selection": true,
      "timeout_seconds": 120
    }
  }
}

// Response (after user selection)
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "success": true,
    "status": "completed",
    "selection_time": "2025-05-20T14:35:23Z",
    "selected_count": 4,
    "primary_image": {
      "id": "googleplaces_CmRaAAAAiB7rP9RcTyLr",
      "url": "https://media.somotravel.us/trips/dublin-trip-2025/accommodations/shelbourne-dublin/primary.jpg",
      "thumbnail_url": "https://media.somotravel.us/trips/dublin-trip-2025/accommodations/shelbourne-dublin/thumbnails/primary.jpg",
      "title": "The Shelbourne Hotel - Exterior",
      "description": "Front facade of the historic Shelbourne Hotel",
      "attribution": "Photo by Google Maps User",
      "source": "googlePlaces"
    },
    "additional_images": [
      {
        "id": "googleplaces_CmRaAAAAiB7rP9RcTyLs",
        "url": "https://media.somotravel.us/trips/dublin-trip-2025/accommodations/shelbourne-dublin/gallery/1.jpg",
        "thumbnail_url": "https://media.somotravel.us/trips/dublin-trip-2025/accommodations/shelbourne-dublin/thumbnails/1.jpg",
        "title": "The Shelbourne Hotel - Lobby",
        "description": "Elegant lobby with period features",
        "attribution": "Photo by Google Maps User",
        "source": "googlePlaces"
      },
      {
        "id": "googleplaces_CmRaAAAAiB7rP9RcTyLt",
        "url": "https://media.somotravel.us/trips/dublin-trip-2025/accommodations/shelbourne-dublin/gallery/2.jpg",
        "thumbnail_url": "https://media.somotravel.us/trips/dublin-trip-2025/accommodations/shelbourne-dublin/thumbnails/2.jpg",
        "title": "The Shelbourne Hotel - Room",
        "description": "Luxury guest room with city views",
        "attribution": "Photo by Google Maps User",
        "source": "googlePlaces"
      },
      {
        "id": "googleplaces_CmRaAAAAiB7rP9RcTyLu",
        "url": "https://media.somotravel.us/trips/dublin-trip-2025/accommodations/shelbourne-dublin/gallery/3.jpg",
        "thumbnail_url": "https://media.somotravel.us/trips/dublin-trip-2025/accommodations/shelbourne-dublin/thumbnails/3.jpg",
        "title": "The Shelbourne Hotel - Restaurant",
        "description": "Fine dining restaurant at The Shelbourne",
        "attribution": "Photo by Google Maps User",
        "source": "googlePlaces"
      }
    ],
    "entity": {
      "type": "accommodation",
      "id": "shelbourne-dublin",
      "name": "The Shelbourne Hotel"
    },
    "trip_id": "dublin-trip-2025"
  }
}

// Response (if selection timeout)
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "success": false,
    "status": "timeout",
    "message": "User selection timed out after 120 seconds",
    "gallery_id": "3f0e7dfa-3b4a-4ef2-9d7a-f4bdca94c3a9",
    "url": "https://gallery.somotravel.us/g/3f0e7dfa-3b4a-4ef2-9d7a-f4bdca94c3a9"
  }
}
```

### 2. Gallery API Endpoints

#### `GET /gallery/:id`
Serves the gallery web interface for a given gallery ID.

#### `GET /api/gallery/:id`
Returns gallery data for the frontend:
```json
{
  "gallery_id": "3f0e7dfa-3b4a-4ef2-9d7a-f4bdca94c3a9",
  "entity": {
    "type": "accommodation",
    "id": "shelbourne-dublin",
    "name": "The Shelbourne Hotel"
  },
  "images": [
    {
      "id": "googleplaces_CmRaAAAAiB7rP9RcTyLr",
      "thumbnail_url": "/thumbnails/googleplaces_CmRaAAAAiB7rP9RcTyLr.jpg",
      "full_url": "/images/googleplaces_CmRaAAAAiB7rP9RcTyLr.jpg",
      "title": "The Shelbourne Hotel - Exterior",
      "description": "Front facade of the historic Shelbourne Hotel",
      "attribution": "Photo by Google Maps User",
      "source": "googlePlaces"
    },
    // Additional images...
  ]
}
```

#### `POST /api/gallery/:id/selections`
Accepts user selections:
```json
// Request
{
  "primary_image_id": "googleplaces_CmRaAAAAiB7rP9RcTyLr",
  "selected_image_ids": [
    "googleplaces_CmRaAAAAiB7rP9RcTyLs",
    "googleplaces_CmRaAAAAiB7rP9RcTyLt",
    "googleplaces_CmRaAAAAiB7rP9RcTyLu"
  ]
}

// Response
{
  "success": true,
  "message": "Selections saved successfully",
  "gallery_id": "3f0e7dfa-3b4a-4ef2-9d7a-f4bdca94c3a9",
  "selected_count": 4
}
```

## Implementation Roadmap

### Phase 1: Project Setup and Core Infrastructure

#### Week 1: Setup and Basic Structure
1. **Day 1-2: Project Initialization**
   - Create Cloudflare Worker project
   - Set up GitHub repository
   - Configure development environment
   - Set up testing framework

2. **Day 3-4: Core MCP Protocol**
   - Implement `initialize` method
   - Implement `tools/list` method
   - Basic `tools/call` routing
   - Error handling and validation

3. **Day 5: Database Setup**
   - Create D1 database instance
   - Implement schema
   - Basic CRUD operations
   - Database connection handling

#### Week 2: Image Provider and Gallery Backend

1. **Day 1-2: Google Places Integration**
   - Implement Google Places API client
   - Image search functionality
   - Result parsing and normalization
   - Error handling and rate limiting

2. **Day 3-4: Gallery Session Management**
   - Create gallery sessions
   - Session storage in D1
   - Session lifecycle management
   - Authentication and security

3. **Day 5: R2 Storage Integration**
   - Set up R2 bucket
   - Implement storage structure
   - Basic image upload/download
   - Presigned URL generation

### Phase 2: Frontend and Integration

#### Week 3: Gallery UI Implementation

1. **Day 1-2: Basic Gallery UI**
   - HTML/CSS structure
   - Responsive grid layout
   - Image loading and display
   - Basic interaction

2. **Day 3-4: Selection Functionality**
   - Image selection UI
   - Primary image designation
   - Selection state management
   - Modal for larger view

3. **Day 5: Form Submission**
   - Submit functionality
   - Validation
   - Success/error handling
   - Return to conversation

#### Week 4: MCP Tools and Integration

1. **Day 1-2: create_image_gallery Tool**
   - Complete implementation
   - Validation and error handling
   - Integration with Google Places
   - Database integration

2. **Day 3-4: get_selected_images Tool**
   - Implement selection retrieval
   - Waiting mechanism
   - Timeout handling
   - Result formatting

3. **Day 5: Claude Integration**
   - Test with Claude Desktop
   - Debugging and refinement
   - Documentation
   - Example prompts

### Phase 3: Testing, Optimization, and Deployment

#### Week 5: Testing and Refinement

1. **Day 1-2: Unit and Integration Testing**
   - Write comprehensive tests
   - Test edge cases
   - Performance testing
   - Security testing

2. **Day 3-4: Optimization**
   - Performance optimization
   - Caching implementation
   - Resource usage optimization
   - Error handling refinement

3. **Day 5: Documentation**
   - API documentation
   - Usage examples
   - Deployment guide
   - Maintenance instructions

#### Week 6: Deployment and Monitoring

1. **Day 1-2: Staging Deployment**
   - Deploy to staging environment
   - Integration testing
   - Fix any discovered issues
   - Performance monitoring

2. **Day 3-4: Production Deployment**
   - Deploy to production
   - Monitoring setup
   - Alerting configuration
   - Initial load testing

3. **Day 5: Handoff and Training**
   - Team training
   - Documentation review
   - Support procedure setup
   - Future development planning

## Implementation Details

### Cloudflare Worker Structure

```
src/
├── index.ts                # Entry point
├── protocol.ts             # MCP protocol handling
├── auth.ts                 # Authentication
├── gallery/
│   ├── galleryManager.ts   # Gallery session management
│   ├── selectionManager.ts # Selection handling
│   └── galleryServer.ts    # Gallery web server
├── providers/
│   ├── providerManager.ts  # Provider orchestration
│   ├── googlePlaces.ts     # Google Places provider
│   └── types.ts            # Common provider types
├── storage/
│   ├── r2Manager.ts        # R2 storage operations
│   ├── cacheManager.ts     # Caching layer
│   └── paths.ts            # Path generation utilities
├── database/
│   ├── d1Manager.ts        # D1 database operations
│   ├── schema.ts           # Schema definitions
│   └── migrations.ts       # Database migrations
├── tools/
│   ├── index.ts            # Tool registration
│   ├── createGallery.ts    # create_image_gallery implementation
│   └── getSelections.ts    # get_selected_images implementation
└── utils/
    ├── logging.ts          # Logging utilities
    ├── errors.ts           # Error handling
    └── validation.ts       # Input validation
```

### Key Dependencies

1. **Cloudflare D1**: For database storage
2. **Cloudflare R2**: For image storage
3. **Hono**: Lightweight web framework
4. **JSON Schema Validator**: For MCP schema validation
5. **Sharp** (if compatible with Cloudflare Workers): For image processing
6. **UUID**: For gallery ID generation

## Testing Strategy

### Unit Testing

- **Protocol Tests**: Verify MCP protocol compliance
- **Tool Tests**: Test each MCP tool with various inputs
- **Gallery Logic Tests**: Test gallery session management
- **Storage Tests**: Verify R2 operations
- **Provider Tests**: Test image source providers

### Integration Testing

- **End-to-end Workflow**: From gallery creation to selection retrieval
- **Cloud Integration**: Test with actual Cloudflare services
- **Claude Integration**: Test with Claude Desktop

### Performance Testing

- **Load Testing**: Simulate multiple concurrent users
- **R2 Performance**: Measure storage operation speed
- **API Response Times**: Ensure quick response times

## Monitoring and Operations

### Metrics to Track

- Gallery creation count
- Selection completion rate
- Image count per gallery
- API response times
- R2 storage usage
- Error rates by endpoint

### Alerting Conditions

- High error rate
- Slow response times
- Low completion rate
- Storage quota nearing limits
- API quota approaching limits

## Security Considerations

### Authentication

- MCP endpoints require API key
- Gallery sessions use secure tokens
- R2 access controlled via presigned URLs

### Data Protection

- No sensitive data stored
- Minimal necessary permissions
- Secure defaults for all features

### Rate Limiting

- Limit gallery creation rate
- Implement backoff for API requests
- Protect against abuse

## Future Enhancements

### Phase 4: Additional Features

1. **Additional Image Sources**
   - Unsplash integration
   - Pexels integration
   - Custom image upload

2. **Advanced Image Processing**
   - Smart cropping
   - Auto-enhancement
   - Thumbnail generation

3. **User Experience Improvements**
   - Drag-and-drop reordering
   - Image filtering
   - Advanced search

4. **Analytics and Insights**
   - Selection patterns
   - Popular images
   - User behavior analytics
# Unified Image Gallery MCP Requirements

This document outlines the requirements for a fresh implementation of the Unified Image Gallery MCP, which will allow Claude to present images to users and capture their selections for use in travel documents.

## Core Functionality Requirements

### 1. Image Sourcing
- Fetch images from Google Places API based on hotel name, attraction, or location search
- Support for multiple image sources in the future (Google Places, Unsplash, etc.)
- Cache search results to minimize API usage

### 2. Gallery Creation and Display
- Generate a web-based gallery with fetched images
- Present images in a responsive, user-friendly interface
- Support selection of primary/featured image
- Support selection of multiple secondary images
- Include relevance ranking to show best matches first
- Display attribution information for legal compliance

### 3. Selection Management
- Allow users to select/deselect images
- Designate one image as the "primary" or featured image
- Capture and store selection state
- Support for abandonment and resumption of selection process
- Timeout for galleries that aren't completed

### 4. Image Storage
- Store selected images in R2 bucket with proper organization
- Generate secure but accessible URLs for document embedding
- Support taxonomy based on usage context (hotel, activity, location, etc.)
- Support metadata storage (attribution, source, context)

### 5. Claude Integration
- MCP interface for Claude to create galleries
- MCP interface for Claude to retrieve selections
- Support for specifying the entity type (hotel, attraction, etc.)
- Support for entity metadata (ID, name, location)

### 6. Database Integration
- Store gallery sessions in D1 database
- Track selections with relationship to travel entities
- Link selected images to trip/itinerary components

## Technical Requirements

### 1. Architecture
- Cloudflare Worker-based MCP implementation
- RESTful API for gallery interface
- Secure token-based gallery access
- JSON-RPC 2.0 compliant MCP protocol implementation

### 2. Performance
- Fast image loading and gallery rendering
- Optimized image storage and retrieval
- Efficient database queries

### 3. Security
- Authentication for MCP endpoints
- Token-based gallery access
- CORS configuration for web access
- Secure storage of API keys

### 4. Storage Organization
- Logical folder structure in R2
- Entity-based organization (hotel/activity/location)
- Trip-based organization
- Content-addressable storage to avoid duplicates

## User Experience Requirements

### 1. Gallery Interface
- Clean, modern aesthetic
- Mobile-responsive design
- Intuitive selection mechanism
- Clear feedback for selection state
- Progress indication
- Clear submission button
- Attribution display

### 2. Integration UX
- Seamless transition from Claude conversation to gallery
- Clear instructions for users
- Indication when selections are complete
- Return to conversation after completion

## MCP Tools Requirements

### 1. Gallery Creation Tool
```
mcp__unified-image-gallery__create_image_gallery
Parameters:
- query: string (search query for images)
- count: number (image count to display, default: 12)
- sources: string[] (image sources to use, default: ["googlePlaces"])
- entity_type: string (hotel, attraction, tour, etc.)
- entity_id: string (database ID if available)
- entity_name: string (display name)
- trip_id: string (associated trip ID if available)
```

### 2. Selection Retrieval Tool
```
mcp__unified-image-gallery__get_selected_images
Parameters:
- gallery_id: string (ID of the gallery to retrieve selections from)
- wait_for_selection: boolean (whether to wait for user selection or return immediately)
- timeout_seconds: number (max time to wait, default: 60)
```

## Implementation Considerations

1. **Stateful Gallery Sessions**:
   - Galleries need state persistence
   - Support for abandonment and resumption
   - Timeout mechanism for incomplete selections

2. **Image Rights Management**:
   - Proper attribution display in gallery
   - Attribution storage with selected images
   - Compliance with API terms of service

3. **R2 Storage Organization**:
   - Consider using a format like: `trips/{trip_id}/{entity_type}/{entity_id}/{image_id}.jpg`
   - Store metadata alongside images

4. **Cloudflare Worker Limitations**:
   - Consider CPU and memory constraints
   - Use efficient implementations for image handling
   - Leverage Cloudflare's edge for performance

5. **Fallback Mechanisms**:
   - Support for default images if sources fail
   - Graceful degradation if services are unavailable
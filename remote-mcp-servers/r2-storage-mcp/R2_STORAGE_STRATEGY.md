# R2 Storage Strategy for Unified Image Gallery

This document outlines the comprehensive strategy for storing and organizing images in Cloudflare R2 storage for the Unified Image Gallery MCP.

## Storage Organization

The R2 storage will use a hierarchical structure that balances:
- Logical organization (by trip and entity)
- Performance considerations
- Access patterns
- Future scalability

### Folder Structure

```
travel-media/
├── galleries/                           # Temporary gallery session images
│   └── {gallery_id}/                    # Unique gallery session identifier
│       ├── source/                      # Original source images
│       │   ├── {source}_{image_id}.jpg
│       │   └── metadata/
│       │       └── {source}_{image_id}.json
│       └── selected/                    # User-selected images
│           ├── {source}_{image_id}.jpg
│           └── metadata/
│               └── {source}_{image_id}.json
├── trips/                               # Permanent trip-related images
│   └── {trip_id}/                       # Trip identifier
│       ├── accommodations/              # Accommodation images
│       │   └── {entity_id}/             # Hotel/lodging identifier
│       │       ├── primary.jpg          # Primary/featured image
│       │       ├── gallery/             # Additional selected images
│       │       │   ├── 1.jpg
│       │       │   ├── 2.jpg
│       │       │   └── ...
│       │       └── metadata/
│       │           ├── primary.json
│       │           ├── 1.json
│       │           └── ...
│       ├── activities/                  # Activity images
│       │   └── {entity_id}/
│       │       ├── primary.jpg
│       │       └── ...
│       ├── destinations/                # Destination/location images
│       │   └── {entity_id}/
│       │       ├── primary.jpg
│       │       └── ...
│       ├── dining/                      # Restaurant/dining images
│       │   └── {entity_id}/
│       │       ├── primary.jpg
│       │       └── ...
│       └── transportation/              # Transportation images
│           └── {entity_id}/
│               ├── primary.jpg
│               └── ...
└── shared/                              # Shared/reusable images
    ├── default/                         # Default fallback images
    │   ├── accommodation.jpg
    │   ├── activity.jpg
    │   └── ...
    └── icons/                           # UI icons and common assets
        └── ...
```

## Naming Conventions

### File Naming

- **Source Images**: `{source}_{source_identifier}.{ext}`
  - Example: `googleplaces_CmRaAAAAiB7rP9RcTyLr.jpg`

- **Selected Images**: Simplified for clarity:
  - Primary: `primary.{ext}`
  - Additional: `{index}.{ext}` (e.g., `1.jpg`, `2.jpg`)

### Identifiers

- **Gallery IDs**: UUID v4
  - Example: `3f0e7dfa-3b4a-4ef2-9d7a-f4bdca94c3a9`

- **Trip IDs**: From travel database
  - Example: `dublin-trip-2025`

- **Entity IDs**: From travel database
  - Example: `shelbourne-hotel`

## Metadata Storage

For each image, store a companion JSON metadata file with:

```json
{
  "id": "googleplaces_CmRaAAAAiB7rP9RcTyLr",
  "source": "googleplaces",
  "source_id": "CmRaAAAAiB7rP9RcTyLr",
  "original_url": "https://maps.googleapis.com/...",
  "content_type": "image/jpeg",
  "width": 1200,
  "height": 800,
  "size_bytes": 245632,
  "created_at": "2025-05-20T12:34:56Z",
  "attribution": "Photo by Google Maps User",
  "license": "Google Places API Terms",
  "entity": {
    "type": "accommodation",
    "id": "shelbourne-hotel",
    "name": "The Shelbourne Hotel"
  },
  "trip_id": "dublin-trip-2025",
  "is_primary": true,
  "tags": ["exterior", "building", "hotel"],
  "description": "Front view of The Shelbourne Hotel",
  "selected_by": "user",
  "selected_at": "2025-05-20T13:45:12Z"
}
```

## Access Control

### Public vs. Restricted Access

- **Public Access**:
  - Selected images for trip documents (`trips/{trip_id}/...`)
  - Default images (`shared/default/...`)
  - UI assets (`shared/icons/...`)

- **Restricted Access**:
  - Source images (`galleries/{gallery_id}/source/...`)
  - Metadata files (`*/metadata/*.json`)

### Access Methods

1. **Direct R2 URLs**: For internal processing
2. **Presigned URLs**: For temporary access to restricted content
3. **Public URLs**: For document embedding
   - Format: `https://media.somotravel.us/trips/{trip_id}/{entity_type}/{entity_id}/primary.jpg`

## Lifecycle Management

### Image Lifecycle

1. **Creation**:
   - Images fetched from external APIs
   - Stored in `galleries/{gallery_id}/source/`

2. **Selection**:
   - User selects images from gallery
   - Selected images copied to `galleries/{gallery_id}/selected/`

3. **Persistence**:
   - Upon gallery completion, images moved to permanent location
   - Path: `trips/{trip_id}/{entity_type}/{entity_id}/`

4. **Cleanup**:
   - Source gallery directories deleted after successful processing
   - Retention policy: 24 hours for unprocessed galleries

### Automated Cleanup

Implement R2 lifecycle rules:
- Delete `galleries/{gallery_id}/` directories after 24 hours
- Retain all `trips/` content indefinitely

## Storage Optimization

### Image Processing

1. **Resizing**:
   - Primary images: Max 1600px wide
   - Gallery images: Max 1200px wide
   - Thumbnails: Max 300px wide

2. **Compression**:
   - JPEG quality: 85% for optimal size/quality
   - WebP conversion where supported

3. **Metadata Stripping**:
   - Remove EXIF data for privacy and size reduction

### Caching Strategy

1. **Browser Caching**:
   - Public images: `Cache-Control: public, max-age=86400`
   - Gallery images: `Cache-Control: private, max-age=3600`

2. **CDN Caching**:
   - Configure Cloudflare cache rules for efficient delivery

## Implementation Considerations

### Storage Operations

1. **Upload Process**:
   - Fetch from source
   - Process image (resize, compress)
   - Extract/generate metadata
   - Upload to R2
   - Create metadata JSON
   - Upload metadata to R2

2. **Selection Process**:
   - Copy from source to selected
   - Update metadata with selection info
   - Generate presigned URLs

3. **Persistence Process**:
   - Copy to permanent location
   - Update database with permanent paths
   - Clean up gallery directory

### Fallback Mechanisms

1. **Missing Images**:
   - Serve default image based on entity type
   - Log missing image for analysis

2. **Processing Failures**:
   - Retry logic for transient errors
   - Fallback to original without processing

## Performance Optimization

### Batch Operations

For efficiency, batch operations where possible:
- Fetch multiple images concurrently
- Process multiple images in parallel
- Bulk uploads for related images

### Lazy Loading

Implement lazy loading patterns:
- Only process selected images
- Generate thumbnails on first access
- Defer metadata creation for unselected images

## Monitoring and Maintenance

### Storage Metrics

Track key metrics for optimization:
- Storage usage by trip/entity
- Image count and sizes
- Access patterns

### Maintenance Tasks

1. **Periodic Cleanup**:
   - Remove orphaned galleries
   - Consolidate duplicate images
   - Optimize storage usage

2. **Data Validation**:
   - Verify metadata accuracy
   - Check image integrity
   - Repair broken references

## Implementation Phases

1. **Phase 1: Basic Structure**
   - Set up R2 bucket and base structure
   - Implement basic upload/download operations

2. **Phase 2: Gallery Integration**
   - Connect to gallery selection process
   - Implement temporary storage and lifecycle

3. **Phase 3: Optimization**
   - Add image processing pipeline
   - Implement caching strategy
   - Add batch operations

4. **Phase 4: Advanced Features**
   - Implement tagging system
   - Add search capabilities
   - Create admin tools for management
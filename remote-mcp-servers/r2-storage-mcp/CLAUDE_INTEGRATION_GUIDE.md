# Claude Integration Guide: Unified Image Gallery

This document provides guidance on integrating the Unified Image Gallery MCP with Claude Desktop and the travel planning database.

## Overview

The integration flow connects Claude Desktop, the Unified Image Gallery MCP, and the travel database to provide a seamless image selection experience for travel planning:

```
┌─────────────┐     ┌───────────────┐     ┌──────────────┐
│             │     │               │     │              │
│   Claude    │────►│ Image Gallery │────►│    User      │
│   Desktop   │◄────│     MCP       │◄────│   Browser    │
│             │     │               │     │              │
└──────┬──────┘     └───────────────┘     └──────────────┘
       │                    ▲
       │                    │
       ▼                    ▼
┌─────────────┐     ┌───────────────┐     ┌──────────────┐
│             │     │               │     │              │
│   Travel    │◄────┤  R2 Storage   │◄────┤   Google     │
│  Database   │     │               │     │    Places    │
│             │     │               │     │              │
└─────────────┘     └───────────────┘     └──────────────┘
```

## Integration Touchpoints

### 1. Claude to Image Gallery MCP

#### Creating a Gallery

Claude uses the `create_image_gallery` MCP tool to initiate the image selection process:

```javascript
// Example Claude code for creating a gallery
try {
  const galleryResult = await mcpClient.callTool('unified-image-gallery', 'create_image_gallery', {
    query: "The Shelbourne Hotel Dublin",
    count: 12,
    sources: ["googlePlaces"],
    entity_type: "accommodation",
    entity_id: "shelbourne-dublin",
    entity_name: "The Shelbourne Hotel",
    trip_id: "dublin-trip-2025"
  });
  
  if (galleryResult.success) {
    // Present gallery URL to user
    return `Please select images for ${galleryResult.entity_name} using this link: ${galleryResult.url}`;
  } else {
    // Handle error
    return `Sorry, I couldn't create an image gallery: ${galleryResult.error}`;
  }
} catch (error) {
  console.error('Gallery creation error:', error);
  return "I encountered an error while trying to create the image gallery.";
}
```

#### Retrieving Selections

After the user makes selections, Claude retrieves them using the `get_selected_images` tool:

```javascript
// Example Claude code for retrieving selected images
try {
  const selectionsResult = await mcpClient.callTool('unified-image-gallery', 'get_selected_images', {
    gallery_id: galleryResult.gallery_id,
    wait_for_selection: true,
    timeout_seconds: 300  // 5 minutes
  });
  
  if (selectionsResult.success && selectionsResult.status === 'completed') {
    // Process selections
    const primaryImage = selectionsResult.primary_image;
    const additionalImages = selectionsResult.additional_images;
    
    // Update database with selections
    await updateTripImagesInDatabase(selectionsResult);
    
    return "Thank you for selecting the images! I've saved your selections.";
  } else {
    // Handle timeout or error
    return "It seems you haven't completed the image selection yet. Would you like more time?";
  }
} catch (error) {
  console.error('Selection retrieval error:', error);
  return "I encountered an error while trying to retrieve your image selections.";
}
```

### 2. Claude to Travel Database

After retrieving selections, Claude needs to update the travel database with the selected images:

```javascript
// Example function to update trip database
async function updateTripImagesInDatabase(selections) {
  try {
    // First, update the primary image
    await mcpClient.callTool('clean-d1-remote', 'general_d1_query', {
      sql: `
        UPDATE Accommodations
        SET primary_image_url = ?, image_attribution = ?
        WHERE trip_id = ? AND accommodation_id = ?
      `,
      params: [
        selections.primary_image.url,
        selections.primary_image.attribution,
        selections.trip_id,
        selections.entity.id
      ]
    });
    
    // Then, add additional images
    for (const image of selections.additional_images) {
      await mcpClient.callTool('clean-d1-remote', 'general_d1_query', {
        sql: `
          INSERT INTO AccommodationImages (trip_id, accommodation_id, image_url, attribution, title)
          VALUES (?, ?, ?, ?, ?)
        `,
        params: [
          selections.trip_id,
          selections.entity.id,
          image.url,
          image.attribution,
          image.title
        ]
      });
    }
    
    // Update activity log
    await mcpClient.callTool('clean-d1-remote', 'add_activity_log_entry', {
      session_id: "current-session-id",
      activity_type: "image_selection",
      details: `Selected images for ${selections.entity.type} ${selections.entity.name}`,
      client_id: null, // Optional, if available
      trip_id: selections.trip_id
    });
    
    return true;
  } catch (error) {
    console.error('Database update error:', error);
    throw error;
  }
}
```

### 3. User Experience Flow

Claude needs to guide the user through the image selection process:

```
Claude: I need some images for The Shelbourne Hotel in Dublin for your travel document. Would you like to select them now?

User: Yes, that would be great.

Claude: Please select images for The Shelbourne Hotel using this link: https://gallery.somotravel.us/g/3f0e7dfa-3b4a-4ef2-9d7a-f4bdca94c3a9

Once you've made your selections, please return to this conversation.

[User clicks link, selects images, and returns]

User: I've selected the images.

Claude: Thank you! I can see you've selected 4 images, including a beautiful shot of the hotel exterior as your primary image. I'll use these in your travel document.

[Claude proceeds with document creation using the selected images]
```

## Database Schema Integration

### 1. Trip Entity Tables

The following database tables need to store image information:

#### Accommodations Table
```sql
CREATE TABLE Accommodations (
  id INTEGER PRIMARY KEY,
  trip_id INTEGER,
  accommodation_id TEXT,
  accommodation_name TEXT,
  address TEXT,
  city TEXT,
  primary_image_url TEXT,
  image_attribution TEXT,
  -- other fields...
  FOREIGN KEY (trip_id) REFERENCES Trips(id)
);
```

#### AccommodationImages Table
```sql
CREATE TABLE AccommodationImages (
  id INTEGER PRIMARY KEY,
  trip_id INTEGER,
  accommodation_id TEXT,
  image_url TEXT,
  attribution TEXT,
  title TEXT,
  description TEXT,
  is_primary BOOLEAN DEFAULT 0,
  FOREIGN KEY (trip_id) REFERENCES Trips(id)
);
```

Similar tables exist for other entity types (Activities, Destinations, etc.).

### 2. Integration Queries

#### Retrieving Images for Document Generation
```sql
-- Get primary and additional images for an accommodation
SELECT
  a.accommodation_name,
  a.primary_image_url,
  a.image_attribution as primary_attribution,
  ai.image_url,
  ai.attribution,
  ai.title,
  ai.description
FROM
  Accommodations a
LEFT JOIN
  AccommodationImages ai ON a.trip_id = ai.trip_id AND a.accommodation_id = ai.accommodation_id
WHERE
  a.trip_id = ? AND a.accommodation_id = ?
```

## Document Integration

When generating travel documents, Claude should use the stored image information:

```html
<!-- Example HTML document fragment using selected images -->
<div class="accommodation">
  <h2>The Shelbourne Hotel</h2>
  
  <div class="primary-image">
    <img src="https://media.somotravel.us/trips/dublin-trip-2025/accommodations/shelbourne-dublin/primary.jpg" 
         alt="The Shelbourne Hotel - Exterior">
    <div class="attribution">Photo by Google Maps User</div>
  </div>
  
  <div class="details">
    <!-- Hotel details here -->
  </div>
  
  <div class="gallery">
    <h3>More Photos</h3>
    <div class="image-grid">
      <div class="gallery-item">
        <img src="https://media.somotravel.us/trips/dublin-trip-2025/accommodations/shelbourne-dublin/gallery/1.jpg" 
             alt="The Shelbourne Hotel - Lobby">
      </div>
      <!-- Additional images here -->
    </div>
  </div>
</div>
```

## Error Handling and Edge Cases

### 1. User Doesn't Complete Selection

If the user doesn't return to complete the selection:
- The `get_selected_images` call should timeout after the specified period
- Claude should handle this gracefully, offering to:
  - Extend the selection time
  - Use default images
  - Skip images for now

```javascript
// Example timeout handling
if (selectionsResult.status === 'timeout') {
  return "I notice you haven't completed the image selection yet. Would you like to: \n\n1. Continue selecting images (I'll extend the time)\n2. Use default images I select\n3. Skip adding images for now";
}
```

### 2. No Suitable Images Found

If the Google Places API returns no suitable images:
- The gallery should show a message explaining the issue
- Claude should offer alternatives:
  - Try a different search query
  - Use default/stock images
  - Skip images for now

### 3. Database Update Failure

If updating the database fails:
- Log the error details
- Store selection details for retry
- Inform the user of the issue but maintain conversation flow

## Performance Considerations

### 1. Asynchronous Processing

To maintain conversation flow, use asynchronous processing:
- Start image fetching in the background
- Continue conversation while images are being fetched
- Notify when gallery is ready

### 2. Preloading Common Images

For popular hotels and destinations:
- Preload and cache images in R2
- Reduce API calls to Google Places
- Improve gallery load times

### 3. Optimize Image Sizes

When generating documents:
- Use appropriate image sizes for the context
- Lazy-load gallery images in documents
- Consider device constraints for mobile viewing

## Testing the Integration

### 1. Test Cases

Develop test cases for the following scenarios:
- Happy path: User selects images promptly
- Timeout path: User doesn't complete selection
- Error path: API or database errors occur
- Empty path: No images available for selection

### 2. Integration Testing Script

Create an end-to-end test script that simulates:
1. Claude creating a gallery
2. User selecting images
3. Claude retrieving selections
4. Database updates
5. Document generation with selected images

## Deployment Checklist

Before deploying the integration:

1. **Environment Variables**
   - Configure API keys
   - Set database connection strings
   - Configure R2 bucket settings

2. **Permission Setup**
   - Verify MCP authentication
   - Configure R2 bucket policies
   - Set up database access permissions

3. **Monitoring**
   - Set up error alerting
   - Configure usage metrics
   - Establish performance baselines

4. **Documentation**
   - Update Claude prompt guides
   - Document common troubleshooting steps
   - Create user guidance materials

## Best Practices for Claude

When integrating image selection into conversations, Claude should:

1. **Provide Context**
   - Explain why images are needed
   - Describe what the user should look for
   - Set expectations about selection count

2. **Give Clear Instructions**
   - Provide explicit steps for the process
   - Confirm when to return to the conversation
   - Explain primary vs. additional image selection

3. **Acknowledge Completion**
   - Confirm receipt of selections
   - Describe the selected images briefly
   - Explain how they'll be used

4. **Handle Errors Gracefully**
   - Offer alternatives if issues occur
   - Don't blame the user for technical problems
   - Provide clear next steps

## Example Claude Prompts

### Initiating Image Selection

```
I'd like to add some images of The Shelbourne Hotel to your trip document. Would you like to select the images yourself, or would you prefer I choose them for you?

If you'd like to select them yourself, I'll provide a link to a gallery where you can choose the images that best represent your vision for this trip.
```

### Following Up After Selection

```
Thank you for selecting those images! I can see you've chosen a beautiful exterior shot as the primary image, along with photos of the lobby, a guest room, and the restaurant.

I'll use these images in your Dublin trip document. The primary image will be featured prominently, with the others in a gallery section.

Would you like to continue with selecting images for other parts of your trip, or shall we move on to something else?
```

## Maintenance and Monitoring

### 1. Key Metrics to Track

- Gallery creation success rate
- Selection completion rate
- Average selection time
- Database update success rate
- Image load performance

### 2. Log Analysis

Regularly review logs for:
- Common error patterns
- Unusual selection behaviors
- Performance bottlenecks
- API usage spikes

### 3. User Feedback Collection

Collect and analyze user feedback:
- Ease of selection process
- Image quality satisfaction
- Technical issues encountered
- Feature requests
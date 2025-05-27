# Image Gallery UI Design

This document outlines the design and functionality of the user interface for the Unified Image Gallery, focused on providing an intuitive and responsive experience for image selection.

## UI Overview

The gallery UI is a web-based interface that allows users to:
1. View images related to their travel entity (hotel, activity, etc.)
2. Select a primary/featured image
3. Select additional supporting images
4. Submit their selections
5. Return to Claude conversation

## Design Principles

- **Clarity**: Clear purpose and actions
- **Simplicity**: Minimal learning curve
- **Responsiveness**: Works on all devices
- **Feedback**: Clear indication of current selection state
- **Context**: Maintains connection to the travel planning context

## UI Components

### 1. Header Section

```
┌──────────────────────────────────────────────────┐
│ SomoTravel Image Selection                       │
├──────────────────────────────────────────────────┤
│                                                  │
│  Select images for: The Shelbourne Hotel, Dublin │
│                                                  │
│  Instructions: Click to select images. Choose    │
│  one primary image and any additional images     │
│  you'd like to include.                          │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Components**:
- Logo/branding
- Entity name and type
- Clear instructions
- Context information

### 2. Image Grid

```
┌────────────┐ ┌────────────┐ ┌────────────┐
│            │ │            │ │            │
│    [✓]     │ │    [ ]     │ │    [ ]     │
│  PRIMARY   │ │            │ │            │
│            │ │            │ │            │
└────────────┘ └────────────┘ └────────────┘

┌────────────┐ ┌────────────┐ ┌────────────┐
│            │ │            │ │            │
│    [✓]     │ │    [✓]     │ │    [ ]     │
│            │ │            │ │            │
│            │ │            │ │            │
└────────────┘ └────────────┘ └────────────┘
```

**Components**:
- Responsive grid layout (3 columns on desktop, 2 on tablet, 1 on mobile)
- Consistent image size and aspect ratio
- Selection checkboxes
- Primary image indicator
- Image attribution/source
- Lazy loading for performance

### 3. Action Bar

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  Selected: 3 of 9 images                         │
│                                                  │
│  [Reset Selections]    [Submit and Return] →     │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Components**:
- Selection counter
- Reset button
- Submit button
- Return to conversation indication

### 4. Image Modal

When an image is clicked, show a larger view:

```
┌──────────────────────────────────────────────────┐
│                                      [×] Close   │
├──────────────────────────────────────────────────┤
│                                                  │
│                                                  │
│                  [LARGE IMAGE]                   │
│                                                  │
│                                                  │
├──────────────────────────────────────────────────┤
│  The Shelbourne Hotel - Exterior View            │
│  Source: Google Places                           │
│                                                  │
│  [Select as Primary]   [Include in Gallery]      │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Components**:
- Large image view
- Image details
- Selection options
- Close button

## User Interaction Flow

### Initial Load
1. User receives URL from Claude
2. User opens URL in browser
3. Gallery loads with context and instructions
4. Images load in grid format

### Selection Process
1. User clicks on an image to view larger
2. User selects as primary or includes in gallery
3. Selected state updates in the grid
4. User continues selecting images

### Submission
1. User clicks "Submit and Return"
2. Confirmation overlay appears
3. Selection data is sent to server
4. Success message with "Return to Claude" button
5. User returns to conversation

## Responsive Design

### Desktop (>1024px)
- 3-4 columns in grid
- Larger image thumbnails
- Sidebar for instructions

### Tablet (768px-1024px)
- 2-3 columns in grid
- Medium-sized thumbnails
- Collapsed header

### Mobile (<768px)
- 1-2 columns in grid
- Smaller thumbnails
- Streamlined UI elements
- Fixed action bar at bottom

## Visual Design Elements

### Color Scheme
- Primary: #2c3e50 (Dark Blue)
- Secondary: #3498db (Light Blue)
- Accent: #e74c3c (Red)
- Background: #f8f9fa (Light Gray)
- Text: #333333 (Dark Gray)

### Typography
- Headings: Inter, sans-serif
- Body: Open Sans, sans-serif
- Size range: 14px - 24px

### Interactive Elements
- Selection checkbox: Custom styled for visibility
- Primary badge: Distinctive color (gold/yellow)
- Buttons: Clear, high-contrast

### Visual Feedback
- Hover effects on images
- Selection animation
- Loading indicators
- Success/error messages

## Accessibility Considerations

- Keyboard navigation support
- Screen reader compatibility
- Sufficient color contrast
- Focus indicators
- Alt text for all images
- ARIA attributes for interactive elements

## Implementation Notes

### HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Image Selection - SomoTravel</title>
    <link rel="stylesheet" href="/static/gallery.css">
</head>
<body>
    <header class="gallery-header">
        <div class="brand">SomoTravel Image Selection</div>
        <div class="entity-info">
            <h1>Select images for: <span id="entity-name">The Shelbourne Hotel</span></h1>
            <p class="instructions">Click to select images. Choose one primary image and any additional images you'd like to include.</p>
        </div>
    </header>
    
    <main class="gallery-grid" id="image-grid">
        <!-- Images will be populated dynamically -->
    </main>
    
    <footer class="action-bar">
        <div class="selection-count">Selected: <span id="selected-count">0</span> of <span id="total-count">0</span> images</div>
        <div class="actions">
            <button id="reset-btn" class="btn-secondary">Reset Selections</button>
            <button id="submit-btn" class="btn-primary">Submit and Return</button>
        </div>
    </footer>
    
    <div class="modal" id="image-modal" hidden>
        <div class="modal-content">
            <button class="close-btn" id="close-modal">&times;</button>
            <div class="modal-image-container">
                <img id="modal-image" src="" alt="">
            </div>
            <div class="modal-details">
                <h2 id="modal-title"></h2>
                <p id="modal-source"></p>
                <div class="modal-actions">
                    <button id="select-primary-btn" class="btn-highlight">Select as Primary</button>
                    <button id="select-include-btn" class="btn-secondary">Include in Gallery</button>
                </div>
            </div>
        </div>
    </div>
    
    <div class="toast" id="notification" hidden></div>
    
    <script src="/static/gallery.js"></script>
</body>
</html>
```

### CSS Framework
- Use lightweight CSS framework/utility library
- Custom components for gallery-specific needs
- CSS variables for theming
- Flexbox/Grid for layout

### JavaScript Features
- Fetch gallery data from API
- Handle image selection state
- Modal interaction
- Form submission
- Responsive behavior
- Error handling

## Loading States and Error Handling

### Loading States
- Initial skeleton UI during data fetch
- Progressive image loading with placeholders
- Loading indicator during submission

### Error States
- Connection error handling
- Retry mechanisms
- Fallback content
- Clear error messages
- Recovery options

## Animation and Transitions

- Subtle entrance animations for images
- Selection state transitions
- Modal open/close animations
- Feedback animations (success/error)

## Example Image Object

```json
{
  "id": "gp_12345",
  "url": "/thumbnails/gp_12345.jpg",
  "fullUrl": "/images/gp_12345.jpg",
  "title": "The Shelbourne Hotel - Exterior",
  "source": "Google Places",
  "attribution": "Photo by Google Maps User",
  "selected": false,
  "isPrimary": false
}
```

## User Testing Considerations

- Test on various devices and screen sizes
- Ensure intuitive selection process
- Verify clear feedback mechanisms
- Confirm proper return to conversation
- Check for accessibility compliance
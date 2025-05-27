import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { Env } from './r2-context';
import { r2_upload_image } from './tools/image-upload-tools';

// Define interface for gallery session
interface GallerySession {
  id: string;
  created_at: number;
  updated_at: number;
  status: 'created' | 'active' | 'completed' | 'expired';
  query: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  trip_id?: string;
  expires_at: number;
  image_count: number;
}

// Define interface for gallery image
interface GalleryImage {
  id: string;
  gallery_id: string;
  index: number;
  source: string;
  source_id: string;
  url: string;
  thumbnail_url: string;
  title: string;
  description?: string;
  attribution?: string;
}

// Define interface for image selection
interface ImageSelection {
  id: string;
  gallery_id: string;
  image_id: string;
  is_primary: boolean;
  selected_at: number;
  r2_path?: string;
  r2_url?: string;
}

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// Apply CORS middleware
app.use(cors());

// Implement MCP protocol routes
app.post('/mcp', async (c) => {
  const body = await c.req.json();

  // Extract JSON-RPC request
  const { jsonrpc, id, method, params } = body;

  // Validate JSON-RPC request
  if (jsonrpc !== '2.0' || !id) {
    return c.json({
      jsonrpc: '2.0',
      id: id || null,
      error: {
        code: -32600,
        message: 'Invalid Request'
      }
    });
  }

  // Initialize method - returns server information
  if (method === 'initialize') {
    return c.json({
      jsonrpc: '2.0',
      id,
      result: {
        name: c.env.MCP_SERVER_NAME || 'unified-image-gallery-mcp',
        version: c.env.MCP_SERVER_VERSION || '1.0.0',
        vendor: 'Claude Travel Chat',
        protocol: {
          version: '0.1.0'
        }
      }
    });
  }

  // List tools method
  if (method === 'tools/list') {
    const tools = [
      {
        name: 'create_image_gallery',
        description: 'Create a gallery for selecting travel images from multiple sources',
        schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for images (e.g. "Grand Hyatt Singapore exterior")'
            },
            sources: {
              type: 'array',
              description: 'Image sources to search (googlePlaces)',
              items: {
                type: 'string',
                enum: ['googlePlaces']
              },
              default: ['googlePlaces']
            },
            count: {
              type: 'integer',
              description: 'Number of images to display in the gallery (max 30)',
              minimum: 1,
              maximum: 30,
              default: 12
            }
          },
          required: ['query']
        }
      },
      {
        name: 'get_selected_images',
        description: 'Get the images selected by the user from a gallery, optionally waiting for selection.',
        schema: {
          type: 'object',
          properties: {
            galleryId: {
              type: 'string',
              description: 'ID of the gallery to get selections from'
            },
            waitForSelection: {
              type: 'boolean',
              description: 'Whether to wait for the user to make a selection',
              default: true
            },
            timeoutSeconds: {
              type: 'integer',
              description: 'How long to wait for selection in seconds (10-600)',
              minimum: 10,
              maximum: 600,
              default: 60
            }
          },
          required: ['galleryId']
        }
      }
    ];

    return c.json({
      jsonrpc: '2.0',
      id,
      result: {
        tools
      }
    });
  }

  // Execute tool method
  if (method === 'tools/call') {
    // Check authentication
    const authHeader = c.req.header('X-API-Token');
    if (!authHeader || authHeader !== c.env.MCP_AUTH_KEY) {
      return c.json({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32001,
          message: 'Authentication failed'
        }
      });
    }

    const { name, arguments: args } = params || {};

    if (!name) {
      return c.json({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32602,
          message: 'Invalid params: tool name is required'
        }
      });
    }

    // Handle tools
    try {
      let result;

      // Create image gallery
      if (name === 'create_image_gallery') {
        result = await createImageGallery(args, c.env);
      }
      // Get selected images
      else if (name === 'get_selected_images') {
        result = await getSelectedImages(args, c.env);
      }
      else {
        result = { success: false, error: `Tool ${name} not found` };
      }

      return c.json({
        jsonrpc: '2.0',
        id,
        result
      });
    } catch (error) {
      return c.json({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32000,
          message: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  // Method not found
  return c.json({
    jsonrpc: '2.0',
    id,
    error: {
      code: -32601,
      message: `Method '${method}' not found`
    }
  });
});

/**
 * Create an image gallery
 */
async function createImageGallery(
  params: {
    query: string;
    sources?: string[];
    count?: number;
    entity_type?: string;
    entity_id?: string;
    entity_name?: string;
    trip_id?: string;
  },
  env: Env
): Promise<any> {
  try {
    const {
      query,
      sources = ['googlePlaces'],
      count = 12,
      entity_type = 'generic',
      entity_id = '',
      entity_name = '',
      trip_id = ''
    } = params;

    // Validate input
    if (!query || query.trim() === '') {
      return {
        success: false,
        error: 'Search query is required'
      };
    }

    // Generate a unique gallery ID
    const galleryId = `gallery_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    // Create a gallery session (would normally be stored in D1)
    const gallerySession: GallerySession = {
      id: galleryId,
      created_at: Date.now(),
      updated_at: Date.now(),
      status: 'created',
      query,
      entity_type,
      entity_id,
      entity_name: entity_name || query,
      trip_id,
      expires_at: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      image_count: count
    };

    // For this demo, store session in KV or just return directly
    // In a real implementation, this would be stored in D1 database

    // Generate the gallery URL
    const host = env.GALLERY_HOSTNAME || 'r2-storage-mcp.somotravel.workers.dev';
    const galleryUrl = `https://${host}/gallery/${galleryId}`;

    return {
      success: true,
      galleryId,
      galleryUrl,
      query,
      sources,
      expiresAt: new Date(gallerySession.expires_at).toISOString()
    };
  } catch (error) {
    console.error('Error creating gallery:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get selected images from a gallery
 */
async function getSelectedImages(
  params: {
    galleryId: string;
    waitForSelection?: boolean;
    timeoutSeconds?: number;
  },
  env: Env
): Promise<any> {
  try {
    const {
      galleryId,
      waitForSelection = true,
      timeoutSeconds = 60
    } = params;

    // Validate gallery ID
    if (!galleryId) {
      return {
        success: false,
        error: 'Gallery ID is required'
      };
    }

    // In a real implementation, we would fetch the gallery session and selections from D1
    // For this demo, we'll simulate the data

    // Check if the gallery exists and has selections
    // In a real implementation, we'd check the database
    const hasSelections = Math.random() > 0.5; // Simulate whether selections exist

    if (!waitForSelection || hasSelections) {
      // Return the selected images
      // In a real implementation, we'd fetch from the database
      return {
        success: true,
        galleryId,
        selections: [
          {
            id: 'selection_1',
            is_primary: true,
            url: 'https://example.com/images/primary.jpg',
            thumbnail_url: 'https://example.com/thumbnails/primary.jpg',
            title: 'Primary Image',
            attribution: 'Google Places'
          },
          {
            id: 'selection_2',
            is_primary: false,
            url: 'https://example.com/images/secondary.jpg',
            thumbnail_url: 'https://example.com/thumbnails/secondary.jpg',
            title: 'Secondary Image',
            attribution: 'Google Places'
          }
        ],
        completed: true
      };
    } else {
      // No selections yet, and we're not waiting
      return {
        success: true,
        galleryId,
        selections: [],
        completed: false,
        message: 'No selections have been made yet'
      };
    }
  } catch (error) {
    console.error('Error getting selections:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Gallery UI routes
app.get('/gallery/:id', async (c) => {
  const galleryId = c.req.param('id');

  // In a real implementation, we would fetch the gallery session from D1
  // For this demo, we'll simply render the gallery UI

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Image Selection - SomoTravel</title>
      <style>
        :root {
          --primary-color: #2c3e50;
          --secondary-color: #3498db;
          --accent-color: #e74c3c;
          --bg-color: #f8f9fa;
          --text-color: #333333;
          --border-color: #e0e0e0;
          --success-color: #2ecc71;
          --warning-color: #f39c12;
          --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: var(--font-family);
          background-color: var(--bg-color);
          color: var(--text-color);
          line-height: 1.6;
        }

        .gallery-header {
          background-color: var(--primary-color);
          color: white;
          padding: 1rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .brand {
          font-weight: bold;
          font-size: 1.2rem;
          margin-bottom: 0.5rem;
        }

        .entity-info {
          margin: 1rem 0;
        }

        .entity-info h1 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .instructions {
          font-size: 0.9rem;
          opacity: 0.9;
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
          padding: 1rem;
          margin-bottom: 4rem;
        }

        .image-card {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          transition: transform 0.2s, box-shadow 0.2s;
          cursor: pointer;
          position: relative;
        }

        .image-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }

        .image-container {
          height: 200px;
          overflow: hidden;
          position: relative;
        }

        .image-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s;
        }

        .image-card:hover .image-container img {
          transform: scale(1.05);
        }

        .selection-indicator {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          border: 2px solid white;
          transition: all 0.2s;
        }

        .selection-indicator.selected {
          background: var(--secondary-color);
          border-color: white;
        }

        .selection-indicator.primary {
          background: var(--accent-color);
          border-color: gold;
        }

        .image-details {
          padding: 0.75rem;
        }

        .image-title {
          font-weight: 600;
          margin-bottom: 0.25rem;
          font-size: 0.9rem;
        }

        .image-source {
          font-size: 0.8rem;
          color: #666;
        }

        .action-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 -2px 4px rgba(0,0,0,0.1);
          z-index: 100;
        }

        .selection-count {
          font-size: 0.9rem;
        }

        .actions {
          display: flex;
          gap: 1rem;
        }

        .btn-primary, .btn-secondary {
          padding: 0.5rem 1rem;
          border-radius: 4px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-primary {
          background-color: var(--secondary-color);
          color: white;
        }

        .btn-secondary {
          background-color: #e0e0e0;
          color: var(--text-color);
        }

        .btn-primary:hover {
          background-color: #2980b9;
        }

        .btn-secondary:hover {
          background-color: #d0d0d0;
        }

        .modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .close-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: white;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .modal-image-container {
          flex: 1;
          min-height: 300px;
          overflow: hidden;
        }

        .modal-image-container img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .modal-details {
          padding: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 1rem;
        }

        .btn-highlight {
          background-color: var(--accent-color);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-highlight:hover {
          background-color: #c0392b;
        }

        .toast {
          position: fixed;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--primary-color);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          z-index: 1000;
          transition: all 0.3s;
        }

        @media (max-width: 768px) {
          .gallery-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          }

          .image-container {
            height: 150px;
          }

          .action-bar {
            flex-direction: column;
            gap: 0.5rem;
          }

          .actions {
            width: 100%;
          }

          .btn-primary, .btn-secondary {
            flex: 1;
            text-align: center;
          }

          .modal-content {
            width: 95%;
          }
        }
      </style>
  </head>
  <body>
      <header class="gallery-header">
          <div class="brand">SomoTravel Image Selection</div>
          <div class="entity-info">
              <h1>Select images for: <span id="entity-name">Image Gallery</span></h1>
              <p class="instructions">Click to select images. Choose one primary image and any additional images you'd like to include.</p>
          </div>
      </header>

      <main class="gallery-grid" id="image-grid">
          <!-- Images will be populated dynamically via JavaScript -->
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

      <script>
        // Gallery state
        const state = {
          galleryId: '${galleryId}',
          images: [],
          selections: [],
          primarySelection: null,
          currentImageId: null
        };

        // DOM elements
        const imageGrid = document.getElementById('image-grid');
        const entityName = document.getElementById('entity-name');
        const selectedCount = document.getElementById('selected-count');
        const totalCount = document.getElementById('total-count');
        const resetBtn = document.getElementById('reset-btn');
        const submitBtn = document.getElementById('submit-btn');
        const imageModal = document.getElementById('image-modal');
        const modalImage = document.getElementById('modal-image');
        const modalTitle = document.getElementById('modal-title');
        const modalSource = document.getElementById('modal-source');
        const closeModal = document.getElementById('close-modal');
        const selectPrimaryBtn = document.getElementById('select-primary-btn');
        const selectIncludeBtn = document.getElementById('select-include-btn');
        const notification = document.getElementById('notification');

        // Sample gallery data
        // In a real implementation, this would be fetched from the server
        const galleryData = {
          id: '${galleryId}',
          entity_name: 'The Shelbourne Hotel, Dublin',
          images: [
            {
              id: 'gp_1',
              url: 'https://lh3.googleusercontent.com/places/AJDFj401KKYxFt1qgxnP7mFzRQn-9gfA4wNMRw9Rj6YNBO0=w1080-h608-n-k-no',
              title: 'The Shelbourne Hotel - Exterior',
              source: 'Google Places',
              attribution: 'Photo by Google User'
            },
            {
              id: 'gp_2',
              url: 'https://lh3.googleusercontent.com/places/AJDFj40ngLQ1zGRP-U3a5ZDpw89fu8EYBQPbXV8Dkw76B39b=w1080-h608-n-k-no',
              title: 'The Shelbourne Hotel - Lobby',
              source: 'Google Places',
              attribution: 'Photo by Google User'
            },
            {
              id: 'gp_3',
              url: 'https://lh3.googleusercontent.com/places/AJDFj42R4WNUoOErnAkz0jM8ByLQ2xN5LoWV-J6xuEK5O3Q=w1080-h608-n-k-no',
              title: 'The Shelbourne Hotel - Room',
              source: 'Google Places',
              attribution: 'Photo by Google User'
            },
            {
              id: 'gp_4',
              url: 'https://lh3.googleusercontent.com/places/AJDFj41u4DzxYEChRIxOgmVAOkXb-2HUyh7hxOGesrVOa3I=w1080-h608-n-k-no',
              title: 'The Shelbourne Hotel - Restaurant',
              source: 'Google Places',
              attribution: 'Photo by Google User'
            },
            {
              id: 'gp_5',
              url: 'https://lh3.googleusercontent.com/places/AJDFj42QIa19SsZQww1w-cHA-2xh9xECaCkYbkXqD-5_3Rc=w1080-h608-n-k-no',
              title: 'The Shelbourne Hotel - Bar',
              source: 'Google Places',
              attribution: 'Photo by Google User'
            },
            {
              id: 'gp_6',
              url: 'https://lh3.googleusercontent.com/places/AJDFj43F9D8jVjI4lkwFgGQNPwZB4tOtCN_z1yrXnZkAOt4=w1080-h608-n-k-no',
              title: 'The Shelbourne Hotel - Bathroom',
              source: 'Google Places',
              attribution: 'Photo by Google User'
            }
          ]
        };

        // Initialize the gallery
        function initGallery() {
          // Set entity name
          entityName.textContent = galleryData.entity_name;

          // Set state
          state.images = galleryData.images;
          totalCount.textContent = state.images.length;

          // Render images
          renderImages();

          // Add event listeners
          resetBtn.addEventListener('click', resetSelections);
          submitBtn.addEventListener('click', submitSelections);
          closeModal.addEventListener('click', closeImageModal);
          selectPrimaryBtn.addEventListener('click', selectAsPrimary);
          selectIncludeBtn.addEventListener('click', toggleSelection);
        }

        // Render images in the grid
        function renderImages() {
          imageGrid.innerHTML = '';

          state.images.forEach(image => {
            const isPrimary = state.primarySelection === image.id;
            const isSelected = isPrimary || state.selections.includes(image.id);

            const card = document.createElement('div');
            card.className = 'image-card';
            card.dataset.id = image.id;

            card.innerHTML = \`
              <div class="image-container">
                <img src="\${image.url}" alt="\${image.title}">
                <div class="selection-indicator \${isPrimary ? 'primary' : isSelected ? 'selected' : ''}">
                  \${isPrimary ? '★' : isSelected ? '✓' : ''}
                </div>
              </div>
              <div class="image-details">
                <div class="image-title">\${image.title}</div>
                <div class="image-source">\${image.source}</div>
              </div>
            \`;

            card.addEventListener('click', () => openImageModal(image.id));

            imageGrid.appendChild(card);
          });

          // Update selection count
          updateSelectionCount();
        }

        // Open image modal
        function openImageModal(imageId) {
          const image = state.images.find(img => img.id === imageId);
          if (!image) return;

          state.currentImageId = imageId;

          modalImage.src = image.url;
          modalTitle.textContent = image.title;
          modalSource.textContent = \`Source: \${image.source}\`;

          const isPrimary = state.primarySelection === imageId;
          const isSelected = isPrimary || state.selections.includes(imageId);

          selectPrimaryBtn.textContent = isPrimary ? 'Remove Primary' : 'Select as Primary';
          selectIncludeBtn.textContent = isSelected ? 'Remove from Selection' : 'Include in Gallery';

          imageModal.hidden = false;
        }

        // Close image modal
        function closeImageModal() {
          imageModal.hidden = true;
          state.currentImageId = null;
        }

        // Select as primary image
        function selectAsPrimary() {
          const imageId = state.currentImageId;
          if (!imageId) return;

          if (state.primarySelection === imageId) {
            // Unselect as primary
            state.primarySelection = null;

            // Show notification
            showNotification('Primary image removed');
          } else {
            // Set as primary
            state.primarySelection = imageId;

            // Add to selections if not already included
            if (!state.selections.includes(imageId)) {
              state.selections.push(imageId);
            }

            // Show notification
            showNotification('Primary image selected');
          }

          // Update modal buttons
          const isPrimary = state.primarySelection === imageId;
          selectPrimaryBtn.textContent = isPrimary ? 'Remove Primary' : 'Select as Primary';

          // Re-render images
          renderImages();
        }

        // Toggle selection for an image
        function toggleSelection() {
          const imageId = state.currentImageId;
          if (!imageId) return;

          const index = state.selections.indexOf(imageId);

          if (index !== -1) {
            // If it's the primary image, don't remove from selections
            if (state.primarySelection === imageId) {
              showNotification('Cannot remove primary image from selection');
              return;
            }

            // Remove from selections
            state.selections.splice(index, 1);

            // Update button text
            selectIncludeBtn.textContent = 'Include in Gallery';

            // Show notification
            showNotification('Image removed from selection');
          } else {
            // Add to selections
            state.selections.push(imageId);

            // Update button text
            selectIncludeBtn.textContent = 'Remove from Selection';

            // Show notification
            showNotification('Image added to selection');
          }

          // Re-render images
          renderImages();
        }

        // Reset all selections
        function resetSelections() {
          state.selections = [];
          state.primarySelection = null;

          // Re-render images
          renderImages();

          // Show notification
          showNotification('All selections reset');
        }

        // Submit selections
        function submitSelections() {
          // Validate selections
          if (state.selections.length === 0) {
            showNotification('Please select at least one image');
            return;
          }

          if (!state.primarySelection) {
            showNotification('Please select a primary image');
            return;
          }

          // In a real implementation, send the selections to the server
          // For this demo, just show a success message

          showNotification('Selections submitted successfully!');

          // Simulate returning to Claude
          setTimeout(() => {
            window.close();
          }, 2000);
        }

        // Update selection count
        function updateSelectionCount() {
          selectedCount.textContent = state.selections.length;
        }

        // Show notification
        function showNotification(message) {
          notification.textContent = message;
          notification.hidden = false;

          // Hide after 3 seconds
          setTimeout(() => {
            notification.hidden = true;
          }, 3000);
        }

        // Initialize the gallery when the page loads
        window.addEventListener('DOMContentLoaded', initGallery);
      </script>
  </body>
  </html>
  `;

  return c.html(html);
});

// API endpoint to get gallery data
app.get('/api/gallery/:id', async (c) => {
  const galleryId = c.req.param('id');

  // In a real implementation, we would fetch the gallery session and images from D1
  // For this demo, we'll return dummy data

  return c.json({
    id: galleryId,
    entity_name: 'Image Gallery',
    status: 'active',
    images: [
      {
        id: 'gp_1',
        url: 'https://example.com/images/image1.jpg',
        thumbnail_url: 'https://example.com/thumbnails/image1.jpg',
        title: 'Example Image 1',
        source: 'Google Places',
        attribution: 'Photo by Google User'
      },
      {
        id: 'gp_2',
        url: 'https://example.com/images/image2.jpg',
        thumbnail_url: 'https://example.com/thumbnails/image2.jpg',
        title: 'Example Image 2',
        source: 'Google Places',
        attribution: 'Photo by Google User'
      }
    ]
  });
});

// API endpoint for submitting selections
app.post('/api/gallery/:id/selections', async (c) => {
  const galleryId = c.req.param('id');
  const body = await c.req.json();

  // In a real implementation, we would save the selections to D1 and process the images
  // For this demo, we'll just return a success response

  return c.json({
    success: true,
    galleryId,
    message: 'Selections saved successfully'
  });
});

// Serve static assets
app.get('/static/*', (c) => {
  const path = c.req.path.replace('/static/', '');

  // In a real implementation, we would serve files from R2 or use Cloudflare Assets
  // For this demo, we'll return a 404

  return c.text('Static file not found', 404);
});

export default app;

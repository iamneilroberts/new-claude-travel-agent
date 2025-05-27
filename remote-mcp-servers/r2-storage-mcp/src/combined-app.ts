/**
 * Combined R2 Storage and Image Gallery MCP Worker
 * 
 * This file combines both the R2 Storage MCP and the Unified Image Gallery MCP
 * into a single Cloudflare Worker application.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { Env } from './r2-context';
import r2App from './r2-app';
import galleryApp from './unified-gallery-app';

// Create a combined Hono app
const app = new Hono<{ Bindings: Env }>();

// Apply CORS middleware
app.use(cors());

// Mount the R2 app at /
app.route('/', r2App);

// Mount the gallery app at /
app.route('/', galleryApp);

// Add a combined health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    services: ['r2-storage-mcp', 'unified-image-gallery-mcp'],
    version: c.env.MCP_SERVER_VERSION || '1.0.0'
  });
});

// Export the combined app
export default app;
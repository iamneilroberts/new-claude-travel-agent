/**
 * Combined R2 Storage and Image Gallery MCP Worker Entry Point
 *
 * This is the main entry point for the Cloudflare Worker that combines
 * both the R2 Storage MCP and the Unified Image Gallery MCP functionality.
 */

import app from './combined-app';

// Export the default handler for Cloudflare Workers
export default app;

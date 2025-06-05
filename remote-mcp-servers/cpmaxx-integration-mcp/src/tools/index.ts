/**
 * CPMaxx Integration MCP Server Tools
 * 
 * This module exports all tools for the CPMaxx MCP server including:
 * - Real browser automation for hotel, car, and package searches
 * - Test automation tools for development and debugging
 * - Session management and monitoring tools
 */

export * from './search-hotels';
export * from './search-cars'; 
export * from './search-packages';
export * from './test-automation';
export * from './session-management';
export * from './download-hotel-photos';

// Tool registry for easy access
export const CPMAXX_TOOLS = {
  // Production search tools
  'search-hotels': {
    description: 'Search for hotels using CPMaxx with real browser automation',
    module: './search-hotels'
  },
  'search-cars': {
    description: 'Search for car rentals using CPMaxx with real browser automation', 
    module: './search-cars'
  },
  'search-packages': {
    description: 'Search for travel packages using CPMaxx with real browser automation',
    module: './search-packages'
  },
  
  // Test and debugging tools
  'test-browser-automation': {
    description: 'Test CPMaxx browser automation with visible browser for debugging',
    module: './test-automation'
  },
  
  // Session management
  'manage-session': {
    description: 'Manage CPMaxx session state and authentication',
    module: './session-management'
  }
} as const;

export type CPMaxxToolName = keyof typeof CPMAXX_TOOLS;
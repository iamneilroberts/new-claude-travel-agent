#!/usr/bin/env node

// MCP CPMaxx Unified Server - Orchestrated Version
// Delegates browser control to Claude Desktop via mcp-chrome

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { logger } from './utils/logger.js';
import { orchestratedSearch } from './tools/orchestrated-search.js';

// No initialization needed - using singleton exports

// Create server
const server = new Server(
  {
    name: 'mcp-cpmaxx-unified',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'start_cpmaxx_search',
        description: `Start a CPMaxx search and get Chrome MCP instructions.
Supported providers: carrental, delta, american, hotel, allinclusive, cruise, tour.
Returns immediately with a searchId and step-by-step Chrome commands to execute.`,
        inputSchema: {
          type: 'object',
          properties: {
            provider: {
              type: 'string',
              enum: ['carrental', 'cpmaxx-car', 'delta', 'american', 'hotel', 'all-inclusive', 'cruise', 'tour'],
              description: 'The travel provider to search'
            },
            // Common fields
            origin: {
              type: 'string',
              description: 'Origin city or airport code (for flights)'
            },
            destination: {
              type: 'string',
              description: 'Destination city, airport code, or location'
            },
            departDate: {
              type: 'string',
              description: 'Departure/check-in date (YYYY-MM-DD or MM/DD/YYYY)'
            },
            returnDate: {
              type: 'string',
              description: 'Return/check-out date (YYYY-MM-DD or MM/DD/YYYY)'
            },
            // Alternative date field names
            checkInDate: {
              type: 'string',
              description: 'Check-in date for hotels (YYYY-MM-DD)'
            },
            checkOutDate: {
              type: 'string',
              description: 'Check-out date for hotels (YYYY-MM-DD)'
            },
            pickupDate: {
              type: 'string',
              description: 'Pickup date for car rentals (YYYY-MM-DD)'
            },
            dropoffDate: {
              type: 'string',
              description: 'Dropoff date for car rentals (YYYY-MM-DD)'
            },
            // Location fields for car rental
            pickupLocation: {
              type: 'string',
              description: 'Pickup location for car rentals'
            },
            dropoffLocation: {
              type: 'string',
              description: 'Dropoff location for car rentals (if different from pickup)'
            },
            adults: {
              type: 'number',
              description: 'Number of adults',
              default: 2
            },
            children: {
              type: 'number',
              description: 'Number of children',
              default: 0
            },
            // Car rental specific
            pickupTime: {
              type: 'string',
              description: 'Pickup time for car rentals'
            },
            dropoffTime: {
              type: 'string',
              description: 'Dropoff time for car rentals'
            },
            carType: {
              type: 'string',
              description: 'Car type preference'
            },
            // Hotel specific
            rooms: {
              type: 'number',
              description: 'Number of rooms for hotels',
              default: 1
            },
            starRating: {
              type: 'array',
              items: { type: 'number' },
              description: 'Star rating filter for hotels'
            }
          },
          required: ['provider']
        }
      },
      {
        name: 'complete_cpmaxx_search',
        description: `Complete a CPMaxx search by providing the HTML from Chrome.
Call this after executing all Chrome instructions from start_cpmaxx_search.
Returns parsed results with prices, availability, and commission data.`,
        inputSchema: {
          type: 'object',
          properties: {
            searchId: {
              type: 'string',
              description: 'The searchId from start_cpmaxx_search'
            },
            html: {
              type: 'string',
              description: 'The complete HTML content from chrome_get_web_content'
            },
            url: {
              type: 'string',
              description: 'The final URL after all navigation (optional)'
            },
            error: {
              type: 'string',
              description: 'Error message if the search failed'
            }
          },
          required: ['searchId', 'html']
        }
      },
      {
        name: 'check_cpmaxx_search_status',
        description: `Check the status of a CPMaxx search by searchId.
Returns the current status (searching/completed/error) and results if available.`,
        inputSchema: {
          type: 'object',
          properties: {
            searchId: {
              type: 'string',
              description: 'The searchId to check status for'
            }
          },
          required: ['searchId']
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params as any;

  try {
    switch (name) {
      case 'start_cpmaxx_search': {
        const result = await orchestratedSearch.startSearch(args);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }
        
      case 'complete_cpmaxx_search': {
        const result = await orchestratedSearch.completeSearch(args);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }
        
      case 'check_cpmaxx_search_status': {
        const result = await orchestratedSearch.getSearchStatus(args.searchId);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }
        
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    logger.error(`Tool execution error: ${error}`);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            tool: name,
            timestamp: new Date().toISOString()
          }, null, 2)
        }
      ]
    };
  }
});

// Start server
async function main() {
  logger.info('Initializing CPMaxx Unified MCP server...');
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  logger.info('Server started and connected successfully');
}

main().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
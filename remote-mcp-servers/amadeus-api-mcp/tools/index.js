// Tool registry for Amadeus MCP
import { getAmadeusClient } from '../services/amadeus-client.js';
import { testConnectionTool } from './test-connection.js';
import { searchFlightsTool } from './search-flights.js';
import { searchHotelsTool } from './search-hotels.js';
import { searchPOITool } from './search-poi.js';
import { searchAirportTransfersTool } from './search-airport-transfers.js';
import { searchCheapestFlightDatesTool } from './search-cheapest-flight-dates.js';
import { analyzeFlightPricesTool } from './analyze-flight-prices.js';
import { searchFlightInspirationsTool } from './search-flight-inspirations.js';
import { searchHotelsByCityTool } from './search-hotels-by-city.js';
import { getHotelRatingsTool } from './get-hotel-ratings.js';
import { searchActivitiesByCoordinatesTool } from './search-activities-by-coordinates.js';
import { getTravelRecommendationsTool } from './get-travel-recommendations.js';

export async function initializeTools(env) {
  // Initialize Amadeus client
  const amadeus = await getAmadeusClient(env);

  const registry = {
    tools: [],
    handlers: new Map(),
    amadeus
  };

  // Add all tools
  const tools = [
    testConnectionTool,
    searchFlightsTool,
    searchHotelsTool,
    searchPOITool,
    searchAirportTransfersTool,
    searchCheapestFlightDatesTool,
    analyzeFlightPricesTool,
    searchFlightInspirationsTool,
    searchHotelsByCityTool,
    getHotelRatingsTool,
    searchActivitiesByCoordinatesTool,
    getTravelRecommendationsTool
  ];

  tools.forEach(tool => {
    registry.tools.push({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.schema
    });

    registry.handlers.set(tool.name, async (params) => {
      try {
        return await tool.execute(params, env);
      } catch (error) {
        console.error(`Error in tool ${tool.name}:`, error);
        throw error;
      }
    });
  });

  return registry;
}

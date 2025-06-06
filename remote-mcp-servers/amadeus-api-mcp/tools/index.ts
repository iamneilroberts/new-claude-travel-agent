import type { Env } from '../index';
import type { ToolRegistry } from '../protocol';
import { getAmadeusClient } from '../services/amadeus-client';
import { testConnectionTool } from './test-connection';
import { searchFlightsTool } from './search-flights';
import { searchHotelsTool } from './search-hotels';
import { searchPOITool } from './search-poi';
import { searchAirportTransfersTool } from './search-airport-transfers';
import { searchCheapestFlightDatesTool } from './search-cheapest-flight-dates';
import { analyzeFlightPricesTool } from './analyze-flight-prices';
import { searchFlightInspirationsTool } from './search-flight-inspirations';
import { searchHotelsByCityTool } from './search-hotels-by-city';
import { getHotelRatingsTool } from './get-hotel-ratings';
import { searchActivitiesByCoordinatesTool } from './search-activities-by-coordinates';
import { flightChoicePredictionTool } from './flight-choice-prediction';
import { hotelNameAutocompleteTool } from './hotel-name-autocomplete';
import { citySearchTool } from './city-search';
import { flightCheckInLinksTool } from './flight-check-in-links';
import { getPOIByIdTool } from './get-poi-by-id';
import { searchPOIByCoordinatesTool } from './search-poi-by-coordinates';
import { searchPOIBySquareTool } from './search-poi-by-square';

export async function initializeTools(env: Env): Promise<ToolRegistry> {
  // Initialize Amadeus client
  const amadeus = await getAmadeusClient(env);

  const registry: ToolRegistry = {
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
    flightChoicePredictionTool,
    hotelNameAutocompleteTool,
    citySearchTool,
    flightCheckInLinksTool,
    getPOIByIdTool,
    searchPOIByCoordinatesTool,
    searchPOIBySquareTool
  ];

  tools.forEach(tool => {
    registry.tools.push({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.schema
    });

    registry.handlers.set(tool.name, async (params, handlerEnv) => {
      try {
        return await tool.execute(params, handlerEnv || env);
      } catch (error) {
        console.error(`Error in tool ${tool.name}:`, error);
        throw error;
      }
    });
  });

  return registry;
}

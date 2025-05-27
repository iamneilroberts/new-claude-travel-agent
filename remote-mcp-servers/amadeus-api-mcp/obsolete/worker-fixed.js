// Fixed Amadeus MCP Server - Using proper MCP Agent pattern like D1

import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Amadeus API helper
class AmadeusAPI {
  constructor(env) {
    this.apiKey = env.AMADEUS_API_KEY;
    this.apiSecret = env.AMADEUS_API_SECRET;
    this.baseUrl = 'https://api.amadeus.com/v1';
    this.tokenUrl = 'https://api.amadeus.com/v1/security/oauth2/token';
    this.cache = env.CACHE;
  }

  async getAccessToken() {
    // Check cache first
    const cached = await this.cache?.get('amadeus_token');
    if (cached) {
      const { token, expires } = JSON.parse(cached);
      if (Date.now() < expires) {
        return token;
      }
    }

    // Get new token
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.apiKey,
        client_secret: this.apiSecret
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data = await response.json();
    const token = data.access_token;
    const expires = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer

    // Cache the token
    await this.cache?.put('amadeus_token', JSON.stringify({ token, expires }));

    return token;
  }

  async request(endpoint, params = {}) {
    const token = await this.getAccessToken();
    const url = new URL(`${this.baseUrl}${endpoint}`);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value);
      }
    });

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Amadeus API error: ${error}`);
    }

    return response.json();
  }
}

// Define our MCP agent with tools (similar to D1 pattern)
export class AmadeusMCP extends McpAgent {
  server = new McpServer({
    name: "Amadeus Travel MCP",
    version: "2.0.0",
  });

  async init() {
    // Test connection tool
    this.server.tool(
      "test_connection",
      {},
      async () => {
        try {
          const amadeus = new AmadeusAPI(this.env);
          await amadeus.getAccessToken();

          return {
            content: [{ type: "text", text: "Successfully connected to Amadeus API!" }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Failed to connect to Amadeus API: ${error.message}`
            }],
            isError: true
          };
        }
      }
    );

    // Search flights tool
    this.server.tool(
      "search_flights",
      {
        origin: z.string().describe("Departure IATA city/airport code"),
        destination: z.string().describe("Arrival IATA city/airport code"),
        date: z.string().describe("Departure date in YYYY-MM-DD format"),
        adults: z.number().optional().describe("Number of adult passengers"),
        returnDate: z.string().optional().describe("Return date for round trips"),
        travelClass: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']).optional().describe("Travel class")
      },
      async ({ origin, destination, date, adults = 1, returnDate, travelClass }) => {
        try {
          const amadeus = new AmadeusAPI(this.env);
          const params = {
            originLocationCode: origin,
            destinationLocationCode: destination,
            departureDate: date,
            adults: adults,
            travelClass: travelClass,
            currencyCode: 'USD',
            max: 10
          };

          if (returnDate) {
            params.returnDate = returnDate;
          }

          const data = await amadeus.request('/shopping/flight-offers', params);

          // Format the results
          const flights = data.data.map(offer => ({
            id: offer.id,
            price: offer.price.total,
            currency: offer.price.currency,
            segments: offer.itineraries.map(itinerary => ({
              departure: itinerary.segments[0].departure,
              arrival: itinerary.segments[itinerary.segments.length - 1].arrival,
              duration: itinerary.duration,
              stops: itinerary.segments.length - 1
            }))
          }));

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(flights, null, 2)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Error searching flights: ${error.message}`
            }],
            isError: true
          };
        }
      }
    );

    // Search hotels tool
    this.server.tool(
      "search_hotels",
      {
        city: z.string().describe("City name"),
        check_in: z.string().describe("Check-in date in YYYY-MM-DD format"),
        check_out: z.string().describe("Check-out date in YYYY-MM-DD format"),
        adults: z.number().optional().describe("Number of adult guests"),
        radius: z.number().optional().describe("Search radius in kilometers")
      },
      async ({ city, check_in, check_out, adults = 1, radius = 5 }) => {
        try {
          const amadeus = new AmadeusAPI(this.env);

          // First, get city coordinates
          const cityData = await amadeus.request('/reference-data/locations', {
            keyword: city,
            subType: 'CITY'
          });

          if (!cityData.data || cityData.data.length === 0) {
            throw new Error(`City not found: ${city}`);
          }

          const { latitude, longitude } = cityData.data[0].geoCode;

          // Search hotels
          const hotelData = await amadeus.request('/shopping/hotel-offers', {
            latitude,
            longitude,
            radius,
            checkInDate: check_in,
            checkOutDate: check_out,
            adults,
            currency: 'USD'
          });

          // Format results
          const hotels = hotelData.data.map(hotel => ({
            name: hotel.hotel.name,
            hotelId: hotel.hotel.hotelId,
            price: hotel.offers[0]?.price?.total,
            currency: hotel.offers[0]?.price?.currency
          }));

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(hotels, null, 2)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Error searching hotels: ${error.message}`
            }],
            isError: true
          };
        }
      }
    );
  }

  // Store environment for tools to access
  env = null;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // For SSE endpoints, use the MCP Agent's built-in SSE handling
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return AmadeusMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    // For regular MCP endpoints
    if (url.pathname === "/mcp") {
      return AmadeusMCP.serve("/mcp").fetch(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  },
};

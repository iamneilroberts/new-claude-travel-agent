// Simplified Amadeus MCP Server - Following D1 pattern

// Simple UUID v4 generator
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// Main worker handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Return 404 for ALL OAuth discovery endpoints (even without auth)
    // This prevents mcp-remote from trying OAuth flow
    if (url.pathname.includes('/.well-known/')) {
      return new Response('Not found', { 
        status: 404,
        headers: corsHeaders 
      });
    }

    // Handle SSE endpoints without auth
    if (url.pathname === '/sse' || url.pathname === '/sse/message') {
      return await handleSSE(request, env, ctx);
    }

    // Simple authorization check for other endpoints
    const authHeader = request.headers.get('Authorization');
    const expectedAuth = env.MCP_AUTH_KEY || 'amadeus-mcp-auth-key-2025';
    
    if (authHeader !== `Bearer ${expectedAuth}`) {
      return new Response('Unauthorized', { 
        status: 401,
        headers: corsHeaders 
      });
    }

    // Route to appropriate handler
    if (url.pathname === '/') {
      return handleHealth();
    } else if (url.pathname === '/health') {
      return handleHealth();
    } else if (url.pathname === '/mcp' || url.pathname === '/rpc') {
      return await handleJsonRpc(request, env);
    } else {
      return new Response('Not found', { 
        status: 404,
        headers: corsHeaders 
      });
    }
  }
};

// Health check endpoint
function handleHealth() {
  return new Response(JSON.stringify({
    status: 'ok',
    service: 'Amadeus API MCP',
    version: '2.0.0',
    endpoints: ['/mcp', '/rpc', '/sse']
  }), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

// Handle JSON-RPC requests
async function handleJsonRpc(request, env) {
  try {
    const body = await request.json();
    const response = await processJsonRpcRequest(body, env);
    
    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32700,
        message: 'Parse error',
        data: error.message
      }
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

// Handle SSE (Server-Sent Events)
async function handleSSE(request, env, ctx) {
  const url = new URL(request.url);
  
  // Handle incoming messages via POST to /sse/message
  if (url.pathname === '/sse/message' && request.method === 'POST') {
    try {
      const body = await request.json();
      
      // Extract callback URL from query parameters
      const callbackUrl = url.searchParams.get('callback');
      
      const response = await processJsonRpcRequest(body, env);
      
      // If we have a callback URL, send the response there
      if (callbackUrl) {
        try {
          await fetch(callbackUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            },
            body: JSON.stringify(response)
          });
          
          // Return 200 to acknowledge we received and forwarded the message
          return new Response('OK', {
            status: 200,
            headers: corsHeaders
          });
        } catch (callbackError) {
          // If callback fails, fall back to direct response
          console.error('Callback failed:', callbackError);
        }
      }
      
      // Fallback to direct response
      return new Response(JSON.stringify(response), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: 'Parse error',
          data: error.message
        }
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
  
  // For POST requests to /sse endpoint, return 404 to trigger SSE-only fallback
  if (url.pathname === '/sse' && request.method === 'POST') {
    return new Response('Not found', { 
      status: 404,
      headers: corsHeaders 
    });
  }
  
  // Handle SSE connection (GET to /sse)
  if (url.pathname === '/sse' && request.method === 'GET') {
    const sessionId = uuidv4();
    
    // Extract callback URL from query parameters
    const callbackUrl = url.searchParams.get('callback');
    
    // Create a TransformStream for SSE
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Send initial connection event with callback URL
    const connectionData = {
      jsonrpc: '2.0',
      method: 'connected',
      params: { 
        sessionId,
        ...(callbackUrl && { callbackUrl })
      }
    };
    
    writer.write(encoder.encode(`data: ${JSON.stringify(connectionData)}\n\n`));

    // Set up keep-alive
    const keepAlive = setInterval(() => {
      writer.write(encoder.encode(': keep-alive\n\n'));
    }, 30000);

    // Clean up on close
    ctx.waitUntil(
      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        writer.close();
      })
    );

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...corsHeaders
      }
    });
  }
  
  // Fallback for other methods/paths
  return new Response('Not found', { 
    status: 404,
    headers: corsHeaders 
  });
}

// Process JSON-RPC requests
async function processJsonRpcRequest(request, env) {
  const { method, params, id } = request;
  
  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'Amadeus Travel MCP',
            version: '2.0.0'
          }
        },
        id
      };
      
    case 'tools/list':
      return {
        jsonrpc: '2.0',
        result: {
          tools: getAmadeusTools()
        },
        id
      };
      
    case 'tools/call':
      return await handleToolCall(params, env, id);
      
    default:
      return {
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: `Method not found: ${method}`
        },
        id
      };
  }
}

// Get Amadeus tools list
function getAmadeusTools() {
  return [
    {
      name: 'test_connection',
      description: 'Tests if the Amadeus API is connected and working properly.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    },
    {
      name: 'search_flights',
      description: 'Searches for flight options between locations on specific dates using the Amadeus API.',
      inputSchema: {
        type: 'object',
        properties: {
          origin: {
            type: 'string',
            description: 'Departure IATA city/airport code'
          },
          destination: {
            type: 'string',
            description: 'Arrival IATA city/airport code'
          },
          date: {
            type: 'string',
            description: 'Departure date in YYYY-MM-DD format'
          },
          adults: {
            type: 'number',
            description: 'Number of adult passengers',
            default: 1
          },
          returnDate: {
            type: 'string',
            description: 'Return date for round trips'
          },
          travelClass: {
            type: 'string',
            enum: ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'],
            description: 'Travel class'
          }
        },
        required: ['origin', 'destination', 'date']
      }
    },
    {
      name: 'search_hotels',
      description: 'Searches for hotels in a specific location using the Amadeus API.',
      inputSchema: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: 'City name'
          },
          check_in: {
            type: 'string',
            description: 'Check-in date in YYYY-MM-DD format'
          },
          check_out: {
            type: 'string',
            description: 'Check-out date in YYYY-MM-DD format'
          },
          adults: {
            type: 'number',
            description: 'Number of adult guests',
            default: 1
          },
          radius: {
            type: 'number',
            description: 'Search radius in kilometers',
            default: 5
          }
        },
        required: ['city', 'check_in', 'check_out']
      }
    }
    // TODO: Add remaining tools after testing
  ];
}

// Handle tool calls
async function handleToolCall(params, env, requestId) {
  const { name, arguments: args } = params;
  
  try {
    let result;
    
    switch (name) {
      case 'test_connection':
        result = await testAmadeusConnection(env);
        break;
        
      case 'search_flights':
        result = await searchFlights(args, env);
        break;
        
      case 'search_hotels':
        result = await searchHotels(args, env);
        break;
        
      default:
        return {
          jsonrpc: '2.0',
          error: {
            code: -32602,
            message: `Unknown tool: ${name}`
          },
          id: requestId
        };
    }
    
    return {
      jsonrpc: '2.0',
      result,
      id: requestId
    };
  } catch (error) {
    return {
      jsonrpc: '2.0',
      result: {
        content: [{
          type: 'text',
          text: `Error: ${error.message}`
        }],
        isError: true
      },
      id: requestId
    };
  }
}

// Amadeus API helper
class AmadeusAPI {
  constructor(env) {
    this.apiKey = env.AMADEUS_API_KEY;
    this.apiSecret = env.AMADEUS_API_SECRET;
    this.baseUrl = 'https://api.amadeus.com';
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

// Tool implementations
async function testAmadeusConnection(env) {
  try {
    const amadeus = new AmadeusAPI(env);
    await amadeus.getAccessToken();
    
    return {
      content: [{
        type: 'text',
        text: 'Successfully connected to Amadeus API!'
      }]
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

async function searchFlights(args, env) {
  const amadeus = new AmadeusAPI(env);
  const { origin, destination, date, adults = 1, returnDate, travelClass } = args;
  
  try {
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
    
    const data = await amadeus.request('/v2/shopping/flight-offers', params);
    
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

async function searchHotels(args, env) {
  const amadeus = new AmadeusAPI(env);
  const { city, check_in, check_out, adults = 1, radius = 5 } = args;
  
  try {
    // First, get city IATA code
    const cityData = await amadeus.request('/v1/reference-data/locations', {
      keyword: city,
      subType: 'CITY'
    });
    
    if (!cityData.data || cityData.data.length === 0) {
      throw new Error(`City not found: ${city}`);
    }
    
    const cityCode = cityData.data[0].iataCode;
    
    // Get hotel IDs in the city
    const hotelListData = await amadeus.request('/v1/reference-data/locations/hotels/by-city', {
      cityCode: cityCode,
      radius: radius || 5,
      radiusUnit: 'KM'
    });
    
    if (!hotelListData.data || hotelListData.data.length === 0) {
      throw new Error(`No hotels found in: ${city}`);
    }
    
    // Get hotel IDs (limit to first 20 for API efficiency)
    const hotelIds = hotelListData.data.slice(0, 20).map(hotel => hotel.hotelId).join(',');
    
    // Search hotel offers
    const hotelData = await amadeus.request('/v3/shopping/hotel-offers', {
      hotelIds: hotelIds,
      checkInDate: check_in,
      checkOutDate: check_out,
      adults: adults || 1,
      roomQuantity: 1,
      currency: 'USD'
    });
    
    // Format results
    const hotels = hotelData.data.map(hotelOffer => ({
      name: hotelOffer.hotel.name,
      hotelId: hotelOffer.hotel.hotelId,
      cityCode: hotelOffer.hotel.cityCode,
      address: hotelOffer.hotel.address || 'Address not available',
      price: hotelOffer.offers?.[0]?.price?.total || 'Price not available',
      currency: hotelOffer.offers?.[0]?.price?.currency || 'USD',
      checkIn: hotelOffer.offers?.[0]?.checkInDate,
      checkOut: hotelOffer.offers?.[0]?.checkOutDate
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
// Simplified Clean D1 MCP Server with SSE keep-alive
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { v4 as uuidv4 } from 'uuid';

const app = new Hono();

// Enable CORS
app.use('*', cors());

// Authorization middleware
const authMiddleware = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return c.json({ error: 'No authorization header' }, 401);
  }
  // For D1, we don't require authorization but you can add it if needed
  await next();
};

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'Clean D1 Travel DB MCP',
    version: '0.1.0',
    description: 'Provides CRUD operations for the travel database via Cloudflare D1.',
    endpoints: ['/rpc', '/mcp', '/sse'],
    status: 'healthy'
  });
});

// Process JSON-RPC requests
async function processJsonRpcRequest(request, env) {
  const { DB } = env;

  switch (request.method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: { listChanged: true }
          },
          serverInfo: {
            name: 'Clean D1 Travel DB MCP',
            version: '0.1.0',
            description: 'Provides CRUD operations for the travel database via Cloudflare D1.'
          }
        },
        id: request.id
      };

    case 'tools/list':
      return {
        jsonrpc: '2.0',
        result: {
          tools: getToolsList()
        },
        id: request.id
      };

    case 'tools/call':
      return await handleToolCall(request.params, DB, request.id);

    case 'prompts/list':
    case 'resources/list':
      return {
        jsonrpc: '2.0',
        result: [],
        id: request.id
      };

    default:
      return {
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: `Method not found: ${request.method}`
        },
        id: request.id
      };
  }
}

// Handle tool calls
async function handleToolCall(params, DB, requestId) {
  const { name, arguments: args } = params;

  try {
    switch (name) {
      case 'create_client':
        return await createClient(args, DB, requestId);
      case 'get_client':
        return await getClient(args, DB, requestId);
      case 'update_client':
        return await updateClient(args, DB, requestId);
      case 'delete_client':
        return await deleteClient(args, DB, requestId);
      case 'create_trip':
        return await createTrip(args, DB, requestId);
      case 'get_trip':
        return await getTrip(args, DB, requestId);
      case 'update_trip':
        return await updateTrip(args, DB, requestId);
      case 'delete_trip':
        return await deleteTrip(args, DB, requestId);
      case 'search_clients':
        return await searchClients(args, DB, requestId);
      case 'search_trips':
        return await searchTrips(args, DB, requestId);
      case 'get_recent_activities':
        return await getRecentActivities(args, DB, requestId);
      case 'add_activity_log_entry':
        return await addActivityLogEntry(args, DB, requestId);
      case 'get_trip_daily_logistics':
        return await getTripDailyLogistics(args, DB, requestId);
      case 'get_trip_daily_activities':
        return await getTripDailyActivities(args, DB, requestId);
      case 'get_trip_day_summary':
        return await getTripDaySummary(args, DB, requestId);
      case 'get_upcoming_trips':
        return await getUpcomingTrips(args, DB, requestId);
      case 'get_comprehensive_trip_details':
        return await getComprehensiveTripDetails(args, DB, requestId);
      case 'general_d1_query':
        return await generalD1Query(args, DB, requestId);
      default:
        return {
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: `Tool not found: ${name}`
          },
          id: requestId
        };
    }
  } catch (error) {
    console.error(`Error in tool ${name}:`, error);
    return {
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal error',
        data: error.message
      },
      id: requestId
    };
  }
}

// Tool implementations
async function createClient(params, DB, requestId) {
  const sql = `
    INSERT INTO clients (
      first_name, last_name, email, phone, address, city, state,
      postal_code, country, date_of_birth, passport_number,
      passport_expiry, preferences, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;

  const bindings = [
    params.first_name,
    params.last_name,
    params.email || null,
    params.phone || null,
    params.address || null,
    params.city || null,
    params.state || null,
    params.postal_code || null,
    params.country || 'United States',
    params.date_of_birth || null,
    params.passport_number || null,
    params.passport_expiry || null,
    params.preferences || null,
    params.notes || null,
  ];

  const { success, meta } = await DB.prepare(sql).bind(...bindings).run();

  if (success && meta?.last_row_id) {
    return {
      jsonrpc: '2.0',
      result: {
        content: [{
          type: 'text',
          text: JSON.stringify({
            client_id: meta.last_row_id,
            status: 'success',
            message: 'Client created successfully.'
          })
        }]
      },
      id: requestId
    };
  } else {
    throw new Error('Failed to create client');
  }
}

async function getClient(params, DB, requestId) {
  const sql = 'SELECT * FROM clients WHERE client_id = ?;';
  const client = await DB.prepare(sql).bind(params.client_id).first();

  if (client) {
    return {
      jsonrpc: '2.0',
      result: {
        content: [{
          type: 'text',
          text: JSON.stringify(client)
        }]
      },
      id: requestId
    };
  } else {
    return {
      jsonrpc: '2.0',
      result: {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'not_found',
            message: `Client with ID ${params.client_id} not found.`
          })
        }]
      },
      id: requestId
    };
  }
}

// ... (Additional tool implementations would go here)

// Get tools list
function getToolsList() {
  return [
    {
      name: 'create_client',
      description: 'Creates a new client record in the travel database.',
      inputSchema: {
        type: 'object',
        properties: {
          first_name: { type: 'string', description: "Client's first name (required)" },
          last_name: { type: 'string', description: "Client's last name (required)" },
          email: { type: 'string', format: 'email', description: "Client's email address" },
          phone: { type: 'string', description: "Client's phone number" },
          address: { type: 'string', description: "Client's street address" },
          city: { type: 'string', description: "Client's city" },
          state: { type: 'string', description: "Client's state or province" },
          postal_code: { type: 'string', description: "Client's postal code" },
          country: { type: 'string', default: 'United States', description: "Client's country" },
          date_of_birth: { type: 'string', description: "Client's date of birth (e.g., YYYY-MM-DD)" },
          passport_number: { type: 'string', description: "Client's passport number" },
          passport_expiry: { type: 'string', description: "Client's passport expiry date (e.g., YYYY-MM-DD)" },
          preferences: { type: 'string', description: "Client's travel preferences (JSON string or text)" },
          notes: { type: 'string', description: 'Additional notes about the client' },
          idempotency_key: { type: 'string', description: 'Optional unique key to prevent duplicate creation on retry' }
        },
        required: ['first_name', 'last_name'],
        additionalProperties: false
      }
    },
    {
      name: 'get_client',
      description: "Retrieves a client's details by their ID.",
      inputSchema: {
        type: 'object',
        properties: {
          client_id: { type: 'integer', exclusiveMinimum: 0, description: 'The unique ID of the client to retrieve (required)' }
        },
        required: ['client_id'],
        additionalProperties: false
      }
    }
    // ... (Additional tools would be listed here)
  ];
}

// Standard JSON-RPC endpoint
app.post('/rpc', async (c) => {
  const request = await c.req.json();
  const response = await processJsonRpcRequest(request, c.env);
  return c.json(response);
});

// MCP endpoint (same as RPC)
app.post('/mcp', async (c) => {
  const request = await c.req.json();
  const response = await processJsonRpcRequest(request, c.env);
  return c.json(response);
});

// SSE endpoint with keep-alive
app.get('/sse', async (c) => {
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  // Send initial connection event
  await writer.write(encoder.encode(`data: ${JSON.stringify({
    jsonrpc: '2.0',
    method: 'connected',
    params: { sessionId: uuidv4() }
  })}\n\n`));

  // Process any pending request
  const requestBody = await c.req.text();
  if (requestBody) {
    try {
      const request = JSON.parse(requestBody);
      const response = await processJsonRpcRequest(request, c.env);
      await writer.write(encoder.encode(`data: ${JSON.stringify(response)}\n\n`));
    } catch (error) {
      console.error('Error processing SSE request:', error);
      const errorResponse = {
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: 'Parse error',
          data: error.message
        },
        id: null
      };
      await writer.write(encoder.encode(`data: ${JSON.stringify(errorResponse)}\n\n`));
    }
  }

  // Send pings to keep connection alive
  const pingInterval = setInterval(async () => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify({
        jsonrpc: '2.0',
        method: 'ping',
        params: { timestamp: Date.now() }
      })}\n\n`));
    } catch (error) {
      clearInterval(pingInterval);
    }
  }, 30000); // Send ping every 30 seconds

  // Clean up when connection closes
  c.executionCtx.waitUntil((async () => {
    try {
      await readable.pipeTo(new WritableStream({
        abort() {
          clearInterval(pingInterval);
          writer.close();
        }
      }));
    } catch (error) {
      console.error('Error in SSE stream:', error);
      clearInterval(pingInterval);
      writer.close();
    }
  })());

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    }
  });
});

// Export the Cloudflare Worker
export default {
  async fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  }
};

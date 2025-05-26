// Modular Amadeus MCP Server - Core worker with tool registry
import { initializeTools } from './tools/index.js';
import { AmadeusAPI } from './services/amadeus-client.js';

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
    if (url.pathname === '/' || url.pathname === '/health') {
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
          
          return new Response('OK', {
            status: 200,
            headers: corsHeaders
          });
        } catch (callbackError) {
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
      const toolRegistry = await initializeTools(env);
      return {
        jsonrpc: '2.0',
        result: {
          tools: toolRegistry.tools
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

// Handle tool calls
async function handleToolCall(params, env, requestId) {
  const { name, arguments: args } = params;
  
  try {
    const toolRegistry = await initializeTools(env);
    const handler = toolRegistry.handlers.get(name);
    
    if (!handler) {
      return {
        jsonrpc: '2.0',
        error: {
          code: -32602,
          message: `Unknown tool: ${name}`
        },
        id: requestId
      };
    }
    
    const result = await handler(args);
    
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
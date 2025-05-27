// Simplified MCP Server for Sequential Thinking
import { Hono } from 'hono';
import { cors } from 'hono/cors';

// Create Hono app
const app = new Hono();

// Configure CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// MCP implementation
const MCPServer = {
  name: 'Sequential Thinking MCP Server',
  version: '1.0.0',
  
  // Handle JSON-RPC 2.0 requests
  async handleRequest(request, context) {
    const { id, method, params = {} } = request;
    const { env, log } = context;
    
    try {
      // Initialize method
      if (method === 'initialize') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            name: this.name,
            version: this.version,
            protocol_version: '0.3.0'
          }
        };
      }
      
      // List tools method
      if (method === 'listTools') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: [
              {
                name: 'sequential_thinking',
                description: 'Perform structured, step-by-step reasoning about complex problems',
                schema: {
                  type: 'object',
                  properties: {
                    problem: {
                      type: 'string',
                      description: 'The problem or question to analyze'
                    },
                    context: {
                      type: 'string',
                      description: 'Additional context or information about the problem'
                    },
                    steps: {
                      type: 'number',
                      description: 'Maximum number of steps to use in the analysis',
                      default: 5,
                      minimum: 1,
                      maximum: 10
                    },
                    format: {
                      type: 'string',
                      description: 'Output format (markdown, text, structured)',
                      default: 'markdown',
                      enum: ['markdown', 'text', 'structured']
                    }
                  },
                  required: ['problem']
                }
              }
            ]
          }
        };
      }
      
      // Tool execution
      if (method.startsWith('tools/')) {
        const toolName = method.substring(6);
        
        if (toolName === 'sequential_thinking') {
          // Check required parameters
          if (!params.problem) {
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32602,
                message: 'Missing required parameter: problem'
              }
            };
          }
          
          // Parse options
          const problem = params.problem;
          const context = params.context || '';
          const steps = params.steps || 5;
          const format = params.format || 'markdown';
          
          // Mock sequential thinking process
          const thinking = {
            problem,
            context,
            steps: []
          };
          
          // Generate mock steps
          for (let i = 1; i <= steps; i++) {
            thinking.steps.push({
              step: i,
              title: `Step ${i}: ${['Identify key elements', 'Analyze relationships', 'Consider constraints', 'Explore alternatives', 'Evaluate solutions', 'Draw conclusions', 'Reflect on implications', 'Formulate action plan', 'Assess potential risks', 'Summarize findings'][i - 1] || 'Further analysis'}`,
              content: `This is simulated content for step ${i} of the sequential thinking process. In a real implementation, this would contain actual reasoning about the problem based on previous steps.`
            });
          }
          
          // Format the output
          let result;
          
          if (format === 'structured') {
            // Return structured JSON
            result = thinking;
          } else if (format === 'markdown') {
            // Format as markdown
            let markdown = `# Analysis: ${problem}\n\n`;
            
            if (context) {
              markdown += `## Context\n${context}\n\n`;
            }
            
            markdown += `## Sequential Analysis\n\n`;
            
            for (const step of thinking.steps) {
              markdown += `### ${step.title}\n${step.content}\n\n`;
            }
            
            markdown += `## Conclusion\nBased on the step-by-step analysis above, we can conclude that... (this is a simplified mock implementation).`;
            
            result = markdown;
          } else {
            // Plain text format
            let text = `ANALYSIS: ${problem}\n\n`;
            
            if (context) {
              text += `CONTEXT:\n${context}\n\n`;
            }
            
            text += `SEQUENTIAL ANALYSIS:\n\n`;
            
            for (const step of thinking.steps) {
              text += `${step.title}\n${step.content}\n\n`;
            }
            
            text += `CONCLUSION:\nBased on the step-by-step analysis above, we can conclude that... (this is a simplified mock implementation).`;
            
            result = text;
          }
          
          return {
            jsonrpc: '2.0',
            id,
            result
          };
        }
        
        // Unknown tool
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Unknown tool: ${toolName}`
          }
        };
      }
      
      // Unknown method
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`
        }
      };
    } catch (error) {
      console.error('Error handling request:', error);
      
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: 'Internal error',
          data: { reason: error.message }
        }
      };
    }
  }
};

// Function to create MCP RPC handlers for both /mcp and /rpc endpoints
function createMcpHandler(path) {
  app.post(path, async (c) => {
    // Authorization check
    const authToken = c.req.header('Authorization')?.replace('Bearer ', '') || 
                      c.req.header('X-API-Token');
    const expectedToken = c.env.MCP_AUTH_KEY;
    
    if (expectedToken && authToken !== expectedToken) {
      return c.json({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32001,
          message: 'Unauthorized',
          data: { reason: 'Invalid or missing API token' }
        }
      }, 401);
    }
    
    try {
      const request = await c.req.json();
      const response = await MCPServer.handleRequest(request, {
        env: c.env,
        log: console
      });
      return c.json(response);
    } catch (error) {
      console.error('Error handling MCP request:', error);
      return c.json({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Internal error',
          data: { reason: error.message }
        }
      }, 500);
    }
  });
}

// Create both /rpc and /mcp endpoints
createMcpHandler('/rpc');
createMcpHandler('/mcp');

// SSE endpoint for MCP
app.get('/sse', async (c) => {
  // Set SSE headers
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');
  
  // Authorization check
  const authToken = c.req.query('token') || 
                    c.req.header('Authorization')?.replace('Bearer ', '');
  const expectedToken = c.env.MCP_AUTH_KEY;
  
  if (expectedToken && authToken !== expectedToken) {
    return new Response(
      'event: error\ndata: {"message":"Unauthorized"}\n\n', 
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'WWW-Authenticate': 'Bearer'
        },
        status: 401
      }
    );
  }
  
  // Create response stream
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  
  // Send initial open event
  writer.write(encoder.encode('event: open\ndata: {}\n\n'));
  
  // Handle command if provided
  const url = new URL(c.req.url);
  const command = url.searchParams.get('command');
  
  if (command) {
    try {
      const request = JSON.parse(command);
      const response = await MCPServer.handleRequest(request, {
        env: c.env,
        log: console
      });
      writer.write(encoder.encode(`data: ${JSON.stringify(response)}\n\n`));
    } catch (error) {
      console.error('Error processing command:', error);
      const errorEvent = `data: ${JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Internal error',
          data: { reason: error.message }
        }
      })}\n\n`;
      writer.write(encoder.encode(errorEvent));
    }
  }
  
  // Send pings to keep connection alive
  let pingInterval = setInterval(() => {
    writer.write(encoder.encode('event: ping\ndata: {}\n\n'))
      .catch(() => {
        clearInterval(pingInterval);
      });
  }, 30000);
  
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    }
  });
});

// Default route
app.get('/', (c) => {
  return c.json({
    name: 'Sequential Thinking MCP Server',
    version: '1.0.0',
    description: 'MCP server for structured step-by-step reasoning'
  });
});

// Worker setup
export default {
  async fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  }
};
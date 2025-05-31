# MCP Server Development Template

This template ensures all MCP servers follow the established patterns for mcp-use compatibility.

## ✅ CRITICAL SUCCESS FACTORS - VERIFIED 2025-05-31

**ALL 8 CLOUDFLARE MCP SERVERS NOW WORKING** - Use these exact patterns:

### Environment Access Pattern (CRITICAL)
```typescript
// ✅ WORKING - Use this exact pattern
const env = (this as any).env as Env;

// ❌ BROKEN - Do not use
const env = this.env as Env;
const env = this.env;
```

### McpAgent Framework Pattern
- ✅ **ALL servers use McpAgent framework** (agents package ^0.0.93)
- ✅ **Inline Zod schemas** work perfectly (see google-places-api-mcp)
- ✅ **SSE endpoints** via `serveSSE("/sse")` are the standard
- ✅ **Environment access** requires `(this as any).env as Env` pattern

## Common Issues & Fixes

Based on CHANGELOG.md and recent commits, these are the most common issues when creating/fixing MCP servers:

### 1. Protocol Version Fix
**Issue**: Using outdated protocol version ("2025-03-26" or similar)
**Fix**: Always use `"2024-11-05"`

### 2. Schema Issues  
**Issue**: Empty schemas `{}` or Zod internal structure (`_def`, `~standard`) returned to Claude Desktop
**Fix**: Use proper Zod schemas with `.describe()` for all parameters

**CRITICAL**: Schema conversion must happen automatically in McpAgent framework. If you see Zod internal structure in Claude Desktop logs, check:
- Ensure using `agents` package version `^0.0.93`
- Use inline Zod schemas directly in `this.server.tool()` calls
- Do NOT use `zodToJsonSchema()` explicitly - framework handles conversion
- Compare with working servers like `google-places-api-mcp`

### 3. Missing Tool Imports
**Issue**: Tool files exist but not imported in `tools/index.ts`
**Fix**: Ensure all tools are imported and added to the tools array

### 4. McpAgent Framework
**Issue**: Not using McpAgent framework consistently
**Fix**: Extend McpAgent, use McpServer, implement proper init()

### 5. Authentication Issues
**Issue**: Inconsistent auth token handling
**Fix**: Use standardized MCP_AUTH_KEY pattern with proper env interface

### 6. Deployment Patterns
**Issue**: McpAgent constructor and export pattern errors
**Fix**: Use exact pattern from working servers:
- Export: `export default { fetch: ... }`
- SSE endpoints: `ServerClass.serveSSE("/sse").fetch(request, env, ctx)`
- Environment access: `const env = this.env as Env;` in init()

### 7. Schema Debugging
**Issue**: Cannot determine why schemas fail conversion
**Fix**: Check Claude Desktop logs for schema format:
- Working: `"inputSchema":{"type":"object","properties":...}`
- Broken: `"inputSchema":{"_def":{"unknownKeys":"strip"...}}`
- Compare dependencies in `package.json` with working servers

## File Structure Template

```
your-mcp-server/
├── src/
│   ├── index.ts          # Main server file
│   ├── client.ts         # API client (if needed)
│   └── types.ts          # Type definitions
├── tools/
│   ├── index.ts          # Tool registry
│   ├── tool1.ts          # Individual tool files
│   └── tool2.ts
├── package.json
├── tsconfig.json
├── wrangler.toml
└── worker-mcpagent.js    # Deployment script
```

## Template Files

### 1. src/index.ts (Main Server - Inline Pattern)

**RECOMMENDED**: Use inline Zod schemas (proven to work)

```typescript
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

interface Env {
  // Add your environment variables here
  API_KEY: string;
  MCP_AUTH_KEY: string;
}

export class YourServiceMCP extends McpAgent {
  server = new McpServer({
    name: "Your Service MCP",
    version: "1.0.0",
  });

  async init() {
    const env = (this as any).env as Env;

    try {
      console.log("Initializing Your Service MCP server...");

      // Example tool with inline Zod schema (PROVEN PATTERN)
      this.server.tool(
        'example_tool',
        {
          query: z.string().describe('Search query or input text'),
          limit: z.number().min(1).max(100).optional().describe('Maximum results to return'),
          format: z.enum(["json", "text"]).optional().describe('Output format')
        },
        async (params) => {
          try {
            // Your tool logic here
            const result = await yourApiCall(params.query, env.API_KEY);
            
            return {
              content: [{
                type: "text",
                text: JSON.stringify(result)
              }]
            };
          } catch (error) {
            console.error(`Error in 'example_tool':`, error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ 
                  status: "error", 
                  message: error instanceof Error ? error.message : 'Unknown error' 
                })
              }]
            };
          }
        }
      );

      console.log("MCP server initialized with all tools");
    } catch (error) {
      console.error("Failed to initialize MCP server:", error);
      throw error;
    }
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'Your Service MCP',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // SSE endpoints (primary)
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return YourServiceMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    // Default 404 response
    return new Response(JSON.stringify({
      error: "Not found",
      available_endpoints: ["/health", "/sse"]
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  },
};
```

### 1b. src/index.ts (External Tools Pattern - TROUBLESOME)

**WARNING**: This pattern has schema conversion issues - use only if inline pattern cannot work

```typescript
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { initializeTools } from "../tools/index.js";

interface Env {
  API_KEY: string;
  MCP_AUTH_KEY: string;
}

export class YourServiceMCP extends McpAgent {
  server = new McpServer({
    name: "Your Service MCP",
    version: "1.0.0",
  });

  async init() {
    try {
      console.log("Initializing Your Service MCP server...");

      const toolRegistry = await initializeTools(this.env as Env);

      // Register all tools with proper schemas
      toolRegistry.tools.forEach(tool => {
        this.server.tool(
          tool.name,
          tool.description,
          tool.inputSchema,  // This may cause Zod internal structure issues
          async (params: any) => {
            const handler = toolRegistry.handlers.get(tool.name);
            if (!handler) {
              throw new Error(`No handler found for tool: ${tool.name}`);
            }

            console.log(`Executing ${tool.name} with params:`, JSON.stringify(params, null, 2));
            const result = await handler(params, this.env);
            console.log(`Successfully executed ${tool.name}`);

            return result;
          }
        );
      });

      console.log(`Successfully registered ${toolRegistry.tools.length} tools:`);
      toolRegistry.tools.forEach(tool => {
        console.log(`  - ${tool.name}: ${tool.description}`);
      });

    } catch (error) {
      console.error('Failed to initialize tools:', error);

      // Fallback health check tool
      this.server.tool(
        "health_check",
        {},
        async () => ({
          content: [{
            type: "text",
            text: `Your Service MCP server is running but tool initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        })
      );
    }
  }
}

// Default export for Cloudflare Worker
export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'Your Service MCP',
        version: '1.0.0',
        tools: [
          'list_your_tools_here'
        ],
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // SSE endpoints (primary)
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return YourServiceMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    // MCP endpoint (fallback)
    if (url.pathname === "/mcp") {
      return YourServiceMCP.serve("/mcp").fetch(request, env, ctx);
    }

    // Default 404 response
    return new Response(JSON.stringify({
      error: "Not found",
      available_endpoints: ["/health", "/sse", "/mcp"]
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  },
};
```

### 2. tools/index.ts (Tool Registry)

```typescript
import { z } from "zod";

// Import all your tools
import { tool1 } from "./tool1.js";
import { tool2 } from "./tool2.js";

export interface ToolRegistry {
  tools: Array<{
    name: string;
    description: string;
    inputSchema: any;
  }>;
  handlers: Map<string, (params: any, env: any) => Promise<any>>;
}

export async function initializeTools(env: any): Promise<ToolRegistry> {
  const registry: ToolRegistry = {
    tools: [],
    handlers: new Map(),
  };

  // All tools in your service
  const tools = [
    tool1,
    tool2,
    // Add more tools here
  ];

  // Register each tool
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
        console.error(`Error executing ${tool.name}:`, error);
        return {
          content: [{
            type: "text",
            text: `Error executing ${tool.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    });
  });

  console.log(`Registered ${tools.length} tools`);
  return registry;
}
```

### 3. tools/example-tool.ts (Individual Tool)

```typescript
import { z } from "zod";

export const exampleTool = {
  name: "example_tool",
  description: "Example tool description explaining what it does",
  schema: z.object({
    param1: z.string().describe("Description of parameter 1"),
    param2: z.number().optional().describe("Optional parameter description"),
    param3: z.enum(["option1", "option2"]).optional().describe("Enum parameter with options"),
  }),

  async execute(params: any, env: any) {
    try {
      // Your tool logic here
      const result = await yourApiCall(params, env);

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      console.error(`Error in example_tool:`, error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ 
            status: "error", 
            message: error instanceof Error ? error.message : 'Unknown error' 
          })
        }],
        isError: true
      };
    }
  }
};

async function yourApiCall(params: any, env: any) {
  // Implement your API call logic
  // Always use proper error handling
  // Include authentication headers if needed
  
  const response = await fetch('your-api-endpoint', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.API_KEY}`,
      'Content-Type': 'application/json',
      // Add any other required headers
    },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}
```

### 4. wrangler.toml (Cloudflare Configuration)

```toml
name = "your-service-mcp"
main = "src/index.ts"
compatibility_date = "2024-10-02"
compatibility_flags = ["nodejs_compat"]

[env.production]
vars = { MCP_AUTH_KEY = "your-service-auth-2025" }

[[migrations]]
tag = "v1"
new_classes = ["YourServiceMCP"]

[[durable_objects.bindings]]
name = "MCP_OBJECT" 
class_name = "YourServiceMCP"
```

### 5. package.json

```json
{
  "name": "your-service-mcp",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "build": "tsc"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.3",
    "agents": "^0.0.93",
    "zod": "^3.23.8",
    "zod-to-json-schema": "^3.23.5"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241022.0",
    "typescript": "^5.6.3",
    "wrangler": "^3.84.0"
  }
}
```

### 6. tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/**/*", "tools/**/*"]
}
```

## Deployment Checklist

### Before Deployment
- [ ] All tools imported in `tools/index.ts`
- [ ] Proper Zod schemas with `.describe()` for all parameters
- [ ] Error handling in all tool execute functions
- [ ] Environment variables defined in Env interface
- [ ] wrangler.toml configured with correct durable object class
- [ ] Health endpoint returns correct tool list

### After Deployment
- [ ] Test health endpoint: `curl https://your-service.workers.dev/health`
- [ ] Check logs for successful tool registration
- [ ] Add to mcp-use production_config.json
- [ ] Update claude_desktop_config.json if needed
- [ ] Test tools through Claude Desktop
- [ ] Update CHANGELOG.md with deployment info

## Testing Commands

```bash
# Local development
npm run dev

# Deploy to Cloudflare
npm run deploy

# Test health endpoint
curl https://your-service-mcp.workers.dev/health

# Test SSE endpoint (requires auth)
curl -H "Authorization: Bearer your-auth-token" \
     https://your-service-mcp.workers.dev/sse
```

## Common Debugging

### Server Shows as Disabled
1. Check input schemas - look for `_def` or `~standard` in logs
2. Verify all tools are imported in tools/index.ts
3. Ensure proper tool registration with description and schema
4. Check authentication token matches production_config.json

### Tools Not Available
1. Verify tool execute() functions return proper format
2. Check error handling doesn't swallow exceptions
3. Ensure async/await patterns are correct
4. Check API keys and environment variables

### Authentication Errors
1. Verify MCP_AUTH_KEY in wrangler.toml matches production_config.json
2. Check headers in production_config.json
3. Ensure environment variables are properly set

## Integration with mcp-use

Add to `/mcptools/mcp-use/production_config.json`:

```json
{
  "mcpServers": {
    "your-service": {
      "url": "https://your-service-mcp.workers.dev/sse",
      "headers": {
        "Authorization": "Bearer your-service-auth-2025"
      }
    }
  }
}
```

## Troubleshooting Schema Issues

### Diagnosing Schema Problems

1. **Check Claude Desktop Logs**:
   ```bash
   tail -f ~/.config/Claude/logs/mcp-server-your-service.log
   ```

2. **Look for Schema Format**:
   - ✅ **Working**: `"inputSchema":{"type":"object","properties":{"param":{"type":"string"}}}`
   - ❌ **Broken**: `"inputSchema":{"_def":{"unknownKeys":"strip","typeName":"ZodObject"}}`

3. **Compare with Working Server**:
   ```bash
   # Check google-places (known working)
   grep -A5 '"inputSchema"' ~/.config/Claude/logs/mcp-server-google-places-api.log
   
   # Check your server
   grep -A5 '"inputSchema"' ~/.config/Claude/logs/mcp-server-your-service.log
   ```

### Common Schema Fixes

1. **If seeing Zod internal structure**:
   - Revert to inline Zod schemas in `this.server.tool()` calls
   - Remove any `zodToJsonSchema()` conversions
   - Ensure using exact pattern from `google-places-api-mcp`

2. **If tools not appearing in Claude Desktop**:
   - Check protocol version is `"2024-11-05"`
   - Verify authentication token matches production_config.json
   - Restart Claude Desktop completely

3. **If deployment errors**:
   - Check Durable Object migrations in wrangler.toml
   - Ensure export pattern matches working servers
   - Verify environment bindings in wrangler.toml

### Emergency Recovery

If server completely broken:
1. Copy working server (google-places-api-mcp) as base
2. Replace API calls with your service
3. Keep exact same schema and export patterns
4. Deploy and test incrementally

### Dependency Verification

Ensure exact versions match working servers:
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.11.4",
    "agents": "^0.0.93",
    "zod": "^3.25.16"
  }
}
```

This template ensures consistency with the established McpAgent framework, proper Zod schema usage, and mcp-use compatibility patterns used throughout the project.
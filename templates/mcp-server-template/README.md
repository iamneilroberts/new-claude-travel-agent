# Your Service MCP Server Template

This is a working template for creating Cloudflare MCP servers that connect reliably to Claude Desktop through the mcp-use bridge.

## ✅ Verified Working Pattern

This template is based on the successful patterns documented in `/doc/MCP_SERVER_TEMPLATE.md` and uses the exact same approach as the working servers in this project.

## Key Features

- ✅ **McpAgent Framework**: Uses proven `agents@0.0.93` framework
- ✅ **Inline Zod Schemas**: Direct schema definition in `this.server.tool()` calls
- ✅ **Required MCP Handlers**: Includes prompts/list, resources/list, resources/templates/list
- ✅ **SSE Endpoints**: Primary connection method for mcp-use bridge
- ✅ **Environment Access**: Uses `(this as any).env as Env` pattern
- ✅ **Error Handling**: Comprehensive error handling and fallback tools
- ✅ **Health Checks**: Built-in health and status endpoints

## Quick Start

1. **Copy this template to your new server directory:**
   ```bash
   cp -r templates/mcp-server-template remote-mcp-servers/your-new-server
   cd remote-mcp-servers/your-new-server
   ```

2. **Customize for your service:**
   - Update `package.json` name and description
   - Update `wrangler.toml` name and class references
   - Modify `src/index.ts` to add your specific tools
   - Add your environment variables to the `Env` interface

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Test locally:**
   ```bash
   npm run dev
   ```

5. **Deploy to Cloudflare:**
   ```bash
   npm run deploy
   ```

6. **Test deployment:**
   ```bash
   curl https://your-server-name.your-subdomain.workers.dev/health
   ```

## Adding Your Tools

Replace the example tools in `src/index.ts` with your specific functionality:

```typescript
this.server.tool(
  'your_tool_name',
  {
    // Define parameters with Zod schemas
    param1: z.string().describe('Description of parameter'),
    param2: z.number().optional().describe('Optional parameter'),
  },
  async (params) => {
    try {
      // Your tool logic here
      const result = await yourApiCall(params, env);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result)
        }]
      };
    } catch (error) {
      console.error('Error in your_tool_name:', error);
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
```

## Environment Variables

Add your environment variables in three places:

1. **TypeScript Interface** (`src/index.ts`):
   ```typescript
   interface Env {
     YOUR_API_KEY: string;
     MCP_AUTH_KEY: string;
   }
   ```

2. **Wrangler Config** (`wrangler.toml`):
   ```toml
   [vars]
   YOUR_API_KEY = "development-key"
   MCP_AUTH_KEY = "your-auth-key-2025"
   ```

3. **Production Secrets** (use wrangler CLI):
   ```bash
   echo "your-production-key" | wrangler secret put YOUR_API_KEY
   ```

## Integration with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "your-service": {
      "command": "npx",
      "args": [
        "mcp-use",
        "https://your-server-name.your-subdomain.workers.dev/sse"
      ],
      "env": {
        "MCP_AUTH_TOKEN": "your-auth-key-2025"
      }
    }
  }
}
```

Or add to `/mcptools/mcp-use/production_config.json` for the mcp-use bridge:

```json
{
  "mcpServers": {
    "your-service": {
      "url": "https://your-server-name.your-subdomain.workers.dev/sse",
      "headers": {
        "Authorization": "Bearer your-auth-key-2025"
      }
    }
  }
}
```

## Troubleshooting

### Server not connecting to Claude Desktop
1. Check that all required MCP protocol handlers are implemented
2. Verify the authentication token matches between server and client
3. Check Cloudflare logs: `wrangler tail your-server-name`

### Tools not appearing
1. Ensure Zod schemas use `.describe()` for all parameters
2. Check for schema conversion issues in Claude Desktop logs
3. Verify tools are properly registered in the `init()` method

### Deployment errors
1. Check Durable Object class names match between `wrangler.toml` and TypeScript
2. Ensure `worker-mcpagent.js` exports match the class names
3. Verify all dependencies are properly installed

## Reference

- **Working Template Documentation**: `/doc/MCP_SERVER_TEMPLATE.md`
- **Migration Guide**: `/doc/MCP_MIGRATION_GUIDE.md`
- **Working Examples**: `/remote-mcp-servers/google-places-api-mcp/`
- **Project Instructions**: `/CLAUDE.md`
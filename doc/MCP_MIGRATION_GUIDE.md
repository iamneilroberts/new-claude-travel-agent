# MCP Server Migration Guide

## Executive Summary

This guide provides a comprehensive migration strategy for moving MCP servers from `/home/neil/dev/claude-travel-chat/remote_mcp_servers` to `/home/neil/dev/new-claude-travel-agent/remote-mcp-servers`, based on lessons learned from the successful Amadeus API MCP implementation.

## Critical Success Patterns (From Amadeus Implementation)

### 1. **Use McpAgent Framework - Never Manual SSE**
```javascript
// ✅ WORKING PATTERN
import { McpAgent } from "agents/mcp";
export class YourMCP extends McpAgent {
  server = new McpServer({ name: "Your Service", version: "1.0.0" });
  async init() {
    // Register tools here
  }
}
```

**Key Insight:** Manual SSE implementations fail MCP handshake. McpAgent handles the complex protocol coordination.

### 2. **agents@0.0.93+ Required**
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.11.4",
    "agents": "^0.0.93",  // ⚠️ CRITICAL: Must be 0.0.93+
    "zod": "^3.25.16"
  }
}
```

**Critical:** agents@0.0.90 has "Invalid binding" errors. Issue #294 in cloudflare/agents resolved in 0.0.93.

### 3. **Cloudflare Workers Configuration**
```toml
# wrangler.toml
name = "your-mcp-server"
main = "worker-mcpagent.js"  # Points to compiled JS
compatibility_date = "2025-05-25"
compatibility_flags = ["nodejs_compat"]  # REQUIRED

[durable_objects]
bindings = [
  { class_name = "YourMCP", name = "MCP_OBJECT" }
]

[[migrations]]
tag = "v1"
new_sqlite_classes = [ "YourMCP" ]  # Use sqlite for free plan

[vars]
MCP_AUTH_KEY = "your-auth-key-2025"
```

### 4. **Modular Tool Architecture**
```typescript
// tools/index.ts - Successful pattern from Amadeus
export async function initializeTools(env: Env): Promise<ToolRegistry> {
  const registry: ToolRegistry = {
    tools: [],
    handlers: new Map(),
    client: await getClient(env)
  };
  
  const tools = [
    tool1, tool2, tool3  // Import individual tools
  ];
  
  tools.forEach(tool => {
    registry.tools.push({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.schema
    });
    
    registry.handlers.set(tool.name, async (params) => {
      return await tool.execute(params, env);
    });
  });
  
  return registry;
}
```

### 5. **Worker Structure**
```javascript
// worker-mcpagent.js
export default {
  fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'Your MCP',
        version: '1.0.0'
      }));
    }
    
    // SSE endpoints (primary)
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return YourMCP.serveSSE("/sse").fetch(request, env, ctx);
    }
    
    // MCP endpoint (fallback)
    if (url.pathname === "/mcp") {
      return YourMCP.serve("/mcp").fetch(request, env, ctx);
    }
    
    return new Response("Not found", { status: 404 });
  },
};
```

## Migration Priority Levels

### Priority 1: Must Have (Easy)
1. **fetch/http-fetch-mcp** - Basic HTTP requests
2. **github-mcp** - Repository integration

### Priority 2: Need for Full Function
3. **template-document-mcp** - Document generation

### Priority 3: Low Priority (Easy)
4. **sequential-thinking-mcp** - Workflow management

### Priority 4: Complex Feature
5. **cloudflare-unified-gallery** - Photo integration
   - Includes google-places-api-mcp integration
   - Includes r2-storage-mcp for image storage

## Step-by-Step Migration Process

### Phase 1: Preparation

1. **Create standardized directory structure:**
```bash
cd /home/neil/dev/new-claude-travel-agent/remote-mcp-servers
mkdir -p {fetch-mcp,github-mcp,template-document-mcp,sequential-thinking-mcp,unified-gallery-mcp}
```

2. **Update each server package.json:**
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.11.4",
    "agents": "^0.0.93",
    "zod": "^3.25.16"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "typescript": "^5.8.3",
    "wrangler": "^4.16.0"
  },
  "scripts": {
    "deploy": "wrangler deploy",
    "dev": "wrangler dev",
    "type-check": "tsc --noEmit"
  }
}
```

### Phase 2: Individual Server Migration

#### For each server:

1. **Copy and restructure source code:**
```bash
# Copy the TypeScript source
cp -r /old/path/server-name/src /new/path/server-name/src

# Copy configuration
cp /old/path/server-name/package.json /new/path/server-name/
cp /old/path/server-name/tsconfig.json /new/path/server-name/
```

2. **Update package.json dependencies** (see above)

3. **Create new wrangler.toml** using the successful pattern:
```toml
name = "server-name-mcp"
main = "worker-mcpagent.js"
compatibility_date = "2025-05-25"
compatibility_flags = ["nodejs_compat"]

[durable_objects]
bindings = [
  { class_name = "ServerNameMCP", name = "MCP_OBJECT" }
]

[[migrations]]
tag = "v1"
new_sqlite_classes = [ "ServerNameMCP" ]

[vars]
# Add any environment variables needed
```

4. **Refactor to McpAgent pattern:**
```typescript
// src/index.ts
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { initializeTools } from "./tools/index.js";

export class ServerNameMCP extends McpAgent {
  server = new McpServer({
    name: "Server Name MCP",
    version: "1.0.0",
  });

  async init() {
    const env = this.env;
    
    try {
      const toolRegistry = await initializeTools(env);
      
      toolRegistry.tools.forEach(tool => {
        this.server.tool(
          tool.name,
          tool.inputSchema.properties || {},
          async (params) => {
            const handler = toolRegistry.handlers.get(tool.name);
            if (!handler) {
              throw new Error(`No handler found for tool: ${tool.name}`);
            }
            return await handler(params);
          }
        );
      });
      
      console.log(`Registered ${toolRegistry.tools.length} tools`);
    } catch (error) {
      console.error('Failed to initialize tools:', error);
      
      // Fallback tool
      this.server.tool("health_check", {}, async () => ({
        content: [{ 
          type: "text", 
          text: "Server initialized but tool loading failed" 
        }],
        isError: true
      }));
    }
  }
}

export default {
  fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'Server Name MCP',
        version: '1.0.0'
      }));
    }
    
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return ServerNameMCP.serveSSE("/sse").fetch(request, env, ctx);
    }
    
    if (url.pathname === "/mcp") {
      return ServerNameMCP.serve("/mcp").fetch(request, env, ctx);
    }
    
    return new Response("Not found", { status: 404 });
  },
};
```

5. **Compile and deploy:**
```bash
npm install
npm run type-check
wrangler deploy
```

6. **Test deployment:**
```bash
curl https://server-name-mcp.yourworker.workers.dev/health
```

### Phase 3: Claude Desktop Integration

1. **Add to claude_desktop_config.json:**
```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://server-name-mcp.yourworker.workers.dev/sse"
      ],
      "env": {
        "MCP_AUTH_TOKEN": "your-auth-token"
      }
    }
  }
}
```

2. **Test in Claude Desktop** - should see server connect and tools available

## Server-Specific Migration Notes

### 1. fetch-mcp / http-fetch-mcp
- **Complexity:** Low
- **Dependencies:** None
- **Special considerations:** Basic HTTP tools, straightforward migration

### 2. github-mcp
- **Complexity:** Low
- **Dependencies:** GitHub API token
- **Special considerations:** May need OAuth for advanced features

### 3. template-document-mcp
- **Complexity:** Medium
- **Dependencies:** Document templates, possibly GitHub integration
- **Special considerations:** File generation and storage patterns

### 4. sequential-thinking-mcp
- **Complexity:** Low
- **Dependencies:** None
- **Special considerations:** Workflow state management

### 5. unified-gallery-mcp
- **Complexity:** High
- **Dependencies:** 
  - google-places-api-mcp (Google Places API)
  - r2-storage-mcp (Cloudflare R2)
  - D1 database for metadata
- **Special considerations:** 
  - Multi-service integration
  - Image processing and storage
  - Complex UI components

## Common Migration Pitfalls

### ❌ Don't Do This
1. **Manual SSE implementation** - Use McpAgent
2. **agents@0.0.90 or older** - Must use 0.0.93+
3. **Missing nodejs_compat flag** - Required for TypeScript
4. **new_classes instead of new_sqlite_classes** - Free plan requires SQLite
5. **Pointing wrangler.toml to TypeScript files** - Must point to compiled JS

### ✅ Do This
1. Use McpAgent framework consistently
2. Update to agents@0.0.93+
3. Include all required compatibility flags
4. Use SQLite for durable objects on free plan
5. Point configuration to compiled JavaScript files

## Testing Strategy

1. **Local development:**
```bash
wrangler dev
```

2. **Health check test:**
```bash
curl https://your-server.workers.dev/health
```

3. **MCP protocol test:**
```bash
npx @modelcontextprotocol/inspector https://your-server.workers.dev/sse
```

4. **Claude Desktop integration test** - Add to config and verify connection

## Success Metrics

- ✅ Server deploys without errors
- ✅ Health endpoint returns 200
- ✅ MCP inspector can connect
- ✅ Claude Desktop shows "connected successfully"
- ✅ Tools are visible and functional in Claude conversations

## Rollback Strategy

If migration fails:
1. Remove from claude_desktop_config.json
2. Restart Claude Desktop
3. Debug using wrangler logs
4. Check against successful Amadeus patterns
5. Verify agents package version

## Maintenance

1. **Monitor deployments:**
```bash
wrangler tail server-name-mcp
```

2. **Update dependencies regularly:**
```bash
npm update
```

3. **Test after Claude Desktop updates:**
- Verify connections still work
- Check for new MCP protocol requirements

## Resources

- **Successful Reference:** `/remote-mcp-servers/amadeus-api-mcp/`
- **Configuration Guide:** `/config/AMADEUS_MCP_SUCCESS_SUMMARY.md`
- **Cloudflare Agents Docs:** https://developers.cloudflare.com/workers/runtime-apis/ai/
- **MCP Protocol Docs:** https://modelcontextprotocol.io/

---

*This migration guide is based on the successful implementation of the Amadeus API MCP server, which went from 2 tools to 16 tools and is currently deployed at https://amadeus-api-mcp.somotravel.workers.dev*
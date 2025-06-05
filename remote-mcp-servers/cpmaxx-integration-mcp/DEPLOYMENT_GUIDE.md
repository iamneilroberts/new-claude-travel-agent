# CPMaxx Integration MCP Server - Deployment Guide

This guide walks you through deploying the CPMaxx Integration MCP Server to Cloudflare Workers.

## Prerequisites

1. **Cloudflare Account**: Free tier is sufficient for development/testing
2. **Wrangler CLI**: Install with `npm install -g wrangler`
3. **Node.js**: Version 18 or higher
4. **CPMaxx Credentials**: Valid login credentials for the CPMaxx portal

## Quick Start

### 1. Install Dependencies

```bash
cd /home/neil/dev/new-claude-travel-agent/remote-mcp-servers/cpmaxx-integration-mcp
npm install
```

### 2. Authenticate with Cloudflare

```bash
wrangler login
```

### 3. Set Environment Variables

Set your CPMaxx credentials and authentication key:

```bash
wrangler secret put CP_CENTRAL_LOGIN
# Enter your CPMaxx username when prompted

wrangler secret put CP_CENTRAL_PASSWORD  
# Enter your CPMaxx password when prompted

wrangler secret put MCP_AUTH_KEY
# Enter a secure authentication key for MCP access
```

### 4. Build and Deploy

```bash
npm run build
npm run deploy
```

### 5. Test Deployment

```bash
# Test with the included test script
node test-server.js --url https://your-worker-name.your-subdomain.workers.dev

# Or test manually
curl https://your-worker-name.your-subdomain.workers.dev/health
```

## Detailed Deployment Steps

### Step 1: Project Setup

Ensure you're in the correct directory:
```bash
cd /home/neil/dev/new-claude-travel-agent/remote-mcp-servers/cpmaxx-integration-mcp
```

Install dependencies:
```bash
npm install
```

### Step 2: Configure Wrangler

Update `wrangler.toml` if needed:
```toml
name = "cpmaxx-integration-mcp"  # Change this to your preferred worker name
main = "dist/index.js"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[vars]
CPMAXX_BASE_URL = "https://cpmaxx.cruiseplannersnet.com"
```

### Step 3: Environment Variables

Set required secrets:

```bash
# CPMaxx portal credentials
wrangler secret put CP_CENTRAL_LOGIN
wrangler secret put CP_CENTRAL_PASSWORD

# MCP authentication key (generate a secure random string)
wrangler secret put MCP_AUTH_KEY

# Optional: Custom base URL if different
wrangler secret put CPMAXX_BASE_URL
```

### Step 4: Build TypeScript

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### Step 5: Deploy to Cloudflare Workers

```bash
npm run deploy
```

This will:
- Upload your worker code to Cloudflare
- Set up the routing
- Provide you with a worker URL

### Step 6: Verify Deployment

Test the health endpoint:
```bash
curl https://your-worker-name.your-subdomain.workers.dev/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "CPMaxx Integration MCP",
  "version": "1.0.0",
  "tools": [
    "cpmaxx_search_hotels",
    "cpmaxx_search_cars", 
    "cpmaxx_search_packages",
    "cpmaxx_health_check"
  ],
  "endpoints": ["/health", "/sse", "/mcp"],
  "timestamp": "2025-06-03T..."
}
```

## Integration with Claude Desktop

### Add to Claude Desktop Config

Add the following to your `~/.config/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cpmaxx-integration": {
      "command": "node",
      "args": [
        "/path/to/mcp-use", 
        "https://your-worker-name.your-subdomain.workers.dev/sse"
      ],
      "env": {}
    }
  }
}
```

### Using mcp-use Bridge

If you're using the mcp-use bridge (recommended):

```bash
# Install mcp-use if not already installed
cd /home/neil/dev/new-claude-travel-agent/mcptools/mcp-use
pip install -e .

# Update Claude Desktop config to use mcp-use
```

## Testing the Deployment

### Automated Testing

Use the included test script:

```bash
# Basic test
node test-server.js

# Test specific URL
node test-server.js --url https://your-worker.workers.dev

# With custom auth key
node test-server.js --auth your-auth-key
```

### Manual Testing

Test individual endpoints:

```bash
# Health check
curl https://your-worker.workers.dev/health

# SSE endpoint (should show connection attempt)
curl -N https://your-worker.workers.dev/sse

# MCP tool call
curl -X POST https://your-worker.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-auth-key" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "cpmaxx_health_check",
      "arguments": {}
    }
  }'
```

## Troubleshooting

### Common Issues

1. **"Module not found" errors**
   - Ensure you've run `npm run build` before deploying
   - Check that all dependencies are in `package.json`

2. **Authentication failures**
   - Verify secrets are set: `wrangler secret list`
   - Check CPMaxx credentials are correct
   - Ensure MCP_AUTH_KEY is set

3. **Timeout errors**
   - Browser automation requires additional setup for production
   - Consider using remote browser services (BrowserBase, etc.)

4. **CORS errors**
   - Worker includes CORS headers
   - Check if your domain needs to be whitelisted

### Debugging

1. **Check Worker logs**:
   ```bash
   wrangler tail
   ```

2. **Test locally**:
   ```bash
   npm run dev
   # Test against http://localhost:8787
   ```

3. **Enable debug mode**:
   Add debug flags to your environment variables

### Performance Optimization

1. **Bundle size**: The current implementation includes placeholders for browser automation. In production, you may want to use remote browser services.

2. **Cold starts**: Worker should warm up quickly due to the lightweight McpAgent framework.

3. **Rate limiting**: Built-in rate limiting respects CPMaxx terms of service.

## Security Considerations

1. **Credential Storage**: Secrets are encrypted in Cloudflare Workers
2. **Rate Limiting**: Implemented to prevent abuse
3. **Authentication**: MCP_AUTH_KEY protects tool access
4. **HTTPS Only**: All communications are encrypted

## Monitoring and Maintenance

### Analytics

Monitor your worker performance in the Cloudflare Dashboard:
- Request volume
- Error rates
- Response times
- Geographic distribution

### Logs

Access real-time logs:
```bash
wrangler tail --format pretty
```

### Updates

To update the deployed worker:
```bash
npm run build
npm run deploy
```

### Backup Configuration

Save your configuration:
```bash
# Export secrets (values not shown for security)
wrangler secret list > secrets-backup.txt

# Backup wrangler.toml
cp wrangler.toml wrangler.toml.backup
```

## Next Steps

1. **Browser Automation**: Integrate with remote browser services for production use
2. **Caching**: Add Redis/KV caching for search results
3. **Analytics**: Add detailed logging and metrics
4. **Rate Limiting**: Fine-tune rate limiting based on usage patterns
5. **Error Handling**: Enhance error recovery and user feedback

## Support

If you encounter issues:

1. Check the worker logs: `wrangler tail`
2. Test the health endpoint: `/health`
3. Verify environment variables are set
4. Review this deployment guide
5. Check Cloudflare Workers documentation

For CPMaxx-specific issues, ensure you have valid portal access and that the website structure hasn't changed significantly.
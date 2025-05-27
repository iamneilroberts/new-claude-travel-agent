# R2 Storage MCP Deployment Guide

This guide covers the deployment process for the R2 Storage MCP Worker to Cloudflare Workers.

## Prerequisites

1. Cloudflare account with Workers and R2 enabled
2. Existing R2 bucket for travel media storage
3. Wrangler CLI installed (`npm install -g wrangler`)
4. Node.js 18+ and npm/pnpm installed

## Required Access Tokens

You'll need to create these in your Cloudflare account:

1. **Cloudflare API Token** with permissions:
   - Account > Workers Scripts > Edit
   - Account > Workers R2 Storage > Edit

2. **OAuth Application** in Cloudflare:
   - Go to Cloudflare Dashboard > Developer Platform > OAuth Applications
   - Create a new application with:
     - Redirect URL: `https://r2-storage-mcp.somotravel.workers.dev/oauth/callback`
     - Scopes: 
       - `account:read`
       - `storage:write`

## Deployment Steps

### 1. Configure Environment Variables

Create `.dev.vars` file from the example:

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` to include your specific values:

```
CLOUDFLARE_CLIENT_ID=your_client_id_from_oauth_app
CLOUDFLARE_CLIENT_SECRET=your_client_secret_from_oauth_app
MCP_AUTH_KEY=generate_a_secure_random_string
MCP_SERVER_NAME=r2-storage-mcp
MCP_SERVER_VERSION=1.0.0
```

### 2. Update Wrangler Configuration

Edit `wrangler.toml` to include your specific R2 bucket:

```toml
[[r2_buckets]]
binding = 'TRAVEL_MEDIA_BUCKET'  
bucket_name = 'your-actual-bucket-name'
```

### 3. Create KV Namespace for Caching

```bash
npx wrangler kv:namespace create CACHE
```

Copy the ID and update it in `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"
```

### 4. Login to Cloudflare

```bash
npx wrangler login
```

### 5. Add Secrets

```bash
npx wrangler secret put CLOUDFLARE_CLIENT_ID
npx wrangler secret put CLOUDFLARE_CLIENT_SECRET
npx wrangler secret put MCP_AUTH_KEY
```

### 6. Deploy the Worker

```bash
npm run deploy
```

### 7. Configure for Claude Desktop

Add the MCP service to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "r2-storage": {
      "command": "npx",
      "args": ["mcp-remote", "https://r2-storage-mcp.somotravel.workers.dev/sse"]
    }
  }
}
```

## Testing the Deployment

Run the test script to verify functionality:

```bash
# First set your API token
export MCP_AUTH_KEY=your_api_token_here

# Run the test
node test-deployed.js
```

## Troubleshooting

### OAuth Issues

If OAuth authentication fails:
1. Verify the client ID and secret
2. Check that your redirect URL is correct
3. Ensure all required scopes are enabled

### R2 Access Issues

If R2 bucket operations fail:
1. Verify the bucket exists
2. Check that the Worker has proper permissions
3. Ensure the bucket name matches in `wrangler.toml`

### Connection Issues

If the MCP server is unreachable:
1. Check that the Worker is deployed successfully
2. Verify the URL in Claude Desktop configuration
3. Check for any Cloudflare service issues

## Monitoring

Monitor your Worker using:
1. Cloudflare Workers Dashboard
2. Cloudflare Analytics
3. Workers logs via `wrangler tail`

## Further Assistance

For additional help, refer to:
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [R2 Storage Documentation](https://developers.cloudflare.com/r2/)
- [MCP Protocol Documentation](https://modelcontextprotocol.io/introduction)
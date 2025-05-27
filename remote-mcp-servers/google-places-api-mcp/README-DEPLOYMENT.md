# Google Places API MCP Deployment Guide

This guide provides step-by-step instructions for deploying the Google Places API MCP server to Cloudflare Workers.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/get-started/) (v2 or higher)
- Cloudflare account
- Google Maps Platform account with Places API enabled

## Setup Steps

### 1. Install Dependencies

```bash
cd remote_mcp_servers/google-places-api-mcp
npm install
```

### 2. Configure Environment Variables

Create a `.dev.vars` file in the project root for local development:

```
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
MCP_AUTH_KEY=your_auth_key
```

### 3. Configure Cloudflare Worker

Update the `wrangler.toml` file:

1. Change the `name` if needed (determines your worker's URL)
2. Configure KV namespace:
   ```
   wrangler kv:namespace create "MCP_CACHE"
   ```
   Then copy the ID and preview_id to the `wrangler.toml` file.

### 4. Local Testing

Run the worker locally for testing:

```bash
npm run dev
```

Then run the test scripts to verify functionality:

```bash
node test-minimal.cjs
node test-hotel-photo.cjs
node test-v1-final.cjs
```

### 5. Deploy to Cloudflare

Deploy the worker to production:

```bash
npm run deploy
```

Cloudflare will prompt you to log in if needed, then deploy your worker.

### 6. Add Secret Environment Variables

After deployment, add your Google Maps API key as a secret:

```bash
npx wrangler secret put GOOGLE_MAPS_API_KEY
```

You'll be prompted to enter your API key, which will be securely stored in Cloudflare.

Update the auth key for production:

```bash
npx wrangler secret put MCP_AUTH_KEY
```

### 7. Verify Deployment

Test that your deployed worker is functioning correctly:

```bash
GOOGLE_PLACES_MCP_URL=https://google-places-api-mcp.yourusername.workers.dev \
GOOGLE_PLACES_AUTH_KEY=your_auth_key \
node test-v1-final.cjs
```

### 8. Configure Claude Desktop

Add the MCP server to your Claude Desktop config:

```json
{
  "mcpServers": {
    "google-places-api": {
      "command": "npx",
      "args": ["mcp-remote", "https://google-places-api-mcp.yourusername.workers.dev/sse"]
    }
  }
}
```

## Maintenance

### Updating the Worker

Make changes to the code, then redeploy:

```bash
npm run deploy
```

### Monitoring

View logs and requests in the Cloudflare Dashboard under Workers → yourworkername.

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Ensure the auth keys match between the worker and your test scripts
2. **API Key Problems**: Verify your Google API key is valid and has the Places API enabled
3. **CORS Errors**: The worker has CORS headers included, but you may need to modify them for your specific use case

### Debugging

For local debugging, use:

```bash
npm run dev -- --inspect
```

This will enable Node.js inspector for debugging.
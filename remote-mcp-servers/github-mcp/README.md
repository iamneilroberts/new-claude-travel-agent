# GitHub MCP Server

A pure MCP (Model Context Protocol) server for GitHub API integration, designed to work with mcp-remote and Claude Desktop.

## Deployment

The server is deployed to Cloudflare Workers at:
- **Production URL**: https://github-mcp-pure.somotravel.workers.dev

## Available Tools

The server provides the following GitHub API tools:

1. **create_or_update_file** - Create or update a single file in a GitHub repository
2. **get_file_contents** - Get the contents of a file or directory from a GitHub repository  
3. **push_files** - Push multiple files to a GitHub repository in a single commit
4. **create_branch** - Create a new branch in a GitHub repository
5. **list_branches** - List branches in a GitHub repository
6. **list_commits** - Get list of commits of a branch in a GitHub repository
7. **get_commit** - Get details for a commit from a GitHub repository

## Configuration

The server is configured with environment variables:
- `GITHUB_TOKEN` - GitHub Personal Access Token (from .env)
- `MCP_AUTH_KEY` - Optional authentication key for MCP access

## Testing

Run the test script to verify the deployment:

```bash
node test-github-connection.js
```

## Files Structure

- `src/pure-mcp-index.ts` - Main MCP server implementation
- `wrangler.pure-mcp.toml` - Cloudflare Worker configuration
- `package.json` - Dependencies and build scripts
- `tsconfig.json` - TypeScript configuration
- `worker-mcpagent.js` - Worker entry point for mcp-remote integration
- `test-github-connection.js` - Test script

## Deployment Commands

```bash
# Install dependencies
npm install

# Type check
npm run type-check

# Deploy to Cloudflare
wrangler deploy --config wrangler.pure-mcp.toml
```

## Integration with Claude Desktop

This server can be integrated with Claude Desktop using mcp-remote configuration pointing to the deployed worker URL.
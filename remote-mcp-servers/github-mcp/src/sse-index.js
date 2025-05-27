import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { Octokit } from '@octokit/rest';

// Create Hono app
const app = new Hono();

// Configure CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Token'],
}));

// OAuth metadata endpoints (required by mcp-remote)
app.get('/.well-known/oauth-metadata', (c) => {
  const baseUrl = new URL(c.req.url).origin;
  const metadata = {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/authorize`,
    token_endpoint: `${baseUrl}/token`,
    registration_endpoint: `${baseUrl}/register`,
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
    grant_types_supported: ["client_credentials", "authorization_code", "refresh_token"],
    response_types_supported: ["code", "token"],
    scopes_supported: ["github"],
    code_challenge_methods_supported: ["S256"],
    service_documentation: "https://modelcontextprotocol.io/",
    ui_locales_supported: ["en-US"]
  };
  return c.json(metadata);
});

app.get('/sse/.well-known/oauth-metadata', (c) => {
  const baseUrl = new URL(c.req.url).origin;
  const metadata = {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/authorize`,
    token_endpoint: `${baseUrl}/token`,
    registration_endpoint: `${baseUrl}/register`,
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
    grant_types_supported: ["client_credentials", "authorization_code", "refresh_token"],
    response_types_supported: ["code", "token"],
    scopes_supported: ["github"],
    code_challenge_methods_supported: ["S256"],
    service_documentation: "https://modelcontextprotocol.io/",
    ui_locales_supported: ["en-US"]
  };
  return c.json(metadata);
});

// SSE endpoint with persistent connection
app.post('/sse', async (c) => {
  // Check authorization
  const authHeader = c.req.header('Authorization');
  if (c.env.MCP_AUTH_KEY && authHeader !== `Bearer ${c.env.MCP_AUTH_KEY}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const sessionId = crypto.randomUUID();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Create a TransformStream for bidirectional communication
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  // Send initial connected message
  await writer.write(encoder.encode(`data: ${JSON.stringify({
    jsonrpc: '2.0',
    method: 'connected',
    params: { sessionId }
  })}\n\n`));

  // Handle the persistent connection
  c.executionCtx.waitUntil((async () => {
    let pingInterval;

    try {
      // Set up ping interval to keep connection alive
      pingInterval = setInterval(async () => {
        try {
          await writer.write(encoder.encode(`data: ${JSON.stringify({
            jsonrpc: '2.0',
            method: 'ping',
            params: { timestamp: Date.now(), sessionId }
          })}\n\n`));
        } catch (e) {
          console.error('Ping error:', e);
          clearInterval(pingInterval);
        }
      }, 25000); // Ping every 25 seconds

      // Read incoming messages from the request body
      const reader = c.req.raw.body.getReader();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('Client disconnected');
          break;
        }

        // Append to buffer and process complete messages
        buffer += decoder.decode(value, { stream: true });

        // Process each line in the buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            // Parse the JSON-RPC request
            const jsonRequest = JSON.parse(trimmed);
            console.log('Received request:', jsonRequest.method);

            // Handle the request
            const response = await mcp.handleRequest(jsonRequest, {
              log: console,
              env: c.env
            });

            // Send the response
            await writer.write(encoder.encode(`data: ${JSON.stringify(response)}\n\n`));

          } catch (parseError) {
            console.error('Parse error:', parseError, 'Line:', trimmed);
            // Send error response
            await writer.write(encoder.encode(`data: ${JSON.stringify({
              jsonrpc: '2.0',
              id: null,
              error: {
                code: -32700,
                message: 'Parse error',
                data: parseError.message
              }
            })}\n\n`));
          }
        }
      }

    } catch (error) {
      console.error('Connection error:', error);
    } finally {
      // Clean up
      if (pingInterval) clearInterval(pingInterval);
      try {
        await writer.close();
      } catch (e) {
        console.error('Error closing writer:', e);
      }
    }
  })());

  // Return the SSE response
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
      'Access-Control-Allow-Origin': '*'
    }
  });
});

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: 'github-mcp',
    version: '1.0.0',
    description: 'Cloudflare Worker MCP server for GitHub API integration'
  });
});

// Initialize FastMCP
const mcp = new FastMCP({
  name: 'GitHub MCP Server',
  version: '1.0.0',
});

// Helper function to create GitHub client
const createGitHubClient = (env) => {
  const token = env.GITHUB_TOKEN || env.GITHUB_PAT;

  if (!token) {
    throw new Error('GitHub token not configured. Please set GITHUB_TOKEN or GITHUB_PAT environment variable.');
  }

  return new Octokit({
    auth: token,
    baseUrl: 'https://api.github.com',
    userAgent: 'github-mcp/1.0.0'
  });
};

// Helper function to handle errors
const handleError = (error, log) => {
  log.error('GitHub API error:', error);

  if (error.status === 401) {
    return {
      status: 'error',
      message: 'Authentication failed. Please check your GitHub token.',
      code: 'AUTH_FAILED'
    };
  }

  if (error.status === 404) {
    return {
      status: 'error',
      message: 'Resource not found.',
      code: 'NOT_FOUND'
    };
  }

  if (error.status === 403) {
    return {
      status: 'error',
      message: 'Access forbidden. You may have hit a rate limit.',
      code: 'FORBIDDEN',
      rate_limit: error.headers ? {
        limit: error.headers['x-ratelimit-limit'],
        remaining: error.headers['x-ratelimit-remaining'],
        reset: error.headers['x-ratelimit-reset']
      } : undefined
    };
  }

  return {
    status: 'error',
    message: error.message || 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR'
  };
};

// Register tools
mcp.addTool({
  name: 'get_me',
  description: 'Get details of the authenticated GitHub user. Use this when a request include "me", "my"...',
  parameters: z.object({
    reason: z.string().optional().describe('Optional: reason the session was created')
  }),
  execute: async (args, context) => {
    const { log, env } = context;

    try {
      const github = createGitHubClient(env);
      const response = await github.users.getAuthenticated();

      return {
        status: 'success',
        user: {
          login: response.data.login,
          name: response.data.name,
          email: response.data.email,
          bio: response.data.bio,
          company: response.data.company,
          location: response.data.location,
          public_repos: response.data.public_repos,
          followers: response.data.followers,
          following: response.data.following,
          created_at: response.data.created_at,
          updated_at: response.data.updated_at,
          html_url: response.data.html_url
        }
      };
    } catch (error) {
      return handleError(error, log);
    }
  }
});

mcp.addTool({
  name: 'create_repository',
  description: 'Create a new GitHub repository in your account',
  parameters: z.object({
    name: z.string().describe('Repository name'),
    description: z.string().optional().describe('Repository description'),
    private: z.boolean().optional().describe('Whether repo should be private'),
    autoInit: z.boolean().optional().describe('Initialize with README')
  }),
  execute: async (args, context) => {
    const { log, env } = context;

    try {
      const github = createGitHubClient(env);
      const response = await github.repos.createForAuthenticatedUser({
        name: args.name,
        description: args.description,
        private: args.private || false,
        auto_init: args.autoInit || false
      });

      return {
        status: 'success',
        repository: {
          name: response.data.name,
          full_name: response.data.full_name,
          description: response.data.description,
          private: response.data.private,
          html_url: response.data.html_url,
          clone_url: response.data.clone_url,
          ssh_url: response.data.ssh_url,
          created_at: response.data.created_at
        }
      };
    } catch (error) {
      return handleError(error, log);
    }
  }
});

mcp.addTool({
  name: 'create_or_update_file',
  description: 'Create or update a single file in a GitHub repository',
  parameters: z.object({
    owner: z.string().describe('Repository owner (username or organization)'),
    repo: z.string().describe('Repository name'),
    path: z.string().describe('Path where to create/update the file'),
    content: z.string().describe('Content of the file'),
    message: z.string().describe('Commit message'),
    branch: z.string().describe('Branch to create/update the file in'),
    sha: z.string().optional().describe('SHA of file being replaced (for updates)')
  }),
  execute: async (args, context) => {
    const { log, env } = context;
    const { owner, repo, path, content, message, branch, sha } = args;

    try {
      const github = createGitHubClient(env);

      // Base64 encode the content
      const encodedContent = btoa(content);

      const params = {
        owner,
        repo,
        path,
        message,
        content: encodedContent,
        branch
      };

      // If updating, include the SHA
      if (sha) {
        params.sha = sha;
      }

      const response = await github.repos.createOrUpdateFileContents(params);

      return {
        status: 'success',
        commit: {
          sha: response.data.commit.sha,
          message: response.data.commit.message,
          html_url: response.data.commit.html_url
        },
        content: {
          path: response.data.content.path,
          sha: response.data.content.sha,
          size: response.data.content.size
        }
      };
    } catch (error) {
      return handleError(error, log);
    }
  }
});

mcp.addTool({
  name: 'get_file_contents',
  description: 'Get the contents of a file from a GitHub repository',
  parameters: z.object({
    owner: z.string().describe('Repository owner (username or organization)'),
    repo: z.string().describe('Repository name'),
    path: z.string().describe('Path to file/directory'),
    branch: z.string().optional().describe('Branch to get contents from')
  }),
  execute: async (args, context) => {
    const { log, env } = context;
    const { owner, repo, path, branch } = args;

    try {
      const github = createGitHubClient(env);

      const params = { owner, repo, path };
      if (branch) {
        params.ref = branch;
      }

      const response = await github.repos.getContent(params);

      // Handle single file
      if (!Array.isArray(response.data)) {
        const file = response.data;

        // Decode base64 content for files
        let decodedContent = null;
        if (file.type === 'file' && file.content) {
          try {
            decodedContent = atob(file.content);
          } catch (e) {
            log.warn('Failed to decode file content:', e);
          }
        }

        return {
          status: 'success',
          type: 'file',
          name: file.name,
          path: file.path,
          sha: file.sha,
          size: file.size,
          content: decodedContent,
          encoding: file.encoding,
          download_url: file.download_url,
          html_url: file.html_url
        };
      }

      // Handle directory
      return {
        status: 'success',
        type: 'directory',
        path: path,
        items: response.data.map(item => ({
          name: item.name,
          path: item.path,
          type: item.type,
          sha: item.sha,
          size: item.size,
          html_url: item.html_url
        }))
      };
    } catch (error) {
      return handleError(error, log);
    }
  }
});

mcp.addTool({
  name: 'push_files',
  description: 'Push multiple files to a GitHub repository in a single commit',
  parameters: z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    branch: z.string().describe('Branch to push to'),
    files: z.array(z.object({
      path: z.string().describe('path to the file'),
      content: z.string().describe('file content')
    })).describe('Array of file objects to push, each object with path (string) and content (string)'),
    message: z.string().describe('Commit message')
  }),
  execute: async (args, context) => {
    const { log, env } = context;
    const { owner, repo, branch, files, message } = args;

    try {
      const github = createGitHubClient(env);

      // Get the current commit SHA for the branch
      const { data: ref } = await github.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`
      });
      const latestCommitSha = ref.object.sha;

      // Get the tree SHA for the latest commit
      const { data: commit } = await github.git.getCommit({
        owner,
        repo,
        commit_sha: latestCommitSha
      });
      const baseTreeSha = commit.tree.sha;

      // Create blobs for each file
      const blobs = await Promise.all(
        files.map(async (file) => {
          const { data: blob } = await github.git.createBlob({
            owner,
            repo,
            content: btoa(file.content),
            encoding: 'base64'
          });
          return {
            path: file.path,
            mode: '100644',
            type: 'blob',
            sha: blob.sha
          };
        })
      );

      // Create a new tree
      const { data: tree } = await github.git.createTree({
        owner,
        repo,
        tree: blobs,
        base_tree: baseTreeSha
      });

      // Create a new commit
      const { data: newCommit } = await github.git.createCommit({
        owner,
        repo,
        message,
        tree: tree.sha,
        parents: [latestCommitSha]
      });

      // Update the branch reference
      await github.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: newCommit.sha
      });

      return {
        status: 'success',
        commit: {
          sha: newCommit.sha,
          message: newCommit.message,
          url: newCommit.url,
          html_url: newCommit.html_url
        },
        files_pushed: files.length
      };
    } catch (error) {
      return handleError(error, log);
    }
  }
});

mcp.addTool({
  name: 'get_commit',
  description: 'Get details for a commit from a GitHub repository',
  parameters: z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    sha: z.string().describe('Commit SHA, branch name, or tag name'),
    page: z.number().optional().min(1).describe('Page number for pagination (min 1)'),
    perPage: z.number().optional().min(1).max(100).describe('Results per page for pagination (min 1, max 100)')
  }),
  execute: async (args, context) => {
    const { log, env } = context;
    const { owner, repo, sha, page, perPage } = args;

    try {
      const github = createGitHubClient(env);

      const response = await github.repos.getCommit({
        owner,
        repo,
        ref: sha,
        page,
        per_page: perPage
      });

      return {
        status: 'success',
        commit: {
          sha: response.data.sha,
          message: response.data.commit.message,
          author: {
            name: response.data.commit.author.name,
            email: response.data.commit.author.email,
            date: response.data.commit.author.date
          },
          committer: {
            name: response.data.commit.committer.name,
            email: response.data.commit.committer.email,
            date: response.data.commit.committer.date
          },
          html_url: response.data.html_url,
          files: response.data.files?.map(file => ({
            filename: file.filename,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
            changes: file.changes
          }))
        }
      };
    } catch (error) {
      return handleError(error, log);
    }
  }
});

// MCP JSON-RPC endpoint
app.post('/mcp', async (c) => {
  // Authorization check
  const authToken = c.req.header('X-API-Token');
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
    // Handle the MCP request
    const request = await c.req.json();
    const response = await mcp.handleRequest(request, {
      log: console,
      env: c.env
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

// Worker setup
export default {
  async fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  }
};

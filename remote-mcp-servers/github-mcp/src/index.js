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

// Initialize FastMCP
const mcp = new FastMCP({
  name: 'GitHub MCP Server',
  version: '1.0.0',
});

// Create GitHub client
const createGitHubClient = (env) => {
  return new Octokit({
    auth: env.GITHUB_TOKEN,
  });
};

// Helper function to handle errors
const handleError = (error, log) => {
  log.error('GitHub API error:', error);
  return {
    status: 'error',
    message: error.message,
    details: error.response?.data || {}
  };
};

// Register tools
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
    sha: z.string().optional().describe('SHA of file being replaced (for updates)'),
  }),
  execute: async (args, context) => {
    const { owner, repo, path, content, message, branch, sha } = args;
    const { env, log } = context;
    
    try {
      const github = createGitHubClient(env);
      
      const response = await github.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        branch,
        sha
      });
      
      return {
        status: 'success',
        commit: response.data.commit,
        file: {
          path: response.data.content?.path,
          sha: response.data.content?.sha,
          url: response.data.content?.html_url
        }
      };
    } catch (error) {
      return handleError(error, log);
    }
  }
});

mcp.addTool({
  name: 'get_file_contents',
  description: 'Get the contents of a file or directory from a GitHub repository',
  parameters: z.object({
    owner: z.string().describe('Repository owner (username or organization)'),
    repo: z.string().describe('Repository name'),
    path: z.string().describe('Path to file/directory'),
    branch: z.string().optional().describe('Branch to get contents from'),
  }),
  execute: async (args, context) => {
    const { owner, repo, path, branch } = args;
    const { env, log } = context;
    
    try {
      const github = createGitHubClient(env);
      
      const response = await github.repos.getContent({
        owner,
        repo,
        path,
        ref: branch
      });
      
      // Handle file
      if (!Array.isArray(response.data)) {
        const content = Buffer.from(response.data.content, 'base64').toString();
        return {
          status: 'success',
          type: 'file',
          content,
          sha: response.data.sha,
          size: response.data.size,
          url: response.data.html_url
        };
      }
      
      // Handle directory
      return {
        status: 'success',
        type: 'directory',
        items: response.data.map(item => ({
          name: item.name,
          path: item.path,
          type: item.type,
          size: item.size,
          sha: item.sha,
          url: item.html_url
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
    message: z.string().describe('Commit message'),
  }),
  execute: async (args, context) => {
    const { owner, repo, branch, files, message } = args;
    const { env, log } = context;
    
    try {
      const github = createGitHubClient(env);
      
      // Get the latest commit on the branch to use as base
      const branchData = await github.repos.getBranch({
        owner,
        repo,
        branch
      });
      
      const baseTree = branchData.data.commit.sha;
      
      // Create blobs for each file
      const blobs = await Promise.all(
        files.map(async file => {
          const blob = await github.git.createBlob({
            owner,
            repo,
            content: Buffer.from(file.content).toString('base64'),
            encoding: 'base64'
          });
          
          return {
            path: file.path,
            mode: '100644', // Regular file
            type: 'blob',
            sha: blob.data.sha
          };
        })
      );
      
      // Create a new tree with the blobs
      const tree = await github.git.createTree({
        owner,
        repo,
        base_tree: baseTree,
        tree: blobs
      });
      
      // Create a commit
      const commit = await github.git.createCommit({
        owner,
        repo,
        message,
        tree: tree.data.sha,
        parents: [baseTree]
      });
      
      // Update the branch reference
      await github.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: commit.data.sha
      });
      
      return {
        status: 'success',
        commit: {
          sha: commit.data.sha,
          message,
          url: `https://github.com/${owner}/${repo}/commit/${commit.data.sha}`
        },
        files_count: files.length
      };
    } catch (error) {
      return handleError(error, log);
    }
  }
});

mcp.addTool({
  name: 'create_branch',
  description: 'Create a new branch in a GitHub repository',
  parameters: z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    branch: z.string().describe('Name for new branch'),
    from_branch: z.string().optional().describe('Source branch (defaults to repo default)'),
  }),
  execute: async (args, context) => {
    const { owner, repo, branch, from_branch } = args;
    const { env, log } = context;
    
    try {
      const github = createGitHubClient(env);
      
      // Get the default branch if from_branch not specified
      let sourceBranch = from_branch;
      if (!sourceBranch) {
        const repoData = await github.repos.get({
          owner,
          repo
        });
        sourceBranch = repoData.data.default_branch;
      }
      
      // Get the commit SHA of the source branch
      const sourceRef = await github.git.getRef({
        owner,
        repo,
        ref: `heads/${sourceBranch}`
      });
      
      // Create the new branch
      const response = await github.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branch}`,
        sha: sourceRef.data.object.sha
      });
      
      return {
        status: 'success',
        branch_name: branch,
        source_branch: sourceBranch,
        ref: response.data.ref,
        url: response.data.url
      };
    } catch (error) {
      return handleError(error, log);
    }
  }
});

mcp.addTool({
  name: 'list_branches',
  description: 'List branches in a GitHub repository',
  parameters: z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    page: z.number().int().min(1).optional().describe('Page number for pagination (min 1)'),
    perPage: z.number().int().min(1).max(100).optional().describe('Results per page for pagination (min 1, max 100)'),
  }),
  execute: async (args, context) => {
    const { owner, repo, page, perPage } = args;
    const { env, log } = context;
    
    try {
      const github = createGitHubClient(env);
      
      const response = await github.repos.listBranches({
        owner,
        repo,
        page,
        per_page: perPage
      });
      
      return {
        status: 'success',
        branches: response.data.map(branch => ({
          name: branch.name,
          sha: branch.commit.sha,
          protected: branch.protected
        }))
      };
    } catch (error) {
      return handleError(error, log);
    }
  }
});

mcp.addTool({
  name: 'list_commits',
  description: 'Get list of commits of a branch in a GitHub repository',
  parameters: z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    sha: z.string().optional().describe('SHA or Branch name'),
    page: z.number().int().min(1).optional().describe('Page number for pagination (min 1)'),
    perPage: z.number().int().min(1).max(100).optional().describe('Results per page for pagination (min 1, max 100)'),
  }),
  execute: async (args, context) => {
    const { owner, repo, sha, page, perPage } = args;
    const { env, log } = context;
    
    try {
      const github = createGitHubClient(env);
      
      const response = await github.repos.listCommits({
        owner,
        repo,
        sha,
        page,
        per_page: perPage
      });
      
      return {
        status: 'success',
        commits: response.data.map(commit => ({
          sha: commit.sha,
          message: commit.commit.message,
          author: {
            name: commit.commit.author.name,
            email: commit.commit.author.email,
            date: commit.commit.author.date
          },
          committer: {
            name: commit.commit.committer.name,
            email: commit.commit.committer.email,
            date: commit.commit.committer.date
          },
          html_url: commit.html_url
        }))
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
    page: z.number().int().min(1).optional().describe('Page number for pagination (min 1)'),
    perPage: z.number().int().min(1).max(100).optional().describe('Results per page for pagination (min 1, max 100)'),
  }),
  execute: async (args, context) => {
    const { owner, repo, sha, page, perPage } = args;
    const { env, log } = context;
    
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

// Server-sent events endpoint
app.get('/sse', async (c) => {
  // Set SSE headers
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');
  
  // Authorization check
  const authToken = c.req.query('token') || c.req.header('Authorization')?.replace('Bearer ', '');
  const expectedToken = c.env.MCP_AUTH_KEY;
  
  if (expectedToken && authToken !== expectedToken) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue('event: error\ndata: {"message":"Unauthorized"}\n\n');
        controller.close();
      }
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  }
  
  // Create SSE response
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  
  // Process incoming SSE commands
  const processSSECommand = async (data) => {
    try {
      const request = JSON.parse(data);
      const response = await mcp.handleRequest(request, {
        log: console,
        env: c.env
      });
      const event = `data: ${JSON.stringify(response)}\n\n`;
      await writer.write(encoder.encode(event));
    } catch (error) {
      console.error('Error processing SSE command:', error);
      const errorEvent = `data: ${JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Internal error',
          data: { reason: error.message }
        }
      })}\n\n`;
      await writer.write(encoder.encode(errorEvent));
    }
  };
  
  // Handle SSE connection
  const url = new URL(c.req.url);
  const initialCommand = url.searchParams.get('command');
  
  if (initialCommand) {
    await processSSECommand(initialCommand);
  }
  
  // Send ping every 30 seconds to keep connection alive
  const pingInterval = setInterval(async () => {
    await writer.write(encoder.encode('event: ping\ndata: {}\n\n'));
  }, 30000);
  
  // Clean up when client disconnects
  c.executionCtx.waitUntil((async () => {
    try {
      await readable.pipeTo(new WritableStream({
        abort() {
          clearInterval(pingInterval);
          writer.close();
        }
      }));
    } catch (error) {
      console.error('Error in SSE stream:', error);
      clearInterval(pingInterval);
      writer.close();
    }
  })());
  
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
});

// Default route
app.get('/', (c) => {
  return c.json({
    name: 'GitHub MCP Server',
    version: '1.0.0',
    description: 'Cloudflare Worker MCP server for GitHub API integration'
  });
});

// Worker setup
export default {
  async fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  }
};
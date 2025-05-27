// Simplified MCP Server for GitHub API integration
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

const GITHUB_TOOLS = [
  {
    name: 'create_or_update_file',
    description: 'Create or update a single file in a GitHub repository',
    schema: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: 'Repository owner (username or organization)'
        },
        repo: {
          type: 'string',
          description: 'Repository name'
        },
        path: {
          type: 'string',
          description: 'Path where to create/update the file'
        },
        content: {
          type: 'string',
          description: 'Content of the file'
        },
        message: {
          type: 'string',
          description: 'Commit message'
        },
        branch: {
          type: 'string',
          description: 'Branch to create/update the file in'
        },
        sha: {
          type: 'string',
          description: 'SHA of file being replaced (for updates)'
        }
      },
      required: ['owner', 'repo', 'path', 'content', 'message', 'branch']
    }
  },
  {
    name: 'get_file_contents',
    description: 'Get the contents of a file or directory from a GitHub repository',
    schema: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: 'Repository owner (username or organization)'
        },
        repo: {
          type: 'string',
          description: 'Repository name'
        },
        path: {
          type: 'string',
          description: 'Path to file/directory'
        },
        branch: {
          type: 'string',
          description: 'Branch to get contents from'
        }
      },
      required: ['owner', 'repo', 'path']
    }
  },
  {
    name: 'push_files',
    description: 'Push multiple files to a GitHub repository in a single commit',
    schema: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: 'Repository owner'
        },
        repo: {
          type: 'string',
          description: 'Repository name'
        },
        branch: {
          type: 'string',
          description: 'Branch to push to'
        },
        files: {
          type: 'array',
          description: 'Array of file objects to push, each object with path (string) and content (string)',
          items: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'path to the file'
              },
              content: {
                type: 'string',
                description: 'file content'
              }
            },
            required: ['path', 'content']
          }
        },
        message: {
          type: 'string',
          description: 'Commit message'
        }
      },
      required: ['owner', 'repo', 'branch', 'files', 'message']
    }
  },
  {
    name: 'create_branch',
    description: 'Create a new branch in a GitHub repository',
    schema: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: 'Repository owner'
        },
        repo: {
          type: 'string',
          description: 'Repository name'
        },
        branch: {
          type: 'string',
          description: 'Name for new branch'
        },
        from_branch: {
          type: 'string',
          description: 'Source branch (defaults to repo default)'
        }
      },
      required: ['owner', 'repo', 'branch']
    }
  },
  {
    name: 'list_branches',
    description: 'List branches in a GitHub repository',
    schema: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: 'Repository owner'
        },
        repo: {
          type: 'string',
          description: 'Repository name'
        },
        page: {
          type: 'number',
          description: 'Page number for pagination (min 1)',
          minimum: 1
        },
        perPage: {
          type: 'number',
          description: 'Results per page for pagination (min 1, max 100)',
          minimum: 1,
          maximum: 100
        }
      },
      required: ['owner', 'repo']
    }
  },
  {
    name: 'list_commits',
    description: 'Get list of commits of a branch in a GitHub repository',
    schema: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: 'Repository owner'
        },
        repo: {
          type: 'string',
          description: 'Repository name'
        },
        sha: {
          type: 'string',
          description: 'SHA or Branch name'
        },
        page: {
          type: 'number',
          description: 'Page number for pagination (min 1)',
          minimum: 1
        },
        perPage: {
          type: 'number',
          description: 'Results per page for pagination (min 1, max 100)',
          minimum: 1,
          maximum: 100
        }
      },
      required: ['owner', 'repo']
    }
  },
  {
    name: 'get_commit',
    description: 'Get details for a commit from a GitHub repository',
    schema: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: 'Repository owner'
        },
        repo: {
          type: 'string',
          description: 'Repository name'
        },
        sha: {
          type: 'string',
          description: 'Commit SHA, branch name, or tag name'
        },
        page: {
          type: 'number',
          description: 'Page number for pagination (min 1)',
          minimum: 1
        },
        perPage: {
          type: 'number',
          description: 'Results per page for pagination (min 1, max 100)',
          minimum: 1,
          maximum: 100
        }
      },
      required: ['owner', 'repo', 'sha']
    }
  }
];

const MOCK_CREATE_OR_UPDATE_FILE_RESPONSE = (id, params) => ({
  jsonrpc: '2.0',
  id,
  result: {
    content: {
      name: params.path.split('/').pop(),
      path: params.path,
      sha: "abc123def456gh789ijklmnopqrstuvwxyz0123",
      size: params.content.length,
      url: `https://api.github.com/repos/${params.owner}/${params.repo}/contents/${params.path}`,
      html_url: `https://github.com/${params.owner}/${params.repo}/blob/${params.branch}/${params.path}`,
      git_url: `https://api.github.com/repos/${params.owner}/${params.repo}/git/blobs/abc123def456gh789ijklmnopqrstuvwxyz0123`,
      download_url: `https://raw.githubusercontent.com/${params.owner}/${params.repo}/${params.branch}/${params.path}`,
      type: "file",
      _links: {
        self: `https://api.github.com/repos/${params.owner}/${params.repo}/contents/${params.path}`,
        git: `https://api.github.com/repos/${params.owner}/${params.repo}/git/blobs/abc123def456gh789ijklmnopqrstuvwxyz0123`,
        html: `https://github.com/${params.owner}/${params.repo}/blob/${params.branch}/${params.path}`
      }
    },
    commit: {
      sha: "def789abc123gh456ijklmnopqrstuvwxyz0987",
      node_id: "MDQ6Q29tbWl0MTIzNDU2Nzg5",
      url: `https://api.github.com/repos/${params.owner}/${params.repo}/git/commits/def789abc123gh456ijklmnopqrstuvwxyz0987`,
      html_url: `https://github.com/${params.owner}/${params.repo}/commit/def789abc123gh456ijklmnopqrstuvwxyz0987`,
      message: params.message,
      tree: {
        sha: "ghi123def456jkl789mnopqrstuvwxyz0123",
        url: `https://api.github.com/repos/${params.owner}/${params.repo}/git/trees/ghi123def456jkl789mnopqrstuvwxyz0123`
      },
      parents: [
        {
          sha: "456abc123def789ghijklmnopqrstuvwxyz0123",
          url: `https://api.github.com/repos/${params.owner}/${params.repo}/git/commits/456abc123def789ghijklmnopqrstuvwxyz0123`,
          html_url: `https://github.com/${params.owner}/${params.repo}/commit/456abc123def789ghijklmnopqrstuvwxyz0123`
        }
      ]
    }
  }
});

const MOCK_GET_FILE_CONTENTS_RESPONSE = (id, params) => ({
  jsonrpc: '2.0',
  id,
  result: {
    type: "file",
    encoding: "base64",
    size: 1234,
    name: params.path.split('/').pop(),
    path: params.path,
    content: "U2ltdWxhdGVkIGZpbGUgY29udGVudC4gSW4gYSByZWFsIGltcGxlbWVudGF0aW9uLCB0aGlzIHdvdWxkIGJlIGFjdHVhbCBiYXNlNjQtZW5jb2RlZCBjb250ZW50LiBUaGlzIGlzIGEgcmVwcmVzZW50YXRpb24gb2YgaG93IHRoZSBHaXRIdWIgQVBJIHdvdWxkIHJldHVybiBmaWxlIGNvbnRlbnRzLg==",
    sha: "abc123def456gh789ijklmnopqrstuvwxyz0123",
    url: `https://api.github.com/repos/${params.owner}/${params.repo}/contents/${params.path}`,
    git_url: `https://api.github.com/repos/${params.owner}/${params.repo}/git/blobs/abc123def456gh789ijklmnopqrstuvwxyz0123`,
    html_url: `https://github.com/${params.owner}/${params.repo}/blob/${params.branch || 'main'}/${params.path}`,
    download_url: `https://raw.githubusercontent.com/${params.owner}/${params.repo}/${params.branch || 'main'}/${params.path}`,
    _links: {
      self: `https://api.github.com/repos/${params.owner}/${params.repo}/contents/${params.path}`,
      git: `https://api.github.com/repos/${params.owner}/${params.repo}/git/blobs/abc123def456gh789ijklmnopqrstuvwxyz0123`,
      html: `https://github.com/${params.owner}/${params.repo}/blob/${params.branch || 'main'}/${params.path}`
    }
  }
});

const MOCK_PUSH_FILES_RESPONSE = (id, params) => ({
  jsonrpc: '2.0',
  id,
  result: {
    sha: "def789abc123gh456ijklmnopqrstuvwxyz0987",
    url: `https://api.github.com/repos/${params.owner}/${params.repo}/git/commits/def789abc123gh456ijklmnopqrstuvwxyz0987`,
    html_url: `https://github.com/${params.owner}/${params.repo}/commit/def789abc123gh456ijklmnopqrstuvwxyz0987`,
    message: params.message,
    files: params.files.map(file => ({
      path: file.path,
      mode: "100644",
      type: "blob",
      size: file.content.length,
      sha: "abc123def456gh789ijklmnopqrstuvwxyz0123", // Would be unique in real implementation
      url: `https://api.github.com/repos/${params.owner}/${params.repo}/git/blobs/abc123def456gh789ijklmnopqrstuvwxyz0123`
    }))
  }
});

const MOCK_CREATE_BRANCH_RESPONSE = (id, params) => ({
  jsonrpc: '2.0',
  id,
  result: {
    ref: `refs/heads/${params.branch}`,
    node_id: "REF_kwDOG_DYos4D6Ggc",
    url: `https://api.github.com/repos/${params.owner}/${params.repo}/git/refs/heads/${params.branch}`,
    object: {
      sha: "456abc123def789ghijklmnopqrstuvwxyz0123",
      type: "commit",
      url: `https://api.github.com/repos/${params.owner}/${params.repo}/git/commits/456abc123def789ghijklmnopqrstuvwxyz0123`
    }
  }
});

const MOCK_LIST_BRANCHES_RESPONSE = (id, params) => ({
  jsonrpc: '2.0',
  id,
  result: [
    {
      name: "main",
      commit: {
        sha: "456abc123def789ghijklmnopqrstuvwxyz0123",
        url: `https://api.github.com/repos/${params.owner}/${params.repo}/commits/456abc123def789ghijklmnopqrstuvwxyz0123`
      },
      protected: true
    },
    {
      name: "development",
      commit: {
        sha: "789def456ghi123jklmnopqrstuvwxyz0123",
        url: `https://api.github.com/repos/${params.owner}/${params.repo}/commits/789def456ghi123jklmnopqrstuvwxyz0123`
      },
      protected: false
    },
    {
      name: "feature/new-gallery",
      commit: {
        sha: "123abc456def789ghijklmnopqrstuvwxyz0123",
        url: `https://api.github.com/repos/${params.owner}/${params.repo}/commits/123abc456def789ghijklmnopqrstuvwxyz0123`
      },
      protected: false
    }
  ]
});

const MOCK_LIST_COMMITS_RESPONSE = (id, params) => ({
  jsonrpc: '2.0',
  id,
  result: [
    {
      sha: "def789abc123gh456ijklmnopqrstuvwxyz0987",
      node_id: "MDQ6Q29tbWl0MTIzNDU2Nzg5",
      commit: {
        author: {
          name: "John Doe",
          email: "john.doe@example.com",
          date: "2025-05-20T12:00:00Z"
        },
        committer: {
          name: "GitHub",
          email: "noreply@github.com",
          date: "2025-05-20T12:00:00Z"
        },
        message: "Add new gallery feature",
        tree: {
          sha: "ghi123def456jkl789mnopqrstuvwxyz0123",
          url: `https://api.github.com/repos/${params.owner}/${params.repo}/git/trees/ghi123def456jkl789mnopqrstuvwxyz0123`
        },
        url: `https://api.github.com/repos/${params.owner}/${params.repo}/git/commits/def789abc123gh456ijklmnopqrstuvwxyz0987`,
        comment_count: 0
      },
      url: `https://api.github.com/repos/${params.owner}/${params.repo}/commits/def789abc123gh456ijklmnopqrstuvwxyz0987`,
      html_url: `https://github.com/${params.owner}/${params.repo}/commit/def789abc123gh456ijklmnopqrstuvwxyz0987`,
      comments_url: `https://api.github.com/repos/${params.owner}/${params.repo}/commits/def789abc123gh456ijklmnopqrstuvwxyz0987/comments`
    },
    {
      sha: "456abc123def789ghijklmnopqrstuvwxyz0123",
      node_id: "MDQ6Q29tbWl0OTg3NjU0MzIx",
      commit: {
        author: {
          name: "Jane Smith",
          email: "jane.smith@example.com",
          date: "2025-05-19T10:30:00Z"
        },
        committer: {
          name: "GitHub",
          email: "noreply@github.com",
          date: "2025-05-19T10:30:00Z"
        },
        message: "Fix styling issues",
        tree: {
          sha: "jkl456ghi789mno123pqrstuvwxyz0123",
          url: `https://api.github.com/repos/${params.owner}/${params.repo}/git/trees/jkl456ghi789mno123pqrstuvwxyz0123`
        },
        url: `https://api.github.com/repos/${params.owner}/${params.repo}/git/commits/456abc123def789ghijklmnopqrstuvwxyz0123`,
        comment_count: 0
      },
      url: `https://api.github.com/repos/${params.owner}/${params.repo}/commits/456abc123def789ghijklmnopqrstuvwxyz0123`,
      html_url: `https://github.com/${params.owner}/${params.repo}/commit/456abc123def789ghijklmnopqrstuvwxyz0123`,
      comments_url: `https://api.github.com/repos/${params.owner}/${params.repo}/commits/456abc123def789ghijklmnopqrstuvwxyz0123/comments`
    }
  ]
});

const MOCK_GET_COMMIT_RESPONSE = (id, params) => ({
  jsonrpc: '2.0',
  id,
  result: {
    sha: params.sha,
    node_id: "MDQ6Q29tbWl0MTIzNDU2Nzg5",
    commit: {
      author: {
        name: "John Doe",
        email: "john.doe@example.com",
        date: "2025-05-20T12:00:00Z"
      },
      committer: {
        name: "GitHub",
        email: "noreply@github.com",
        date: "2025-05-20T12:00:00Z"
      },
      message: "Add new gallery feature", // Example message
      tree: {
        sha: "ghi123def456jkl789mnopqrstuvwxyz0123",
        url: `https://api.github.com/repos/${params.owner}/${params.repo}/git/trees/ghi123def456jkl789mnopqrstuvwxyz0123`
      },
      url: `https://api.github.com/repos/${params.owner}/${params.repo}/git/commits/${params.sha}`,
      comment_count: 0,
      verification: {
        verified: false,
        reason: "unsigned",
        signature: null,
        payload: null
      }
    },
    url: `https://api.github.com/repos/${params.owner}/${params.repo}/commits/${params.sha}`,
    html_url: `https://github.com/${params.owner}/${params.repo}/commit/${params.sha}`,
    comments_url: `https://api.github.com/repos/${params.owner}/${params.repo}/commits/${params.sha}/comments`,
    author: { // Example author data
      login: "johndoe",
      id: 12345,
      avatar_url: "https://avatars.githubusercontent.com/u/12345?v=4",
      html_url: "https://github.com/johndoe"
    },
    committer: { // Example committer data
      login: "web-flow",
      id: 19864447,
      avatar_url: "https://avatars.githubusercontent.com/u/19864447?v=4",
      html_url: "https://github.com/web-flow"
    },
    parents: [
      {
        sha: "456abc123def789ghijklmnopqrstuvwxyz0123", // Example parent SHA
        url: `https://api.github.com/repos/${params.owner}/${params.repo}/git/commits/456abc123def789ghijklmnopqrstuvwxyz0123`,
        html_url: `https://github.com/${params.owner}/${params.repo}/commit/456abc123def789ghijklmnopqrstuvwxyz0123`
      }
    ],
    stats: { // Example stats
      total: 2,
      additions: 1,
      deletions: 1
    },
    files: [ // Example files
      {
        sha: "xyz789abc123def456ghijklmnopqrstuvwxyz0123",
        filename: "README.md",
        status: "modified",
        additions: 1,
        deletions: 1,
        changes: 2,
        blob_url: `https://github.com/${params.owner}/${params.repo}/blob/${params.sha}/README.md`,
        raw_url: `https://github.com/${params.owner}/${params.repo}/raw/${params.sha}/README.md`,
        contents_url: `https://api.github.com/repos/${params.owner}/${params.repo}/contents/README.md?ref=${params.sha}`,
        patch: "@@ -1 +1 @@\n-Hello World\n+Hello Universe"
      }
    ]
  }
});

// MCP implementation
const MCPServer = {
  name: 'GitHub API MCP Server',
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
            protocol_version: '0.3.0',
            capabilities: {
              tools: {}
            }
          }
        };
      }

      // List tools method
      if (method === 'tools/list') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: GITHUB_TOOLS
          }
        };
      }

      // Tool execution
      if (method.startsWith('tools/')) {
        const toolName = method.substring(6);

        // In a simplified version, we'll return mock responses
        switch (toolName) {
          case 'create_or_update_file':
            return MOCK_CREATE_OR_UPDATE_FILE_RESPONSE(id, params);

          case 'get_file_contents':
            return MOCK_GET_FILE_CONTENTS_RESPONSE(id, params);

          case 'push_files':
            return MOCK_PUSH_FILES_RESPONSE(id, params);

          case 'create_branch':
            return MOCK_CREATE_BRANCH_RESPONSE(id, params);

          case 'list_branches':
            return MOCK_LIST_BRANCHES_RESPONSE(id, params);

          case 'list_commits':
            return MOCK_LIST_COMMITS_RESPONSE(id, params);

          case 'get_commit':
            return MOCK_GET_COMMIT_RESPONSE(id, params);

          default:
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32601,
                message: `Unknown tool: ${toolName}`
              }
            };
        }
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
  try {
    await writer.write(encoder.encode('event: open\ndata: {}\n\n'));
  } catch (error) {
    console.error('Error writing to SSE stream:', error);
    // Optionally, close the writer or stream if a critical write fails
  }

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
      try {
        await writer.write(encoder.encode(`data: ${JSON.stringify(response)}\n\n`));
      } catch (e) {
        console.error('Error writing to SSE stream:', e);
      }
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
      try {
        await writer.write(encoder.encode(errorEvent));
      } catch (e) {
        console.error('Error writing to SSE stream:', e);
      }
    }
  }

  // Send pings to keep connection alive
  let pingInterval = setInterval(async () => {
    try {
      await writer.write(encoder.encode('event: ping\ndata: {}\n\n'));
    } catch (error) {
      console.error('Error writing to SSE stream:', error);
      clearInterval(pingInterval);
    }
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

// SSE endpoint for MCP (POST)
app.post('/sse', async (c) => {
  // Set SSE headers
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');

  // Authorization check
  // For POST, token and command could be in body, but mirroring GET for now.
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
  try {
    await writer.write(encoder.encode('event: open\ndata: {}\n\n'));
  } catch (error) {
    console.error('Error writing to SSE stream:', error);
    // Optionally, close the writer or stream if a critical write fails
  }

  // Handle command if provided
  // For POST, command could be in body, but mirroring GET for now.
  const url = new URL(c.req.url);
  const command = url.searchParams.get('command');

  if (command) {
    try {
      const request = JSON.parse(command);
      const response = await MCPServer.handleRequest(request, {
        env: c.env,
        log: console
      });
      try {
        await writer.write(encoder.encode(`data: ${JSON.stringify(response)}\n\n`));
      } catch (e) {
        console.error('Error writing to SSE stream:', e);
      }
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
      try {
        await writer.write(encoder.encode(errorEvent));
      } catch (e) {
        console.error('Error writing to SSE stream:', e);
      }
    }
  }

  // Send pings to keep connection alive
  let pingInterval = setInterval(async () => {
    try {
      await writer.write(encoder.encode('event: ping\ndata: {}\n\n'));
    } catch (error) {
      console.error('Error writing to SSE stream:', error);
      clearInterval(pingInterval);
    }
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
    name: 'GitHub API MCP Server',
    version: '1.0.0',
    description: 'MCP server for GitHub API integration'
  });
});

// Worker setup
export default {
  async fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  }
};

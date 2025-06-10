import { Octokit } from '@octokit/rest';

// Helper function to create GitHub client
const createGitHubClient = (env) => {
  return new Octokit({
    auth: env.GITHUB_TOKEN,
  });
};

// Helper function to handle errors
const handleError = (error) => {
  console.error('GitHub API error:', error);
  return {
    status: 'error',
    message: error.message,
    details: error.response?.data || {}
  };
};

// OAuth metadata helper
function getOAuthMetadata(baseUrl) {
  return {
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
}

// Tool definitions
const TOOLS = [
  {
    name: 'create_or_update_file',
    description: 'Create or update a single file in a GitHub repository',
    inputSchema: {
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
    inputSchema: {
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
    inputSchema: {
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
          },
          description: 'Array of file objects to push, each object with path (string) and content (string)'
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
    inputSchema: {
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
    inputSchema: {
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
    inputSchema: {
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
    inputSchema: {
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

// Tool handlers
async function handleCreateOrUpdateFile(args, env) {
  const { owner, repo, path, content, message, branch, sha } = args;
  
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
    return handleError(error);
  }
}

async function handleGetFileContents(args, env) {
  const { owner, repo, path, branch } = args;
  
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
    return handleError(error);
  }
}

async function handlePushFiles(args, env) {
  const { owner, repo, branch, files, message } = args;
  
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
    return handleError(error);
  }
}

async function handleCreateBranch(args, env) {
  const { owner, repo, branch, from_branch } = args;
  
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
    return handleError(error);
  }
}

async function handleListBranches(args, env) {
  const { owner, repo, page, perPage } = args;
  
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
    return handleError(error);
  }
}

async function handleListCommits(args, env) {
  const { owner, repo, sha, page, perPage } = args;
  
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
    return handleError(error);
  }
}

async function handleGetCommit(args, env) {
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
    return handleError(error);
  }
}

// Map tool names to handlers
const TOOL_HANDLERS = new Map([
  ['create_or_update_file', handleCreateOrUpdateFile],
  ['get_file_contents', handleGetFileContents],
  ['push_files', handlePushFiles],
  ['create_branch', handleCreateBranch],
  ['list_branches', handleListBranches],
  ['list_commits', handleListCommits],
  ['get_commit', handleGetCommit]
]);

// Process JSON-RPC request
async function processJsonRpcRequest(request, env) {
  switch (request.method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            prompts: {}
          },
          serverInfo: {
            name: 'GitHub MCP Server',
            version: '1.0.0'
          }
        },
        id: request.id
      };
      
    case 'tools/list':
      return {
        jsonrpc: '2.0',
        result: { tools: TOOLS },
        id: request.id
      };
      
    case 'tools/call':
      const { name, arguments: args } = request.params;
      const handler = TOOL_HANDLERS.get(name);
      
      if (!handler) {
        return {
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: `Tool not found: ${name}`
          },
          id: request.id
        };
      }
      
      try {
        const result = await handler(args, env);
        return {
          jsonrpc: '2.0',
          result,
          id: request.id
        };
      } catch (error) {
        console.error(`Error in tool ${name}:`, error);
        return {
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal error',
            data: error instanceof Error ? error.message : 'Unknown error'
          },
          id: request.id
        };
      }
      
    default:
      return {
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: `Method not found: ${request.method}`
        },
        id: request.id
      };
  }
}

// Worker export
export default {
  async fetch(request, env, ctx) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      
      // OAuth metadata endpoints - public access
      if (url.pathname === '/.well-known/oauth-metadata' || 
          url.pathname === '/.well-known/openid-configuration' ||
          url.pathname === '/sse/.well-known/oauth-metadata' ||
          url.pathname === '/sse/.well-known/openid-configuration') {
        const baseUrl = url.origin;
        const metadata = getOAuthMetadata(baseUrl);
        return new Response(JSON.stringify(metadata), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // For MCP endpoints, check authorization
      const authHeader = request.headers.get('Authorization');
      let isAuthenticated = false;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        // Simple bearer token authentication
        if (token === env.MCP_AUTH_KEY) {
          isAuthenticated = true;
        }
      }
      
      if (!isAuthenticated) {
        return new Response('Unauthorized', { 
          status: 401,
          headers: {
            'WWW-Authenticate': 'Bearer',
            ...corsHeaders
          }
        });
      }

      // Handle SSE endpoint
      if (url.pathname === '/sse' && request.method === 'POST') {
        const encoder = new TextEncoder();
        
        const readable = new ReadableStream({
          async start(controller) {
            try {
              // Process the request body
              const json = await request.json();
              const response = await processJsonRpcRequest(json, env);
              
              // Send the response as an SSE event with proper format
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(response)}\n\n`));
              
              // Close the stream after sending the response
              controller.close();
            } catch (error) {
              const errorResponse = {
                jsonrpc: '2.0',
                error: {
                  code: -32700,
                  message: 'Parse error',
                  data: error instanceof Error ? error.message : 'Unknown error'
                },
                id: null
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorResponse)}\n\n`));
              controller.close();
            }
          }
        });
        
        return new Response(readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            ...corsHeaders
          }
        });
      }
      
      // Handle RPC endpoint
      if (url.pathname === '/rpc' && request.method === 'POST') {
        try {
          const json = await request.json();
          const response = await processJsonRpcRequest(json, env);
          
          return new Response(JSON.stringify(response), {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32700,
              message: 'Parse error'
            },
            id: null
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }
      
      // Health check endpoint
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({
          status: 'ok',
          service: 'GitHub MCP Server',
          version: '1.0.0'
        }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Default route
      if (url.pathname === '/') {
        return new Response(JSON.stringify({
          name: 'GitHub MCP Server',
          version: '1.0.0',
          description: 'Cloudflare Worker MCP server for GitHub API integration'
        }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      return new Response('Not Found', { 
        status: 404,
        headers: corsHeaders 
      });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : 'Unknown error'
        },
        id: null
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
};
// Environment interface (JavaScript - no TypeScript syntax)
// Env contains: MCP_AUTH_KEY, GITHUB_TOKEN

// Import Octokit for GitHub API
import { Octokit } from '@octokit/rest';

// Direct JSON Schema definitions (no more Zod complexity!)
const toolSchemas = {
  create_or_update_file: {
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
  },
  get_file_contents: {
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
  },
  push_files: {
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
  },
  create_branch: {
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
  },
  list_branches: {
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
        minimum: 1,
        description: 'Page number for pagination (min 1)'
      },
      perPage: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        description: 'Results per page for pagination (min 1, max 100)'
      }
    },
    required: ['owner', 'repo']
  },
  list_commits: {
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
        minimum: 1,
        description: 'Page number for pagination (min 1)'
      },
      perPage: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        description: 'Results per page for pagination (min 1, max 100)'
      }
    },
    required: ['owner', 'repo']
  },
  get_commit: {
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
        minimum: 1,
        description: 'Page number for pagination (min 1)'
      },
      perPage: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        description: 'Results per page for pagination (min 1, max 100)'
      }
    },
    required: ['owner', 'repo', 'sha']
  }
};

// Helper function to handle GitHub API errors
function handleError(error) {
  console.error('GitHub API error:', error);
  return {
    status: 'error',
    message: error.message,
    details: error.response?.data || {}
  };
}

// Tool implementations
class GitHubTools {
  constructor(env) {
    this.env = env;
    this.github = new Octokit({
      auth: env.GITHUB_TOKEN,
    });
  }

  async create_or_update_file(params) {
    try {
      console.log('create_or_update_file called with:', params);

      const { owner, repo, path, content, message, branch, sha } = params;

      const response = await this.github.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        branch,
        sha
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: 'success',
            commit: response.data.commit,
            file: {
              path: response.data.content?.path,
              sha: response.data.content?.sha,
              url: response.data.content?.html_url
            }
          }, null, 2)
        }]
      };
    } catch (error) {
      console.error('Exception in create_or_update_file:', error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(handleError(error))
        }],
        isError: true
      };
    }
  }

  async get_file_contents(params) {
    try {
      console.log('get_file_contents called with:', params);

      const { owner, repo, path, branch } = params;

      const response = await this.github.repos.getContent({
        owner,
        repo,
        path,
        ref: branch
      });

      // Handle file
      if (!Array.isArray(response.data)) {
        const content = Buffer.from(response.data.content, 'base64').toString();
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: 'success',
              type: 'file',
              content,
              sha: response.data.sha,
              size: response.data.size,
              url: response.data.html_url
            }, null, 2)
          }]
        };
      }

      // Handle directory
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
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
          }, null, 2)
        }]
      };
    } catch (error) {
      console.error('Exception in get_file_contents:', error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(handleError(error))
        }],
        isError: true
      };
    }
  }

  async push_files(params) {
    try {
      console.log('push_files called with:', params);

      const { owner, repo, branch, files, message } = params;

      // Get the latest commit on the branch to use as base
      const branchData = await this.github.repos.getBranch({
        owner,
        repo,
        branch
      });

      const baseTree = branchData.data.commit.sha;

      // Create blobs for each file
      const blobs = await Promise.all(
        files.map(async file => {
          const blob = await this.github.git.createBlob({
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
      const tree = await this.github.git.createTree({
        owner,
        repo,
        base_tree: baseTree,
        tree: blobs
      });

      // Create a commit
      const commit = await this.github.git.createCommit({
        owner,
        repo,
        message,
        tree: tree.data.sha,
        parents: [baseTree]
      });

      // Update the branch reference
      await this.github.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: commit.data.sha
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: 'success',
            commit: {
              sha: commit.data.sha,
              message,
              url: `https://github.com/${owner}/${repo}/commit/${commit.data.sha}`
            },
            files_count: files.length
          }, null, 2)
        }]
      };
    } catch (error) {
      console.error('Exception in push_files:', error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(handleError(error))
        }],
        isError: true
      };
    }
  }

  async create_branch(params) {
    try {
      console.log('create_branch called with:', params);

      const { owner, repo, branch, from_branch } = params;

      // Get the default branch if from_branch not specified
      let sourceBranch = from_branch;
      if (!sourceBranch) {
        const repoData = await this.github.repos.get({
          owner,
          repo
        });
        sourceBranch = repoData.data.default_branch;
      }

      // Get the commit SHA of the source branch
      const sourceRef = await this.github.git.getRef({
        owner,
        repo,
        ref: `heads/${sourceBranch}`
      });

      // Create the new branch
      const response = await this.github.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branch}`,
        sha: sourceRef.data.object.sha
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: 'success',
            branch_name: branch,
            source_branch: sourceBranch,
            ref: response.data.ref,
            url: response.data.url
          }, null, 2)
        }]
      };
    } catch (error) {
      console.error('Exception in create_branch:', error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(handleError(error))
        }],
        isError: true
      };
    }
  }

  async list_branches(params) {
    try {
      console.log('list_branches called with:', params);

      const { owner, repo, page, perPage } = params;

      const response = await this.github.repos.listBranches({
        owner,
        repo,
        page,
        per_page: perPage
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: 'success',
            branches: response.data.map(branch => ({
              name: branch.name,
              sha: branch.commit.sha,
              protected: branch.protected
            }))
          }, null, 2)
        }]
      };
    } catch (error) {
      console.error('Exception in list_branches:', error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(handleError(error))
        }],
        isError: true
      };
    }
  }

  async list_commits(params) {
    try {
      console.log('list_commits called with:', params);

      const { owner, repo, sha, page, perPage } = params;

      const response = await this.github.repos.listCommits({
        owner,
        repo,
        sha,
        page,
        per_page: perPage
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
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
          }, null, 2)
        }]
      };
    } catch (error) {
      console.error('Exception in list_commits:', error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(handleError(error))
        }],
        isError: true
      };
    }
  }

  async get_commit(params) {
    try {
      console.log('get_commit called with:', params);

      const { owner, repo, sha, page, perPage } = params;

      const response = await this.github.repos.getCommit({
        owner,
        repo,
        ref: sha,
        page,
        per_page: perPage
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
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
          }, null, 2)
        }]
      };
    } catch (error) {
      console.error('Exception in get_commit:', error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(handleError(error))
        }],
        isError: true
      };
    }
  }
}

// Pure MCP JSON-RPC 2.0 Handler
class PureGitHubMCPServer {
  constructor(env) {
    this.tools = new GitHubTools(env);
  }

  async handleRequest(request) {
    const { method, params, id } = request;
    
    try {
      switch (method) {
        case 'initialize':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {}
              },
              serverInfo: {
                name: 'GitHub MCP',
                version: '2.0.0'
              }
            }
          };
          
        case 'tools/list':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              tools: [
                {
                  name: 'create_or_update_file',
                  description: 'Create or update a single file in a GitHub repository',
                  inputSchema: toolSchemas.create_or_update_file
                },
                {
                  name: 'get_file_contents',
                  description: 'Get the contents of a file or directory from a GitHub repository',
                  inputSchema: toolSchemas.get_file_contents
                },
                {
                  name: 'push_files',
                  description: 'Push multiple files to a GitHub repository in a single commit',
                  inputSchema: toolSchemas.push_files
                },
                {
                  name: 'create_branch',
                  description: 'Create a new branch in a GitHub repository',
                  inputSchema: toolSchemas.create_branch
                },
                {
                  name: 'list_branches',
                  description: 'List branches in a GitHub repository',
                  inputSchema: toolSchemas.list_branches
                },
                {
                  name: 'list_commits',
                  description: 'Get list of commits of a branch in a GitHub repository',
                  inputSchema: toolSchemas.list_commits
                },
                {
                  name: 'get_commit',
                  description: 'Get details for a commit from a GitHub repository',
                  inputSchema: toolSchemas.get_commit
                }
              ]
            }
          };
          
        case 'tools/call':
          const toolName = params.name;
          const toolArgs = params.arguments || {};
          
          // Validate tool exists
          if (!(toolName in toolSchemas)) {
            throw new Error(`Unknown tool: ${toolName}`);
          }
          
          // Call the appropriate tool method
          const result = await this.tools[toolName](toolArgs);
          
          return {
            jsonrpc: '2.0',
            id,
            result
          };
          
        case 'ping':
          return {
            jsonrpc: '2.0',
            id,
            result: {}
          };
          
        default:
          throw new Error(`Unknown method: ${method}`);
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: 'Internal error',
          data: String(error)
        }
      };
    }
  }
}

// OAuth metadata endpoints (for mcp-remote compatibility)
function createOAuthMetadata(baseUrl) {
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

// Cloudflare Worker Export
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Token',
    };
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // OAuth metadata endpoints
    if (url.pathname === '/.well-known/oauth-metadata' || url.pathname === '/sse/.well-known/oauth-metadata') {
      const baseUrl = url.origin;
      const metadata = createOAuthMetadata(baseUrl);
      return new Response(JSON.stringify(metadata), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // SSE endpoint for MCP protocol
    if (url.pathname === '/sse') {
      // Authorization check
      const authToken = url.searchParams.get('token') || request.headers.get('Authorization')?.replace('Bearer ', '');
      const expectedToken = env.MCP_AUTH_KEY;

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
            'Connection': 'keep-alive',
            ...corsHeaders
          }
        });
      }

      const server = new PureGitHubMCPServer(env);
      
      // Handle incoming messages
      if (request.method === 'POST') {
        try {
          const body = await request.json();
          const response = await server.handleRequest(body);
          
          // Return SSE-formatted response
          return new Response(
            `data: ${JSON.stringify(response)}\n\n`,
            {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                ...corsHeaders
              }
            }
          );
        } catch (error) {
          return new Response(
            `data: ${JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32700,
                message: 'Parse error',
                data: String(error)
              }
            })}\n\n`,
            {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                ...corsHeaders
              }
            }
          );
        }
      }
      
      // For GET requests, return a simple SSE connection
      return new Response(
        `data: {"jsonrpc":"2.0","method":"ping","result":{}}\n\n`,
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            ...corsHeaders
          }
        }
      );
    }

    // JSON-RPC endpoint (legacy)
    if (url.pathname === '/mcp') {
      // Authorization check
      const authToken = request.headers.get('X-API-Token');
      const expectedToken = env.MCP_AUTH_KEY;

      if (expectedToken && authToken !== expectedToken) {
        return new Response(JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32001,
            message: 'Unauthorized',
            data: { reason: 'Invalid or missing API token' }
          }
        }), {
          status: 401,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      try {
        const server = new PureGitHubMCPServer(env);
        const requestBody = await request.json();
        const response = await server.handleRequest(requestBody);
        return new Response(JSON.stringify(response), {
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      } catch (error) {
        console.error('Error handling MCP request:', error);
        return new Response(JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32603,
            message: 'Internal error',
            data: { reason: error.message }
          }
        }), {
          status: 500,
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
        status: 'healthy',
        service: 'Pure GitHub MCP v2.0',
        timestamp: new Date().toISOString(),
        tools: [
          'create_or_update_file',
          'get_file_contents',
          'push_files',
          'create_branch',
          'list_branches',
          'list_commits',
          'get_commit'
        ],
        features: [
          'Repository file management',
          'Branch operations',
          'Commit operations',
          'Multi-file push support',
          'OAuth integration ready'
        ]
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
        version: '2.0.0',
        description: 'Pure MCP implementation for GitHub API integration'
      }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Default response
    return new Response(JSON.stringify({
      error: 'Not found',
      available_endpoints: ['/sse', '/mcp', '/health', '/.well-known/oauth-metadata']
    }), {
      status: 404,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
};
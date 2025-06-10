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
    name: 'search_repositories',
    description: 'Search for GitHub repositories',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query'
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
      required: ['query']
    }
  },
  {
    name: 'get_file_contents',
    description: 'Get the contents of a file from a GitHub repository',
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
    name: 'get_pull_request',
    description: 'Get details of a specific pull request',
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
        pullNumber: {
          type: 'number',
          description: 'Pull request number'
        }
      },
      required: ['owner', 'repo', 'pullNumber']
    }
  }
];

// Tool implementation
async function callTool(name, args, env) {
  const github = createGitHubClient(env);
  
  switch (name) {
    case 'create_or_update_file': {
      const { owner, repo, path, content, message, branch, sha } = args;
      
      try {
        // Base64 encode the content
        const encodedContent = btoa(unescape(encodeURIComponent(content)));
        
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
        return handleError(error);
      }
    }
    
    case 'push_files': {
      const { owner, repo, branch, files, message } = args;
      
      try {
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
              content: btoa(unescape(encodeURIComponent(file.content))),
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
        return handleError(error);
      }
    }
    
    case 'search_repositories': {
      const { query, page, perPage } = args;
      
      try {
        const response = await github.search.repos({
          q: query,
          page: page || 1,
          per_page: perPage || 30
        });
        
        return {
          status: 'success',
          total_count: response.data.total_count,
          repositories: response.data.items.map(repo => ({
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description,
            html_url: repo.html_url,
            owner: {
              login: repo.owner.login,
              avatar_url: repo.owner.avatar_url,
              type: repo.owner.type
            },
            private: repo.private,
            stars: repo.stargazers_count,
            language: repo.language,
            created_at: repo.created_at,
            updated_at: repo.updated_at
          }))
        };
      } catch (error) {
        return handleError(error);
      }
    }
    
    case 'get_file_contents': {
      const { owner, repo, path, branch } = args;
      
      try {
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
              decodedContent = decodeURIComponent(escape(atob(file.content)));
            } catch (e) {
              console.warn('Failed to decode file content:', e);
              decodedContent = '[Binary or invalid content]';
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
        return handleError(error);
      }
    }
    
    case 'get_pull_request': {
      const { owner, repo, pullNumber } = args;
      
      try {
        const response = await github.pulls.get({
          owner,
          repo,
          pull_number: pullNumber
        });
        
        return {
          status: 'success',
          number: response.data.number,
          state: response.data.state,
          title: response.data.title,
          body: response.data.body,
          html_url: response.data.html_url,
          user: {
            login: response.data.user.login,
            avatar_url: response.data.user.avatar_url
          },
          head: {
            ref: response.data.head.ref,
            sha: response.data.head.sha
          },
          base: {
            ref: response.data.base.ref,
            sha: response.data.base.sha
          },
          merged: response.data.merged,
          mergeable: response.data.mergeable,
          created_at: response.data.created_at,
          updated_at: response.data.updated_at,
          closed_at: response.data.closed_at,
          merged_at: response.data.merged_at
        };
      } catch (error) {
        return handleError(error);
      }
    }
    
    default:
      return {
        status: 'error',
        message: `Unknown tool: ${name}`
      };
  }
}

// Process JSON-RPC request
async function processJsonRpcRequest(request, env) {
  const { id, method, params } = request;
  
  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'github-mcp',
            version: '1.0.0'
          },
          capabilities: {
            tools: {
              list: true,
              call: true
            }
          }
        }
      };
      
    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: TOOLS
        }
      };
      
    case 'tools/call':
      if (!params?.name || !params?.arguments) {
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32602,
            message: 'Invalid params'
          }
        };
      }
      
      try {
        const result = await callTool(params.name, params.arguments, env);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }]
          }
        };
      } catch (error) {
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32603,
            message: 'Internal error',
            data: error.message
          }
        };
      }
      
    default:
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: 'Method not found'
        }
      };
  }
}

// Worker entry point
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Token'
    };
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }
    
    // OAuth metadata endpoints
    if (url.pathname === '/.well-known/oauth-metadata' || 
        url.pathname === '/sse/.well-known/oauth-metadata' ||
        url.pathname === '/sse/.well-known/openid-configuration') {
      return new Response(JSON.stringify(getOAuthMetadata(url.origin)), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Handle persistent SSE endpoint
    if (url.pathname === '/sse' && request.method === 'POST') {
      // Check authorization
      const authHeader = request.headers.get('Authorization');
      if (env.MCP_AUTH_KEY && authHeader !== `Bearer ${env.MCP_AUTH_KEY}`) {
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
      ctx.waitUntil((async () => {
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
          const reader = request.body.getReader();
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
                const response = await processJsonRpcRequest(jsonRequest, env);
                
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
  }
};
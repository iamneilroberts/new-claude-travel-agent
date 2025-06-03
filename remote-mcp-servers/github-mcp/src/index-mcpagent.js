import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Octokit } from '@octokit/rest';

// Helper function to create GitHub client
const createGitHubClient = (env) => {
  return new Octokit({
    auth: env.GITHUB_TOKEN,
  });
};

export class GitHubMCP extends McpAgent {
  server = new McpServer({
    name: "GitHub API MCP Server",
    version: "1.0.0",
  });

  async init() {
    const env = this.env;

    // Create or update file tool
    this.server.tool(
      "create_or_update_file",
      {
        owner: z.string().describe("Repository owner"),
        repo: z.string().describe("Repository name"),
        path: z.string().describe("File path"),
        content: z.string().describe("File content (base64 encoded)"),
        message: z.string().describe("Commit message"),
        branch: z.string().optional().describe("Branch name (defaults to default branch)"),
        sha: z.string().optional().describe("SHA of existing file (for updates)")
      },
      async (params) => {
        try {
          const github = createGitHubClient(env);
          
          const result = await github.repos.createOrUpdateFileContents({
            owner: params.owner,
            repo: params.repo,
            path: params.path,
            message: params.message,
            content: params.content,
            branch: params.branch,
            sha: params.sha
          });

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "success",
                sha: result.data.content.sha,
                html_url: result.data.content.html_url
              }, null, 2)
            }]
          };
        } catch (error) {
          console.error('Error in create_or_update_file:', error);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "error",
                message: error.message
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );

    // Get file contents tool
    this.server.tool(
      "get_file_contents",
      {
        owner: z.string().describe("Repository owner"),
        repo: z.string().describe("Repository name"),
        path: z.string().describe("File path"),
        ref: z.string().optional().describe("Git ref (branch, tag, or commit SHA)")
      },
      async (params) => {
        try {
          const github = createGitHubClient(env);
          
          const result = await github.repos.getContent({
            owner: params.owner,
            repo: params.repo,
            path: params.path,
            ref: params.ref
          });

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "success",
                content: result.data.content,
                encoding: result.data.encoding,
                sha: result.data.sha
              }, null, 2)
            }]
          };
        } catch (error) {
          console.error('Error in get_file_contents:', error);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "error",
                message: error.message
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );

    // Push files tool
    this.server.tool(
      "push_files",
      {
        owner: z.string().describe("Repository owner"),
        repo: z.string().describe("Repository name"),
        files: z.array(z.object({
          path: z.string(),
          content: z.string()
        })).describe("Array of files to push"),
        message: z.string().describe("Commit message"),
        branch: z.string().optional().describe("Branch name")
      },
      async (params) => {
        try {
          const github = createGitHubClient(env);
          
          // For multiple files, we need to create a tree and commit
          const results = [];
          for (const file of params.files) {
            const result = await github.repos.createOrUpdateFileContents({
              owner: params.owner,
              repo: params.repo,
              path: file.path,
              message: `${params.message} - ${file.path}`,
              content: Buffer.from(file.content).toString('base64'),
              branch: params.branch
            });
            results.push(result.data);
          }

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "success",
                files_pushed: results.length,
                results: results.map(r => ({
                  path: r.content.path,
                  sha: r.content.sha
                }))
              }, null, 2)
            }]
          };
        } catch (error) {
          console.error('Error in push_files:', error);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "error",
                message: error.message
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );

    // Create branch tool
    this.server.tool(
      "create_branch",
      {
        owner: z.string().describe("Repository owner"),
        repo: z.string().describe("Repository name"),
        branch: z.string().describe("New branch name"),
        from: z.string().optional().describe("Source branch or SHA (defaults to default branch)")
      },
      async (params) => {
        try {
          const github = createGitHubClient(env);
          
          // Get source SHA
          let sha;
          if (params.from) {
            const ref = await github.git.getRef({
              owner: params.owner,
              repo: params.repo,
              ref: `heads/${params.from}`
            });
            sha = ref.data.object.sha;
          } else {
            const repo = await github.repos.get({
              owner: params.owner,
              repo: params.repo
            });
            const defaultBranch = await github.git.getRef({
              owner: params.owner,
              repo: params.repo,
              ref: `heads/${repo.data.default_branch}`
            });
            sha = defaultBranch.data.object.sha;
          }

          const result = await github.git.createRef({
            owner: params.owner,
            repo: params.repo,
            ref: `refs/heads/${params.branch}`,
            sha: sha
          });

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "success",
                branch: params.branch,
                sha: result.data.object.sha
              }, null, 2)
            }]
          };
        } catch (error) {
          console.error('Error in create_branch:', error);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "error",
                message: error.message
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );

    // List branches tool
    this.server.tool(
      "list_branches",
      {
        owner: z.string().describe("Repository owner"),
        repo: z.string().describe("Repository name")
      },
      async (params) => {
        try {
          const github = createGitHubClient(env);
          
          const result = await github.repos.listBranches({
            owner: params.owner,
            repo: params.repo
          });

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "success",
                branches: result.data.map(branch => ({
                  name: branch.name,
                  sha: branch.commit.sha,
                  protected: branch.protected
                }))
              }, null, 2)
            }]
          };
        } catch (error) {
          console.error('Error in list_branches:', error);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "error",
                message: error.message
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );

    // List commits tool
    this.server.tool(
      "list_commits",
      {
        owner: z.string().describe("Repository owner"),
        repo: z.string().describe("Repository name"),
        sha: z.string().optional().describe("SHA or branch to start listing commits from"),
        per_page: z.number().optional().describe("Results per page (max 100)")
      },
      async (params) => {
        try {
          const github = createGitHubClient(env);
          
          const result = await github.repos.listCommits({
            owner: params.owner,
            repo: params.repo,
            sha: params.sha,
            per_page: params.per_page || 30
          });

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "success",
                commits: result.data.map(commit => ({
                  sha: commit.sha,
                  message: commit.commit.message,
                  author: commit.commit.author,
                  date: commit.commit.author.date
                }))
              }, null, 2)
            }]
          };
        } catch (error) {
          console.error('Error in list_commits:', error);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "error",
                message: error.message
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );

    // Get commit tool
    this.server.tool(
      "get_commit",
      {
        owner: z.string().describe("Repository owner"),
        repo: z.string().describe("Repository name"),
        ref: z.string().describe("Commit SHA")
      },
      async (params) => {
        try {
          const github = createGitHubClient(env);
          
          const result = await github.repos.getCommit({
            owner: params.owner,
            repo: params.repo,
            ref: params.ref
          });

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "success",
                sha: result.data.sha,
                message: result.data.commit.message,
                author: result.data.commit.author,
                stats: result.data.stats,
                files: result.data.files?.map(file => ({
                  filename: file.filename,
                  status: file.status,
                  additions: file.additions,
                  deletions: file.deletions
                }))
              }, null, 2)
            }]
          };
        } catch (error) {
          console.error('Error in get_commit:', error);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "error",
                message: error.message
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );

    console.log("GitHub MCP initialized with 7 tools");
  }
}

export default {
  fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'GitHub API MCP Server',
        version: '1.0.0',
        tools: [
          'create_or_update_file',
          'get_file_contents',
          'push_files',
          'create_branch',
          'list_branches',
          'list_commits',
          'get_commit'
        ],
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // SSE endpoints (primary)
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return GitHubMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    // MCP endpoint (fallback)
    if (url.pathname === "/mcp") {
      return GitHubMCP.serve("/mcp").fetch(request, env, ctx);
    }

    // Default 404 response
    return new Response(JSON.stringify({
      error: "Not found",
      available_endpoints: ["/health", "/sse", "/mcp"]
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  },
};
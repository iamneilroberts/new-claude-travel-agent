import { Octokit } from '@octokit/rest';

// Cloudflare Workers compatible base64 encoding
function base64Encode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

function base64Decode(str: string): string {
  return decodeURIComponent(escape(atob(str)));
}

// Environment interface
interface Env {
	GITHUB_TOKEN: string;
	MCP_AUTH_KEY: string;
}

// Direct JSON Schema definitions (much simpler!)
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

// Tool implementations
class GitHubTools {
	private env: Env;
	private github: Octokit;
	
	constructor(env: Env) {
		this.env = env;
		this.github = new Octokit({
			auth: env.GITHUB_TOKEN,
		});
	}
	
	private handleError(error: any): any {
		console.error('GitHub API error:', error);
		return {
			content: [{
				type: "text",
				text: `Error: ${error.message || 'Unknown error'}`
			}]
		};
	}
	
	async create_or_update_file(params: any) {
		try {
			const { owner, repo, path, content, message, branch, sha } = params;
			
			const response = await this.github.repos.createOrUpdateFileContents({
				owner,
				repo,
				path,
				message,
				content: base64Encode(content),
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
		} catch (error: any) {
			return this.handleError(error);
		}
	}
	
	async get_file_contents(params: any) {
		try {
			const { owner, repo, path, branch } = params;
			
			const response = await this.github.repos.getContent({
				owner,
				repo,
				path,
				ref: branch
			});
			
			// Handle file
			if (!Array.isArray(response.data) && 'content' in response.data) {
				const content = base64Decode(response.data.content);
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
			if (Array.isArray(response.data)) {
				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							status: 'success',
							type: 'directory',
							items: response.data.map((item: any) => ({
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
			}
			
			// Fallback for unknown response type
			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						status: 'error',
						message: 'Unknown response type'
					}, null, 2)
				}]
			};
		} catch (error: any) {
			return this.handleError(error);
		}
	}
	
	async push_files(params: any) {
		try {
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
				files.map(async (file: any) => {
					const blob = await this.github.git.createBlob({
						owner,
						repo,
						content: base64Encode(file.content),
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
		} catch (error: any) {
			return this.handleError(error);
		}
	}
	
	async create_branch(params: any) {
		try {
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
		} catch (error: any) {
			return this.handleError(error);
		}
	}
	
	async list_branches(params: any) {
		try {
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
		} catch (error: any) {
			return this.handleError(error);
		}
	}
	
	async list_commits(params: any) {
		try {
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
								name: commit.commit.author?.name,
								email: commit.commit.author?.email,
								date: commit.commit.author?.date
							},
							committer: {
								name: commit.commit.committer?.name,
								email: commit.commit.committer?.email,
								date: commit.commit.committer?.date
							},
							html_url: commit.html_url
						}))
					}, null, 2)
				}]
			};
		} catch (error: any) {
			return this.handleError(error);
		}
	}
	
	async get_commit(params: any) {
		try {
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
								name: response.data.commit.author?.name,
								email: response.data.commit.author?.email,
								date: response.data.commit.author?.date
							},
							committer: {
								name: response.data.commit.committer?.name,
								email: response.data.commit.committer?.email,
								date: response.data.commit.committer?.date
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
		} catch (error: any) {
			return this.handleError(error);
		}
	}
}

// Pure MCP JSON-RPC 2.0 Handler
class PureGitHubMCPServer {
	private tools: GitHubTools;
	
	constructor(env: Env) {
		this.tools = new GitHubTools(env);
	}
	
	async handleRequest(request: any): Promise<any> {
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
								name: 'GitHub API MCP',
								version: '3.0.0'
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
					const result = await (this.tools as any)[toolName](toolArgs);
					
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
					
				case 'resources/list':
					return {
						jsonrpc: '2.0',
						id,
						result: {
							resources: []
						}
					};
					
				case 'prompts/list':
					return {
						jsonrpc: '2.0',
						id,
						result: {
							prompts: []
						}
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

// Cloudflare Worker Export
export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		
		// CORS headers
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		};
		
		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}
		
		// SSE endpoint for MCP protocol
		if (url.pathname === '/sse') {
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
		
		// Health check endpoint
		if (url.pathname === '/health') {
			return new Response(JSON.stringify({
				status: 'healthy',
				service: 'Pure GitHub API MCP v3',
				timestamp: new Date().toISOString()
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
			available_endpoints: ['/sse', '/health']
		}), {
			status: 404,
			headers: { 
				'Content-Type': 'application/json',
				...corsHeaders
			}
		});
	}
};
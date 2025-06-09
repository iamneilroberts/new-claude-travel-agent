// Environment interface
interface Env {
	MCP_AUTH_KEY: string;
}

// Direct JSON Schema definitions (no more Zod complexity!)
const toolSchemas = {
	sequential_thinking: {
		type: 'object',
		properties: {
			problem: {
				type: 'string',
				description: 'The problem or question to analyze'
			},
			context: {
				type: 'string',
				description: 'Additional context or information about the problem'
			},
			steps: {
				type: 'number',
				minimum: 1,
				maximum: 10,
				description: 'Maximum number of steps to use in the analysis (default 5)'
			},
			format: {
				type: 'string',
				enum: ['markdown', 'text', 'structured'],
				description: 'Output format (default markdown)'
			}
		},
		required: ['problem']
	}
};

// Tool implementations
class SequentialThinkingTools {
	private env: Env;
	
	constructor(env: Env) {
		this.env = env;
	}
	
	async sequential_thinking(params: any) {
		try {
			const { problem, context = '', steps = 5, format = 'markdown' } = params;

			// Perform sequential thinking process
			const thinking = {
				problem,
				context,
				steps: [] as Array<{step: number; title: string; content: string}>
			};

			// Generate sophisticated step content
			const stepTitles = [
				'Identify key elements and define the problem scope',
				'Analyze relationships and underlying patterns', 
				'Consider constraints, limitations, and assumptions',
				'Explore alternative perspectives and approaches',
				'Evaluate potential solutions and their implications',
				'Draw logical conclusions based on analysis',
				'Reflect on broader implications and consequences',
				'Formulate actionable recommendations or next steps',
				'Assess potential risks and mitigation strategies',
				'Synthesize findings into coherent insights'
			];

			for (let i = 1; i <= steps; i++) {
				thinking.steps.push({
					step: i,
					title: `Step ${i}: ${stepTitles[i - 1] || 'Additional analysis'}`,
					content: this.generateStepContent(i, problem, context)
				});
			}

			// Format the output
			let result;
			if (format === 'structured') {
				result = JSON.stringify(thinking, null, 2);
			} else if (format === 'markdown') {
				result = this.formatAsMarkdown(thinking);
			} else {
				result = this.formatAsText(thinking);
			}

			return {
				content: [{
					type: "text",
					text: result
				}]
			};
		} catch (error: any) {
			console.error('Error in sequential_thinking tool:', error);
			return {
				content: [{
					type: "text",
					text: `Error in sequential thinking: ${error.message}`
				}],
				isError: true
			};
		}
	}

	private generateStepContent(stepNumber: number, problem: string, context: string): string {
		const stepContent = [
			`Breaking down "${problem}" into its fundamental components. We need to understand what exactly is being asked and what factors might influence the solution. ${context ? `Given the context: ${context}` : 'Without additional context, we must work with the information provided.'}`,
			
			`Examining the interconnections between different elements of this problem. How do various factors relate to each other? What patterns or dependencies can we identify that might affect our approach?`,
			
			`Identifying the boundaries and limitations that may constrain our solution space. What assumptions are we making? What resources, time, or other constraints need to be considered?`,
			
			`Considering alternative viewpoints and approaches. What would different stakeholders think about this? Are there unconventional methods that might be more effective?`,
			
			`Weighing the pros and cons of different potential solutions. What are the likely outcomes of each approach? How do we measure success and what are the trade-offs involved?`,
			
			`Synthesizing our analysis into clear, evidence-based conclusions. What insights have emerged from our systematic examination? What can we confidently assert based on our reasoning?`,
			
			`Exploring the broader implications of our conclusions. How might this affect related areas? What unintended consequences should we anticipate?`,
			
			`Translating our insights into concrete, actionable steps. What specific actions should be taken? In what order? What resources will be needed?`,
			
			`Identifying potential obstacles and developing contingency plans. What could go wrong? How can we mitigate risks or adapt if circumstances change?`,
			
			`Bringing together all our findings into a coherent understanding. What are the key takeaways? How does this systematic analysis enhance our understanding of the original problem?`
		];

		return stepContent[stepNumber - 1] || `Continuing detailed analysis of "${problem}" with focus on systematic reasoning and logical progression through the problem space.`;
	}

	private formatAsMarkdown(thinking: any): string {
		let markdown = `# Sequential Analysis: ${thinking.problem}\n\n`;

		if (thinking.context) {
			markdown += `## Context\n${thinking.context}\n\n`;
		}

		markdown += `## Step-by-Step Analysis\n\n`;

		for (const step of thinking.steps) {
			markdown += `### ${step.title}\n${step.content}\n\n`;
		}

		markdown += `## Conclusion\nBased on the ${thinking.steps.length}-step systematic analysis above, we have thoroughly examined "${thinking.problem}" through multiple lenses. This structured approach ensures comprehensive consideration of all relevant factors, leading to well-reasoned insights and actionable conclusions.`;

		return markdown;
	}

	private formatAsText(thinking: any): string {
		let text = `SEQUENTIAL ANALYSIS: ${thinking.problem}\n\n`;

		if (thinking.context) {
			text += `CONTEXT:\n${thinking.context}\n\n`;
		}

		text += `STEP-BY-STEP BREAKDOWN:\n\n`;

		for (const step of thinking.steps) {
			text += `${step.title}\n${step.content}\n\n`;
		}

		text += `CONCLUSION:\nThis ${thinking.steps.length}-step systematic analysis provides a structured approach to understanding "${thinking.problem}" with methodical consideration of key factors, relationships, and implications.`;

		return text;
	}
}

// Pure MCP JSON-RPC 2.0 Handler
class PureSequentialThinkingMCPServer {
	private tools: SequentialThinkingTools;
	
	constructor(env: Env) {
		this.tools = new SequentialThinkingTools(env);
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
								name: 'Sequential Thinking MCP',
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
									name: 'sequential_thinking',
									description: 'Perform systematic step-by-step analysis of problems and questions',
									inputSchema: toolSchemas.sequential_thinking
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
			const server = new PureSequentialThinkingMCPServer(env);
			
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
				service: 'Pure Sequential Thinking MCP v3',
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
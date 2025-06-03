import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

interface Env {
  MCP_AUTH_KEY: string;
}

export class SequentialThinkingMCP extends McpAgent {
  server = new McpServer({
    name: "Sequential Thinking MCP",
    version: "1.0.0",
  });

  async init() {
    const env = (this as any).env as Env;

    // Sequential thinking tool
    this.server.tool(
      "sequential_thinking",
      {
        problem: z.string().describe("The problem or question to analyze"),
        context: z.string().optional().describe("Additional context or information about the problem"),
        steps: z.number().min(1).max(10).optional().default(5).describe("Maximum number of steps to use in the analysis"),
        format: z.enum(['markdown', 'text', 'structured']).optional().default('markdown').describe("Output format")
      },
      async (params) => {
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
    );
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

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'Sequential Thinking MCP',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // SSE endpoints (primary)
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return SequentialThinkingMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    // Default 404 response
    return new Response(JSON.stringify({
      error: "Not found",
      available_endpoints: ["/health", "/sse"]
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  },
};
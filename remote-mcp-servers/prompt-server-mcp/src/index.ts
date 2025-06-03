/**
 * Prompt Server MCP - McpAgent Framework Implementation
 *
 * Provides dynamic instruction sets for travel assistant using D1 database storage
 */
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

interface Env {
  DB: D1Database;
  PROMPTS_CACHE?: KVNamespace;
  MCP_AUTH_KEY: string;
}

export class PromptServerMCP extends McpAgent {
  server = new McpServer({
    name: "Prompt Server MCP",
    version: "1.0.0",
  });

  async init() {
    const env = (this as any).env as Env;
    
    // McpAgent framework handles protocol method handlers automatically
    
    try {
      console.log("Initializing Prompt Server MCP...");
      
      // Tool 1: Initialize travel assistant with mode detection
      this.server.tool('initialize_travel_assistant', {
        first_message: z.string().describe('The first message from the user to detect mode'),
      }, async (params) => {
        try {
          console.log('initialize_travel_assistant called with params:', params);
          const firstMessage = params.first_message || '';
          
          // Detect mode from first message
          const isMobileMode = /\[MOBILE\]|just got off the phone|new lead:/i.test(firstMessage);
          const mode = isMobileMode ? 'mobile-mode' : 'interactive-mode';
          console.log('Detected mode:', mode);
          
          // Store current mode in KV for session tracking (if available)
          if (env.PROMPTS_CACHE) {
            await env.PROMPTS_CACHE.put('current_mode', mode);
          }
          
          // Setup mode variables
          const modeIndicator = isMobileMode ? '[🤖 AUTONOMOUS]' : '[💬 INTERACTIVE]';
          const modeDescription = isMobileMode ? '🤖 Mobile/Autonomous' : '💬 Interactive/Desktop';
          
          // Get the appropriate instruction set from database
          const instructionResult = await env.DB.prepare(
            'SELECT title, content FROM instruction_sets WHERE name = ? AND is_active = true'
          ).bind(mode).first();
          
          if (!instructionResult) {
            console.log(`No instruction set '${mode}' found in database, using fallback`);
            // Fallback instructions if database is empty
            const fallbackContent = mode === 'mobile-mode'
              ? `# Mobile Mode - Autonomous Operation
**Work autonomously** without confirmations. Process leads immediately and generate trip proposals.
Include **[🤖 AUTONOMOUS]** at the end of responses.`
              : `# Interactive Mode - Desktop Collaboration  
**Collaborate with agent** through confirmations and detailed explanations.
Include **[💬 INTERACTIVE]** at the end of responses.`;
            
            const content = `# Travel Assistant Initialized

## Mode Detected: ${modeDescription}

## Core System:
- **Role**: Professional travel assistant for agent Kim Henderson (Somo Travel)
- **Three-tier proposals**: Classic (75%), Premium (110%), Luxury (175%) of budget  
- **Service markups never disclosed** in client documents
- **Session ID**: Generate Session-YYYYMMDD-Description for activity logs

## Current Mode Instructions:
${fallbackContent}

## Available Tools:
Use available MCP tools for flights, hotels, database operations, and document generation.

## Response Format:
**Add this indicator to each response:**
${modeIndicator} - Include this at the end of every response to show current mode.

Ready to assist with travel planning!`;
            
            return {
              content: [{
                type: 'text',
                text: content
              }]
            };
          }
          
          console.log('Found instruction set:', instructionResult.title);
          const content = `# Travel Assistant Initialized

## Mode Detected: ${modeDescription}

## Core System:
- **Role**: Professional travel assistant for agent Kim Henderson (Somo Travel)
- **Three-tier proposals**: Classic (75%), Premium (110%), Luxury (175%) of budget  
- **Service markups never disclosed** in client documents
- **Session ID**: Generate Session-YYYYMMDD-Description for activity logs

## Current Mode Instructions:
${instructionResult.content}

## Available Instruction Sets:
Use get_instruction_set("name") to access:
- mobile-mode, interactive-mode, three-tier-pricing
- tool-reference, database-schema, workflows

## Response Format:
**Add this indicator to each response:**
${modeIndicator} - Include this at the end of every response to show current mode.

Ready to assist with travel planning!`;
          
          return {
            content: [{
              type: 'text',
              text: content
            }]
          };
        } catch (error) {
          console.error('Error in initialize_travel_assistant:', error);
          return {
            content: [{
              type: 'text',
              text: `Error initializing travel assistant: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
            isError: true
          };
        }
      });

      // Tool 2: Get specific instruction set
      this.server.tool('get_instruction_set', {
        instruction_set: z.string().describe('The instruction set name to retrieve'),
        include_examples: z.boolean().optional().describe('Whether to include usage examples'),
      }, async (params) => {
        try {
          const instructionResult = await env.DB.prepare(
            'SELECT name, title, content, description, category FROM instruction_sets WHERE name = ? AND is_active = true'
          ).bind(params.instruction_set).first();
          
          if (!instructionResult) {
            // Get available instruction sets
            const availableSets = await env.DB.prepare(
              'SELECT name FROM instruction_sets WHERE is_active = true ORDER BY name'
            ).all();
            const availableNames = availableSets.results.map((row: any) => row.name).join(', ');
            throw new Error(`Unknown instruction set: ${params.instruction_set}. Available sets: ${availableNames}`);
          }
          
          let content = `# ${instructionResult.title}\n\n${instructionResult.content}`;
          
          if (params.include_examples) {
            content += '\n\n## Usage Examples\n';
            content += 'Use this instruction set when:\n';
            switch (instructionResult.category) {
              case 'mode':
                if (instructionResult.name === 'mobile-mode') {
                  content += '- Processing leads from mobile interactions\n- Working autonomously without confirmations\n- Creating initial trip structures from raw lead data';
                } else {
                  content += '- Agent is using desktop interface\n- Collaborative planning sessions\n- Technical operations requiring approval';
                }
                break;
              case 'pricing':
                content += '- Creating client proposals\n- Calculating pricing strategies\n- Building competitive tier options';
                break;
              case 'reference':
                content += '- Looking up tool parameters or database schema\n- Understanding available operations\n- Debugging tool usage or data issues';
                break;
              case 'workflow':
                content += '- Following standard procedures\n- Managing complex operations\n- Error recovery scenarios';
                break;
              default:
                content += `- Working with ${instructionResult.category} related tasks`;
            }
          }
          
          return {
            content: [{
              type: 'text',
              text: content
            }]
          };
        } catch (error) {
          console.error('Error in get_instruction_set:', error);
          return {
            content: [{
              type: 'text',
              text: `Error getting instruction set: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
            isError: true
          };
        }
      });

      // Tool 3: List all instruction sets
      this.server.tool('list_instruction_sets', {
        category: z.string().optional().describe('Filter by category (mode, pricing, reference, workflow)'),
      }, async (params) => {
        try {
          let query = 'SELECT name, title, description, category FROM instruction_sets WHERE is_active = true';
          const bindings: any[] = [];
          
          if (params.category) {
            query += ' AND category = ?';
            bindings.push(params.category);
          }
          query += ' ORDER BY category, name';
          
          const result = await env.DB.prepare(query).bind(...bindings).all();
          let content = '# Available Instruction Sets\n\n';
          
          // Group by category
          const categories: { [key: string]: any[] } = {};
          result.results.forEach((row: any) => {
            if (!categories[row.category]) {
              categories[row.category] = [];
            }
            categories[row.category].push(row);
          });
          
          Object.keys(categories).sort().forEach(category => {
            content += `## ${category.charAt(0).toUpperCase() + category.slice(1)} Instructions\n\n`;
            categories[category].forEach((instruction: any) => {
              content += `- **${instruction.name}**: ${instruction.title}\n`;
              if (instruction.description) {
                content += `  ${instruction.description}\n`;
              }
              content += '\n';
            });
          });
          
          content += '\nUse `get_instruction_set("name")` to retrieve specific instruction content.';
          
          return {
            content: [{
              type: 'text',
              text: content
            }]
          };
        } catch (error) {
          console.error('Error in list_instruction_sets:', error);
          return {
            content: [{
              type: 'text',
              text: `Error listing instruction sets: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
            isError: true
          };
        }
      });

      // Tool 4: Get current mode indicator
      this.server.tool('get_mode_indicator', {}, async () => {
        try {
          const currentMode = env.PROMPTS_CACHE ? await env.PROMPTS_CACHE.get('current_mode') || 'interactive-mode' : 'interactive-mode';
          const isMobileMode = currentMode === 'mobile-mode';
          const indicator = isMobileMode ? '[🤖 AUTONOMOUS]' : '[💬 INTERACTIVE]';
          const description = isMobileMode ? 'Mobile/Autonomous Mode' : 'Interactive/Desktop Mode';
          
          return {
            content: [{
              type: 'text',
              text: `${indicator} - ${description}`
            }]
          };
        } catch (error) {
          console.error('Error in get_mode_indicator:', error);
          return {
            content: [{
              type: 'text',
              text: `Error getting mode indicator: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
            isError: true
          };
        }
      });

      // Tool 5: Switch between modes
      this.server.tool('switch_mode', {
        mode: z.enum(['mobile-mode', 'interactive-mode']).describe('The mode to switch to'),
      }, async (params) => {
        try {
          if (env.PROMPTS_CACHE) {
            await env.PROMPTS_CACHE.put('current_mode', params.mode);
          }
          const isMobileMode = params.mode === 'mobile-mode';
          const indicator = isMobileMode ? '[🤖 AUTONOMOUS]' : '[💬 INTERACTIVE]';
          const description = isMobileMode ? 'Mobile/Autonomous Mode' : 'Interactive/Desktop Mode';
          
          return {
            content: [{
              type: 'text',
              text: `Mode switched to: ${indicator} - ${description}\n\nRemember to include the mode indicator at the end of each response.`
            }]
          };
        } catch (error) {
          console.error('Error in switch_mode:', error);
          return {
            content: [{
              type: 'text',
              text: `Error switching mode: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
            isError: true
          };
        }
      });

      console.log("Prompt Server MCP initialized with 5 tools:");
      console.log("  - initialize_travel_assistant: Mode detection and initialization");
      console.log("  - get_instruction_set: Retrieve specific instruction content");
      console.log("  - list_instruction_sets: List available instruction sets");
      console.log("  - get_mode_indicator: Get current mode indicator");
      console.log("  - switch_mode: Switch between mobile/interactive modes");
    } catch (error) {
      console.error("Failed to initialize Prompt Server MCP:", error);
      throw error;
    }
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    
    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'Prompt Server MCP',
        version: '1.0.0',
        tools: [
          'initialize_travel_assistant',
          'get_instruction_set',
          'list_instruction_sets',
          'get_mode_indicator',
          'switch_mode'
        ],
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // SSE endpoints (primary)
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return PromptServerMCP.serveSSE("/sse").fetch(request, env, ctx);
    }
    
    // MCP endpoint (fallback)
    if (url.pathname === "/mcp") {
      return PromptServerMCP.serve("/mcp").fetch(request, env, ctx);
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
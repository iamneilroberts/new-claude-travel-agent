/**
 * Prompt Server MCP - McpAgent Framework Implementation
 *
 * Provides dynamic instruction sets for travel assistant using D1 database storage
 */
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { templateEngine } from "./template-engine.js";
import { chainExecutor } from "./chain-executor.js";
import { travelWorkflowProcessor } from "./travel-workflows.js";

interface Env {
  DB: D1Database;
  PROMPTS_CACHE?: KVNamespace;
  MCP_AUTH_KEY: string;
}

export class PromptInstructionsMCP extends McpAgent {
  server = new McpServer({
    name: "Prompt Instructions MCP",
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

      // NEW TOOL 6: Execute Chain - Run workflow automation with full persistence
      this.server.tool('execute_chain', {
        chain_name: z.string().describe('The name of the chain to execute'),
        variables: z.record(z.any()).describe('Input variables for chain execution'),
        execution_options: z.object({
          async_execution: z.boolean().optional().default(false).describe('Whether to run chain asynchronously'),
          timeout_ms: z.number().optional().default(120000).describe('Maximum execution time in milliseconds'),
          execution_mode: z.enum(['sequential', 'parallel', 'hybrid']).optional().default('sequential').describe('Execution strategy'),
          enable_checkpoints: z.boolean().optional().default(true).describe('Enable checkpointing for rollback'),
          enable_rollback: z.boolean().optional().default(true).describe('Enable automatic rollback on failure'),
          save_execution_log: z.boolean().optional().default(true).describe('Save detailed execution log to database'),
          session_id: z.string().optional().describe('Optional session ID for tracking')
        }).optional().default({}).describe('Advanced execution configuration')
      }, async (params) => {
        try {
          console.log('execute_chain called with params:', {
            chain_name: params.chain_name,
            variables_count: Object.keys(params.variables).length,
            execution_mode: params.execution_options?.execution_mode || 'sequential'
          });

          // Load chain definition from database
          const chainResult = await env.DB.prepare(
            'SELECT id, name, title, description, category, steps, variables_schema, default_variables FROM execution_chains WHERE name = ? AND is_active = true'
          ).bind(params.chain_name).first();

          if (!chainResult) {
            // Get available chains for helpful error message
            const availableChains = await env.DB.prepare(
              'SELECT name, category, description FROM execution_chains WHERE is_active = true ORDER BY category, name'
            ).all();
            const chainsList = availableChains.results.map((row: any) => `${row.name} (${row.category}): ${row.description || 'No description'}`).join('\n- ');
            throw new Error(`Chain '${params.chain_name}' not found.\n\nAvailable chains:\n- ${chainsList}`);
          }

          // Parse chain definition
          const chainDefinition = {
            id: chainResult.id as string,
            name: chainResult.name as string,
            title: chainResult.title as string,
            description: chainResult.description as string || '',
            category: chainResult.category as string,
            steps: JSON.parse(chainResult.steps as string),
            variables_schema: chainResult.variables_schema ? JSON.parse(chainResult.variables_schema as string) : {},
            default_variables: chainResult.default_variables ? JSON.parse(chainResult.default_variables as string) : {}
          };

          // Validate input variables against schema if provided
          if (chainDefinition.variables_schema && Object.keys(chainDefinition.variables_schema).length > 0) {
            const validationErrors: string[] = [];
            Object.entries(chainDefinition.variables_schema).forEach(([varName, schema]: [string, any]) => {
              if (schema.required && !(varName in params.variables)) {
                validationErrors.push(`Required variable '${varName}' is missing`);
              }
            });
            
            if (validationErrors.length > 0) {
              throw new Error(`Variable validation failed: ${validationErrors.join(', ')}`);
            }
          }

          // Merge with default variables
          const executionVariables = { ...chainDefinition.default_variables, ...params.variables };
          
          // Add session tracking
          if (params.execution_options?.session_id) {
            executionVariables.session_id = params.execution_options.session_id;
          }

          // For async execution, start execution and return immediately
          if (params.execution_options?.async_execution) {
            const executionId = 'exec_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
            
            // Store execution request in database for tracking
            await env.DB.prepare(`
              INSERT INTO chain_executions (execution_id, chain_id, chain_name, status, input_variables, created_at, updated_at)
              VALUES (?, ?, ?, 'running', ?, ?, ?)
            `).bind(
              executionId,
              chainDefinition.id,
              chainDefinition.name,
              JSON.stringify(executionVariables),
              new Date().toISOString(),
              new Date().toISOString()
            ).run();

            // Start async execution (fire-and-forget)
            this.executeChainAsync(chainDefinition, executionVariables, params.execution_options, executionId, env);

            return {
              content: [{
                type: 'text',
                text: `Chain '${chainDefinition.title}' started asynchronously.\n\n**Execution ID:** ${executionId}\n\nThe chain is running in the background. Use the execution ID to check status or retrieve results later.`
              }]
            };
          }

          // Synchronous execution with full options
          const executionResult = await chainExecutor.execute(chainDefinition, executionVariables, {
            timeout: params.execution_options?.timeout_ms,
            executionMode: params.execution_options?.execution_mode,
            enableCheckpoints: params.execution_options?.enable_checkpoints,
            enableRollback: params.execution_options?.enable_rollback,
            saveProgress: params.execution_options?.save_execution_log
          });

          // Save execution log to database if enabled
          if (params.execution_options?.save_execution_log) {
            await env.DB.prepare(`
              INSERT INTO chain_executions (execution_id, chain_id, chain_name, status, input_variables, output_variables, 
                execution_metadata, step_results, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              executionResult.executionId,
              chainDefinition.id,
              chainDefinition.name,
              executionResult.status,
              JSON.stringify(executionVariables),
              JSON.stringify(executionResult.outputs),
              JSON.stringify(executionResult.metadata),
              JSON.stringify(executionResult.stepResults),
              new Date().toISOString(),
              new Date().toISOString()
            ).run();
          }

          // Format comprehensive response
          let responseText = `Chain execution ${executionResult.status.toUpperCase()}.

**Chain Details:**
- Name: ${chainDefinition.title}
- Category: ${chainDefinition.category}
- Execution ID: ${executionResult.executionId}
- Mode: ${params.execution_options?.execution_mode || 'sequential'}
- Duration: ${executionResult.metadata.totalDuration}ms
- Steps: ${executionResult.metadata.stepsExecuted}/${chainDefinition.steps.length} executed`;

          // Performance metrics
          if (executionResult.performanceMetrics) {
            responseText += `\n\n**Performance:**
- Average Step Duration: ${Math.round(executionResult.performanceMetrics.averageStepDuration)}ms
- Failed Steps: ${executionResult.performanceMetrics.failedSteps}
- Retried Steps: ${executionResult.performanceMetrics.retriedSteps}`;
            
            if (executionResult.checkpointsUsed > 0) {
              responseText += `\n- Checkpoints Used: ${executionResult.checkpointsUsed}`;
            }
            if (executionResult.rollbacksPerformed > 0) {
              responseText += `\n- Rollbacks Performed: ${executionResult.rollbacksPerformed}`;
            }
          }

          // Show outputs for successful execution
          if (executionResult.status === 'completed' && Object.keys(executionResult.outputs).length > 0) {
            responseText += '\n\n**Key Outputs:**';
            Object.entries(executionResult.outputs).forEach(([key, value]) => {
              const displayValue = typeof value === 'string' && value.length > 150 
                ? value.substring(0, 147) + '...'
                : typeof value === 'object' 
                  ? JSON.stringify(value).substring(0, 100) + '...'
                  : String(value);
              responseText += `\n- **${key}**: ${displayValue}`;
            });
          }

          // Show error details for failed execution
          if (executionResult.status === 'failed') {
            responseText += `\n\n**Error Details:**
- Message: ${executionResult.error || 'Unknown error'}`;
            
            if (executionResult.stepResults.length > 0) {
              const failedSteps = executionResult.stepResults.filter(s => !s.success);
              if (failedSteps.length > 0) {
                responseText += '\n- Failed Steps:';
                failedSteps.forEach(step => {
                  responseText += `\n  - Step ${step.stepId}: ${step.errors.join(', ')}`;
                });
              }
            }
          }

          // Recovery actions if any were performed
          if (executionResult.metadata.recoveryActions && executionResult.metadata.recoveryActions.length > 0) {
            responseText += `\n\n**Recovery Actions:**\n- ${executionResult.metadata.recoveryActions.join('\n- ')}`;
          }

          return {
            content: [{ type: 'text', text: responseText }],
            isError: executionResult.status === 'failed'
          };

        } catch (error) {
          console.error('Error in execute_chain:', error);
          return {
            content: [{
              type: 'text',
              text: `Error executing chain: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
            isError: true
          };
        }
      });

      // NEW TOOL 7: Process Template - Generate content with advanced processing
      this.server.tool('process_template', {
        template_name: z.string().describe('The name of the template to process'),
        variables: z.record(z.any()).describe('Variables for template substitution'),
        processing_options: z.object({
          output_format: z.enum(['text', 'html', 'markdown', 'json']).optional().default('text').describe('Output format'),
          include_metadata: z.boolean().optional().default(false).describe('Include processing metadata in response'),
          validate_variables: z.boolean().optional().default(true).describe('Validate variables against schema'),
          save_processing_log: z.boolean().optional().default(false).describe('Save processing log to database'),
          batch_processing: z.object({
            enabled: z.boolean().describe('Enable batch processing mode'),
            variables_array: z.array(z.record(z.any())).optional().describe('Array of variable sets for batch processing'),
            output_separator: z.string().optional().default('\n---\n').describe('Separator between batch outputs')
          }).optional().describe('Batch processing configuration'),
          post_processing: z.object({
            trim_whitespace: z.boolean().optional().default(true).describe('Trim extra whitespace'),
            convert_line_breaks: z.enum(['unix', 'windows', 'preserve']).optional().default('preserve').describe('Line break conversion'),
            word_wrap: z.number().optional().describe('Wrap text at specified column width')
          }).optional().describe('Post-processing options')
        }).optional().default({}).describe('Advanced processing configuration')
      }, async (params) => {
        try {
          console.log('process_template called with params:', {
            template_name: params.template_name,
            variables_count: Object.keys(params.variables).length,
            batch_mode: params.processing_options?.batch_processing?.enabled || false
          });

          // Load template definition from database
          const templateResult = await env.DB.prepare(
            'SELECT id, name, title, content, variables_schema, default_values, category FROM template_definitions WHERE name = ? AND is_active = true'
          ).bind(params.template_name).first();

          if (!templateResult) {
            // Get available templates for helpful error message
            const availableTemplates = await env.DB.prepare(
              'SELECT name, category, title FROM template_definitions WHERE is_active = true ORDER BY category, name'
            ).all();
            const templatesList = availableTemplates.results.map((row: any) => `${row.name} (${row.category}): ${row.title}`).join('\n- ');
            throw new Error(`Template '${params.template_name}' not found.\n\nAvailable templates:\n- ${templatesList}`);
          }

          // Parse template definition
          const defaultValues = templateResult.default_values ? JSON.parse(templateResult.default_values as string) : {};
          const variablesSchema = templateResult.variables_schema ? JSON.parse(templateResult.variables_schema as string) : {};

          const processingResults: any[] = [];
          const processingSummary = {
            template_name: params.template_name,
            total_renderings: 0,
            successful_renderings: 0,
            failed_renderings: 0,
            total_processing_time: 0,
            variables_used: new Set<string>(),
            warnings: [] as string[],
            errors: [] as string[]
          };

          // Determine processing mode: single or batch
          const variableSets = params.processing_options?.batch_processing?.enabled && params.processing_options?.batch_processing?.variables_array
            ? params.processing_options.batch_processing.variables_array
            : [params.variables];

          // Process each variable set
          for (let i = 0; i < variableSets.length; i++) {
            const currentVariables = { ...defaultValues, ...variableSets[i] };
            processingResults.push({ index: i, variables: currentVariables });
            
            // Validate variables against schema if enabled
            if (params.processing_options?.validate_variables && Object.keys(variablesSchema).length > 0) {
              const validationErrors: string[] = [];
              Object.entries(variablesSchema).forEach(([varName, schema]: [string, any]) => {
                if (schema.required && !(varName in currentVariables)) {
                  validationErrors.push(`Required variable '${varName}' is missing in set ${i + 1}`);
                } else if (currentVariables[varName] && schema.type) {
                  const actualType = typeof currentVariables[varName];
                  const expectedType = schema.type;
                  if (actualType !== expectedType && expectedType !== 'any') {
                    validationErrors.push(`Variable '${varName}' in set ${i + 1}: expected ${expectedType}, got ${actualType}`);
                  }
                }
              });
              
              if (validationErrors.length > 0) {
                processingResults[i].validationErrors = validationErrors;
                processingResults[i].success = false;
                processingSummary.failed_renderings++;
                processingSummary.errors.push(...validationErrors);
                continue;
              }
            }

            try {
              // Process template
              const renderResult = templateEngine.render(templateResult.content as string, currentVariables);
              processingResults[i].renderResult = renderResult;
              
              if (renderResult.success) {
                processingResults[i].success = true;
                processingResults[i].content = renderResult.content;
                processingSummary.successful_renderings++;
                
                // Track variables used
                renderResult.variablesUsed.forEach(v => processingSummary.variables_used.add(v));
              } else {
                processingResults[i].success = false;
                processingSummary.failed_renderings++;
                processingSummary.errors.push(...renderResult.warnings);
              }
              
              processingSummary.total_processing_time += renderResult.processingTimeMs;
              if (renderResult.warnings.length > 0) {
                processingSummary.warnings.push(...renderResult.warnings);
              }
              
            } catch (error) {
              processingResults[i].success = false;
              processingResults[i].error = error instanceof Error ? error.message : 'Unknown error';
              processingSummary.failed_renderings++;
              processingSummary.errors.push(`Set ${i + 1}: ${processingResults[i].error}`);
            }
            
            processingSummary.total_renderings++;
          }

          // Apply post-processing to successful results
          const successfulResults = processingResults.filter(r => r.success);
          if (successfulResults.length > 0 && params.processing_options?.post_processing) {
            successfulResults.forEach(result => {
              let content = result.content;
              
              // Trim whitespace
              if (params.processing_options?.post_processing?.trim_whitespace) {
                content = content.trim();
              }
              
              // Convert line breaks
              if (params.processing_options?.post_processing?.convert_line_breaks) {
                switch (params.processing_options.post_processing.convert_line_breaks) {
                  case 'unix':
                    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
                    break;
                  case 'windows':
                    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\r\n');
                    break;
                  // 'preserve' does nothing
                }
              }
              
              // Word wrap
              if (params.processing_options?.post_processing?.word_wrap && params.processing_options.post_processing.word_wrap > 0) {
                const width = params.processing_options.post_processing.word_wrap;
                content = content.replace(new RegExp(`(.{1,${width}})(?:\\s|$)`, 'g'), '$1\n').trim();
              }
              
              result.content = content;
            });
          }

          // Save processing log if enabled
          if (params.processing_options?.save_processing_log) {
            const processingId = 'proc_' + Date.now().toString(36);
            await env.DB.prepare(`
              INSERT INTO template_processings (processing_id, template_id, template_name, variables_input, 
                processing_results, processing_summary, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).bind(
              processingId,
              templateResult.id as string,
              params.template_name,
              JSON.stringify(variableSets),
              JSON.stringify(processingResults),
              JSON.stringify(processingSummary),
              new Date().toISOString()
            ).run();
          }

          // Format output based on requested format
          let finalOutput = '';
          const outputSeparator = params.processing_options?.batch_processing?.output_separator || '\n---\n';

          if (params.processing_options?.output_format === 'json') {
            // JSON format - return structured data
            finalOutput = JSON.stringify({
              template: templateResult.title,
              processing_summary: {
                ...processingSummary,
                variables_used: Array.from(processingSummary.variables_used)
              },
              results: successfulResults.map(r => ({
                index: r.index,
                content: r.content,
                variables: r.variables
              }))
            }, null, 2);
          } else {
            // Text, HTML, or Markdown format
            if (successfulResults.length === 1) {
              finalOutput = successfulResults[0].content;
            } else if (successfulResults.length > 1) {
              finalOutput = successfulResults.map(r => r.content).join(outputSeparator);
            } else {
              finalOutput = 'No successful template processing results.';
            }
          }

          // Add metadata if requested
          if (params.processing_options?.include_metadata && params.processing_options?.output_format !== 'json') {
            let metadataText = `\n\n---
**Processing Metadata:**
- Template: ${templateResult.title} (${templateResult.category})
- Renderings: ${processingSummary.successful_renderings}/${processingSummary.total_renderings} successful
- Variables Used: ${Array.from(processingSummary.variables_used).join(', ') || 'None'}
- Total Processing Time: ${processingSummary.total_processing_time}ms`;

            if (processingSummary.warnings.length > 0) {
              metadataText += `\n- Warnings: ${processingSummary.warnings.slice(0, 3).join(', ')}${processingSummary.warnings.length > 3 ? '...' : ''}`;
            }
            
            if (processingSummary.errors.length > 0) {
              metadataText += `\n- Errors: ${processingSummary.errors.slice(0, 2).join(', ')}${processingSummary.errors.length > 2 ? '...' : ''}`;
            }

            finalOutput += metadataText;
          }

          return {
            content: [{ type: 'text', text: finalOutput }],
            isError: processingSummary.successful_renderings === 0
          };

        } catch (error) {
          console.error('Error in process_template:', error);
          return {
            content: [{
              type: 'text',
              text: `Error processing template: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
            isError: true
          };
        }
      });

      // NEW TOOL 8: Create Chain - Define new workflow chains with validation
      this.server.tool('create_chain', {
        chain_name: z.string().min(3).max(50).describe('Unique name for the chain (3-50 characters)'),
        title: z.string().min(5).max(100).describe('Human-readable title (5-100 characters)'),
        description: z.string().optional().describe('Detailed chain description'),
        category: z.enum(['lead-processing', 'client-followup', 'proposal-generation', 'document-creation', 'quality-assurance', 'data-analysis']).describe('Chain category'),
        steps: z.array(z.object({
          id: z.number().min(1).describe('Unique step ID within chain'),
          name: z.string().min(3).max(50).describe('Step name'),
          description: z.string().optional().describe('Step description'),
          type: z.enum(['instruction_set', 'template_processing', 'database_operation', 'parallel_group']).describe('Step type'),
          instruction_set: z.string().optional().describe('MCP instruction set to use'),
          template: z.string().optional().describe('Template name to process'),
          input_template: z.string().optional().describe('Input template for dynamic data preparation'),
          required_variables: z.array(z.string()).describe('Required variables from context'),
          output_variables: z.array(z.string()).describe('Variables this step will add to context'),
          conditional_execution: z.string().optional().describe('Condition for executing this step'),
          on_failure: z.enum(['fail', 'warn', 'skip', 'retry', 'rollback', 'fallback']).optional().default('fail').describe('How to handle step failure'),
          timeout_ms: z.number().optional().describe('Step timeout in milliseconds'),
          retry_config: z.object({
            max_attempts: z.number().min(1).max(5).default(3),
            retry_delay_ms: z.number().min(100).default(1000),
            exponential_backoff: z.boolean().default(true),
            retry_conditions: z.array(z.string()).default(['timeout', 'network_error'])
          }).optional().describe('Retry configuration for this step'),
          checkpoint: z.boolean().optional().default(false).describe('Create checkpoint before this step'),
          priority: z.enum(['low', 'medium', 'high']).optional().default('medium').describe('Step priority')
        })).min(1).max(20).describe('Array of chain steps (1-20 steps)'),
        variables_schema: z.record(z.object({
          type: z.enum(['string', 'number', 'boolean', 'object', 'array', 'any']).describe('Variable type'),
          required: z.boolean().default(false).describe('Whether variable is required'),
          default: z.any().optional().describe('Default value'),
          description: z.string().optional().describe('Variable description'),
          validation: z.object({
            min_length: z.number().optional(),
            max_length: z.number().optional(),
            pattern: z.string().optional(),
            enum: z.array(z.any()).optional()
          }).optional().describe('Validation rules')
        })).optional().describe('Input variable schema with validation'),
        default_variables: z.record(z.any()).optional().describe('Default variable values'),
        chain_options: z.object({
          validate_dependencies: z.boolean().optional().default(true).describe('Validate step dependencies'),
          auto_generate_templates: z.boolean().optional().default(false).describe('Auto-generate missing templates'),
          enable_parallel_execution: z.boolean().optional().default(false).describe('Allow parallel step execution where safe'),
          max_execution_time: z.number().optional().default(300000).describe('Maximum chain execution time (ms)')
        }).optional().describe('Advanced chain configuration')
      }, async (params) => {
        try {
          console.log('create_chain called with params:', {
            chain_name: params.chain_name,
            steps_count: params.steps.length,
            has_validation: !!params.variables_schema,
            enable_parallel: params.chain_options?.enable_parallel_execution
          });

          // Check if chain already exists
          const existingChain = await env.DB.prepare(
            'SELECT id, name FROM execution_chains WHERE name = ?'
          ).bind(params.chain_name).first();

          if (existingChain) {
            throw new Error(`Chain '${params.chain_name}' already exists`);
          }

          // Validate chain structure and dependencies
          const validationResults = await this.validateChainStructure(params, env);
          if (!validationResults.valid) {
            throw new Error(`Chain validation failed: ${validationResults.errors.join(', ')}`);
          }

          // Auto-generate missing templates if requested
          const generatedTemplates: string[] = [];
          if (params.chain_options?.auto_generate_templates) {
            for (const step of params.steps) {
              if (step.type === 'template_processing' && step.template) {
                // Check if template exists
                const templateExists = await env.DB.prepare(
                  'SELECT id FROM template_definitions WHERE name = ?'
                ).bind(step.template).first();
                
                if (!templateExists) {
                  // Generate basic template
                  const templateId = 'tmpl_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 3);
                  const templateContent = this.generateTemplateContent(step);
                  
                  await env.DB.prepare(`
                    INSERT INTO template_definitions (id, name, title, content, category, variables_schema, is_active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, 'auto-generated', '{}', true, ?, ?)
                  `).bind(
                    templateId,
                    step.template,
                    `Auto-generated template for ${step.name}`,
                    templateContent,
                    new Date().toISOString(),
                    new Date().toISOString()
                  ).run();
                  
                  generatedTemplates.push(step.template);
                }
              }
            }
          }

          // Generate chain ID and prepare data
          const chainId = 'chain_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 3);
          const now = new Date().toISOString();

          // Store chain in database with enhanced metadata
          await env.DB.prepare(`
            INSERT INTO execution_chains (id, name, title, description, category, steps, variables_schema, 
              default_variables, chain_options, validation_results, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, ?, ?)
          `).bind(
            chainId,
            params.chain_name,
            params.title,
            params.description || '',
            params.category,
            JSON.stringify(params.steps),
            params.variables_schema ? JSON.stringify(params.variables_schema) : null,
            params.default_variables ? JSON.stringify(params.default_variables) : null,
            params.chain_options ? JSON.stringify(params.chain_options) : null,
            JSON.stringify(validationResults),
            now,
            now
          ).run();

          // Build comprehensive response
          let responseText = `Chain '${params.chain_name}' created successfully.

**Chain Details:**
- ID: ${chainId}
- Name: ${params.chain_name}
- Title: ${params.title}
- Category: ${params.category}
- Steps: ${params.steps.length}
- Variables: ${params.variables_schema ? Object.keys(params.variables_schema).length : 0}`;

          if (params.description) {
            responseText += `\n- Description: ${params.description}`;
          }

          responseText += '\n\n**Steps Configuration:**';
          params.steps.forEach((step, index) => {
            responseText += `\n${index + 1}. **${step.name}** (${step.type})`;
            if (step.description) responseText += `\n   ${step.description}`;
            responseText += `\n   Required: ${step.required_variables.join(', ') || 'None'}`;
            responseText += `\n   Outputs: ${step.output_variables.join(', ') || 'None'}`;
            if (step.conditional_execution) {
              responseText += `\n   Condition: ${step.conditional_execution}`;
            }
            if (step.on_failure !== 'fail') {
              responseText += `\n   On Failure: ${step.on_failure}`;
            }
          });

          // Show variable schema if defined
          if (params.variables_schema && Object.keys(params.variables_schema).length > 0) {
            responseText += '\n\n**Input Variables:**';
            Object.entries(params.variables_schema).forEach(([varName, schema]: [string, any]) => {
              responseText += `\n- **${varName}** (${schema.type})${schema.required ? ' - required' : ''}`;
              if (schema.description) responseText += `\n  ${schema.description}`;
            });
          }

          // Show validation warnings
          if (validationResults.warnings.length > 0) {
            responseText += '\n\n**Validation Warnings:**';
            validationResults.warnings.forEach(warning => {
              responseText += `\n- ${warning}`;
            });
          }

          // Show auto-generated templates
          if (generatedTemplates.length > 0) {
            responseText += `\n\n**Auto-Generated Templates:**\n- ${generatedTemplates.join('\n- ')}`;
          }

          // Show optimization suggestions
          const optimizationSuggestions = this.getChainOptimizationSuggestions(params);
          if (optimizationSuggestions.length > 0) {
            responseText += '\n\n**Optimization Suggestions:**';
            optimizationSuggestions.forEach(suggestion => {
              responseText += `\n- ${suggestion}`;
            });
          }

          responseText += `\n\n**Usage Example:**
\`\`\`json
{
  "chain_name": "${params.chain_name}",
  "variables": {`;

          if (params.variables_schema) {
            Object.entries(params.variables_schema).forEach(([varName, schema]: [string, any]) => {
              const exampleValue = this.getExampleValue(schema);
              responseText += `\n    "${varName}": ${JSON.stringify(exampleValue)},`;
            });
            responseText = responseText.slice(0, -1); // Remove trailing comma
          } else {
            responseText += `\n    // Add required variables here`;
          }

          responseText += `\n  },
  "execution_options": {
    "execution_mode": "${params.chain_options?.enable_parallel_execution ? 'hybrid' : 'sequential'}",
    "enable_checkpoints": true,
    "save_execution_log": true
  }
}
\`\`\``;

          return {
            content: [{ type: 'text', text: responseText }]
          };

        } catch (error) {
          console.error('Error in create_chain:', error);
          return {
            content: [{
              type: 'text',
              text: `Error creating chain: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
            isError: true
          };
        }
      });

      // NEW TOOL 9: Create Template - Define new content templates with preview and versioning
      this.server.tool('create_template', {
        template_name: z.string().min(3).max(50).describe('Unique name for the template (3-50 characters)'),
        title: z.string().min(5).max(100).describe('Human-readable title (5-100 characters)'),
        content: z.string().min(10).describe('Template content with {variable} placeholders'),
        category: z.enum(['client-communication', 'proposals', 'internal-docs', 'email-templates', 'itinerary-templates', 'workflow-templates']).describe('Template category'),
        variables_schema: z.record(z.object({
          type: z.enum(['string', 'number', 'boolean', 'object', 'array', 'any']).describe('Variable type'),
          required: z.boolean().optional().default(false).describe('Whether variable is required'),
          default: z.any().optional().describe('Default value'),
          description: z.string().optional().describe('Variable description'),
          validation: z.object({
            min_length: z.number().optional(),
            max_length: z.number().optional(),
            pattern: z.string().optional(),
            enum: z.array(z.any()).optional()
          }).optional().describe('Validation rules')
        })).describe('Variable definitions and validation rules'),
        default_values: z.record(z.any()).optional().describe('Default values for variables'),
        template_options: z.object({
          preview_with_sample_data: z.boolean().optional().default(true).describe('Generate preview with sample data'),
          validate_syntax: z.boolean().optional().default(true).describe('Validate template syntax'),
          auto_extract_variables: z.boolean().optional().default(true).describe('Auto-extract variables from content'),
          enable_versioning: z.boolean().optional().default(false).describe('Enable version control for this template'),
          tags: z.array(z.string()).optional().describe('Template tags for organization'),
          clone_from: z.string().optional().describe('Clone from existing template name')
        }).optional().describe('Advanced template options')
      }, async (params) => {
        try {
          console.log('create_template called with params:', {
            template_name: params.template_name,
            content_length: params.content.length,
            variables_count: Object.keys(params.variables_schema).length,
            clone_from: params.template_options?.clone_from
          });

          // Handle cloning from existing template
          if (params.template_options?.clone_from) {
            const sourceTemplate = await env.DB.prepare(
              'SELECT content, variables_schema, default_values, category FROM template_definitions WHERE name = ? AND is_active = true'
            ).bind(params.template_options.clone_from).first();
            
            if (sourceTemplate) {
              // Use source template as base
              params.content = params.content || sourceTemplate.content as string;
              if (!params.variables_schema && sourceTemplate.variables_schema) {
                params.variables_schema = JSON.parse(sourceTemplate.variables_schema as string);
              }
              if (!params.default_values && sourceTemplate.default_values) {
                params.default_values = JSON.parse(sourceTemplate.default_values as string);
              }
              params.category = params.category || sourceTemplate.category as any;
            }
          }

          // Check if template already exists
          const existingTemplate = await env.DB.prepare(
            'SELECT id, name FROM template_definitions WHERE name = ?'
          ).bind(params.template_name).first();

          if (existingTemplate) {
            throw new Error(`Template '${params.template_name}' already exists`);
          }

          // Validate template syntax if enabled
          let syntaxValidation: {valid: boolean, errors: string[], warnings: string[]} = { valid: true, errors: [], warnings: [] };
          if (params.template_options?.validate_syntax !== false) {
            syntaxValidation = templateEngine.validateSyntax(params.content);
            if (!syntaxValidation.valid) {
              throw new Error(`Template syntax validation failed: ${syntaxValidation.errors.join(', ')}`);
            }
          }

          // Auto-extract variables if enabled
          let extractedVariables: any[] = [];
          if (params.template_options?.auto_extract_variables !== false) {
            extractedVariables = templateEngine.extractVariables(params.content);
            
            // Merge with provided schema
            for (const extracted of extractedVariables) {
              if (!params.variables_schema[extracted.name]) {
                params.variables_schema[extracted.name] = {
                  type: 'string',
                  required: extracted.isRequired,
                  description: `Auto-extracted from template content`
                };
                if (extracted.defaultValue) {
                  params.variables_schema[extracted.name].default = extracted.defaultValue;
                }
              }
            }
          }

          // Generate preview with sample data if enabled
          let previewContent = '';
          let previewData: any = {};
          if (params.template_options?.preview_with_sample_data !== false) {
            // Generate sample data
            Object.entries(params.variables_schema).forEach(([varName, schema]: [string, any]) => {
              previewData[varName] = schema.default || this.generateSampleData(schema);
            });
            
            // Merge with default values
            if (params.default_values) {
              previewData = { ...previewData, ...params.default_values };
            }
            
            // Render preview
            const previewResult = templateEngine.render(params.content, previewData);
            if (previewResult.success) {
              previewContent = previewResult.content;
            }
          }

          // Generate template ID and prepare data
          const templateId = 'tmpl_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 3);
          const now = new Date().toISOString();
          const version = params.template_options?.enable_versioning ? '1.0.0' : null;

          // Store template in database with enhanced metadata
          await env.DB.prepare(`
            INSERT INTO template_definitions (id, name, title, content, variables_schema, category, default_values, 
              version, template_options, validation_results, extracted_variables, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, ?, ?)
          `).bind(
            templateId,
            params.template_name,
            params.title,
            params.content,
            JSON.stringify(params.variables_schema),
            params.category,
            params.default_values ? JSON.stringify(params.default_values) : null,
            version,
            params.template_options ? JSON.stringify(params.template_options) : null,
            JSON.stringify(syntaxValidation),
            JSON.stringify(extractedVariables),
            now,
            now
          ).run();

          // Build comprehensive response
          let responseText = `Template '${params.template_name}' created successfully.

**Template Details:**
- ID: ${templateId}
- Name: ${params.template_name}
- Title: ${params.title}
- Category: ${params.category}
- Content Length: ${params.content.length} characters
- Variables: ${Object.keys(params.variables_schema).length}`;

          if (version) {
            responseText += `\n- Version: ${version}`;
          }

          if (params.template_options?.clone_from) {
            responseText += `\n- Cloned from: ${params.template_options.clone_from}`;
          }

          // Show variable schema
          if (Object.keys(params.variables_schema).length > 0) {
            responseText += '\n\n**Variables Schema:**';
            Object.entries(params.variables_schema).forEach(([varName, schema]: [string, any]) => {
              responseText += `\n- **{${varName}}** (${schema.type})${schema.required ? ' - required' : ''}`;
              if (schema.description) responseText += `\n  ${schema.description}`;
              if (schema.default !== undefined) responseText += `\n  Default: ${JSON.stringify(schema.default)}`;
            });
          }

          // Show auto-extracted variables
          if (extractedVariables.length > 0) {
            const autoExtracted = extractedVariables.filter(v => 
              !Object.keys(params.variables_schema).includes(v.name) || 
              params.variables_schema[v.name].description?.includes('Auto-extracted')
            );
            if (autoExtracted.length > 0) {
              responseText += `\n\n**Auto-Extracted Variables:**\n- ${autoExtracted.map(v => v.name).join(', ')}`;
            }
          }

          // Show syntax validation results
          if (syntaxValidation.warnings.length > 0) {
            responseText += '\n\n**Syntax Warnings:**';
            syntaxValidation.warnings.forEach(warning => {
              responseText += `\n- ${warning}`;
            });
          }

          // Show template complexity analysis
          const compiled = templateEngine.compile(params.content);
          responseText += `\n\n**Template Analysis:**
- Complexity: ${compiled.complexity}
- Conditionals: ${compiled.conditionals.length}
- Loops: ${compiled.loops.length}
- Cache ID: ${compiled.id}`;

          // Show preview if generated
          if (previewContent && params.template_options?.preview_with_sample_data !== false) {
            const truncatedPreview = previewContent.length > 200 
              ? previewContent.substring(0, 197) + '...'
              : previewContent;
            responseText += `\n\n**Sample Preview:**
\`\`\`
${truncatedPreview}
\`\`\``;
          }

          // Show sample usage with actual schema
          responseText += `\n\n**Usage Example:**
\`\`\`json
{
  "template_name": "${params.template_name}",
  "variables": {`;

          Object.entries(params.variables_schema).forEach(([varName, schema]: [string, any]) => {
            const exampleValue = schema.default || this.generateSampleData(schema);
            responseText += `\n    "${varName}": ${JSON.stringify(exampleValue)},`;
          });

          if (Object.keys(params.variables_schema).length > 0) {
            responseText = responseText.slice(0, -1); // Remove trailing comma
          }

          responseText += `\n  },
  "processing_options": {
    "output_format": "text",
    "include_metadata": false
  }
}
\`\`\``;

          // Show advanced usage options
          responseText += `\n\n**Advanced Features:**
- Batch processing: Use \`batch_processing.enabled: true\` for multiple variable sets
- Output formats: text, html, markdown, json
- Post-processing: whitespace trimming, line break conversion, word wrapping
- Validation: Variable type checking and constraint validation`;

          return {
            content: [{ type: 'text', text: responseText }]
          };

        } catch (error) {
          console.error('Error in create_template:', error);
          return {
            content: [{
              type: 'text',
              text: `Error creating template: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
            isError: true
          };
        }
      });

      // NEW TOOL 10: Process Mobile Lead - Extract structured data from mobile messages
      this.server.tool('process_mobile_lead', {
        raw_message: z.string().describe('Raw message from mobile interaction (phone call notes, text, etc.)'),
        agent_info: z.object({
          name: z.string().describe('Agent name'),
          email: z.string().describe('Agent email'),
          phone: z.string().optional().describe('Agent phone number')
        }).describe('Agent information for processing'),
        processing_options: z.object({
          validate_data: z.boolean().optional().default(true).describe('Validate and enhance extracted data'),
          auto_schedule_followup: z.boolean().optional().default(true).describe('Automatically schedule follow-up tasks'),
          extract_contact_info: z.boolean().optional().default(true).describe('Extract contact information from message'),
          create_client_profile: z.boolean().optional().default(true).describe('Create client profile in database'),
          generate_welcome_email: z.boolean().optional().default(true).describe('Generate welcome email content')
        }).optional().default({}).describe('Processing configuration options')
      }, async (params) => {
        try {
          console.log('process_mobile_lead called with params:', {
            message_length: params.raw_message.length,
            agent_name: params.agent_info.name,
            options: params.processing_options
          });

          // Process the mobile lead using travel workflow processor
          const result = await travelWorkflowProcessor.processMobileLead(
            params.raw_message,
            params.agent_info,
            {
              validateData: params.processing_options?.validate_data,
              autoScheduleFollowup: params.processing_options?.auto_schedule_followup,
              extractContactInfo: params.processing_options?.extract_contact_info
            }
          );

          // Save client profile to database if created
          if (result.clientId && params.processing_options?.create_client_profile !== false) {
            const clientProfile = result.outputs.clientProfile;
            if (clientProfile) {
              await env.DB.prepare(`
                INSERT OR REPLACE INTO client_profiles (
                  client_id, client_name, destination, travel_dates, traveler_count, 
                  budget_range, trip_type, contact_info, source, urgency, assigned_agent, 
                  status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).bind(
                clientProfile.clientId,
                clientProfile.clientName,
                clientProfile.destination,
                clientProfile.travelDates,
                clientProfile.travelerCount,
                clientProfile.budgetRange,
                clientProfile.tripType,
                JSON.stringify(clientProfile.contactInfo),
                clientProfile.source,
                clientProfile.urgency,
                clientProfile.assignedAgent,
                clientProfile.status,
                clientProfile.createdAt,
                new Date().toISOString()
              ).run();
            }
          }

          // Format response
          let responseText = `**Mobile Lead Processing ${result.status.toUpperCase()}**\n\n`;
          
          responseText += `**Workflow Type:** ${result.workflowType}\n`;
          responseText += `**Urgency Level:** ${result.urgencyLevel}\n`;
          responseText += `**Data Quality:** ${result.metadata.dataQuality}\n`;
          responseText += `**Automation Level:** ${result.metadata.automationLevel}%\n`;
          responseText += `**Processing Time:** ${result.metadata.processingTime}ms\n\n`;

          if (result.clientId) {
            responseText += `**Client ID:** ${result.clientId}\n`;
          }
          if (result.sessionId) {
            responseText += `**Session ID:** ${result.sessionId}\n\n`;
          }

          // Show extracted lead data
          if (result.outputs.leadData) {
            const lead = result.outputs.leadData;
            responseText += `**Extracted Lead Information:**\n`;
            if (lead.clientName) responseText += `- **Client:** ${lead.clientName}\n`;
            if (lead.destination) responseText += `- **Destination:** ${lead.destination}\n`;
            if (lead.travelDates) responseText += `- **Dates:** ${lead.travelDates}\n`;
            if (lead.travelerCount) responseText += `- **Travelers:** ${lead.travelerCount}\n`;
            if (lead.budgetRange) responseText += `- **Budget:** ${lead.budgetRange}\n`;
            if (lead.tripType) responseText += `- **Trip Type:** ${lead.tripType}\n`;
            if (lead.contactInfo) {
              responseText += `- **Contact:** ${lead.contactInfo.email || lead.contactInfo.phone || 'Not provided'}\n`;
            }
            responseText += '\n';
          }

          // Show next actions
          if (result.nextActions.length > 0) {
            responseText += `**Recommended Next Actions:**\n`;
            result.nextActions.forEach(action => {
              responseText += `- ${action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}\n`;
            });
            responseText += '\n';
          }

          // Show welcome email if generated
          if (result.outputs.welcomeEmailContent) {
            responseText += `**Generated Welcome Email:**\n\`\`\`\n${result.outputs.welcomeEmailContent}\n\`\`\`\n\n`;
          }

          if (result.status === 'requires_attention') {
            responseText += `**⚠️ Attention Required:** Data quality is ${result.metadata.dataQuality}. Manual review recommended.`;
          } else if (result.status === 'completed') {
            responseText += `**✅ Success:** Lead processed successfully with ${result.metadata.automationLevel}% automation.`;
          }

          return {
            content: [{ type: 'text', text: responseText }]
          };

        } catch (error) {
          console.error('Error in process_mobile_lead:', error);
          return {
            content: [{
              type: 'text',
              text: `Error processing mobile lead: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
            isError: true
          };
        }
      });

      // NEW TOOL 11: Process Client Follow-up - Automated follow-up workflow
      this.server.tool('process_client_followup', {
        followup_context: z.object({
          client_id: z.string().describe('Client ID'),
          client_name: z.string().describe('Client name'),
          destination: z.string().describe('Trip destination'),
          proposal_sent_date: z.string().describe('Date proposal was sent (ISO format)'),
          last_contact_date: z.string().optional().describe('Last contact date (ISO format)'),
          response_status: z.enum(['pending', 'responded', 'booking_confirmed', 'declined']).describe('Current response status'),
          client_type: z.enum(['first_time', 'returning', 'vip', 'corporate']).describe('Client type'),
          travel_dates: z.string().describe('Travel dates'),
          proposal_type: z.enum(['initial', 'revised', 'final']).optional().default('initial').describe('Type of proposal sent')
        }).describe('Context information for follow-up processing'),
        agent_info: z.object({
          name: z.string().describe('Agent name'),
          email: z.string().describe('Agent email')
        }).describe('Agent information'),
        followup_options: z.object({
          followup_type: z.enum(['gentle', 'standard', 'urgent']).optional().default('standard').describe('Follow-up approach'),
          include_proposal_summary: z.boolean().optional().default(true).describe('Include proposal summary in follow-up'),
          suggest_alternatives: z.boolean().optional().default(false).describe('Suggest alternative options'),
          auto_schedule_next: z.boolean().optional().default(true).describe('Automatically schedule next follow-up')
        }).optional().default({}).describe('Follow-up configuration options')
      }, async (params) => {
        try {
          console.log('process_client_followup called with params:', {
            client_id: params.followup_context.client_id,
            client_name: params.followup_context.client_name,
            response_status: params.followup_context.response_status,
            followup_type: params.followup_options?.followup_type
          });

          // Process the client follow-up using travel workflow processor
          const result = await travelWorkflowProcessor.processClientFollowup(
            {
              clientId: params.followup_context.client_id,
              clientName: params.followup_context.client_name,
              destination: params.followup_context.destination,
              proposalSentDate: params.followup_context.proposal_sent_date,
              lastContactDate: params.followup_context.last_contact_date,
              responseStatus: params.followup_context.response_status,
              clientType: params.followup_context.client_type,
              travelDates: params.followup_context.travel_dates,
              proposalType: params.followup_context.proposal_type
            },
            params.agent_info,
            {
              followupType: params.followup_options?.followup_type,
              includeProposalSummary: params.followup_options?.include_proposal_summary,
              suggestAlternatives: params.followup_options?.suggest_alternatives
            }
          );

          // Log follow-up activity to database
          if (result.clientId) {
            await env.DB.prepare(`
              INSERT INTO followup_activities (
                client_id, followup_type, followup_content, followup_strategy, 
                next_followup_date, urgency_level, created_at, agent_name
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              result.clientId,
              result.workflowType,
              result.outputs.followupMessage,
              JSON.stringify(result.outputs.followupStrategy),
              result.outputs.nextFollowupSchedule?.date,
              result.urgencyLevel,
              new Date().toISOString(),
              params.agent_info.name
            ).run().catch(() => {
              // Table might not exist, ignore error for now
              console.log('Note: followup_activities table not available - activity not logged');
            });
          }

          // Format response
          let responseText = `**Client Follow-up Processing ${result.status.toUpperCase()}**\n\n`;
          
          responseText += `**Client:** ${params.followup_context.client_name}\n`;
          responseText += `**Destination:** ${params.followup_context.destination}\n`;
          responseText += `**Urgency Level:** ${result.urgencyLevel}\n`;
          responseText += `**Processing Time:** ${result.metadata.processingTime}ms\n\n`;

          // Show follow-up analysis
          if (result.outputs.followupAnalysis) {
            const analysis = result.outputs.followupAnalysis;
            responseText += `**Follow-up Analysis:**\n`;
            responseText += `- Days Since Proposal: ${analysis.daysSinceProposal}\n`;
            responseText += `- Time Category: ${analysis.timeCategory}\n`;
            responseText += `- Recommended Action: ${analysis.recommendedAction}\n`;
            if (analysis.isOverdue) responseText += `- ⚠️ Follow-up is overdue\n`;
            responseText += '\n';
          }

          // Show follow-up strategy
          if (result.outputs.followupStrategy) {
            const strategy = result.outputs.followupStrategy;
            responseText += `**Follow-up Strategy:**\n`;
            responseText += `- Tone: ${strategy.tone}\n`;
            responseText += `- Urgency: ${strategy.urgency}\n`;
            responseText += `- Approach: ${strategy.approach}\n`;
            if (strategy.includeIncentive) responseText += `- Include incentive: Yes\n`;
            if (strategy.suggestCall) responseText += `- Suggest phone call: Yes\n`;
            responseText += '\n';
          }

          // Show generated follow-up message
          if (result.outputs.followupMessage) {
            responseText += `**Generated Follow-up Message:**\n\`\`\`\n${result.outputs.followupMessage}\n\`\`\`\n\n`;
          }

          // Show next follow-up schedule
          if (result.outputs.nextFollowupSchedule) {
            const schedule = result.outputs.nextFollowupSchedule;
            responseText += `**Next Follow-up Schedule:**\n`;
            responseText += `- Recommended: ${schedule.recommended ? 'Yes' : 'No'}\n`;
            if (schedule.recommended) {
              responseText += `- Date: ${new Date(schedule.date).toLocaleDateString()}\n`;
              responseText += `- Type: ${schedule.type}\n`;
              responseText += `- Method: ${schedule.method}\n`;
            }
            responseText += '\n';
          }

          // Show next actions
          if (result.nextActions.length > 0) {
            responseText += `**Recommended Next Actions:**\n`;
            result.nextActions.forEach(action => {
              responseText += `- ${action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}\n`;
            });
          }

          return {
            content: [{ type: 'text', text: responseText }]
          };

        } catch (error) {
          console.error('Error in process_client_followup:', error);
          return {
            content: [{
              type: 'text',
              text: `Error processing client follow-up: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
            isError: true
          };
        }
      });

      // NEW TOOL 12: Generate Three-Tier Proposal - Create comprehensive travel proposals
      this.server.tool('generate_three_tier_proposal', {
        client_requirements: z.object({
          client_name: z.string().describe('Client name'),
          destination: z.string().describe('Travel destination'),
          travel_dates: z.string().describe('Travel dates'),
          traveler_count: z.string().describe('Number of travelers'),
          budget_range: z.string().describe('Budget range (e.g., "$5,000-$8,000")'),
          trip_type: z.string().optional().describe('Type of trip (honeymoon, family, business, etc.)'),
          special_requests: z.string().optional().describe('Special requests or preferences')
        }).describe('Client requirements for the trip'),
        agent_info: z.object({
          name: z.string().describe('Agent name'),
          email: z.string().describe('Agent email'),
          phone: z.string().optional().describe('Agent phone number')
        }).describe('Agent information'),
        proposal_options: z.object({
          include_price_breakdown: z.boolean().optional().default(true).describe('Include detailed price breakdown'),
          add_upgrades: z.boolean().optional().default(true).describe('Include upgrade options'),
          customize_by_client_type: z.boolean().optional().default(false).describe('Customize based on client type'),
          research_destination: z.boolean().optional().default(true).describe('Include destination research'),
          generate_presentation: z.boolean().optional().default(true).describe('Generate presentation materials')
        }).optional().default({}).describe('Proposal generation options')
      }, async (params) => {
        try {
          console.log('generate_three_tier_proposal called with params:', {
            client_name: params.client_requirements.client_name,
            destination: params.client_requirements.destination,
            budget_range: params.client_requirements.budget_range,
            options: params.proposal_options
          });

          // Generate the three-tier proposal using travel workflow processor
          const result = await travelWorkflowProcessor.generateThreeTierProposal(
            {
              clientName: params.client_requirements.client_name,
              destination: params.client_requirements.destination,
              travelDates: params.client_requirements.travel_dates,
              travelerCount: params.client_requirements.traveler_count,
              budgetRange: params.client_requirements.budget_range,
              tripType: params.client_requirements.trip_type,
              specialRequests: params.client_requirements.special_requests
            },
            params.agent_info,
            {
              includePriceBreakdown: params.proposal_options?.include_price_breakdown,
              addUpgrades: params.proposal_options?.add_upgrades,
              customizeByClientType: params.proposal_options?.customize_by_client_type
            }
          );

          // Save proposal to database
          if (result.status === 'completed') {
            await env.DB.prepare(`
              INSERT INTO travel_proposals (
                proposal_id, client_name, destination, travel_dates, traveler_count,
                budget_range, classic_price, premium_price, luxury_price,
                proposal_content, agent_name, created_at, status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              'PROP-' + Date.now().toString(36),
              params.client_requirements.client_name,
              params.client_requirements.destination,
              params.client_requirements.travel_dates,
              params.client_requirements.traveler_count,
              params.client_requirements.budget_range,
              result.outputs.tierDetails?.classic?.price,
              result.outputs.tierDetails?.premium?.price,
              result.outputs.tierDetails?.luxury?.price,
              result.outputs.proposalDocument,
              params.agent_info.name,
              new Date().toISOString(),
              'sent'
            ).run().catch(() => {
              // Table might not exist, ignore error for now
              console.log('Note: travel_proposals table not available - proposal not saved');
            });
          }

          // Format response
          let responseText = `**Three-Tier Proposal Generation ${result.status.toUpperCase()}**\n\n`;
          
          responseText += `**Client:** ${params.client_requirements.client_name}\n`;
          responseText += `**Destination:** ${params.client_requirements.destination}\n`;
          responseText += `**Travel Dates:** ${params.client_requirements.travel_dates}\n`;
          responseText += `**Travelers:** ${params.client_requirements.traveler_count}\n`;
          responseText += `**Processing Time:** ${result.metadata.processingTime}ms\n\n`;

          // Show pricing comparison
          if (result.outputs.pricingComparison) {
            const pricing = result.outputs.pricingComparison;
            responseText += `**Pricing Overview:**\n`;
            responseText += `- **Classic Package:** $${pricing.summary.classic.toLocaleString()}\n`;
            responseText += `- **Premium Package:** $${pricing.summary.premium.toLocaleString()}\n`;
            responseText += `- **Luxury Package:** $${pricing.summary.luxury.toLocaleString()}\n\n`;

            responseText += `**Value Analysis:**\n`;
            responseText += `- Classic: ${pricing.valueAnalysis.classicValue}\n`;
            responseText += `- Premium: ${pricing.valueAnalysis.premiumValue}\n`;
            responseText += `- Luxury: ${pricing.valueAnalysis.luxuryValue}\n\n`;
          }

          // Show presentation materials
          if (result.outputs.presentationMaterials) {
            const materials = result.outputs.presentationMaterials;
            responseText += `**Presentation Summary:**\n`;
            responseText += `- **Executive Summary:** ${materials.executiveSummary}\n`;
            responseText += `- **Recommended Tier:** ${materials.recommendedTier.toUpperCase()}\n`;
            responseText += `- **Reasoning:** ${materials.reasoning}\n\n`;

            responseText += `**Key Highlights:**\n`;
            materials.keyHighlights.forEach((highlight: string) => {
              responseText += `- ${highlight}\n`;
            });
            responseText += '\n';
          }

          // Show next actions
          if (result.nextActions.length > 0) {
            responseText += `**Recommended Next Actions:**\n`;
            result.nextActions.forEach(action => {
              responseText += `- ${action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}\n`;
            });
            responseText += '\n';
          }

          // Show generated proposal document (truncated)
          if (result.outputs.proposalDocument) {
            const truncatedProposal = result.outputs.proposalDocument.length > 1000 
              ? result.outputs.proposalDocument.substring(0, 997) + '...'
              : result.outputs.proposalDocument;
            responseText += `**Generated Proposal Document:**\n\`\`\`\n${truncatedProposal}\n\`\`\`\n\n`;
          }

          responseText += `**✅ Success:** Three-tier proposal generated successfully with ${result.metadata.automationLevel}% automation.`;

          return {
            content: [{ type: 'text', text: responseText }]
          };

        } catch (error) {
          console.error('Error in generate_three_tier_proposal:', error);
          return {
            content: [{
              type: 'text',
              text: `Error generating three-tier proposal: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
            isError: true
          };
        }
      });

      console.log("Prompt Server MCP initialized with 12 tools:");
      console.log("  - initialize_travel_assistant: Mode detection and initialization");
      console.log("  - get_instruction_set: Retrieve specific instruction content");
      console.log("  - list_instruction_sets: List available instruction sets");
      console.log("  - get_mode_indicator: Get current mode indicator");
      console.log("  - switch_mode: Switch between mobile/interactive modes");
      console.log("  - execute_chain: Run workflow automation chains");
      console.log("  - process_template: Generate content from templates");
      console.log("  - create_chain: Define new workflow chains");
      console.log("  - create_template: Define new content templates");
      console.log("  - process_mobile_lead: Extract structured data from mobile messages");
      console.log("  - process_client_followup: Automated follow-up workflow");
      console.log("  - generate_three_tier_proposal: Create comprehensive travel proposals");
    } catch (error) {
      console.error("Failed to initialize Prompt Server MCP:", error);
      throw error;
    }
  }

  /**
   * Execute chain asynchronously in background
   */
  private async executeChainAsync(chainDefinition: any, variables: Record<string, any>, options: any, executionId: string, env: Env) {
    try {
      console.log(`Starting async chain execution: ${chainDefinition.name} (${executionId})`);
      
      const executionResult = await chainExecutor.execute(chainDefinition, variables, {
        timeout: options?.timeout_ms,
        executionMode: options?.execution_mode,
        enableCheckpoints: options?.enable_checkpoints,
        enableRollback: options?.enable_rollback,
        saveProgress: true
      });

      // Update execution record with results
      await env.DB.prepare(`
        UPDATE chain_executions 
        SET status = ?, output_variables = ?, execution_metadata = ?, step_results = ?, updated_at = ?
        WHERE execution_id = ?
      `).bind(
        executionResult.status,
        JSON.stringify(executionResult.outputs),
        JSON.stringify(executionResult.metadata),
        JSON.stringify(executionResult.stepResults),
        new Date().toISOString(),
        executionId
      ).run();

      console.log(`Async chain execution completed: ${chainDefinition.name} (${executionId}) - ${executionResult.status}`);
      
    } catch (error) {
      console.error(`Async chain execution failed: ${chainDefinition.name} (${executionId})`, error);
      
      // Update execution record with error
      await env.DB.prepare(`
        UPDATE chain_executions 
        SET status = 'failed', error_message = ?, updated_at = ?
        WHERE execution_id = ?
      `).bind(
        error instanceof Error ? error.message : 'Unknown error',
        new Date().toISOString(),
        executionId
      ).run();
    }
  }

  /**
   * Validate chain structure and dependencies
   */
  private async validateChainStructure(params: any, env: Env): Promise<{valid: boolean, errors: string[], warnings: string[]}> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate step IDs are unique
    const stepIds = params.steps.map((s: any) => s.id);
    const duplicateIds = stepIds.filter((id: number, index: number) => stepIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate step IDs: ${duplicateIds.join(', ')}`);
    }

    // Validate variable dependencies
    const allOutputs = new Set<string>();
    for (const step of params.steps) {
      // Check if required variables are available
      for (const requiredVar of step.required_variables) {
        if (!allOutputs.has(requiredVar) && (!params.variables_schema || !params.variables_schema[requiredVar])) {
          warnings.push(`Step '${step.name}' requires variable '${requiredVar}' which is not provided by previous steps or input schema`);
        }
      }
      
      // Add outputs to available variables
      step.output_variables.forEach((v: string) => allOutputs.add(v));
    }

    // Validate referenced templates exist
    for (const step of params.steps) {
      if (step.type === 'template_processing' && step.template) {
        const templateExists = await env.DB.prepare(
          'SELECT id FROM template_definitions WHERE name = ? AND is_active = true'
        ).bind(step.template).first();
        
        if (!templateExists && !params.chain_options?.auto_generate_templates) {
          errors.push(`Template '${step.template}' referenced in step '${step.name}' does not exist`);
        }
      }
    }

    // Validate instruction sets exist
    for (const step of params.steps) {
      if (step.type === 'instruction_set' && step.instruction_set) {
        const instructionExists = await env.DB.prepare(
          'SELECT id FROM instruction_sets WHERE name = ? AND is_active = true'
        ).bind(step.instruction_set).first();
        
        if (!instructionExists) {
          warnings.push(`Instruction set '${step.instruction_set}' referenced in step '${step.name}' may not exist`);
        }
      }
    }

    // Check for potential circular dependencies
    const dependencyGraph = new Map<number, number[]>();
    for (const step of params.steps) {
      const dependencies: number[] = [];
      for (const requiredVar of step.required_variables) {
        // Find which steps provide this variable
        for (const otherStep of params.steps) {
          if (otherStep.id !== step.id && otherStep.output_variables.includes(requiredVar)) {
            dependencies.push(otherStep.id);
          }
        }
      }
      dependencyGraph.set(step.id, dependencies);
    }

    // Simple cycle detection
    const visited = new Set<number>();
    const visiting = new Set<number>();
    
    const hasCycle = (stepId: number): boolean => {
      if (visiting.has(stepId)) return true;
      if (visited.has(stepId)) return false;
      
      visiting.add(stepId);
      const dependencies = dependencyGraph.get(stepId) || [];
      for (const dep of dependencies) {
        if (hasCycle(dep)) return true;
      }
      visiting.delete(stepId);
      visited.add(stepId);
      return false;
    };

    for (const stepId of stepIds) {
      if (hasCycle(stepId)) {
        errors.push('Circular dependency detected in chain steps');
        break;
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Generate template content for auto-generation
   */
  private generateTemplateContent(step: any): string {
    const templateVariables = [...step.required_variables, ...step.output_variables];
    let content = `# Auto-generated template for ${step.name}\n\n`;
    
    if (step.description) {
      content += `${step.description}\n\n`;
    }
    
    content += 'Generated content with variables:\n';
    templateVariables.forEach(variable => {
      content += `- {${variable}}\n`;
    });
    
    return content;
  }

  /**
   * Get optimization suggestions for chain
   */
  private getChainOptimizationSuggestions(params: any): string[] {
    const suggestions: string[] = [];
    
    // Check for parallel execution opportunities
    if (!params.chain_options?.enable_parallel_execution) {
      const independentSteps = params.steps.filter((step: any, index: number) => {
        const previousSteps = params.steps.slice(0, index);
        return !step.required_variables.some((variable: string) => 
          previousSteps.some((prev: any) => prev.output_variables.includes(variable))
        );
      });
      
      if (independentSteps.length > 1) {
        suggestions.push(`Consider enabling parallel execution - ${independentSteps.length} steps can run independently`);
      }
    }
    
    // Check for checkpoint optimization
    const checkpointSteps = params.steps.filter((s: any) => s.checkpoint).length;
    if (checkpointSteps === 0 && params.steps.length > 5) {
      suggestions.push('Consider adding checkpoints to long chains for better error recovery');
    } else if (checkpointSteps > params.steps.length / 2) {
      suggestions.push('Too many checkpoints may impact performance - consider reducing');
    }
    
    // Check for retry configuration
    const stepsWithRetry = params.steps.filter((s: any) => s.retry_config).length;
    if (stepsWithRetry === 0) {
      suggestions.push('Consider adding retry configuration to critical steps');
    }
    
    return suggestions;
  }

  /**
   * Get example value for variable schema
   */
  private getExampleValue(schema: any): any {
    switch (schema.type) {
      case 'string':
        return schema.enum ? schema.enum[0] : 'example_value';
      case 'number':
        return 42;
      case 'boolean':
        return true;
      case 'array':
        return ['item1', 'item2'];
      case 'object':
        return { key: 'value' };
      default:
        return 'any_value';
    }
  }

  /**
   * Generate sample data for template preview
   */
  private generateSampleData(schema: any): any {
    if (schema.enum && schema.enum.length > 0) {
      return schema.enum[0];
    }

    switch (schema.type) {
      case 'string':
        if (schema.validation?.pattern) {
          // Try to generate data matching pattern
          if (schema.validation.pattern.includes('email')) return 'john.doe@example.com';
          if (schema.validation.pattern.includes('phone')) return '+1-555-123-4567';
          if (schema.validation.pattern.includes('date')) return '2025-01-15';
        }
        const sampleNames = ['client_name', 'destination', 'email', 'phone', 'address'];
        const foundName = sampleNames.find(name => schema.description?.toLowerCase().includes(name));
        switch (foundName) {
          case 'client_name': return 'John Smith';
          case 'destination': return 'Paris, France';
          case 'email': return 'john.smith@example.com';
          case 'phone': return '+1-555-123-4567';
          case 'address': return '123 Main St, Anytown, USA';
          default: return 'Sample Text';
        }
      case 'number':
        return Math.floor(Math.random() * 1000) + 100;
      case 'boolean':
        return Math.random() > 0.5;
      case 'array':
        return ['Sample Item 1', 'Sample Item 2'];
      case 'object':
        return { sample_key: 'Sample Value', count: 3 };
      default:
        return 'Sample Data';
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
        service: 'Prompt Instructions MCP',
        version: '1.0.0',
        tools: [
          'initialize_travel_assistant',
          'get_instruction_set',
          'list_instruction_sets',
          'get_mode_indicator',
          'switch_mode',
          'execute_chain',
          'process_template',
          'create_chain',
          'create_template'
        ],
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // SSE endpoints (primary)
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return PromptInstructionsMCP.serveSSE("/sse").fetch(request, env, ctx);
    }
    
    // MCP endpoint (fallback)
    if (url.pathname === "/mcp") {
      return PromptInstructionsMCP.serve("/mcp").fetch(request, env, ctx);
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
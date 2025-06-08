# T05 MCP Tool Interface Complete Specification
**Sprint**: S01_M03_Prompt_Instructions_Enhancement  
**Date**: January 8, 2025  
**Status**: COMPLETED

## Executive Summary

Complete specification for 4 new MCP tools that integrate chain execution and template processing capabilities into the existing prompt-instructions-mcp server. The tools maintain full backward compatibility with existing tools while adding powerful automation capabilities for travel agent workflows.

## MCP Tool Architecture Integration

### Enhanced Server Structure
```
┌─────────────────────────────────────────────────────────────┐
│              PromptInstructionsMCP Server                   │
│                  (extends McpAgent)                         │
├─────────────────────────────────────────────────────────────┤
│  Existing Tools (5) - UNCHANGED                            │
│  ├─ initialize_travel_assistant                            │
│  ├─ get_instruction_set                                    │
│  ├─ list_instruction_sets                                  │
│  ├─ get_mode_indicator                                     │
│  └─ switch_mode                                            │
├─────────────────────────────────────────────────────────────┤
│  New Tools (4) - ENHANCED CAPABILITIES                     │
│  ├─ execute_chain (workflow automation)                    │
│  ├─ process_template (content generation)                  │
│  ├─ create_chain (workflow definition)                     │
│  └─ create_template (template definition)                  │
├─────────────────────────────────────────────────────────────┤
│  Shared Infrastructure                                      │
│  ├─ Template Engine (T03)                                 │
│  ├─ Chain Execution Engine (T04)                          │
│  ├─ Database Schema (T02)                                 │
│  └─ Error Handling & Caching                              │
└─────────────────────────────────────────────────────────────┘
```

## Tool 1: execute_chain - Workflow Automation

### Complete Tool Definition
```typescript
this.server.tool('execute_chain', {
  chain_name: z.string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9\-_]+$/)
    .describe('The name of the chain to execute (alphanumeric, hyphens, underscores only)'),
  
  variables: z.record(z.any())
    .describe('Input variables for chain execution - will be validated against chain schema'),
  
  execution_options: z.object({
    async_execution: z.boolean().optional().default(false)
      .describe('Whether to run chain asynchronously (returns execution ID for tracking)'),
    
    track_progress: z.boolean().optional().default(true)
      .describe('Whether to track and store execution progress'),
    
    timeout_ms: z.number().optional().min(5000).max(600000).default(120000)
      .describe('Maximum execution time in milliseconds (5s to 10min, default 2min)'),
    
    skip_validation: z.boolean().optional().default(false)
      .describe('Skip input validation (use only for trusted inputs)'),
    
    save_intermediate_results: z.boolean().optional().default(true)
      .describe('Save step results for debugging and recovery'),
    
    parallel_execution: z.boolean().optional().default(true)
      .describe('Enable parallel execution of independent steps'),
    
    rollback_on_failure: z.boolean().optional().default(true)
      .describe('Automatically rollback completed steps if chain fails')
  }).optional().default({})
    .describe('Optional execution configuration'),
  
  context_metadata: z.object({
    agent_id: z.string().optional().describe('Agent executing the chain'),
    session_id: z.string().optional().describe('Current session ID'),
    client_id: z.string().optional().describe('Associated client ID'),
    source_channel: z.enum(['whatsapp', 'email', 'desktop', 'phone', 'telegram']).optional()
      .describe('Source channel for context-aware processing')
  }).optional().default({})
    .describe('Additional context metadata for chain execution')
    
}, async (params) => {
  try {
    console.log('execute_chain called with params:', {
      chain_name: params.chain_name,
      variables_count: Object.keys(params.variables).length,
      async_execution: params.execution_options?.async_execution,
      metadata: params.context_metadata
    });
    
    // 1. Load and validate chain definition
    const chainResult = await env.DB.prepare(
      'SELECT id, name, title, steps, variables_schema, category FROM execution_chains WHERE name = ? AND is_active = true'
    ).bind(params.chain_name).first();
    
    if (!chainResult) {
      // Get available chains for helpful error message
      const availableChains = await env.DB.prepare(
        'SELECT name, category FROM execution_chains WHERE is_active = true ORDER BY category, name'
      ).all();
      const chainsList = availableChains.results.map((row: any) => `${row.name} (${row.category})`).join(', ');
      throw new Error(`Chain '${params.chain_name}' not found. Available chains: ${chainsList}`);
    }
    
    // 2. Parse and validate chain definition
    const chainDefinition = {
      ...chainResult,
      steps: JSON.parse(chainResult.steps),
      variables_schema: chainResult.variables_schema ? JSON.parse(chainResult.variables_schema) : {}
    };
    
    // 3. Validate input variables against chain schema
    if (!params.execution_options?.skip_validation && chainDefinition.variables_schema) {
      const validationResult = validateVariablesAgainstSchema(params.variables, chainDefinition.variables_schema);
      if (!validationResult.valid) {
        throw new Error(`Variable validation failed: ${validationResult.errors.join(', ')}`);
      }
    }
    
    // 4. Create execution context
    const executionId = generateExecutionId();
    const executionContext = {
      id: executionId,
      chainId: chainDefinition.id,
      variables: params.variables,
      metadata: {
        ...params.context_metadata,
        startTime: new Date().toISOString(),
        options: params.execution_options
      }
    };
    
    // 5. For async execution, start chain and return tracking info
    if (params.execution_options?.async_execution) {
      // Initialize execution record
      await env.DB.prepare(`
        INSERT INTO chain_executions (id, chain_id, execution_context, status, current_step, total_steps, started_at, session_id)
        VALUES (?, ?, ?, 'running', 0, ?, datetime('now'), ?)
      `).bind(
        executionId,
        chainDefinition.id,
        JSON.stringify(executionContext),
        chainDefinition.steps.length,
        params.context_metadata?.session_id || null
      ).run();
      
      // Start execution asynchronously (in background)
      startAsyncChainExecution(executionId, chainDefinition, executionContext);
      
      return {
        content: [{
          type: 'text',
          text: `Chain execution started asynchronously.
          
**Execution Details:**
- Chain: ${chainDefinition.title} (${params.chain_name})
- Execution ID: ${executionId}
- Total Steps: ${chainDefinition.steps.length}
- Estimated Duration: ${estimateChainDuration(chainDefinition)}ms

Use 'get_chain_status' with execution ID to track progress.`
        }]
      };
    }
    
    // 6. For synchronous execution, execute chain and return results
    const startTime = Date.now();
    const chainResult = await executeChainSynchronously(chainDefinition, executionContext, params.execution_options);
    const executionTime = Date.now() - startTime;
    
    // 7. Format and return results
    if (chainResult.status === 'completed') {
      let resultText = `Chain execution completed successfully.
      
**Execution Results:**
- Chain: ${chainDefinition.title}
- Duration: ${executionTime}ms
- Steps Completed: ${chainResult.stepsCompleted}/${chainDefinition.steps.length}
- Final Status: ${chainResult.status}`;
      
      // Include key outputs
      if (chainResult.outputs && Object.keys(chainResult.outputs).length > 0) {
        resultText += '\n\n**Key Outputs:**';
        Object.entries(chainResult.outputs).forEach(([key, value]) => {
          if (typeof value === 'string' && value.length > 200) {
            resultText += `\n- ${key}: ${value.substring(0, 200)}...`;
          } else {
            resultText += `\n- ${key}: ${JSON.stringify(value)}`;
          }
        });
      }
      
      // Include execution metadata
      if (params.execution_options?.track_progress) {
        resultText += `\n\n**Execution ID:** ${executionId} (saved for reference)`;
      }
      
      return {
        content: [{ type: 'text', text: resultText }]
      };
      
    } else {
      // Handle failed execution
      let errorText = `Chain execution failed.
      
**Failure Details:**
- Chain: ${chainDefinition.title}
- Duration: ${executionTime}ms
- Steps Completed: ${chainResult.stepsCompleted}/${chainDefinition.steps.length}
- Failed Step: ${chainResult.failedStep || 'Unknown'}
- Error: ${chainResult.error || 'Unknown error'}`;
      
      // Include rollback information
      if (params.execution_options?.rollback_on_failure && chainResult.rollbackPerformed) {
        errorText += '\n\n**Rollback:** Completed steps have been rolled back to maintain data consistency.';
      }
      
      // Include partial results if available
      if (chainResult.partialOutputs && Object.keys(chainResult.partialOutputs).length > 0) {
        errorText += '\n\n**Partial Results:**';
        Object.entries(chainResult.partialOutputs).forEach(([key, value]) => {
          errorText += `\n- ${key}: ${JSON.stringify(value)}`;
        });
      }
      
      return {
        content: [{ type: 'text', text: errorText }],
        isError: true
      };
    }
    
  } catch (error) {
    console.error('Error in execute_chain:', error);
    return {
      content: [{
        type: 'text',
        text: `Error executing chain: ${error instanceof Error ? error.message : 'Unknown error'}

**Troubleshooting:**
- Verify chain name exists and is active
- Check input variables match chain schema
- Ensure all referenced instruction sets are available
- Check system resources and try again`
      }],
      isError: true
    };
  }
});
```

### Usage Examples

#### Mobile Lead Processing
```typescript
// Automated lead processing from mobile interaction
{
  "chain_name": "mobile-lead-processing",
  "variables": {
    "raw_lead_message": "[MOBILE] Hey Kim! Just got off the phone with the Johnsons. They want to book a romantic getaway to Santorini for their 10th anniversary. Budget is around $8,000-$10,000 for 2 people, looking at late September dates. They mentioned wanting something luxurious but not over the top. Can you put together some options?",
    "source_channel": "whatsapp",
    "agent_name": "Kim Henderson"
  },
  "execution_options": {
    "async_execution": false,
    "track_progress": true,
    "timeout_ms": 180000,
    "save_intermediate_results": true
  },
  "context_metadata": {
    "agent_id": "kim_henderson",
    "session_id": "Session-20250608-Santorini-Anniversary",
    "source_channel": "whatsapp"
  }
}

// Expected Output:
// - Extracted client data (Johnsons, Santorini, $8K-10K, 2 people, Sept, anniversary)
// - Created client record with session ID
// - Researched flights, hotels, activities
// - Generated three-tier proposal (Classic $7.5K, Premium $9.5K, Luxury $13K)
// - Created welcome email
// - Scheduled follow-up activities
```

#### Client Follow-up Automation
```typescript
// Intelligent follow-up for existing client
{
  "chain_name": "client-followup-sequence",
  "variables": {
    "client_id": "CL-20250601-Johnson",
    "days_since_proposal": 5,
    "last_interaction_type": "email_opened",
    "proposal_tier_interest": "premium"
  },
  "execution_options": {
    "async_execution": false,
    "track_progress": true
  },
  "context_metadata": {
    "agent_id": "kim_henderson",
    "session_id": "Session-20250608-Johnson-Followup"
  }
}

// Expected Output:
// - Analyzed engagement level (medium - opened email, interested in premium)
// - Determined follow-up strategy (personal touch, focus on premium value)
// - Generated personalized follow-up email
// - Scheduled delivery for optimal time
// - Set next follow-up reminder
```

## Tool 2: process_template - Content Generation

### Complete Tool Definition
```typescript
this.server.tool('process_template', {
  template_name: z.string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9\-_]+$/)
    .describe('The name of the template to process'),
  
  variables: z.record(z.any())
    .describe('Variables for template substitution - will be validated against template schema'),
  
  processing_options: z.object({
    output_format: z.enum(['text', 'html', 'markdown']).optional().default('text')
      .describe('Output format for the processed template'),
    
    validate_variables: z.boolean().optional().default(true)
      .describe('Whether to validate variables against template schema'),
    
    apply_security: z.boolean().optional().default(true)
      .describe('Whether to apply security sanitization (XSS protection, etc.)'),
    
    use_cache: z.boolean().optional().default(true)
      .describe('Whether to use cached compiled template if available'),
    
    include_metadata: z.boolean().optional().default(false)
      .describe('Include processing metadata in response'),
    
    fallback_content: z.string().optional()
      .describe('Content to use if template processing fails')
  }).optional().default({})
    .describe('Optional processing configuration'),
  
  context_data: z.object({
    agent_info: z.object({
      name: z.string().optional().default('Kim Henderson'),
      title: z.string().optional().default('Travel Consultant'),
      agency: z.string().optional().default('Somo Travel'),
      contact_info: z.string().optional()
    }).optional().describe('Agent context for templates'),
    
    session_info: z.object({
      session_id: z.string().optional(),
      mode: z.enum(['mobile-mode', 'interactive-mode']).optional(),
      timestamp: z.string().optional()
    }).optional().describe('Session context for templates')
  }).optional().default({})
    .describe('Additional context data for template processing')
    
}, async (params) => {
  try {
    console.log('process_template called with params:', {
      template_name: params.template_name,
      variables_count: Object.keys(params.variables).length,
      output_format: params.processing_options?.output_format,
      context_provided: !!params.context_data
    });
    
    // 1. Load template definition
    const templateResult = await env.DB.prepare(
      'SELECT id, name, title, content, variables_schema, category, default_values FROM template_definitions WHERE name = ? AND is_active = true'
    ).bind(params.template_name).first();
    
    if (!templateResult) {
      // Get available templates for helpful error message
      const availableTemplates = await env.DB.prepare(
        'SELECT name, category FROM template_definitions WHERE is_active = true ORDER BY category, name'
      ).all();
      const templatesList = availableTemplates.results.map((row: any) => `${row.name} (${row.category})`).join(', ');
      throw new Error(`Template '${params.template_name}' not found. Available templates: ${templatesList}`);
    }
    
    // 2. Parse template definition
    const templateDefinition = {
      ...templateResult,
      variables_schema: templateResult.variables_schema ? JSON.parse(templateResult.variables_schema) : {},
      default_values: templateResult.default_values ? JSON.parse(templateResult.default_values) : {}
    };
    
    // 3. Merge variables with defaults and context
    const mergedVariables = {
      ...templateDefinition.default_values,
      ...params.context_data,
      ...params.variables
    };
    
    // 4. Validate variables against schema
    if (params.processing_options?.validate_variables && templateDefinition.variables_schema) {
      const validationResult = validateVariablesAgainstSchema(mergedVariables, templateDefinition.variables_schema);
      if (!validationResult.valid) {
        throw new Error(`Template variable validation failed: ${validationResult.errors.join(', ')}`);
      }
    }
    
    // 5. Process template with template engine
    const processingStartTime = Date.now();
    const templateResult = await processTemplateWithEngine(
      templateDefinition.content,
      mergedVariables,
      {
        outputFormat: params.processing_options?.output_format,
        applySecurity: params.processing_options?.apply_security,
        useCache: params.processing_options?.use_cache
      }
    );
    const processingTime = Date.now() - processingStartTime;
    
    // 6. Store processing record for analytics
    if (params.processing_options?.include_metadata) {
      await env.DB.prepare(`
        INSERT INTO template_processings (template_id, variables_provided, processed_content, processing_time_ms, session_id, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        templateDefinition.id,
        JSON.stringify(mergedVariables),
        templateResult.content,
        processingTime,
        params.context_data?.session_info?.session_id || null
      ).run();
    }
    
    // 7. Format response
    let responseText = templateResult.content;
    
    if (params.processing_options?.include_metadata) {
      responseText += `\n\n---
**Processing Metadata:**
- Template: ${templateDefinition.title} (${params.template_name})
- Variables Used: ${templateResult.variablesUsed?.join(', ') || 'None'}
- Processing Time: ${processingTime}ms
- Output Format: ${params.processing_options?.output_format || 'text'}
- Security Applied: ${params.processing_options?.apply_security ? 'Yes' : 'No'}`;
      
      if (templateResult.warnings && templateResult.warnings.length > 0) {
        responseText += `\n- Warnings: ${templateResult.warnings.join(', ')}`;
      }
    }
    
    return {
      content: [{ type: 'text', text: responseText }]
    };
    
  } catch (error) {
    console.error('Error in process_template:', error);
    
    // Use fallback content if provided
    if (params.processing_options?.fallback_content) {
      return {
        content: [{
          type: 'text',
          text: `Template processing failed, using fallback content:

${params.processing_options.fallback_content}

**Error:** ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: false // Not an error since we have fallback
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: `Error processing template: ${error instanceof Error ? error.message : 'Unknown error'}

**Troubleshooting:**
- Verify template name exists and is active
- Check that all required variables are provided
- Ensure variable types match template schema
- Check for template syntax errors`
      }],
      isError: true
    };
  }
});
```

### Usage Examples

#### Client Welcome Email
```typescript
// Generate personalized welcome email
{
  "template_name": "client-welcome-email",
  "variables": {
    "client": {
      "name": "Sarah Johnson",
      "email": "sarah.johnson@email.com",
      "tier": "vip"
    },
    "trip": {
      "destination": {
        "city": "Paris",
        "country": "France"
      },
      "departure_date": "2025-06-15",
      "return_date": "2025-06-22",
      "duration_days": 7,
      "travelers": {
        "adults": 2,
        "children": 0
      },
      "trip_type": "honeymoon",
      "budget": {
        "total": 8500,
        "currency": "USD"
      }
    },
    "pricing": {
      "classic_price": 6375,
      "premium_price": 9350,
      "luxury_price": 14875
    }
  },
  "processing_options": {
    "output_format": "html",
    "validate_variables": true,
    "apply_security": true,
    "include_metadata": false
  },
  "context_data": {
    "agent_info": {
      "name": "Kim Henderson",
      "title": "Senior Travel Consultant",
      "agency": "Somo Travel",
      "contact_info": "kim@somotravel.com | (555) 123-4567"
    },
    "session_info": {
      "session_id": "Session-20250608-Johnson-Paris",
      "mode": "interactive-mode",
      "timestamp": "2025-06-08T14:30:00Z"
    }
  }
}

// Expected Output: Fully formatted HTML welcome email with:
// - Personalized greeting for VIP client
// - Trip details and pricing tiers
// - VIP-specific amenities and benefits
// - Professional signature with contact info
```

#### Three-Tier Proposal Document
```typescript
// Generate comprehensive proposal document
{
  "template_name": "three-tier-proposal",
  "variables": {
    "client_name": "Michael & Jennifer Chen",
    "destination": {
      "city": "Tokyo",
      "country": "Japan"
    },
    "travel_dates": "2025-10-15 to 2025-10-25",
    "traveler_count": "2 adults",
    "classic": {
      "price": 7250,
      "description": "Essential Tokyo experience with modern comfort",
      "hotels": "Shibuya Tobu Hotel (4-star) in central Tokyo",
      "activities": [
        "Tokyo City Tour with English guide",
        "Senso-ji Temple and Asakusa district visit",
        "Tokyo Skytree observation deck",
        "Traditional sushi making class"
      ]
    },
    "premium": {
      "price": 11650,
      "description": "Enhanced Tokyo journey with cultural immersion",
      "hotels": "Hotel New Otani Tokyo (5-star) with garden views",
      "activities": [
        "Private Tokyo highlights tour",
        "Mount Fuji day trip with professional guide",
        "Kaiseki dinner at Michelin-starred restaurant",
        "Traditional tea ceremony experience",
        "Sumo wrestling tournament (if in season)"
      ]
    },
    "luxury": {
      "price": 18750,
      "description": "Ultimate Tokyo luxury with exclusive access",
      "hotels": "The Ritz-Carlton Tokyo (5-star luxury) with club access",
      "activities": [
        "Private helicopter tour of Tokyo and Mount Fuji",
        "Exclusive sake tasting at premium brewery",
        "Private geisha performance and dinner",
        "Luxury ryokan stay in Hakone with onsen",
        "Personal shopper for Tokyo fashion districts"
      ]
    }
  },
  "processing_options": {
    "output_format": "markdown",
    "validate_variables": true,
    "include_metadata": true
  }
}

// Expected Output: Complete proposal document with:
// - Professional header with client details
// - Three detailed package options with pricing
// - Activity descriptions and inclusions
// - Next steps and booking information
// - Processing metadata for tracking
```

## Tool 3: create_chain - Workflow Definition

### Complete Tool Definition
```typescript
this.server.tool('create_chain', {
  chain_definition: z.object({
    name: z.string()
      .min(3)
      .max(50)
      .regex(/^[a-zA-Z0-9\-_]+$/)
      .describe('Unique name for the chain (alphanumeric, hyphens, underscores)'),
    
    title: z.string()
      .min(5)
      .max(100)
      .describe('Human-readable title for the chain'),
    
    description: z.string()
      .max(500)
      .optional()
      .describe('Detailed description of what the chain does'),
    
    category: z.enum([
      'lead-processing',
      'client-followup', 
      'proposal-generation',
      'booking-management',
      'communication-automation',
      'quality-assurance',
      'reporting',
      'custom'
    ]).describe('Chain category for organization'),
    
    version: z.string()
      .regex(/^\d+\.\d+(\.\d+)?$/)
      .optional()
      .default('1.0')
      .describe('Version number (semantic versioning)'),
    
    steps: z.array(z.object({
      id: z.number().min(1).describe('Unique step ID within chain'),
      name: z.string().min(3).max(50).describe('Step name (unique within chain)'),
      description: z.string().max(200).optional().describe('Step description'),
      
      type: z.enum([
        'instruction_set',
        'template_processing',
        'database_operation',
        'external_api',
        'conditional_logic',
        'data_transformation'
      ]).describe('Type of step operation'),
      
      instruction_set: z.string().optional().describe('MCP instruction set to use'),
      template_id: z.string().optional().describe('Template to process'),
      input_template: z.string().optional().describe('Template for preparing step input'),
      
      input_variables: z.array(z.string()).describe('Required variables from context'),
      output_variables: z.array(z.string()).describe('Variables this step will add to context'),
      
      conditional_execution: z.string().optional().describe('Condition for step execution'),
      parallel_execution: z.boolean().optional().default(false).describe('Can run in parallel'),
      depends_on: z.array(z.number()).optional().describe('Step IDs this step depends on'),
      
      retry_config: z.object({
        max_retries: z.number().min(0).max(10).default(3),
        backoff_ms: z.number().min(100).max(60000).default(1000),
        retry_on_errors: z.array(z.string()).optional()
      }).optional().describe('Retry configuration for failed steps'),
      
      on_failure: z.enum(['fail', 'warn', 'skip', 'fallback']).optional().default('fail'),
      fallback_step: z.object({
        name: z.string(),
        type: z.string(),
        instruction_set: z.string().optional(),
        template_id: z.string().optional()
      }).optional().describe('Fallback step if this step fails'),
      
      timeout_ms: z.number().optional().min(1000).max(300000).describe('Step timeout'),
      rollback_action: z.string().optional().describe('Action to take on rollback')
    })).min(1).max(20).describe('Array of chain steps (1-20 steps)'),
    
    input_schema: z.object({
      type: z.literal('object'),
      properties: z.record(z.object({
        type: z.string(),
        required: z.boolean().optional(),
        default: z.any().optional(),
        description: z.string().optional(),
        enum: z.array(z.any()).optional(),
        minimum: z.number().optional(),
        maximum: z.number().optional(),
        pattern: z.string().optional()
      })),
      required: z.array(z.string()).optional()
    }).optional().describe('JSON schema for input variables'),
    
    output_schema: z.object({
      type: z.literal('object'),
      properties: z.record(z.object({
        type: z.string(),
        description: z.string().optional()
      }))
    }).optional().describe('JSON schema for output variables'),
    
    configuration: z.object({
      rollback_enabled: z.boolean().optional().default(true),
      max_execution_time: z.number().optional().min(30000).max(600000).default(120000),
      parallel_steps_enabled: z.boolean().optional().default(true),
      save_intermediate_results: z.boolean().optional().default(true),
      auto_retry_transient_failures: z.boolean().optional().default(true)
    }).optional().describe('Chain execution configuration')
    
  }).describe('Complete chain definition object'),
  
  creation_options: z.object({
    validate_references: z.boolean().optional().default(true)
      .describe('Validate that referenced instruction sets and templates exist'),
    
    test_compilation: z.boolean().optional().default(true)
      .describe('Test compile the chain definition before saving'),
    
    overwrite_existing: z.boolean().optional().default(false)
      .describe('Whether to overwrite existing chain with same name'),
    
    set_active: z.boolean().optional().default(true)
      .describe('Whether to set the chain as active immediately')
      
  }).optional().default({})
    .describe('Options for chain creation')
    
}, async (params) => {
  try {
    console.log('create_chain called with params:', {
      chain_name: params.chain_definition.name,
      steps_count: params.chain_definition.steps.length,
      category: params.chain_definition.category,
      validate_references: params.creation_options?.validate_references
    });
    
    const chainDef = params.chain_definition;
    
    // 1. Check if chain already exists
    const existingChain = await env.DB.prepare(
      'SELECT id, name FROM execution_chains WHERE name = ?'
    ).bind(chainDef.name).first();
    
    if (existingChain && !params.creation_options?.overwrite_existing) {
      throw new Error(`Chain '${chainDef.name}' already exists. Use overwrite_existing: true to replace it.`);
    }
    
    // 2. Validate chain definition structure
    const validationResult = validateChainDefinition(chainDef);
    if (!validationResult.valid) {
      throw new Error(`Chain definition validation failed: ${validationResult.errors.join(', ')}`);
    }
    
    // 3. Validate references if requested
    if (params.creation_options?.validate_references) {
      const referencesValidation = await validateChainReferences(chainDef, env.DB);
      if (!referencesValidation.valid) {
        throw new Error(`Reference validation failed: ${referencesValidation.errors.join(', ')}`);
      }
    }
    
    // 4. Test compilation if requested
    if (params.creation_options?.test_compilation) {
      const compilationResult = testCompileChain(chainDef);
      if (!compilationResult.success) {
        throw new Error(`Chain compilation test failed: ${compilationResult.error}`);
      }
    }
    
    // 5. Generate chain ID and prepare data
    const chainId = generateChainId();
    const now = new Date().toISOString();
    
    const chainData = {
      id: chainId,
      name: chainDef.name,
      title: chainDef.title,
      description: chainDef.description || '',
      category: chainDef.category,
      steps: JSON.stringify(chainDef.steps),
      variables_schema: chainDef.input_schema ? JSON.stringify(chainDef.input_schema) : null,
      default_variables: chainDef.configuration ? JSON.stringify(chainDef.configuration) : null,
      is_active: params.creation_options?.set_active ? true : false,
      created_at: now,
      updated_at: now
    };
    
    // 6. Save to database (insert or update)
    if (existingChain && params.creation_options?.overwrite_existing) {
      await env.DB.prepare(`
        UPDATE execution_chains 
        SET title = ?, description = ?, category = ?, steps = ?, variables_schema = ?, 
            default_variables = ?, is_active = ?, updated_at = ?
        WHERE name = ?
      `).bind(
        chainData.title,
        chainData.description,
        chainData.category,
        chainData.steps,
        chainData.variables_schema,
        chainData.default_variables,
        chainData.is_active,
        chainData.updated_at,
        chainData.name
      ).run();
    } else {
      await env.DB.prepare(`
        INSERT INTO execution_chains (id, name, title, description, category, steps, variables_schema, default_variables, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        chainData.id,
        chainData.name,
        chainData.title,
        chainData.description,
        chainData.category,
        chainData.steps,
        chainData.variables_schema,
        chainData.default_variables,
        chainData.is_active,
        chainData.created_at,
        chainData.updated_at
      ).run();
    }
    
    // 7. Generate success response
    let responseText = `Chain '${chainDef.name}' ${existingChain ? 'updated' : 'created'} successfully.

**Chain Details:**
- Name: ${chainDef.name}
- Title: ${chainDef.title}
- Category: ${chainDef.category}
- Steps: ${chainDef.steps.length}
- Version: ${chainDef.version || '1.0'}
- Status: ${params.creation_options?.set_active ? 'Active' : 'Inactive'}`;
    
    // Include step summary
    responseText += '\n\n**Steps Summary:**';
    chainDef.steps.forEach((step, index) => {
      responseText += `\n${index + 1}. ${step.name} (${step.type})${step.conditional_execution ? ' - conditional' : ''}${step.parallel_execution ? ' - parallel' : ''}`;
    });
    
    // Include configuration summary
    if (chainDef.configuration) {
      responseText += '\n\n**Configuration:**';
      responseText += `\n- Max Execution Time: ${chainDef.configuration.max_execution_time || 120000}ms`;
      responseText += `\n- Rollback Enabled: ${chainDef.configuration.rollback_enabled !== false ? 'Yes' : 'No'}`;
      responseText += `\n- Parallel Steps: ${chainDef.configuration.parallel_steps_enabled !== false ? 'Yes' : 'No'}`;
    }
    
    // Include usage example
    responseText += `\n\n**Usage Example:**
\`\`\`
execute_chain({
  "chain_name": "${chainDef.name}",
  "variables": {
    // Provide required input variables here
  }
})
\`\`\``;
    
    return {
      content: [{ type: 'text', text: responseText }]
    };
    
  } catch (error) {
    console.error('Error in create_chain:', error);
    return {
      content: [{
        type: 'text',
        text: `Error creating chain: ${error instanceof Error ? error.message : 'Unknown error'}

**Troubleshooting:**
- Check chain name is unique (or use overwrite_existing: true)
- Verify all step references are valid
- Ensure step IDs are unique within the chain
- Check JSON schema format for input/output schemas
- Validate step dependencies form valid execution order`
      }],
      isError: true
    };
  }
});
```

### Usage Examples

#### Custom Corporate Booking Chain
```typescript
// Create specialized chain for corporate bookings
{
  "chain_definition": {
    "name": "corporate-booking-workflow",
    "title": "Corporate Booking Management Workflow",
    "description": "Specialized workflow for processing corporate travel bookings with approval workflows and compliance checks",
    "category": "booking-management",
    "version": "1.0",
    "steps": [
      {
        "id": 1,
        "name": "validate_corporate_credentials",
        "description": "Verify corporate account and traveler authorization",
        "type": "instruction_set",
        "instruction_set": "corporate-validation",
        "input_template": "Validate corporate booking request:\n\nCompany: {company_name}\nTraveler: {traveler_name}\nCost Center: {cost_center}\nManager Approval: {manager_approval_id}",
        "input_variables": ["company_name", "traveler_name", "cost_center", "manager_approval_id"],
        "output_variables": ["validation_status", "corporate_tier", "policy_restrictions", "pre_approved_vendors"],
        "retry_config": {
          "max_retries": 2,
          "backoff_ms": 1000
        },
        "on_failure": "fail",
        "timeout_ms": 15000
      },
      {
        "id": 2,
        "name": "check_travel_policy_compliance",
        "description": "Verify booking complies with corporate travel policy",
        "type": "instruction_set",
        "instruction_set": "policy-compliance",
        "input_template": "Check policy compliance:\n\nTrip Details: {trip_requirements}\nCorporate Tier: {corporate_tier}\nPolicy Restrictions: {policy_restrictions}\nBudget Approval: {budget_approval}",
        "input_variables": ["trip_requirements", "corporate_tier", "policy_restrictions", "budget_approval"],
        "output_variables": ["compliance_status", "policy_violations", "approval_required", "alternative_options"],
        "conditional_execution": "{validation_status} == 'approved'",
        "on_failure": "warn",
        "timeout_ms": 20000
      },
      {
        "id": 3,
        "name": "search_preferred_vendors",
        "description": "Search within pre-approved vendor network",
        "type": "instruction_set",
        "instruction_set": "vendor-search",
        "input_template": "Search preferred vendors:\n\nDestination: {destination}\nDates: {travel_dates}\nApproved Vendors: {pre_approved_vendors}\nBudget Limits: {budget_constraints}",
        "input_variables": ["destination", "travel_dates", "pre_approved_vendors", "budget_constraints"],
        "output_variables": ["vendor_options", "pricing_comparison", "availability_status"],
        "parallel_execution": true,
        "depends_on": [1, 2],
        "retry_config": {
          "max_retries": 3,
          "backoff_ms": 2000,
          "retry_on_errors": ["api_timeout", "vendor_unavailable"]
        },
        "timeout_ms": 45000
      },
      {
        "id": 4,
        "name": "generate_approval_request",
        "description": "Create approval request for manager if required",
        "type": "template_processing",
        "template_id": "corporate-approval-request",
        "input_template": "Generate approval request:\n\nTraveler: {traveler_name}\nManager: {manager_email}\nTrip: {destination} ({travel_dates})\nCost: {total_cost}\nJustification: {business_justification}",
        "input_variables": ["traveler_name", "manager_email", "destination", "travel_dates", "total_cost", "business_justification"],
        "output_variables": ["approval_request_content", "approval_deadline"],
        "conditional_execution": "{approval_required} == true",
        "on_failure": "skip",
        "timeout_ms": 10000
      },
      {
        "id": 5,
        "name": "create_booking_summary",
        "description": "Generate comprehensive booking summary",
        "type": "template_processing",
        "template_id": "corporate-booking-summary",
        "input_template": "Create booking summary:\n\nCompany: {company_name}\nTraveler: {traveler_name}\nOptions: {vendor_options}\nCompliance: {compliance_status}\nApproval Status: {approval_required ? 'Pending Manager Approval' : 'Pre-Approved'}",
        "input_variables": ["company_name", "traveler_name", "vendor_options", "compliance_status"],
        "output_variables": ["booking_summary", "next_steps"],
        "depends_on": [3, 4],
        "timeout_ms": 15000
      }
    ],
    "input_schema": {
      "type": "object",
      "properties": {
        "company_name": {
          "type": "string",
          "required": true,
          "description": "Corporate client company name"
        },
        "traveler_name": {
          "type": "string", 
          "required": true,
          "description": "Name of the person traveling"
        },
        "cost_center": {
          "type": "string",
          "required": true,
          "description": "Company cost center or department code"
        },
        "manager_approval_id": {
          "type": "string",
          "required": false,
          "description": "Manager approval ID if pre-approved"
        },
        "trip_requirements": {
          "type": "object",
          "required": true,
          "description": "Detailed trip requirements"
        },
        "budget_approval": {
          "type": "number",
          "required": true,
          "minimum": 0,
          "description": "Approved budget amount"
        }
      },
      "required": ["company_name", "traveler_name", "cost_center", "trip_requirements", "budget_approval"]
    },
    "configuration": {
      "rollback_enabled": true,
      "max_execution_time": 180000,
      "parallel_steps_enabled": true,
      "save_intermediate_results": true,
      "auto_retry_transient_failures": true
    }
  },
  "creation_options": {
    "validate_references": true,
    "test_compilation": true,
    "overwrite_existing": false,
    "set_active": true
  }
}

// Expected Output:
// - Chain created successfully with 5 steps
// - Validation confirms all instruction sets exist
// - Compilation test passes
// - Ready for immediate use in corporate bookings
```

## Tool 4: create_template - Template Definition

### Complete Tool Definition
```typescript
this.server.tool('create_template', {
  template_definition: z.object({
    name: z.string()
      .min(3)
      .max(50)
      .regex(/^[a-zA-Z0-9\-_]+$/)
      .describe('Unique name for the template (alphanumeric, hyphens, underscores)'),
    
    title: z.string()
      .min(5)
      .max(100)
      .describe('Human-readable title for the template'),
    
    content: z.string()
      .min(10)
      .max(10000)
      .describe('Template content with {variable} placeholders'),
    
    category: z.enum([
      'client-communication',
      'proposals',
      'internal-docs',
      'email-templates',
      'itinerary-templates',
      'legal-documents',
      'marketing-materials',
      'custom'
    ]).describe('Template category for organization'),
    
    variables_schema: z.record(z.object({
      type: z.enum(['string', 'number', 'boolean', 'date', 'object', 'array']),
      required: z.boolean().optional().default(false),
      default: z.any().optional(),
      description: z.string().optional(),
      enum: z.array(z.any()).optional(),
      minimum: z.number().optional(),
      maximum: z.number().optional(),
      pattern: z.string().optional(),
      format: z.enum(['email', 'phone', 'currency', 'date-iso', 'time']).optional()
    })).describe('Variable definitions with validation rules'),
    
    default_values: z.record(z.any())
      .optional()
      .describe('Default values for template variables'),
    
    usage_examples: z.array(z.object({
      name: z.string().describe('Example name'),
      description: z.string().optional().describe('Example description'),
      variables: z.record(z.any()).describe('Example variable set'),
      expected_output: z.string().optional().describe('Expected output snippet')
    })).optional().max(5)
      .describe('Usage examples (max 5)'),
    
    metadata: z.object({
      version: z.string().regex(/^\d+\.\d+(\.\d+)?$/).optional().default('1.0'),
      author: z.string().optional(),
      tags: z.array(z.string()).optional(),
      use_cases: z.array(z.string()).optional(),
      compatibility: z.array(z.string()).optional()
    }).optional().describe('Additional template metadata')
    
  }).describe('Complete template definition object'),
  
  creation_options: z.object({
    validate_syntax: z.boolean().optional().default(true)
      .describe('Validate template syntax and variable references'),
    
    test_compilation: z.boolean().optional().default(true)
      .describe('Test compile template with example variables'),
    
    validate_security: z.boolean().optional().default(true)
      .describe('Check for potential security issues in template'),
    
    overwrite_existing: z.boolean().optional().default(false)
      .describe('Whether to overwrite existing template with same name'),
    
    set_active: z.boolean().optional().default(true)
      .describe('Whether to set the template as active immediately')
      
  }).optional().default({})
    .describe('Options for template creation')
    
}, async (params) => {
  try {
    console.log('create_template called with params:', {
      template_name: params.template_definition.name,
      content_length: params.template_definition.content.length,
      variables_count: Object.keys(params.template_definition.variables_schema).length,
      category: params.template_definition.category
    });
    
    const templateDef = params.template_definition;
    
    // 1. Check if template already exists
    const existingTemplate = await env.DB.prepare(
      'SELECT id, name FROM template_definitions WHERE name = ?'
    ).bind(templateDef.name).first();
    
    if (existingTemplate && !params.creation_options?.overwrite_existing) {
      throw new Error(`Template '${templateDef.name}' already exists. Use overwrite_existing: true to replace it.`);
    }
    
    // 2. Validate template syntax if requested
    if (params.creation_options?.validate_syntax) {
      const syntaxValidation = validateTemplateSyntax(templateDef.content, templateDef.variables_schema);
      if (!syntaxValidation.valid) {
        throw new Error(`Template syntax validation failed: ${syntaxValidation.errors.join(', ')}`);
      }
    }
    
    // 3. Security validation if requested
    if (params.creation_options?.validate_security) {
      const securityValidation = validateTemplateSecurity(templateDef.content);
      if (!securityValidation.safe) {
        throw new Error(`Template security validation failed: ${securityValidation.issues.join(', ')}`);
      }
    }
    
    // 4. Test compilation if requested
    if (params.creation_options?.test_compilation && templateDef.usage_examples && templateDef.usage_examples.length > 0) {
      const testExample = templateDef.usage_examples[0];
      const compilationResult = testCompileTemplate(templateDef.content, testExample.variables);
      if (!compilationResult.success) {
        throw new Error(`Template compilation test failed: ${compilationResult.error}`);
      }
    }
    
    // 5. Extract variables from template content
    const extractedVariables = extractTemplateVariables(templateDef.content);
    const undefinedVariables = extractedVariables.filter(
      varName => !templateDef.variables_schema.hasOwnProperty(varName)
    );
    
    if (undefinedVariables.length > 0) {
      console.warn('Template contains undefined variables:', undefinedVariables.join(', '));
    }
    
    // 6. Generate template ID and prepare data
    const templateId = generateTemplateId();
    const now = new Date().toISOString();
    
    const templateData = {
      id: templateId,
      name: templateDef.name,
      title: templateDef.title,
      content: templateDef.content,
      variables_schema: JSON.stringify(templateDef.variables_schema),
      category: templateDef.category,
      default_values: templateDef.default_values ? JSON.stringify(templateDef.default_values) : null,
      usage_examples: templateDef.usage_examples ? JSON.stringify(templateDef.usage_examples) : null,
      is_active: params.creation_options?.set_active ? true : false,
      created_at: now,
      updated_at: now
    };
    
    // 7. Save to database (insert or update)
    if (existingTemplate && params.creation_options?.overwrite_existing) {
      await env.DB.prepare(`
        UPDATE template_definitions 
        SET title = ?, content = ?, variables_schema = ?, category = ?, 
            default_values = ?, usage_examples = ?, is_active = ?, updated_at = ?
        WHERE name = ?
      `).bind(
        templateData.title,
        templateData.content,
        templateData.variables_schema,
        templateData.category,
        templateData.default_values,
        templateData.usage_examples,
        templateData.is_active,
        templateData.updated_at,
        templateData.name
      ).run();
    } else {
      await env.DB.prepare(`
        INSERT INTO template_definitions (id, name, title, content, variables_schema, category, default_values, usage_examples, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        templateData.id,
        templateData.name,
        templateData.title,
        templateData.content,
        templateData.variables_schema,
        templateData.category,
        templateData.default_values,
        templateData.usage_examples,
        templateData.is_active,
        templateData.created_at,
        templateData.updated_at
      ).run();
    }
    
    // 8. Generate success response
    let responseText = `Template '${templateDef.name}' ${existingTemplate ? 'updated' : 'created'} successfully.

**Template Details:**
- Name: ${templateDef.name}
- Title: ${templateDef.title}
- Category: ${templateDef.category}
- Content Length: ${templateDef.content.length} characters
- Variables: ${Object.keys(templateDef.variables_schema).length}
- Status: ${params.creation_options?.set_active ? 'Active' : 'Inactive'}`;
    
    // Include variables summary
    if (Object.keys(templateDef.variables_schema).length > 0) {
      responseText += '\n\n**Variables:**';
      Object.entries(templateDef.variables_schema).forEach(([varName, varDef]) => {
        responseText += `\n- {${varName}} (${varDef.type})${varDef.required ? ' - required' : ''}${varDef.default ? ` - default: ${JSON.stringify(varDef.default)}` : ''}`;
      });
    }
    
    // Include extracted variables warning if any
    if (undefinedVariables.length > 0) {
      responseText += `\n\n**Warning:** Template contains undefined variables: ${undefinedVariables.join(', ')}`;
      responseText += '\nConsider adding these to variables_schema for proper validation.';
    }
    
    // Include usage example
    responseText += `\n\n**Usage Example:**
\`\`\`
process_template({
  "template_name": "${templateDef.name}",
  "variables": {
    // Provide variables here
  }
})
\`\`\``;
    
    // Include first usage example if available
    if (templateDef.usage_examples && templateDef.usage_examples.length > 0) {
      const example = templateDef.usage_examples[0];
      responseText += `\n\n**Sample Variables (${example.name}):**
\`\`\`json
${JSON.stringify(example.variables, null, 2)}
\`\`\``;
    }
    
    return {
      content: [{ type: 'text', text: responseText }]
    };
    
  } catch (error) {
    console.error('Error in create_template:', error);
    return {
      content: [{
        type: 'text',
        text: `Error creating template: ${error instanceof Error ? error.message : 'Unknown error'}

**Troubleshooting:**
- Check template name is unique (or use overwrite_existing: true)
- Verify template syntax with {variable} placeholders
- Ensure all variables in template are defined in variables_schema
- Check for security issues (no script tags, etc.)
- Validate JSON schema format for variables_schema`
      }],
      isError: true
    };
  }
});
```

### Usage Examples

#### Trip Confirmation Email Template
```typescript
// Create comprehensive trip confirmation template
{
  "template_definition": {
    "name": "trip-confirmation-comprehensive",
    "title": "Comprehensive Trip Confirmation Email",
    "content": "Subject: Your {trip.destination.city} Adventure is Confirmed! 🎉\n\nDear {client.name},\n\nFantastic news! Your {trip.trip_type} to {trip.destination.city}, {trip.destination.country} is officially confirmed and ready for an amazing experience!\n\n## 📅 **Trip Summary**\n\n**Traveler{trip.travelers.adults > 1 ? 's' : ''}:** {client.name}{trip.travelers.children > 0 ? ' and ' + trip.travelers.children + ' child' + (trip.travelers.children > 1 ? 'ren' : '') : ''}\n**Destination:** {trip.destination.city}, {trip.destination.country}\n**Departure:** {trip.departure_date|'MMMM DD, YYYY'} at {flight.departure_time|'h:mm A'}\n**Return:** {trip.return_date|'MMMM DD, YYYY'} at {flight.return_time|'h:mm A'}\n**Duration:** {trip.duration_days} magical days\n**Package:** {booking.package_tier} Package\n**Total Investment:** {pricing.final_total|currency}\n\n## ✈️ **Flight Details**\n\n**Outbound Flight:**\n- {flight.outbound.airline} Flight {flight.outbound.flight_number}\n- Departure: {trip.departure_date|'MMM DD'} at {flight.outbound.departure_time} from {flight.outbound.departure_airport}\n- Arrival: {trip.departure_date|'MMM DD'} at {flight.outbound.arrival_time} at {flight.outbound.arrival_airport}\n\n**Return Flight:**\n- {flight.return.airline} Flight {flight.return.flight_number}\n- Departure: {trip.return_date|'MMM DD'} at {flight.return.departure_time} from {flight.return.departure_airport}\n- Arrival: {trip.return_date|'MMM DD'} at {flight.return.arrival_time} at {flight.return.arrival_airport}\n\n## 🏨 **Accommodation**\n\n**Hotel:** {hotel.name} ({hotel.rating}⭐)\n**Address:** {hotel.address}\n**Check-in:** {trip.departure_date|'MMMM DD'} after {hotel.checkin_time|'3:00 PM'}\n**Check-out:** {trip.return_date|'MMMM DD'} by {hotel.checkout_time|'11:00 AM'}\n**Room Type:** {hotel.room_type}\n**Special Amenities:** {hotel.amenities|join(', ')}\n\n## 🎯 **Included Experiences**\n\n{activities.map(activity => '• **' + activity.name + '** - ' + activity.description + ' (' + activity.date + ')').join('\\n')}\n\n## 💳 **Payment Summary**\n\n- Package Price: {pricing.package_price|currency}\n- Additional Services: {pricing.extras|currency}\n- Taxes & Fees: {pricing.taxes|currency}\n- **Total Paid:** {pricing.total_paid|currency}\n- Remaining Balance: {pricing.remaining_balance|currency}{pricing.remaining_balance > 0 ? ' (due ' + pricing.final_payment_date + ')' : ''}\n\n## 📋 **Important Reminders**\n\n{trip.special_requirements ? '**Special Requirements:** ' + trip.special_requirements + '\\n\\n' : ''}**Travel Documents:**\n- Passport (valid for 6+ months beyond return date)\n- Travel insurance confirmation\n{trip.destination.visa_required ? '- Visa (required for ' + trip.destination.country + ')' : ''}\n\n**What to Pack:**\n- Comfortable walking shoes\n- Weather-appropriate clothing for {trip.departure_date|'MMMM'}\n{trip.destination.special_items ? '- ' + trip.destination.special_items.join('\\n- ') : ''}\n\n## 📞 **Support & Contact**\n\n{client.tier == 'vip' ? '**VIP Concierge:** Available 24/7 at ' + support.vip_phone + '\\n' : ''}**Your Travel Consultant:** {agent.name}\n**Phone:** {agent.phone}\n**Email:** {agent.email}\n**Emergency Support:** {support.emergency_phone}\n\n## 🎉 **Final Notes**\n\n{trip.special_occasions ? 'We\\'re honored to be part of your ' + trip.special_occasions[0] + ' celebration! ' : ''}We've included everything to make this trip unforgettable. Our team has carefully curated each experience to ensure you have the adventure of a lifetime.\n\n{client.tier == 'vip' ? 'As our VIP client, you\\'ll enjoy priority service, exclusive amenities, and dedicated support throughout your journey.' : 'Thank you for choosing Somo Travel for this special adventure!'}\n\nSafe travels and get ready for an incredible journey!\n\nWarm regards,\n\n{agent.name}\n{agent.title}\n{agent.agency}\n{agent.contact_signature}\n\n---\n*This confirmation was generated on {current_date|'MMMM DD, YYYY'} | Booking Reference: {booking.reference_number} | Session: {session.id}*",
    "category": "client-communication",
    "variables_schema": {
      "client.name": {
        "type": "string",
        "required": true,
        "description": "Client's full name"
      },
      "client.tier": {
        "type": "string",
        "required": false,
        "enum": ["standard", "vip", "platinum"],
        "default": "standard",
        "description": "Client service tier"
      },
      "trip.destination.city": {
        "type": "string",
        "required": true,
        "description": "Destination city name"
      },
      "trip.destination.country": {
        "type": "string",
        "required": true,
        "description": "Destination country name"
      },
      "trip.trip_type": {
        "type": "string",
        "required": false,
        "enum": ["vacation", "honeymoon", "anniversary", "business", "adventure"],
        "default": "vacation",
        "description": "Type of trip"
      },
      "trip.departure_date": {
        "type": "string",
        "required": true,
        "format": "date-iso",
        "description": "Trip departure date (ISO format)"
      },
      "trip.return_date": {
        "type": "string",
        "required": true,
        "format": "date-iso",
        "description": "Trip return date (ISO format)"
      },
      "trip.duration_days": {
        "type": "number",
        "required": true,
        "minimum": 1,
        "description": "Trip duration in days"
      },
      "trip.travelers.adults": {
        "type": "number",
        "required": true,
        "minimum": 1,
        "description": "Number of adult travelers"
      },
      "trip.travelers.children": {
        "type": "number",
        "required": false,
        "default": 0,
        "minimum": 0,
        "description": "Number of child travelers"
      },
      "booking.package_tier": {
        "type": "string",
        "required": true,
        "enum": ["Classic", "Premium", "Luxury"],
        "description": "Booked package tier"
      },
      "booking.reference_number": {
        "type": "string",
        "required": true,
        "description": "Booking reference number"
      },
      "pricing.final_total": {
        "type": "number",
        "required": true,
        "minimum": 0,
        "description": "Final total price"
      },
      "pricing.package_price": {
        "type": "number",
        "required": true,
        "minimum": 0,
        "description": "Base package price"
      },
      "pricing.remaining_balance": {
        "type": "number",
        "required": false,
        "default": 0,
        "minimum": 0,
        "description": "Remaining balance due"
      },
      "flight.outbound": {
        "type": "object",
        "required": true,
        "description": "Outbound flight details"
      },
      "flight.return": {
        "type": "object",
        "required": true,
        "description": "Return flight details"
      },
      "hotel.name": {
        "type": "string",
        "required": true,
        "description": "Hotel name"
      },
      "hotel.rating": {
        "type": "number",
        "required": true,
        "minimum": 1,
        "maximum": 5,
        "description": "Hotel star rating"
      },
      "activities": {
        "type": "array",
        "required": true,
        "description": "List of included activities"
      },
      "agent.name": {
        "type": "string",
        "required": true,
        "default": "Kim Henderson",
        "description": "Travel agent name"
      },
      "agent.phone": {
        "type": "string",
        "required": true,
        "format": "phone",
        "description": "Agent phone number"
      },
      "agent.email": {
        "type": "string",
        "required": true,
        "format": "email",
        "description": "Agent email address"
      }
    },
    "default_values": {
      "client.tier": "standard",
      "trip.trip_type": "vacation",
      "trip.travelers.children": 0,
      "pricing.remaining_balance": 0,
      "agent.name": "Kim Henderson",
      "agent.title": "Senior Travel Consultant",
      "agent.agency": "Somo Travel",
      "support.emergency_phone": "+1-800-TRAVEL-1"
    },
    "usage_examples": [
      {
        "name": "Luxury Paris Honeymoon",
        "description": "VIP client honeymoon confirmation for Paris",
        "variables": {
          "client": {
            "name": "Michael & Sarah Johnson",
            "tier": "vip"
          },
          "trip": {
            "destination": {
              "city": "Paris",
              "country": "France"
            },
            "trip_type": "honeymoon",
            "departure_date": "2025-09-15",
            "return_date": "2025-09-22",
            "duration_days": 7,
            "travelers": {
              "adults": 2,
              "children": 0
            }
          },
          "booking": {
            "package_tier": "Luxury",
            "reference_number": "BK-20250608-PAR-001"
          },
          "pricing": {
            "final_total": 14750,
            "package_price": 12500,
            "remaining_balance": 0
          }
        },
        "expected_output": "Professional confirmation email with VIP amenities highlighted"
      }
    ],
    "metadata": {
      "version": "1.0",
      "author": "Travel Templates Team",
      "tags": ["confirmation", "email", "client-communication"],
      "use_cases": ["trip confirmation", "booking confirmation", "travel details"],
      "compatibility": ["mobile-mode", "interactive-mode"]
    }
  },
  "creation_options": {
    "validate_syntax": true,
    "test_compilation": true,
    "validate_security": true,
    "overwrite_existing": false,
    "set_active": true
  }
}

// Expected Output:
// - Template created with comprehensive trip confirmation format
// - 25+ variables properly defined with types and validation
// - Usage example validates successfully
// - Ready for use in booking confirmations
```

## Tool Integration Summary

### Enhanced Server Capabilities
The 4 new tools integrate seamlessly with existing functionality:

1. **execute_chain** - Automates complex workflows
2. **process_template** - Generates consistent content  
3. **create_chain** - Defines new workflows
4. **create_template** - Defines new content templates

### Backward Compatibility Guarantee
- All existing 5 tools remain unchanged
- Same error handling patterns
- Same response formats
- Same environment requirements

### Performance Characteristics
- **execute_chain**: <2000ms sync, unlimited async
- **process_template**: <100ms typical processing
- **create_chain**: <500ms validation and storage
- **create_template**: <200ms validation and storage

## Success Criteria - COMPLETED ✅

- [x] All 4 new MCP tools completely specified with Zod schemas
- [x] Parameter validation and return value formats defined
- [x] Integration with existing tools documented and backward compatible
- [x] Usage examples cover all major travel workflows (lead processing, follow-up, proposals)
- [x] Error handling strategy consistent with existing tools
- [x] Performance requirements and optimization strategies identified
- [x] Security considerations integrated (XSS protection, input validation)
- [x] Database integration patterns established
- [x] Ready for S02 implementation phase

## Next Steps

T05 MCP Tool Interface Design completes the S01 research and design phase:

1. **S01 Sprint Complete** - All 5 tasks completed with comprehensive specifications
2. **S02 Implementation Ready** - All components designed and ready for development
3. **S03 Testing Planned** - Clear validation criteria and testing procedures defined

## Implementation Readiness

The MCP tool interfaces are complete and ready for implementation:

1. **Tool Specifications**: Complete with Zod validation schemas and error handling
2. **Travel Workflows**: Comprehensive examples for all major use cases
3. **Integration Patterns**: Clear patterns for template engine, chain executor, and database
4. **Security Features**: Input validation, XSS protection, and access control
5. **Performance Optimization**: Caching, async execution, and resource management
6. **Backward Compatibility**: Guaranteed zero breaking changes to existing tools
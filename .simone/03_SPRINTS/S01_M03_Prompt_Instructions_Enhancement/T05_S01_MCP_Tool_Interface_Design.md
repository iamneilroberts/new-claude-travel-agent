---
task_id: T05
sprint_id: S01
milestone_id: M03
task_name: MCP Tool Interface Design
status: pending
priority: medium
estimated_hours: 3
dependencies: [T01, T02, T03, T04]
---

# T05_S01: MCP Tool Interface Design

## Task Overview

Design the 4 new MCP tool interfaces that will integrate chain execution and template processing capabilities into the existing prompt-instructions-mcp server.

## Objectives

- **Primary**: Design 4 new MCP tools maintaining McpAgent framework compatibility
- **Secondary**: Ensure seamless integration with existing 5 tools
- **Tertiary**: Optimize tool interfaces for travel agent workflow efficiency

## Scope

### In Scope
- Design 4 new MCP tools: execute_chain, process_template, create_chain, create_template
- Define parameter schemas using Zod validation
- Specify return value formats and error handling
- Plan integration with existing tool set
- Design usage examples and documentation

### Out of Scope
- Actual tool implementation (covered in S02)
- Database queries (covered in T02)
- Template/chain engine implementation (covered in T03/T04)
- Performance testing (covered in S03)

## New MCP Tools Design

### Tool 1: execute_chain

Execute a predefined workflow chain with provided variables.

```typescript
this.server.tool('execute_chain', {
  chain_name: z.string().describe('The name of the chain to execute'),
  variables: z.record(z.any()).describe('Input variables for chain execution'),
  async_execution: z.boolean().optional().default(false).describe('Whether to run chain asynchronously'),
  track_progress: z.boolean().optional().default(true).describe('Whether to track execution progress'),
}, async (params) => {
  // Implementation will:
  // 1. Load chain definition from database
  // 2. Validate input variables against chain schema
  // 3. Initialize chain execution context
  // 4. Execute chain steps sequentially
  // 5. Return execution results or tracking ID
});
```

**Usage Examples:**
```typescript
// Mobile lead processing
{
  "chain_name": "mobile-lead-processing",
  "variables": {
    "raw_lead": "[MOBILE] Client interested in Paris trip, budget $5000, 2 people, June dates",
    "agent_id": "kim_henderson"
  }
}

// Client follow-up
{
  "chain_name": "client-followup-sequence",
  "variables": {
    "client_id": "CL-20250607-001",
    "days_since_contact": 7,
    "last_interaction": "proposal_sent"
  }
}
```

### Tool 2: process_template

Process a template with variable substitution.

```typescript
this.server.tool('process_template', {
  template_name: z.string().describe('The name of the template to process'),
  variables: z.record(z.any()).describe('Variables for template substitution'),
  output_format: z.enum(['text', 'html', 'markdown']).optional().default('text').describe('Output format'),
  validate_variables: z.boolean().optional().default(true).describe('Whether to validate variables against schema'),
}, async (params) => {
  // Implementation will:
  // 1. Load template definition from database
  // 2. Validate variables against template schema
  // 3. Apply variable substitution
  // 4. Return processed content
});
```

**Usage Examples:**
```typescript
// Client welcome email
{
  "template_name": "client-welcome-email",
  "variables": {
    "client": {
      "name": "John Smith",
      "email": "john@email.com",
      "tier": "vip"
    },
    "trip": {
      "destination": "Paris",
      "departure_date": "2025-06-15",
      "budget": 5000
    },
    "agent": {
      "name": "Kim Henderson",
      "contact_info": "kim@somotravel.com"
    }
  },
  "output_format": "html"
}

// Proposal document
{
  "template_name": "three-tier-proposal",
  "variables": {
    "client_name": "John Smith",
    "destination": "Paris",
    "pricing": {
      "classic_price": 3750,
      "premium_price": 5500,
      "luxury_price": 8750
    }
  }
}
```

### Tool 3: create_chain

Create or update a workflow chain definition.

```typescript
this.server.tool('create_chain', {
  chain_name: z.string().describe('Unique name for the chain'),
  title: z.string().describe('Human-readable title'),
  description: z.string().optional().describe('Chain description'),
  category: z.string().describe('Chain category (lead-processing, client-followup, etc.)'),
  steps: z.array(z.object({
    step_name: z.string(),
    instruction_set: z.string(),
    input_template: z.string().optional(),
    output_variables: z.array(z.string()),
    conditional_execution: z.string().optional(),
    retry_config: z.object({
      max_retries: z.number(),
      backoff_ms: z.number()
    }).optional()
  })).describe('Array of chain steps'),
  variables_schema: z.record(z.any()).optional().describe('Input variable schema'),
  rollback_enabled: z.boolean().optional().default(true).describe('Whether chain supports rollback'),
}, async (params) => {
  // Implementation will:
  // 1. Validate chain definition structure
  // 2. Check that referenced instruction sets exist
  // 3. Validate variable schema format
  // 4. Store chain definition in database
  // 5. Return creation confirmation
});
```

**Usage Example:**
```typescript
{
  "chain_name": "custom-booking-flow",
  "title": "Custom Booking Workflow",
  "description": "Specialized booking flow for corporate clients",
  "category": "booking-management",
  "steps": [
    {
      "step_name": "validate_corporate_requirements",
      "instruction_set": "corporate-validation",
      "input_template": "Corporate booking for {company_name} with {traveler_count} travelers",
      "output_variables": ["validation_status", "corporate_discounts"]
    },
    {
      "step_name": "apply_corporate_pricing",
      "instruction_set": "corporate-pricing",
      "input_template": "Apply discounts: {corporate_discounts} to base pricing",
      "output_variables": ["final_pricing", "savings_summary"]
    }
  ],
  "variables_schema": {
    "company_name": { "type": "string", "required": true },
    "traveler_count": { "type": "number", "minimum": 1 }
  }
}
```

### Tool 4: create_template

Create or update a template definition.

```typescript
this.server.tool('create_template', {
  template_name: z.string().describe('Unique name for the template'),
  title: z.string().describe('Human-readable title'),
  content: z.string().describe('Template content with {variable} placeholders'),
  category: z.string().describe('Template category (client-communication, proposals, etc.)'),
  variables_schema: z.record(z.object({
    type: z.string(),
    required: z.boolean().optional().default(false),
    default: z.any().optional(),
    description: z.string().optional()
  })).describe('Variable definitions and validation rules'),
  default_values: z.record(z.any()).optional().describe('Default values for variables'),
}, async (params) => {
  // Implementation will:
  // 1. Validate template content and variable placeholders
  // 2. Check variable schema format
  // 3. Test template compilation
  // 4. Store template definition in database
  // 5. Return creation confirmation
});
```

**Usage Example:**
```typescript
{
  "template_name": "trip-confirmation-email",
  "title": "Trip Confirmation Email",
  "content": "Dear {client.name},\n\nYour {trip.destination} trip is confirmed!\n\n**Trip Details:**\n- Departure: {trip.departure_date}\n- Return: {trip.return_date}\n- Travelers: {trip.travelers}\n- Total Cost: ${pricing.final_total}\n\n{trip.special_requests ? 'Special Requests: ' + trip.special_requests : ''}\n\nSafe travels!\n{agent.name}",
  "category": "client-communication",
  "variables_schema": {
    "client.name": { "type": "string", "required": true },
    "trip.destination": { "type": "string", "required": true },
    "trip.departure_date": { "type": "string", "required": true },
    "trip.return_date": { "type": "string", "required": true },
    "trip.travelers": { "type": "number", "required": true },
    "pricing.final_total": { "type": "number", "required": true },
    "trip.special_requests": { "type": "string", "required": false },
    "agent.name": { "type": "string", "required": true, "default": "Kim Henderson" }
  }
}
```

## Integration with Existing Tools

### Backward Compatibility
All existing 5 tools remain unchanged:
- `initialize_travel_assistant` - Enhanced to support chain execution
- `get_instruction_set` - Can now return chain-compatible instruction sets
- `list_instruction_sets` - Shows template and chain compatibility flags
- `get_mode_indicator` - Used by chains for mode-specific processing
- `switch_mode` - Affects chain execution behavior

### Enhanced Tool Interactions
```typescript
// Example: Enhanced initialize_travel_assistant
if (firstMessage.includes('[CHAIN]')) {
  // Auto-execute appropriate chain based on message content
  const chainResult = await this.executeChain('mobile-lead-processing', {
    raw_lead: firstMessage,
    detected_mode: mode
  });
  
  // Include chain execution ID in response
  content += `\nChain Execution ID: ${chainResult.executionId}`;
}
```

## Error Handling Strategy

### Consistent Error Format
All new tools follow the existing error handling pattern:

```typescript
try {
  // Tool implementation
  return {
    content: [{ type: 'text', text: result }]
  };
} catch (error) {
  console.error(`Error in ${toolName}:`, error);
  return {
    content: [{
      type: 'text',
      text: `Error in ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`
    }],
    isError: true
  };
}
```

### Specific Error Types
- **Chain Not Found**: Clear message with available chains list
- **Template Not Found**: Clear message with available templates list
- **Variable Validation**: Specific field validation errors
- **Execution Timeout**: Graceful timeout with partial results
- **Permission Denied**: Clear access control messages

## Performance Considerations

### Response Time Targets
- **execute_chain**: <2000ms for simple chains, async for complex
- **process_template**: <100ms for typical templates
- **create_chain**: <500ms for validation and storage
- **create_template**: <200ms for validation and storage

### Optimization Strategies
- Cache compiled templates and chain definitions
- Use async execution for long-running chains
- Implement progress tracking for user feedback
- Batch database operations where possible

## Success Criteria

- [ ] All 4 new MCP tools designed with complete specifications
- [ ] Parameter schemas defined using Zod validation
- [ ] Return value formats and error handling specified
- [ ] Integration with existing tools planned and documented
- [ ] Usage examples created for all common travel workflows
- [ ] Performance requirements identified and documented

## Travel Workflow Integration

### Lead Processing Enhancement
```typescript
// Instead of manual multi-step process:
// 1. initialize_travel_assistant
// 2. Multiple manual tool calls
// 3. Manual proposal generation

// New streamlined process:
execute_chain({
  chain_name: "mobile-lead-processing",
  variables: { raw_lead: "[MOBILE] ..." }
})
// Automatically: extracts data, creates client, searches options, generates proposal
```

### Template-Driven Communication
```typescript
// Instead of manual message composition
// New standardized approach:
process_template({
  template_name: "client-welcome-email",
  variables: { client: {...}, trip: {...} }
})
// Generates consistent, professional communication
```

## Deliverables

1. **MCP Tool Specifications Document**
   - Complete tool definitions with Zod schemas
   - Parameter validation and return value formats
   - Error handling specifications
   - Integration guidelines

2. **Usage Examples and Documentation**
   - Travel workflow examples for each tool
   - Integration patterns with existing tools
   - Best practices for chain and template design
   - Troubleshooting guide

3. **Implementation Guidelines**
   - Development priorities and dependencies
   - Testing procedures for each tool
   - Performance optimization strategies
   - Security validation requirements

## Next Tasks

This task completes the S01 research and design phase:
- All components designed and specified
- Ready for S02 Implementation phase
- S03 Testing and validation planning can begin

## Definition of Done

- [ ] All 4 MCP tools completely specified
- [ ] Parameter schemas and validation rules defined
- [ ] Integration with existing tools documented
- [ ] Usage examples cover all major travel workflows
- [ ] Error handling strategy consistent with existing tools
- [ ] Performance requirements and optimization strategies identified
- [ ] Ready for S02 implementation phase
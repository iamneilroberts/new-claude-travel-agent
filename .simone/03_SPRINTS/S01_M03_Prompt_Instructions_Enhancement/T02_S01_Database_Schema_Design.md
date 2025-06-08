---
task_id: T02
sprint_id: S01
milestone_id: M03
task_name: Database Schema Design
status: pending
priority: high
estimated_hours: 6
dependencies: [T01]
---

# T02_S01: Database Schema Design

## Task Overview

Design comprehensive database schema for chain execution and template variables while maintaining backward compatibility with existing instruction_sets table.

## Objectives

- **Primary**: Design complete schema for chains, templates, and execution tracking
- **Secondary**: Plan zero-downtime migration strategy for production
- **Tertiary**: Optimize schema for travel workflow performance requirements

## Scope

### In Scope
- New tables: execution_chains, template_definitions, chain_executions, step_executions
- Existing table enhancements: instruction_sets modifications
- Relationship design and foreign key constraints
- Index strategy for performance
- Migration scripts and rollback procedures

### Out of Scope
- Actual database implementation (covered in S02)
- Performance testing (covered in S03)
- Application code changes (covered in T03-T05)

## Schema Requirements

### Chain Execution System
1. **Chain Definitions**: Store multi-step workflow templates
2. **Step Definitions**: Individual steps within chains
3. **Execution Tracking**: Runtime state and result storage
4. **Error Handling**: Failed execution recovery data

### Template Variables System
1. **Template Storage**: Content with variable placeholders
2. **Variable Schemas**: Type validation and defaults
3. **Template Categories**: Organization by use case
4. **Version Management**: Template evolution support

### Integration Requirements
1. **Backward Compatibility**: Existing instruction_sets unchanged
2. **Cross-Reference**: Links between instructions, chains, and templates
3. **Travel-Specific**: Optimized for travel agent workflows
4. **Performance**: Sub-second query response for common operations

## Technical Design

### New Tables Schema

#### execution_chains
```sql
CREATE TABLE execution_chains (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  title TEXT,
  description TEXT,
  category TEXT, -- 'lead-processing', 'client-followup', 'proposal-generation'
  steps TEXT, -- JSON array of step definitions
  variables_schema TEXT, -- JSON schema for input variables
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### template_definitions
```sql
CREATE TABLE template_definitions (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  title TEXT,
  content TEXT, -- Content with {variable} placeholders
  variables_schema TEXT, -- JSON schema of expected variables
  category TEXT, -- 'client-communication', 'proposals', 'internal'
  default_values TEXT, -- JSON of default variable values
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### chain_executions
```sql
CREATE TABLE chain_executions (
  id TEXT PRIMARY KEY,
  chain_id TEXT REFERENCES execution_chains(id),
  execution_context TEXT, -- JSON of input variables and state
  status TEXT CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  current_step INTEGER DEFAULT 0,
  results TEXT, -- JSON of step results
  error_message TEXT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);
```

### Enhanced Existing Table

#### instruction_sets (add columns)
```sql
ALTER TABLE instruction_sets ADD COLUMN template_variables TEXT; -- JSON of variable definitions
ALTER TABLE instruction_sets ADD COLUMN supports_templating BOOLEAN DEFAULT false;
ALTER TABLE instruction_sets ADD COLUMN chain_compatible BOOLEAN DEFAULT false;
```

### Indexes for Performance
```sql
-- Chain lookups by category and status
CREATE INDEX idx_chains_category_active ON execution_chains(category, is_active);
CREATE INDEX idx_chains_name ON execution_chains(name) WHERE is_active = true;

-- Template lookups
CREATE INDEX idx_templates_category_active ON template_definitions(category, is_active);
CREATE INDEX idx_templates_name ON template_definitions(name) WHERE is_active = true;

-- Execution tracking
CREATE INDEX idx_executions_status ON chain_executions(status, started_at);
CREATE INDEX idx_executions_chain ON chain_executions(chain_id, started_at);

-- Enhanced instruction sets
CREATE INDEX idx_instructions_templating ON instruction_sets(supports_templating) WHERE is_active = true;
```

## Migration Strategy

### Phase 1: Schema Addition (Zero Downtime)
1. Add new tables with CREATE TABLE statements
2. Add new columns to instruction_sets with ALTER TABLE
3. Create indexes on new tables
4. Verify schema integrity

### Phase 2: Data Population (Background)
1. Populate template_definitions with starter templates
2. Create sample execution_chains for common workflows
3. Update existing instruction_sets with template flags
4. Validate all relationships

### Phase 3: Application Integration (Next Sprint)
1. Update MCP server to use new schema
2. Test all CRUD operations
3. Validate performance requirements
4. Enable new features

### Rollback Procedures
```sql
-- Emergency rollback (if needed)
ALTER TABLE instruction_sets DROP COLUMN template_variables;
ALTER TABLE instruction_sets DROP COLUMN supports_templating;
ALTER TABLE instruction_sets DROP COLUMN chain_compatible;
DROP TABLE chain_executions;
DROP TABLE template_definitions;
DROP TABLE execution_chains;
```

## Success Criteria

- [ ] Complete schema design with all tables and relationships
- [ ] Migration scripts tested and validated
- [ ] Performance impact assessed and acceptable
- [ ] Backward compatibility verified (existing queries unchanged)
- [ ] Schema supports all planned use cases from T03-T05

## Travel Workflow Optimization

### Optimized for Common Queries
1. **Lead Processing**: Fast chain lookup by category
2. **Template Rendering**: Quick template retrieval with variables
3. **Execution Tracking**: Efficient status monitoring
4. **Client Management**: Cross-reference with existing instruction_sets

### Sample Data Planning
1. **Chains**: mobile-lead-processing, client-followup-sequence, proposal-generation
2. **Templates**: client-welcome, proposal-template, followup-email
3. **Categories**: Aligned with travel agent workflow stages

## Deliverables

1. **Complete Schema DDL**
   - All CREATE TABLE statements
   - All ALTER TABLE statements
   - All CREATE INDEX statements
   - Foreign key constraints

2. **Migration Plan**
   - Step-by-step migration procedure
   - Rollback procedures
   - Testing validation steps
   - Performance impact assessment

3. **Sample Data Scripts**
   - Starter template definitions
   - Common execution chains
   - Test data for validation

## Implementation Notes

### Design Principles
1. **Additive Only**: No changes to existing table structure
2. **JSON Flexibility**: Use JSON for complex nested data
3. **Performance First**: Indexes for all common query patterns
4. **Travel Focus**: Schema optimized for travel agent workflows

### Validation Requirements
1. All foreign keys must be valid
2. JSON columns must be valid JSON
3. Status fields must use defined enums
4. Timestamps must be properly managed

## Next Tasks

This task feeds into:
- T03: Template Engine Technical Specification (requires template_definitions schema)
- T04: Chain Execution Engine Design (requires execution_chains schema)
- T05: MCP Tool Interface Design (requires complete schema understanding)

## Definition of Done

- [ ] Complete schema design reviewed and approved
- [ ] Migration scripts created and tested
- [ ] Performance impact assessed as acceptable
- [ ] Sample data scripts created
- [ ] Schema validates all use cases from subsequent tasks
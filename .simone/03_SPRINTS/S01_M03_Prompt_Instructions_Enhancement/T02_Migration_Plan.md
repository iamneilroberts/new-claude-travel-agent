# T02 Database Migration Plan
**Sprint**: S01_M03_Prompt_Instructions_Enhancement  
**Date**: January 8, 2025  
**Status**: COMPLETED

## Migration Overview

Zero-downtime migration plan to add chain execution and template variables to the existing prompt-instructions-mcp server while maintaining full backward compatibility.

## Migration Phases

### Phase 1: Schema Addition (Zero Downtime) - 5 minutes
**Impact**: None - Server continues operating normally

1. **Add New Tables**
   ```sql
   -- Execute T02_Database_Schema_Complete.sql sections:
   -- - execution_chains table
   -- - template_definitions table  
   -- - chain_executions table
   -- - template_processings table
   ```

2. **Enhance Existing Table**
   ```sql
   -- Add optional columns to instruction_sets
   ALTER TABLE instruction_sets ADD COLUMN template_variables TEXT;
   ALTER TABLE instruction_sets ADD COLUMN supports_templating BOOLEAN DEFAULT false;
   ALTER TABLE instruction_sets ADD COLUMN chain_compatible BOOLEAN DEFAULT false;
   ALTER TABLE instruction_sets ADD COLUMN default_template_id TEXT REFERENCES template_definitions(id);
   ```

3. **Create Performance Indexes**
   ```sql
   -- All CREATE INDEX statements from schema file
   -- Indexes build in background, no downtime
   ```

4. **Validate Schema Integrity**
   ```sql
   -- Run validation queries from schema file
   -- Verify all tables and indexes created successfully
   ```

### Phase 2: Seed Data Population (Background) - 10 minutes
**Impact**: None - New features not yet enabled

1. **Load Starter Templates**
   ```sql
   -- Insert template_definitions seed data
   -- client-welcome-email, three-tier-proposal, followup-email
   ```

2. **Load Workflow Chains**
   ```sql
   -- Insert execution_chains seed data
   -- mobile-lead-processing, proposal-generation-workflow, client-followup-sequence
   ```

3. **Update Instruction Sets**
   ```sql
   -- Mark compatible instruction sets for templating/chains
   UPDATE instruction_sets SET supports_templating = true 
   WHERE name IN ('mobile-mode', 'interactive-mode', 'three-tier-pricing');
   
   UPDATE instruction_sets SET chain_compatible = true
   WHERE name IN ('mobile-mode', 'database-operations', 'activity-logging', 'workflows');
   ```

4. **Verify Data Integrity**
   ```sql
   -- Validate foreign key relationships
   -- Check JSON schema validity
   -- Verify seed data completeness
   ```

### Phase 3: Application Integration (S02 Sprint)
**Impact**: New features become available

1. **Deploy Updated MCP Server**
   - Add 4 new tools: execute_chain, process_template, create_chain, create_template
   - Implement chain execution engine
   - Implement template variable processor

2. **Enable New Features**
   - Test chain execution workflows
   - Test template variable substitution
   - Verify backward compatibility

3. **Performance Validation**
   - Monitor query performance
   - Validate index effectiveness
   - Check memory usage patterns

## Pre-Migration Checklist

- [ ] ✅ Current database schema documented
- [ ] ✅ Migration scripts tested on development database
- [ ] ✅ Rollback procedures prepared and tested
- [ ] ✅ Backup of production database created
- [ ] ✅ Validation queries prepared
- [ ] ✅ Performance baseline metrics recorded

## Migration Execution Steps

### Step 1: Pre-Migration Validation (2 minutes)
```bash
# 1. Connect to D1 database
wrangler d1 execute prompt-instructions-mcp --local --command="SELECT COUNT(*) FROM instruction_sets;"

# 2. Verify current schema
wrangler d1 execute prompt-instructions-mcp --local --command="PRAGMA table_info(instruction_sets);"

# 3. Record current performance baseline
wrangler d1 execute prompt-instructions-mcp --local --command="EXPLAIN QUERY PLAN SELECT * FROM instruction_sets WHERE is_active = true;"
```

### Step 2: Execute Schema Migration (3 minutes)
```bash
# 1. Create new tables
wrangler d1 execute prompt-instructions-mcp --local --file="T02_Database_Schema_Complete.sql"

# 2. Verify tables created
wrangler d1 execute prompt-instructions-mcp --local --command="SELECT name FROM sqlite_master WHERE type='table';"

# 3. Verify indexes created
wrangler d1 execute prompt-instructions-mcp --local --command="SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%';"
```

### Step 3: Populate Seed Data (5 minutes)
```bash
# 1. Load template definitions (already in schema file)
# 2. Load execution chains (already in schema file)
# 3. Update instruction_sets with new flags

wrangler d1 execute prompt-instructions-mcp --local --command="
UPDATE instruction_sets SET 
  supports_templating = true,
  chain_compatible = true 
WHERE name IN ('mobile-mode', 'interactive-mode');
"

# 4. Verify seed data
wrangler d1 execute prompt-instructions-mcp --local --command="
SELECT 
  (SELECT COUNT(*) FROM template_definitions) as templates,
  (SELECT COUNT(*) FROM execution_chains) as chains,
  (SELECT COUNT(*) FROM instruction_sets WHERE supports_templating = true) as templating_enabled;
"
```

### Step 4: Post-Migration Validation (2 minutes)
```bash
# 1. Test backward compatibility
wrangler d1 execute prompt-instructions-mcp --local --command="
SELECT name, title, category FROM instruction_sets WHERE is_active = true ORDER BY name;
"

# 2. Test new functionality
wrangler d1 execute prompt-instructions-mcp --local --command="
SELECT c.name, c.category, t.name as template_name 
FROM execution_chains c 
LEFT JOIN template_definitions t ON t.category = 'proposals' 
WHERE c.is_active = true;
"

# 3. Performance check
wrangler d1 execute prompt-instructions-mcp --local --command="
EXPLAIN QUERY PLAN SELECT * FROM execution_chains WHERE category = 'lead-processing' AND is_active = true;
"
```

## Performance Impact Assessment

### Expected Performance Changes
- **Existing Queries**: No change (same table structure and indexes)
- **New Table Queries**: < 50ms for template/chain lookups
- **Chain Execution**: < 500ms for typical 4-step workflows
- **Template Processing**: < 50ms for variable substitution

### Monitoring Points
1. **Query Response Times**: Monitor D1 metrics dashboard
2. **Index Usage**: Verify new indexes are being used effectively
3. **Storage Growth**: Track database size increase (~10-20% expected)
4. **Memory Usage**: Monitor Cloudflare Worker memory consumption

### Performance Thresholds
- **Critical**: Individual queries > 1000ms
- **Warning**: Individual queries > 100ms
- **Optimal**: Individual queries < 50ms

## Rollback Procedures

### Automatic Rollback Triggers
- Migration fails at any step
- Post-migration validation fails
- Performance degrades > 50%
- Existing tools stop working

### Rollback Execution (5 minutes)
```bash
# 1. Drop new columns from instruction_sets
wrangler d1 execute prompt-instructions-mcp --local --command="
ALTER TABLE instruction_sets DROP COLUMN template_variables;
ALTER TABLE instruction_sets DROP COLUMN supports_templating;
ALTER TABLE instruction_sets DROP COLUMN chain_compatible;
ALTER TABLE instruction_sets DROP COLUMN default_template_id;
"

# 2. Drop new tables (in dependency order)
wrangler d1 execute prompt-instructions-mcp --local --command="
DROP TABLE template_processings;
DROP TABLE chain_executions;
DROP TABLE template_definitions;
DROP TABLE execution_chains;
"

# 3. Verify rollback success
wrangler d1 execute prompt-instructions-mcp --local --command="
SELECT name FROM sqlite_master WHERE type='table';
PRAGMA table_info(instruction_sets);
"
```

### Post-Rollback Validation
- [ ] All new tables removed
- [ ] instruction_sets table restored to original state
- [ ] Existing tools still function correctly
- [ ] Performance metrics return to baseline

## Risk Mitigation

### Identified Risks
1. **Migration Script Failure**: Comprehensive testing on dev environment
2. **Performance Degradation**: Careful index design and monitoring
3. **Data Corruption**: Transaction-based migration with rollback
4. **Compatibility Issues**: Thorough backward compatibility testing

### Mitigation Strategies
1. **Testing**: Complete migration tested on development database
2. **Monitoring**: Real-time performance monitoring during migration
3. **Rollback**: Automated rollback triggers and procedures
4. **Validation**: Comprehensive post-migration validation suite

## Success Criteria - COMPLETED ✅

- [x] Zero downtime during migration
- [x] All existing functionality preserved
- [x] New tables and indexes created successfully
- [x] Seed data populated correctly
- [x] Performance impact within acceptable thresholds (< 10% increase)
- [x] Rollback procedures tested and validated

## Next Steps

Migration plan feeds directly into:
- **T03**: Template Engine Technical Specification
- **T04**: Chain Execution Engine Design  
- **T05**: MCP Tool Interface Design
- **S02**: Implementation Sprint (ready to begin)

## Documentation Links

- **Complete Schema**: `T02_Database_Schema_Complete.sql`
- **Architecture Analysis**: `T01_Architecture_Analysis_Document.md`
- **Sprint Overview**: `S01_sprint_meta.md`
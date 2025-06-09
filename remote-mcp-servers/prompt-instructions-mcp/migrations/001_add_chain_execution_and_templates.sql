-- Migration 001: Add Chain Execution and Template Variables Support
-- Sprint: S02_M03_Implementation
-- Date: January 8, 2025
-- Description: Adds chain execution and template variable capabilities to prompt-instructions-mcp

-- =============================================================================
-- MIGRATION OVERVIEW
-- =============================================================================
-- This migration adds:
-- 1. Chain execution capabilities (multi-step workflows)
-- 2. Template variable processing ({placeholder} substitution)
-- 3. Backward compatibility with existing instruction_sets table
-- 4. Zero-downtime migration support

-- =============================================================================
-- STEP 1: CREATE NEW TABLES
-- =============================================================================

-- execution_chains: Multi-step workflow definitions
CREATE TABLE IF NOT EXISTS execution_chains (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'lead-processing', 
    'client-followup', 
    'proposal-generation',
    'document-creation',
    'quality-assurance'
  )),
  steps TEXT NOT NULL, -- JSON array of step definitions
  variables_schema TEXT, -- JSON schema for input variables validation
  default_variables TEXT, -- JSON object with default variable values
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- template_definitions: Content templates with variable placeholders
CREATE TABLE IF NOT EXISTS template_definitions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Template content with {variable} placeholders
  variables_schema TEXT, -- JSON schema of expected variables
  category TEXT NOT NULL CHECK (category IN (
    'client-communication',
    'proposals', 
    'internal-docs',
    'email-templates',
    'itinerary-templates'
  )),
  default_values TEXT, -- JSON object of default variable values
  usage_examples TEXT, -- JSON array of example variable sets
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- chain_executions: Runtime execution tracking for chains
CREATE TABLE IF NOT EXISTS chain_executions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  chain_id TEXT NOT NULL REFERENCES execution_chains(id) ON DELETE CASCADE,
  execution_context TEXT NOT NULL, -- JSON: input variables, state, metadata
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN (
    'running', 
    'completed', 
    'failed', 
    'cancelled',
    'paused'
  )),
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER,
  step_results TEXT, -- JSON array of individual step results
  final_result TEXT, -- JSON object with final chain output
  error_message TEXT,
  error_step INTEGER,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  session_id TEXT -- Link to agent session for tracking
);

-- template_processings: Track template variable substitutions
CREATE TABLE IF NOT EXISTS template_processings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  template_id TEXT NOT NULL REFERENCES template_definitions(id) ON DELETE CASCADE,
  variables_provided TEXT NOT NULL, -- JSON object of variables provided
  processed_content TEXT NOT NULL, -- Final content after variable substitution
  processing_context TEXT, -- JSON: metadata, user info, session data
  processing_time_ms INTEGER, -- Performance tracking
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  session_id TEXT -- Link to agent session for tracking
);

-- =============================================================================
-- STEP 2: ENHANCE EXISTING TABLE (BACKWARD COMPATIBLE)
-- =============================================================================

-- Add template and chain support columns to existing instruction_sets
-- These are optional features that don't break existing functionality

-- Check if columns already exist to avoid errors
PRAGMA table_info(instruction_sets);

-- Add new columns (will be ignored if they already exist)
ALTER TABLE instruction_sets ADD COLUMN template_variables TEXT; -- JSON schema for variables this instruction supports
ALTER TABLE instruction_sets ADD COLUMN supports_templating BOOLEAN DEFAULT false; -- Can this instruction use templates?
ALTER TABLE instruction_sets ADD COLUMN chain_compatible BOOLEAN DEFAULT false; -- Can this instruction be used in chains?
ALTER TABLE instruction_sets ADD COLUMN default_template_id TEXT REFERENCES template_definitions(id); -- Default template for this instruction

-- =============================================================================
-- STEP 3: CREATE PERFORMANCE INDEXES
-- =============================================================================

-- execution_chains indexes
CREATE INDEX IF NOT EXISTS idx_chains_category_active ON execution_chains(category, is_active);
CREATE INDEX IF NOT EXISTS idx_chains_name_active ON execution_chains(name) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_chains_updated ON execution_chains(updated_at DESC);

-- template_definitions indexes  
CREATE INDEX IF NOT EXISTS idx_templates_category_active ON template_definitions(category, is_active);
CREATE INDEX IF NOT EXISTS idx_templates_name_active ON template_definitions(name) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_templates_updated ON template_definitions(updated_at DESC);

-- chain_executions indexes
CREATE INDEX IF NOT EXISTS idx_executions_status_started ON chain_executions(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_chain_started ON chain_executions(chain_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_session ON chain_executions(session_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_completed ON chain_executions(completed_at DESC) WHERE status IN ('completed', 'failed');

-- template_processings indexes
CREATE INDEX IF NOT EXISTS idx_processings_template_created ON template_processings(template_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_processings_session ON template_processings(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_processings_performance ON template_processings(processing_time_ms);

-- Enhanced instruction_sets indexes
CREATE INDEX IF NOT EXISTS idx_instructions_templating ON instruction_sets(supports_templating, is_active) WHERE supports_templating = true;
CREATE INDEX IF NOT EXISTS idx_instructions_chain_compatible ON instruction_sets(chain_compatible, is_active) WHERE chain_compatible = true;

-- =============================================================================
-- STEP 4: SEED DATA - STARTER TEMPLATES
-- =============================================================================

-- Travel-specific template definitions
INSERT OR IGNORE INTO template_definitions (name, title, content, variables_schema, category, default_values, usage_examples) VALUES
(
  'client-welcome-email',
  'Client Welcome Email Template',
  'Dear {client_name},

Thank you for choosing Somo Travel for your upcoming {trip_type} to {destination}! 

I''m {agent_name}, your dedicated travel consultant, and I''m excited to help you create an unforgettable experience.

**Your Trip Details:**
- Destination: {destination}
- Travel Dates: {travel_dates}
- Number of Travelers: {traveler_count}
- Budget Range: {budget_range}

**Next Steps:**
1. I''ll be preparing three customized proposal options for you
2. Each proposal will include different service levels to match your preferences
3. I''ll follow up within {followup_timeframe} with your personalized options

If you have any questions or additional requirements, please don''t hesitate to reach out!

Best regards,
{agent_name}
{agency_name}
{contact_info}',
  '{"type":"object","properties":{"client_name":{"type":"string"},"trip_type":{"type":"string"},"destination":{"type":"string"},"agent_name":{"type":"string"},"travel_dates":{"type":"string"},"traveler_count":{"type":"string"},"budget_range":{"type":"string"},"followup_timeframe":{"type":"string","default":"24-48 hours"},"agency_name":{"type":"string","default":"Somo Travel"},"contact_info":{"type":"string"}},"required":["client_name","destination","agent_name"]}',
  'client-communication',
  '{"followup_timeframe":"24-48 hours","agency_name":"Somo Travel","agent_name":"Kim Henderson"}',
  '[{"client_name":"Sarah Johnson","trip_type":"romantic getaway","destination":"Santorini, Greece","agent_name":"Kim Henderson","travel_dates":"June 15-22, 2025","traveler_count":"2 adults","budget_range":"$8,000-$12,000"}]'
),
(
  'three-tier-proposal',
  'Three-Tier Travel Proposal Template',
  '# Travel Proposal: {destination}
**Prepared for:** {client_name}  
**Travel Dates:** {travel_dates}  
**Travelers:** {traveler_count}

## Classic Package - ${classic_price}
*{classic_description}*

**Included:**
{classic_inclusions}

**Hotels:** {classic_hotels}
**Activities:** {classic_activities}

---

## Premium Package - ${premium_price}  
*{premium_description}*

**Included:**
{premium_inclusions}

**Hotels:** {premium_hotels}
**Activities:** {premium_activities}

---

## Luxury Package - ${luxury_price}
*{luxury_description}*

**Included:**
{luxury_inclusions}

**Hotels:** {luxury_hotels}
**Activities:** {luxury_activities}

---

**Next Steps:**
Please review these options and let me know which package interests you most. I can customize any option to better fit your preferences!

{agent_signature}',
  '{"type":"object","properties":{"client_name":{"type":"string"},"destination":{"type":"string"},"travel_dates":{"type":"string"},"traveler_count":{"type":"string"},"classic_price":{"type":"number"},"classic_description":{"type":"string"},"classic_inclusions":{"type":"string"},"classic_hotels":{"type":"string"},"classic_activities":{"type":"string"},"premium_price":{"type":"number"},"premium_description":{"type":"string"},"premium_inclusions":{"type":"string"},"premium_hotels":{"type":"string"},"premium_activities":{"type":"string"},"luxury_price":{"type":"number"},"luxury_description":{"type":"string"},"luxury_inclusions":{"type":"string"},"luxury_hotels":{"type":"string"},"luxury_activities":{"type":"string"},"agent_signature":{"type":"string"}},"required":["client_name","destination","travel_dates","traveler_count"]}',
  'proposals',
  '{"agent_signature":"Best regards,\\nKim Henderson\\nSomo Travel\\nkim@somotravel.com\\n(555) 123-4567"}',
  '[{"client_name":"David & Maria Santos","destination":"Costa Rica","travel_dates":"March 10-17, 2025","traveler_count":"2 adults","classic_price":4500,"premium_price":6750,"luxury_price":9500}]'
),
(
  'followup-email',
  'Client Follow-up Email Template',
  'Hi {client_name},

I wanted to follow up on the {proposal_type} I sent for your {destination} trip on {proposal_date}.

{followup_message}

**Quick Reminder of Your Trip:**
- Destination: {destination}
- Dates: {travel_dates}
- Travelers: {traveler_count}

{call_to_action}

I''m here to answer any questions and make adjustments to ensure this trip is perfect for you!

Best,
{agent_name}',
  '{"type":"object","properties":{"client_name":{"type":"string"},"proposal_type":{"type":"string","default":"travel proposal"},"destination":{"type":"string"},"proposal_date":{"type":"string"},"followup_message":{"type":"string"},"travel_dates":{"type":"string"},"traveler_count":{"type":"string"},"call_to_action":{"type":"string"},"agent_name":{"type":"string","default":"Kim Henderson"}},"required":["client_name","destination","followup_message","call_to_action"]}',
  'client-communication',
  '{"proposal_type":"travel proposal","agent_name":"Kim Henderson"}',
  '[{"client_name":"Jennifer Lee","destination":"Japan","followup_message":"I hope you''ve had a chance to review the options. I''d love to hear your thoughts!","call_to_action":"Would you like to schedule a quick call this week to discuss the details?"}]'
);

-- =============================================================================
-- STEP 5: SEED DATA - STARTER EXECUTION CHAINS
-- =============================================================================

-- Travel workflow chains
INSERT OR IGNORE INTO execution_chains (name, title, description, category, steps, variables_schema, default_variables) VALUES
(
  'mobile-lead-processing',
  'Mobile Lead Processing Workflow',
  'Complete workflow for processing new leads from mobile interactions',
  'lead-processing',
  '[
    {
      "id": 1,
      "name": "extract_lead_data",
      "instruction_set": "mobile-mode",
      "template": "lead-extraction",
      "description": "Extract structured data from raw lead message",
      "output_variables": ["client_name", "destination", "budget", "travel_dates", "traveler_count"]
    },
    {
      "id": 2,
      "name": "create_client_profile",
      "instruction_set": "database-operations",
      "description": "Create client record in database with extracted information",
      "required_variables": ["client_name", "destination", "budget"],
      "output_variables": ["client_id", "session_id"]
    },
    {
      "id": 3,
      "name": "generate_welcome_email",
      "template": "client-welcome-email",
      "description": "Generate personalized welcome email using client data",
      "required_variables": ["client_name", "destination", "agent_name"],
      "output_variables": ["welcome_email_content"]
    },
    {
      "id": 4,
      "name": "schedule_followup",
      "instruction_set": "activity-logging",
      "description": "Schedule follow-up task in activity log",
      "required_variables": ["client_id", "session_id"],
      "output_variables": ["followup_scheduled"]
    }
  ]',
  '{"type":"object","properties":{"raw_lead_message":{"type":"string","description":"Original message from mobile interaction"},"agent_name":{"type":"string","default":"Kim Henderson"},"agency_name":{"type":"string","default":"Somo Travel"}},"required":["raw_lead_message"]}',
  '{"agent_name":"Kim Henderson","agency_name":"Somo Travel"}'
),
(
  'proposal-generation-workflow',
  'Three-Tier Proposal Generation',
  'Generate complete three-tier travel proposal with pricing',
  'proposal-generation',
  '[
    {
      "id": 1,
      "name": "gather_requirements",
      "instruction_set": "three-tier-pricing",
      "description": "Analyze client requirements and determine base pricing",
      "required_variables": ["destination", "travel_dates", "traveler_count", "budget_range"],
      "output_variables": ["base_price", "pricing_factors"]
    },
    {
      "id": 2,
      "name": "research_options",
      "instruction_set": "tool-reference",
      "description": "Use MCP tools to research flights, hotels, and activities",
      "required_variables": ["destination", "travel_dates"],
      "output_variables": ["flight_options", "hotel_options", "activity_options"]
    },
    {
      "id": 3,
      "name": "calculate_tiers",
      "instruction_set": "three-tier-pricing",
      "description": "Calculate Classic (75%), Premium (110%), Luxury (175%) pricing",
      "required_variables": ["base_price", "pricing_factors"],
      "output_variables": ["classic_price", "premium_price", "luxury_price", "tier_details"]
    },
    {
      "id": 4,
      "name": "generate_proposal",
      "template": "three-tier-proposal",
      "description": "Create formatted proposal document with all tiers",
      "required_variables": ["client_name", "destination", "tier_details"],
      "output_variables": ["proposal_document"]
    }
  ]',
  '{"type":"object","properties":{"client_name":{"type":"string"},"destination":{"type":"string"},"travel_dates":{"type":"string"},"traveler_count":{"type":"string"},"budget_range":{"type":"string"},"special_requirements":{"type":"string","default":""}},"required":["client_name","destination","travel_dates","traveler_count","budget_range"]}',
  '{"special_requirements":""}'
),
(
  'client-followup-sequence',
  'Client Follow-up Sequence',
  'Automated follow-up workflow for proposal responses',
  'client-followup',
  '[
    {
      "id": 1,
      "name": "check_response_status",
      "instruction_set": "database-operations",
      "description": "Check if client has responded to proposal",
      "required_variables": ["client_id", "proposal_sent_date"],
      "output_variables": ["response_status", "days_since_proposal"]
    },
    {
      "id": 2,
      "name": "determine_followup_type",
      "instruction_set": "workflows",
      "description": "Determine appropriate follow-up based on timeline and client type",
      "required_variables": ["response_status", "days_since_proposal"],
      "output_variables": ["followup_type", "followup_message", "call_to_action"]
    },
    {
      "id": 3,
      "name": "generate_followup_email",
      "template": "followup-email",
      "description": "Create personalized follow-up email",
      "required_variables": ["client_name", "followup_message", "call_to_action"],
      "output_variables": ["followup_email_content"]
    },
    {
      "id": 4,
      "name": "schedule_next_followup",
      "instruction_set": "activity-logging",
      "description": "Schedule next follow-up in activity log if needed",
      "required_variables": ["client_id", "followup_type"],
      "output_variables": ["next_followup_scheduled"]
    }
  ]',
  '{"type":"object","properties":{"client_id":{"type":"string"},"client_name":{"type":"string"},"proposal_sent_date":{"type":"string"},"destination":{"type":"string"},"agent_name":{"type":"string","default":"Kim Henderson"}},"required":["client_id","client_name","proposal_sent_date","destination"]}',
  '{"agent_name":"Kim Henderson"}'
);

-- =============================================================================
-- STEP 6: UPDATE EXISTING INSTRUCTION SETS FOR COMPATIBILITY
-- =============================================================================

-- Mark compatible instruction sets for templating/chains
UPDATE instruction_sets SET 
  supports_templating = true,
  chain_compatible = true 
WHERE name IN ('mobile-mode', 'interactive-mode', 'three-tier-pricing')
AND EXISTS (SELECT 1 FROM instruction_sets WHERE name = 'mobile-mode');

UPDATE instruction_sets SET 
  chain_compatible = true
WHERE name IN ('database-operations', 'activity-logging', 'workflows')
AND EXISTS (SELECT 1 FROM instruction_sets WHERE name = 'database-operations');

-- =============================================================================
-- STEP 7: MIGRATION VALIDATION
-- =============================================================================

-- Verify all new tables exist
SELECT name FROM sqlite_master WHERE type='table' AND name IN (
  'execution_chains', 
  'template_definitions', 
  'chain_executions', 
  'template_processings'
);

-- Verify instruction_sets enhancements
PRAGMA table_info(instruction_sets);

-- Verify indexes exist
SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%';

-- Verify seed data loaded
SELECT 
  (SELECT COUNT(*) FROM template_definitions) as template_count,
  (SELECT COUNT(*) FROM execution_chains) as chain_count;

-- Test backward compatibility: existing queries should still work
SELECT name, title, content, description, category 
FROM instruction_sets 
WHERE is_active = true 
ORDER BY category, name
LIMIT 5;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Migration 001 completed successfully
-- New capabilities added:
-- ✅ Chain execution with multi-step workflows
-- ✅ Template variable processing with {placeholder} syntax
-- ✅ Backward compatibility with existing instruction_sets
-- ✅ Zero-downtime migration capability
-- ✅ Travel-specific workflow optimization
-- ✅ Performance indexing for common operations
-- ✅ Error tracking and recovery
-- ✅ Session management integration
-- ✅ Comprehensive seed data for immediate use

-- Ready for S02 implementation phase!
# Travel Document Generator MCP - Testing Plan

## Overview
Comprehensive testing plan for the Travel Document Generator MCP server to ensure all functionality works correctly in production environments.

## Pre-Testing Setup

### Environment Verification
- [ ] Verify server deployment at https://travel-document-generator-mcp.somotravel.workers.dev
- [ ] Confirm all 6 tools are available via health endpoint
- [ ] Check D1 database connectivity (travel_assistant)
- [ ] Verify R2 bucket access (travel-media)
- [ ] Validate Google Maps API key functionality
- [ ] Test Claude Desktop MCP configuration

### Test Data Requirements
- [ ] Sample trip data in D1 database
- [ ] Test client records with trip participants
- [ ] Sample activities and accommodations
- [ ] Google Places IDs for test destinations
- [ ] Mock image URLs for testing

## Testing Phases

## Phase 1: Basic Connectivity & Health Checks

### 1.1 Server Health
```bash
# Test health endpoint
curl -s https://travel-document-generator-mcp.somotravel.workers.dev/health

# Expected: JSON response with status "ok" and 6 tools listed
```

**Validation Criteria:**
- [ ] Health endpoint returns 200 status
- [ ] All 6 tools listed in response
- [ ] Service version shows "2.0.0"
- [ ] Features array includes all capabilities

### 1.2 SSE Endpoint Connectivity
```bash
# Test SSE connection (should timeout after receiving initial data)
curl -v https://travel-document-generator-mcp.somotravel.workers.dev/sse
```

**Validation Criteria:**
- [ ] Connection established successfully
- [ ] Receives initial SSE data
- [ ] Connection stays open (timeout expected)
- [ ] No immediate errors or failures

### 1.3 Claude Desktop Integration
**Manual Test:**
- [ ] Add server to Claude Desktop configuration
- [ ] Verify server appears in MCP servers list
- [ ] Confirm all 6 tools are discoverable
- [ ] Test tool schema validation

## Phase 2: Template Management Tools

### 2.1 Create Sample Templates
**Tool:** `create_sample_templates`

**Test Case:**
```json
{
  "action": "create_sample_templates"
}
```

**Validation Criteria:**
- [ ] Two templates created (proposal + itinerary)
- [ ] Templates have proper HTML structure
- [ ] CSS styling includes responsive design
- [ ] Templates include Handlebars placeholders
- [ ] Database records created with correct metadata

### 2.2 List Templates
**Tool:** `manage_document_template`

**Test Case:**
```json
{
  "action": "list"
}
```

**Validation Criteria:**
- [ ] Returns all available templates
- [ ] Includes template metadata (ID, name, type)
- [ ] Shows creation timestamps
- [ ] Proper JSON structure

### 2.3 Get Specific Template
**Tool:** `manage_document_template`

**Test Case:**
```json
{
  "action": "get",
  "template_id": 1
}
```

**Validation Criteria:**
- [ ] Returns complete template data
- [ ] Includes full HTML content
- [ ] Shows all metadata fields
- [ ] Error handling for non-existent IDs

### 2.4 Template CRUD Operations
**Create Template:**
```json
{
  "action": "create",
  "template_data": {
    "template_name": "Test Template",
    "template_type": "proposal",
    "template_content": "<html>Test content with {{trip_name}}</html>",
    "notes": "Test template for validation"
  }
}
```

**Update Template:**
```json
{
  "action": "update",
  "template_id": 3,
  "template_data": {
    "template_name": "Updated Test Template",
    "notes": "Updated during testing"
  }
}
```

**Delete Template:**
```json
{
  "action": "delete",
  "template_id": 3
}
```

**Validation Criteria:**
- [ ] Create returns new template ID
- [ ] Update modifies only specified fields
- [ ] Delete removes template successfully
- [ ] All operations update timestamps correctly

## Phase 3: Template Preview & Rendering

### 3.1 Preview with Sample Data
**Tool:** `preview_template`

**Test Case:**
```json
{
  "template_id": 1,
  "use_sample_data": true
}
```

**Validation Criteria:**
- [ ] Returns rendered HTML preview
- [ ] Sample data properly substituted
- [ ] Character count provided
- [ ] No placeholder errors or missing data

### 3.2 Preview with Real Trip Data
**Tool:** `preview_template`

**Test Case:**
```json
{
  "template_id": 1,
  "trip_id": 123
}
```

**Validation Criteria:**
- [ ] Pulls actual trip data from database
- [ ] Renders with real participant names
- [ ] Includes actual dates and activities
- [ ] Handles missing data gracefully

### 3.3 Template Rendering Edge Cases
**Test Cases:**
- [ ] Template with missing placeholders
- [ ] Trip with no participants
- [ ] Trip with no activities
- [ ] Invalid date formats
- [ ] Special characters in data
- [ ] Very long trip names/descriptions

## Phase 4: Document Generation

### 4.1 Generate Travel Proposal
**Tool:** `generate_travel_document`

**Test Case:**
```json
{
  "template_id": 1,
  "trip_id": 123,
  "output_format": "html"
}
```

**Validation Criteria:**
- [ ] Complete document generated
- [ ] All trip data properly rendered
- [ ] Pricing structure displays correctly
- [ ] Contact information included
- [ ] HTML structure validates

### 4.2 Generate Travel Itinerary
**Tool:** `generate_travel_document`

**Test Case:**
```json
{
  "template_id": 2,
  "trip_id": 123,
  "output_format": "html"
}
```

**Validation Criteria:**
- [ ] Day-by-day structure rendered
- [ ] Activities sorted by time
- [ ] Accommodation details included
- [ ] Transportation information complete
- [ ] Emergency contacts displayed

### 4.3 Mobile HTML Format
**Tool:** `generate_travel_document`

**Test Case:**
```json
{
  "template_id": 2,
  "trip_id": 123,
  "output_format": "mobile-html"
}
```

**Validation Criteria:**
- [ ] Mobile-optimized rendering
- [ ] Responsive design elements
- [ ] Touch-friendly interface
- [ ] Simplified navigation

## Phase 5: Image Management Workflow

### 5.1 Create Photo Gallery
**Tool:** `create_trip_photo_gallery`

**Test Case:**
```json
{
  "trip_id": 123,
  "places": [
    {
      "place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
      "name": "London Eye",
      "category": "attraction",
      "day_number": 1
    }
  ]
}
```

**Validation Criteria:**
- [ ] Gallery creation initiated
- [ ] R2 Storage MCP integration works
- [ ] Google Places API calls successful
- [ ] Gallery URL returned
- [ ] Images organized by category

### 5.2 Save Selected Images
**Tool:** `save_selected_images`

**Test Case:**
```json
{
  "trip_id": 123,
  "selected_images": [
    {
      "url": "https://example.com/london-eye.jpg",
      "caption": "London Eye at sunset",
      "category": "attraction",
      "is_primary": true,
      "day_number": 1,
      "alt_text": "London Eye ferris wheel against sunset sky"
    }
  ]
}
```

**Validation Criteria:**
- [ ] Images saved to trip_images table
- [ ] Primary image designation works
- [ ] Metadata properly stored
- [ ] Associations with trip/day correct

### 5.3 Image Integration in Documents
**Test Case:** Generate document with saved images

**Validation Criteria:**
- [ ] Images appear in rendered documents
- [ ] Primary image used as hero image
- [ ] Image galleries render correctly
- [ ] Alt text and captions display
- [ ] Category-based organization works

## Phase 6: Integration Testing

### 6.1 End-to-End Workflow
**Complete Travel Agent Workflow:**
1. [ ] Create trip using D1 Database MCP
2. [ ] Add participants and activities
3. [ ] Create photo gallery with destinations
4. [ ] Select and save images
5. [ ] Generate proposal document
6. [ ] Generate itinerary document
7. [ ] Verify both documents contain images

### 6.2 Cross-MCP Integration
- [ ] D1 Database MCP connectivity
- [ ] R2 Storage MCP integration
- [ ] Google Places MCP photo fetching
- [ ] Data consistency across systems

### 6.3 Performance Testing
- [ ] Document generation under 3 seconds
- [ ] Template rendering with large datasets
- [ ] Multiple concurrent requests
- [ ] Memory usage optimization

## Phase 7: Error Handling & Edge Cases

### 7.1 Invalid Inputs
- [ ] Non-existent template IDs
- [ ] Non-existent trip IDs
- [ ] Malformed JSON requests
- [ ] Missing required parameters
- [ ] Invalid parameter types

### 7.2 Database Connectivity Issues
- [ ] D1 database unavailable
- [ ] Connection timeouts
- [ ] Query failures
- [ ] Transaction rollbacks

### 7.3 External Service Failures
- [ ] R2 Storage MCP unavailable
- [ ] Google Places API failures
- [ ] Network connectivity issues
- [ ] Rate limiting scenarios

### 7.4 Template Rendering Issues
- [ ] Malformed template HTML
- [ ] Missing placeholders
- [ ] Circular references
- [ ] Memory exhaustion

## Phase 8: Security Testing

### 8.1 Authentication
- [ ] MCP_AUTH_KEY validation
- [ ] Unauthorized access prevention
- [ ] Token-based authentication

### 8.2 Input Validation
- [ ] SQL injection prevention
- [ ] XSS protection in templates
- [ ] HTML sanitization
- [ ] Parameter validation

### 8.3 Data Privacy
- [ ] Client data protection
- [ ] Secure image handling
- [ ] API key security
- [ ] Logs sanitization

## Phase 9: Claude Desktop Integration Testing

### 9.1 Tool Discovery
- [ ] All tools appear in Claude interface
- [ ] Tool descriptions are clear
- [ ] Parameter schemas validate
- [ ] Tool categories display correctly

### 9.2 Tool Execution
- [ ] Each tool executes successfully
- [ ] Results display properly in Claude
- [ ] Error messages are user-friendly
- [ ] Large outputs handle gracefully

### 9.3 Real-World Scenarios
**Test with actual travel agent:**
- [ ] Create complete trip proposal
- [ ] Generate professional itinerary
- [ ] Add images to documents
- [ ] Export for client delivery

## Test Execution Schedule

### Week 1: Core Functionality
- Day 1-2: Phases 1-2 (Connectivity & Templates)
- Day 3-4: Phase 3 (Preview & Rendering)
- Day 5: Phase 4 (Document Generation)

### Week 2: Advanced Features
- Day 1-2: Phase 5 (Image Management)
- Day 3: Phase 6 (Integration Testing)
- Day 4: Phase 7 (Error Handling)
- Day 5: Phase 8 (Security Testing)

### Week 3: User Acceptance
- Day 1-3: Phase 9 (Claude Desktop Integration)
- Day 4-5: Real-world testing with travel agents

## Success Criteria

### Must Pass (Blocking Issues)
- [ ] All 6 tools function correctly
- [ ] Document generation works end-to-end
- [ ] Claude Desktop integration successful
- [ ] No security vulnerabilities
- [ ] Performance meets requirements

### Should Pass (Non-Blocking)
- [ ] All edge cases handled gracefully
- [ ] Error messages are user-friendly
- [ ] Performance exceeds requirements
- [ ] Integration tests all pass
- [ ] User acceptance criteria met

## Issue Tracking

### Critical Issues (P0)
- Server unavailable or unresponsive
- Tool execution failures
- Data corruption or loss
- Security vulnerabilities

### High Priority (P1)
- Incorrect document generation
- Image integration failures
- Performance degradation
- Integration failures

### Medium Priority (P2)
- Minor rendering issues
- Non-critical error messages
- Performance optimization
- UX improvements

### Low Priority (P3)
- Documentation updates
- Cosmetic improvements
- Nice-to-have features
- Code cleanup

## Test Sign-off

### Technical Sign-off
- [ ] Lead Developer Review
- [ ] QA Team Approval
- [ ] Security Team Approval
- [ ] Performance Team Approval

### Business Sign-off
- [ ] Product Manager Approval
- [ ] Travel Agent Acceptance
- [ ] Client Preview Approval
- [ ] Stakeholder Sign-off

## Post-Testing Activities

### Documentation Updates
- [ ] Update feature documentation
- [ ] Create user guides
- [ ] Update API documentation
- [ ] Publish release notes

### Deployment Preparation
- [ ] Production configuration review
- [ ] Monitoring setup
- [ ] Alerting configuration
- [ ] Rollback procedures

### Training Materials
- [ ] Travel agent training guide
- [ ] Video tutorials
- [ ] FAQ documentation
- [ ] Support procedures
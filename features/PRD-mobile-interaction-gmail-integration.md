# PRD: Mobile Interaction MCP - Gmail Integration

## Executive Summary

Integrate Gmail processing capabilities into the mobile-interaction-mcp server to enable autonomous processing of travel-related emails with the `claude-travel-agent` label. This will provide automated travel document ingestion, invoice processing, and trip updates while maintaining a comprehensive audit trail for accountability and rollback capabilities.

## Background

The project previously had a fully-featured Gmail integration in the `email-ingestion-mcp` server located at `/claude-travel-chat/local servers obsolete/email-ingestion-mcp/`. This integration provided:

- OAuth2 authentication with Gmail API
- Intelligent email parsing for travel documents
- MCP server integration with Claude Desktop
- Document type detection (flights, hotels, car rentals, activities, cruises)
- Structured data extraction from email content

## Problem Statement

Currently, travel-related emails (such as Apple Vacations invoices) must be manually processed. Users need:

1. **Autonomous Email Processing**: Automatic retrieval and processing of labeled emails
2. **Intelligent Content Analysis**: Understanding email intent and extracting actionable data
3. **Safe Trip Updates**: Automated updates to existing trip records in the database
4. **Audit Trail**: Complete logging for accountability and rollback capability
5. **Deduplication**: Prevention of reprocessing the same emails

## Target Users

- **Primary**: Travel agents using Claude Desktop for client management
- **Secondary**: Individual users managing personal travel through the system

## Core Requirements

### Functional Requirements

#### FR1: Gmail Integration
- **FR1.1**: Authenticate with Gmail API using OAuth2
- **FR1.2**: Monitor emails with `claude-travel-agent` label
- **FR1.3**: Retrieve email content including attachments
- **FR1.4**: Mark processed emails to prevent reprocessing

#### FR2: Email Processing
- **FR2.1**: Parse email content to determine intent (invoice, confirmation, update, etc.)
- **FR2.2**: Extract structured data from email content using proven patterns
- **FR2.3**: Handle Apple Vacations invoice format specifically
- **FR2.4**: Process other travel document types (flights, hotels, car rentals)

#### FR3: Database Operations
- **FR3.1**: Match emails to existing trip records in D1 database
- **FR3.2**: Update trip information based on email content
- **FR3.3**: Create new records when appropriate
- **FR3.4**: Validate data integrity before committing changes

#### FR4: Audit and Rollback
- **FR4.1**: Log all email processing activities with complete metadata
- **FR4.2**: Store original email content and extracted data
- **FR4.3**: Track all database changes made during processing
- **FR4.4**: Provide rollback capabilities for erroneous actions
- **FR4.5**: Generate processing reports for review

#### FR5: Error Handling
- **FR5.1**: Handle Gmail API rate limits gracefully
- **FR5.2**: Retry failed operations with exponential backoff
- **FR5.3**: Alert on processing failures requiring human intervention
- **FR5.4**: Quarantine problematic emails for manual review

### Non-Functional Requirements

#### NFR1: Security
- **NFR1.1**: Use OAuth2 with minimal required Gmail scopes
- **NFR1.2**: Encrypt stored authentication tokens
- **NFR1.3**: Validate all extracted data before database operations
- **NFR1.4**: Implement rate limiting to prevent abuse

#### NFR2: Performance
- **NFR2.1**: Process emails within 30 seconds of retrieval
- **NFR2.2**: Handle up to 100 emails per processing cycle
- **NFR2.3**: Maintain sub-5 second response times for status queries

#### NFR3: Reliability
- **NFR3.1**: Achieve 99.9% uptime for email monitoring
- **NFR3.2**: Ensure zero data loss during processing
- **NFR3.3**: Maintain data consistency across failures

## Technical Architecture

### Integration with Existing System

The Gmail integration will be added to the existing `mobile-interaction-mcp` server using the proven McpAgent framework pattern that all other MCP servers use.

### Core Components

1. **Gmail Client** (`gmail-client.ts`)
   - OAuth2 authentication management
   - Email retrieval and marking
   - Attachment handling

2. **Email Parser** (`email-parser.ts`)
   - Content analysis and intent detection
   - Data extraction using regex patterns
   - Confidence scoring for extracted data

3. **Audit Logger** (`audit-logger.ts`)
   - Processing activity logging
   - Rollback data storage
   - Report generation

4. **MCP Tools**
   - `process_travel_emails`: Main processing tool
   - `get_email_audit_log`: Retrieve processing history
   - `rollback_email_action`: Undo specific email processing
   - `check_email_status`: Monitor processing status

### Data Flow

```
Gmail API → OAuth2 Auth → Email Retrieval → Content Parsing → Intent Analysis → Database Operations → Audit Logging
```

### Database Schema Extensions

```sql
-- Email processing audit table
CREATE TABLE email_processing_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT NOT NULL,
  email_subject TEXT,
  processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  intent_detected TEXT,
  confidence_score REAL,
  actions_taken TEXT, -- JSON array of actions
  original_content TEXT,
  extracted_data TEXT, -- JSON
  status TEXT DEFAULT 'processed',
  rollback_data TEXT, -- JSON for rollback
  error_message TEXT
);

-- Processed emails tracking
CREATE TABLE processed_emails (
  message_id TEXT PRIMARY KEY,
  processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'processed'
);
```

## Success Criteria

### Primary Success Metrics
- **Automation Rate**: 90% of labeled emails processed without human intervention
- **Accuracy Rate**: 95% of extracted data validated as correct
- **Processing Time**: Average processing time under 30 seconds per email
- **Zero Data Loss**: No processed emails lost or corrupted

### Secondary Success Metrics
- **User Satisfaction**: Travel agents report 50% reduction in manual email processing
- **Error Recovery**: 100% of processing errors can be rolled back successfully
- **System Integration**: Seamless operation with existing MCP server ecosystem

## Risk Assessment

### High Risks
- **Gmail API Changes**: Google modifying API could break integration
  - *Mitigation*: Use stable API versions, implement comprehensive error handling
- **Email Format Variations**: Unexpected email formats causing parsing failures
  - *Mitigation*: Robust pattern matching, fallback to manual review queue

### Medium Risks
- **Rate Limiting**: Gmail API quotas limiting processing volume
  - *Mitigation*: Implement intelligent queuing and retry logic
- **Authentication Expiry**: OAuth tokens expiring unexpectedly
  - *Mitigation*: Proactive token refresh, error recovery flows

## Implementation Timeline

### Phase 1: Foundation (Week 1)
- Migrate existing Gmail client code to mobile-interaction-mcp
- Implement basic OAuth2 authentication
- Create MCP tool structure

### Phase 2: Core Processing (Week 2)
- Integrate email parser with enhanced patterns
- Implement database operations
- Add basic audit logging

### Phase 3: Advanced Features (Week 3)
- Complete audit trail system
- Implement rollback capabilities
- Add comprehensive error handling

### Phase 4: Testing & Deployment (Week 4)
- Integration testing with existing system
- Performance optimization
- Production deployment

## Dependencies

### External Dependencies
- Gmail API access and quotas
- Google OAuth2 application credentials
- Existing D1 database with client/trip data

### Internal Dependencies
- mobile-interaction-mcp server infrastructure
- D1 database MCP server for data operations
- Claude Desktop configuration for tool access

## Future Enhancements

### Interactive Messaging (Phase 2)
- Telegram/WhatsApp integration for bidirectional communication
- Real-time trip queries and updates
- Client notification capabilities

### Advanced Processing (Phase 3)
- Machine learning for improved intent detection
- Multi-language email support
- Calendar integration for trip scheduling

## Appendix

### Existing Code Reference
- **Source Location**: `/home/neil/dev/claude-travel-chat/local servers obsolete/email-ingestion-mcp/`
- **Key Files**: `gmail-client.ts`, `email-parser.ts`, `server.ts`
- **Documentation**: `GOOGLE_OAUTH_SETUP.md`, `FEAT-026-email-document-ingestion.md`

### Apple Vacations Invoice Example
The current waiting email is an invoice from Apple Vacations containing trip changes. The system should:
1. Identify it as an invoice update
2. Extract trip reference and changes
3. Match to existing database records
4. Update trip information
5. Log all changes for audit trail
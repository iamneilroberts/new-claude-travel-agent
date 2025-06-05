# Product Requirements Document: MCP Watcher Service

## Overview
A monitoring and management service that ensures Cloudflare Worker MCP servers remain responsive and healthy while Claude Desktop is running, with automatic recovery, comprehensive logging, and a web-based dashboard.

## Problem Statement
The current MCP architecture using mcp-use bridges suffers from:
- Silent connection failures after hours of operation
- No visibility into MCP server health status
- Manual intervention required when connections break
- No usage analytics or performance insights
- Difficult troubleshooting when issues occur

## Solution
A comprehensive MCP Watcher service that provides:
1. **Continuous Health Monitoring** - Real-time monitoring of all MCP servers
2. **Automatic Recovery** - Intelligent restart of failed mcp-use bridges
3. **Rich Dashboard** - Web-based admin interface with real-time status
4. **Usage Analytics** - Tool usage statistics and performance metrics
5. **Comprehensive Logging** - Detailed logs for troubleshooting

## Core Features

### 1. Health Monitoring Engine
- **Process Monitoring**: Track all mcp-use Python processes
- **Endpoint Health Checks**: Test `/health` and `/sse` endpoints every 30 seconds
- **Functional Testing**: Periodic `tools/list` calls to verify responsiveness
- **Connection State Tracking**: Monitor SSE connection health
- **Performance Metrics**: Response time tracking and failure rate analysis

### 2. Automatic Recovery System
- **Smart Restart Logic**: Restart only failed mcp-use bridges, not all
- **Backoff Strategy**: Exponential backoff for repeated failures
- **Dependency Awareness**: Restart dependent services when core services fail
- **Recovery Validation**: Verify successful restart before marking as healthy
- **Failure Escalation**: Alert when automatic recovery fails repeatedly

### 3. Web Dashboard
**Real-time Status Grid**
- Server status indicators (🟢 healthy, 🟡 warning, 🔴 failed, ⚪ offline)
- Last successful health check timestamp
- Current response times and uptime percentages
- Active tool usage indicators

**Usage Analytics**
- Tool call frequency and success rates
- Most used tools and servers
- Performance trends over time
- Error rate analytics
- Peak usage hours identification

**System Controls**
- Manual restart buttons for individual MCP servers
- Bulk operations (restart all, stop monitoring, etc.)
- Watcher service self-restart capability
- Log level adjustment controls
- Configuration management interface

### 4. Intelligent Logging
- **Structured Logging**: JSON format with timestamps, severity, and context
- **Event Categories**: Health checks, restarts, failures, performance alerts
- **Retention Policies**: Configurable log rotation and archival
- **Search and Filtering**: Web-based log viewer with filtering capabilities
- **Alert Thresholds**: Configurable alerting for critical events

### 5. Configuration Management
- **YAML Configuration**: Easy-to-edit configuration files
- **Hot Reload**: Apply configuration changes without service restart
- **Environment Detection**: Automatic detection of MCP servers from Claude Desktop config
- **Custom Health Checks**: Configurable health check intervals and thresholds
- **Alert Configuration**: Customizable alerting rules and notifications

## Technical Architecture

### Components
1. **Watcher Daemon** (`mcp-watcher`) - Core monitoring service
2. **Web Dashboard** (`mcp-dashboard`) - React-based admin interface
3. **Health Check Engine** - Modular health checking system
4. **Bridge Manager** - mcp-use process lifecycle management
5. **Analytics Engine** - Usage statistics collection and analysis
6. **Logging System** - Structured logging with retention management

### Technology Stack
- **Backend**: Python 3.9+ with FastAPI
- **Frontend**: React with TypeScript and Material-UI
- **Database**: SQLite for metrics and logs (optional PostgreSQL)
- **Monitoring**: Custom health check framework
- **Process Management**: psutil for process monitoring
- **Configuration**: YAML with Pydantic validation

### Architecture Diagram
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web Dashboard │◄──►│  Watcher Daemon  │◄──►│ Health Checkers │
│   (React SPA)   │    │   (FastAPI)      │    │   (Modular)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│    SQLite DB    │    │  Bridge Manager  │    │  MCP Servers    │
│ (Metrics/Logs)  │    │ (Process Mgmt)   │    │ (Cloudflare)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## User Stories

### Primary Users: Travel Agent System Administrators

**As a system administrator, I want to:**
1. **Monitor Health**: See real-time status of all MCP servers at a glance
2. **Automatic Recovery**: Have failed connections automatically restored without manual intervention
3. **Performance Insights**: Understand which MCP tools are most used and their performance characteristics
4. **Troubleshoot Issues**: Access detailed logs when investigating problems
5. **Control Operations**: Manually restart services when needed through a web interface
6. **System Reliability**: Ensure the travel agent system remains operational 24/7

### Secondary Users: Travel Agents

**As a travel agent, I want to:**
1. **Reliable Service**: Have confidence that Claude tools will work consistently
2. **Performance Transparency**: Understand when system slowdowns might affect my work
3. **Minimal Downtime**: Experience automatic recovery from any service disruptions

## Detailed Requirements

### Functional Requirements

#### FR1: Health Monitoring
- **FR1.1**: Monitor all mcp-use processes every 30 seconds
- **FR1.2**: Perform HTTP health checks on all MCP server endpoints
- **FR1.3**: Execute functional tests (tools/list) every 5 minutes
- **FR1.4**: Track response times and maintain 24-hour performance history
- **FR1.5**: Detect Claude Desktop running state and adjust monitoring accordingly

#### FR2: Automatic Recovery
- **FR2.1**: Restart failed mcp-use bridges within 10 seconds of detection
- **FR2.2**: Implement exponential backoff (1s, 2s, 4s, 8s, max 60s) for repeated failures
- **FR2.3**: Validate successful restart before marking service as healthy
- **FR2.4**: Log all restart events with detailed context and reasoning
- **FR2.5**: Escalate to manual intervention after 5 consecutive restart failures

#### FR3: Web Dashboard
- **FR3.1**: Display real-time status grid with color-coded health indicators
- **FR3.2**: Show last successful check timestamp and current uptime for each server
- **FR3.3**: Provide manual restart controls for individual and bulk operations
- **FR3.4**: Display usage statistics with interactive charts and graphs
- **FR3.5**: Include searchable, filterable log viewer with real-time updates

#### FR4: Analytics and Reporting
- **FR4.1**: Track tool usage frequency and success rates per MCP server
- **FR4.2**: Generate performance reports with trend analysis
- **FR4.3**: Identify peak usage patterns and performance bottlenecks
- **FR4.4**: Export usage data in CSV format for external analysis
- **FR4.5**: Provide API endpoints for integration with external monitoring systems

#### FR5: Logging and Alerting
- **FR5.1**: Generate structured JSON logs with configurable verbosity levels
- **FR5.2**: Implement log rotation with configurable size and time-based policies
- **FR5.3**: Provide configurable alerting thresholds for critical events
- **FR5.4**: Support multiple notification channels (email, webhook, desktop)
- **FR5.5**: Maintain audit trail of all administrative actions

### Non-Functional Requirements

#### NFR1: Performance
- **NFR1.1**: Health checks must complete within 5 seconds per server
- **NFR1.2**: Dashboard must load within 2 seconds and update in real-time
- **NFR1.3**: Service restart operations must complete within 15 seconds
- **NFR1.4**: Support monitoring up to 20 concurrent MCP servers
- **NFR1.5**: Minimal resource footprint (<100MB RAM, <5% CPU during normal operation)

#### NFR2: Reliability
- **NFR2.1**: Watcher service must have 99.9% uptime when Claude Desktop is running
- **NFR2.2**: Automatic recovery success rate must exceed 95%
- **NFR2.3**: Service must gracefully handle network interruptions and worker cold starts
- **NFR2.4**: No data loss during service restarts or system shutdown
- **NFR2.5**: Resilient to configuration errors with fallback defaults

#### NFR3: Usability
- **NFR3.1**: Dashboard must be intuitive for non-technical users
- **NFR3.2**: Configuration changes must be possible without service restart
- **NFR3.3**: Clear visual indicators for all system states and transitions
- **NFR3.4**: Comprehensive help documentation and tooltips
- **NFR3.5**: Mobile-responsive design for dashboard access

#### NFR4: Security
- **NFR4.1**: Web interface must require authentication (configurable)
- **NFR4.2**: API endpoints must validate all input parameters
- **NFR4.3**: Sensitive configuration data must be encrypted at rest
- **NFR4.4**: Audit logs for all administrative actions
- **NFR4.5**: Rate limiting on API endpoints to prevent abuse

## Implementation Phases

### Phase 1: Core Monitoring (Week 1-2)
- Basic health check engine
- mcp-use process monitoring
- Simple restart mechanism
- Basic logging infrastructure
- CLI interface for testing

### Phase 2: Web Dashboard (Week 3-4)
- React-based dashboard UI
- Real-time status display
- Manual control interface
- Basic usage statistics
- RESTful API backend

### Phase 3: Advanced Features (Week 5-6)
- Usage analytics and reporting
- Advanced alerting system
- Configuration management UI
- Performance optimization
- Comprehensive testing

### Phase 4: Polish and Documentation (Week 7)
- User documentation
- Installation automation
- Performance tuning
- Security hardening
- Production deployment guide

## Success Metrics

### Reliability Metrics
- **Uptime**: >99.9% availability of MCP services while Claude Desktop is running
- **Recovery Time**: <15 seconds average time to restore failed services
- **False Positive Rate**: <2% incorrect failure detections
- **Manual Intervention**: <5% of failures require manual intervention

### Performance Metrics
- **Health Check Latency**: <1 second average response time
- **Dashboard Load Time**: <2 seconds initial load
- **Resource Usage**: <100MB RAM, <5% CPU during normal operation
- **Concurrent Monitoring**: Support 20+ MCP servers simultaneously

### User Experience Metrics
- **Dashboard Usability**: >4.5/5 user satisfaction rating
- **Issue Resolution**: >90% of issues self-resolved through dashboard
- **Configuration Ease**: <10 minutes to configure new MCP server monitoring
- **Documentation Clarity**: >95% successful self-service setup rate

## Deployment and Operations

### Installation Requirements
- Python 3.9+ with pip
- Node.js 16+ and npm (for dashboard)
- 512MB available RAM
- 1GB available disk space
- Network access to Cloudflare Workers

### Configuration Management
- YAML-based configuration files
- Environment variable overrides
- Hot reload capability
- Configuration validation on startup
- Backup and restore functionality

### Monitoring and Maintenance
- Self-monitoring capabilities with health endpoints
- Automated log rotation and cleanup
- Configuration backup automation
- Update notification system
- Performance monitoring dashboards

## Risk Assessment

### Technical Risks
- **Risk**: SSE connection instability affecting monitoring accuracy
  - **Mitigation**: Multiple health check methods, fallback strategies
- **Risk**: Resource exhaustion under high load
  - **Mitigation**: Resource limits, monitoring thresholds, graceful degradation
- **Risk**: Configuration errors causing service disruption
  - **Mitigation**: Configuration validation, rollback capability, safe defaults

### Operational Risks
- **Risk**: False positive alerts causing unnecessary restarts
  - **Mitigation**: Multiple confirmation checks, configurable thresholds
- **Risk**: Monitoring service becoming single point of failure
  - **Mitigation**: Self-monitoring, automatic restart, manual override capabilities
- **Risk**: Security vulnerabilities in web dashboard
  - **Mitigation**: Authentication, input validation, security auditing

## Future Enhancements

### Version 2.0 Features
- Distributed monitoring across multiple machines
- Integration with external monitoring systems (Prometheus, Grafana)
- Advanced machine learning for failure prediction
- Mobile app for remote monitoring and control
- Slack/Teams integration for notifications

### Enterprise Features
- Multi-tenant support for multiple Claude Desktop instances
- Advanced RBAC (Role-Based Access Control)
- Enterprise SSO integration
- SLA monitoring and reporting
- Professional support and maintenance

## Conclusion

The MCP Watcher Service will transform the reliability and observability of the travel agent system's MCP infrastructure. By providing proactive monitoring, automatic recovery, and comprehensive insights, it will ensure that travel agents can rely on Claude's capabilities without interruption while providing administrators with the tools they need to maintain optimal system performance.

The phased implementation approach ensures rapid delivery of core value while allowing for iterative improvement based on user feedback and operational experience. The comprehensive metrics and monitoring capabilities will provide clear evidence of the service's effectiveness and guide future enhancements.
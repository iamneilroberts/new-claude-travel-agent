---
task_id: T01_S01
sprint_id: S01
milestone_id: M02
name: Diagnose MCP Connectivity Issues
status: pending
priority: critical
estimated_hours: 2
actual_hours: 0
dependencies: []
---

# T01_S01: Diagnose MCP Connectivity Issues

## Objective
Identify and document the root cause of why basic-memory MCP tools are not accessible in Claude Code.

## Scope
- Investigate current Claude Code MCP configuration
- Check basic-memory MCP server status and deployment
- Analyze MCP tool discovery and availability
- Document specific error messages and connectivity issues

## Investigation Areas

### 1. Claude Code MCP Configuration
- Check `.claude/settings.local.json` for basic-memory configuration
- Verify MCP server connection parameters
- Compare with working MCP servers (e.g., D1 database)

### 2. Basic-Memory MCP Server Status
- Verify basic-memory MCP server is running/deployed
- Check server health and endpoints
- Test MCP protocol compliance

### 3. Tool Discovery Process
- Analyze how Claude Code discovers MCP tools
- Check for tool registration issues
- Verify JSON schema compatibility

### 4. Network and Transport Issues  
- Test connectivity to MCP server endpoints
- Check for authentication/authorization problems
- Verify transport protocol (STDIO vs HTTP vs SSE)

## Diagnostic Steps

### Step 1: Configuration Analysis
```bash
# Check Claude Code MCP settings
cat ~/.claude/settings.local.json

# Look for basic-memory server configuration
grep -r "basic-memory" ~/.claude/
```

### Step 2: Server Health Check
```bash
# Check if basic-memory MCP server is running
ps aux | grep basic-memory

# Test server endpoints if HTTP-based
curl [server-endpoint]/health
```

### Step 3: MCP Tool Testing
```bash
# Test MCP tools directly if possible
npx mcp-client [basic-memory-endpoint]
```

### Step 4: Log Analysis
```bash
# Check Claude Code logs for MCP errors
tail -f ~/.claude/logs/
```

## Expected Findings

### Possible Issues
1. **Missing Configuration**: basic-memory not configured in Claude Code MCP settings
2. **Server Down**: MCP server not running or deployed
3. **Wrong Protocol**: Using incorrect transport method (STDIO vs HTTP)
4. **Schema Issues**: Tool definitions not compatible with Claude Code
5. **Authentication**: Missing or incorrect authentication credentials

### Success Indicators
- Clear identification of connectivity issue root cause
- Documented error messages and symptoms
- Understanding of current vs required configuration
- Actionable next steps for resolution

## Acceptance Criteria
- [ ] Current Claude Code MCP configuration documented
- [ ] Basic-memory MCP server status verified
- [ ] Root cause of connectivity issues identified
- [ ] Specific error messages and logs captured
- [ ] Comparison with working MCP servers completed
- [ ] Action items for resolution documented

## Deliverables
1. **Diagnosis Report**: Complete analysis of connectivity issues
2. **Configuration Comparison**: Current vs working MCP server configs
3. **Error Log Summary**: Key error messages and symptoms
4. **Resolution Roadmap**: Next steps to fix connectivity

## Tools and Resources
- Claude Code configuration files
- Basic-memory MCP server codebase
- MCP protocol documentation
- D1 MCP server (as working reference)
- Network testing tools (curl, netstat, etc.)
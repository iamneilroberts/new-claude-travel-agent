# MCP Watcher Service

A local Node.js service for monitoring and managing Cloudflare Worker MCP servers to handle timeout issues and provide resilient operation execution.

## 🚨 Problem Solved

Cloudflare Workers have strict resource limitations:
- **10ms CPU time** on free tier
- **30-second execution time** maximum
- **Ephemeral execution** with no persistent state

These limitations cause MCP server timeouts during complex operations, leading to cascade failures in Claude Desktop.

## ✅ Solution: Ephemeral-Friendly Design

The MCP Watcher Service provides:

1. **Health Monitoring** - Continuous health checks of all MCP servers
2. **Automatic Retry** - Intelligent retry logic with exponential backoff
3. **Operation Chunking** - Breaking large operations into smaller pieces
4. **Fallback Execution** - Direct execution when retry fails
5. **Database Caching** - Intermediate results stored in local SQLite
6. **Diagnostic Tools** - CLI tools for troubleshooting and data cleanup

## 🛠 Installation

```bash
cd /home/neil/dev/new-claude-travel-agent/mcp-watcher-service
npm install
npm run build
```

## 🚀 Usage

### Start the Watcher Service

```bash
npm start
```

This starts the background service that monitors all MCP servers every 10 seconds.

### CLI Commands

```bash
# Check status of all MCP servers
npm run cli status

# Test a specific operation with retry logic
npm run cli test d1-database search_clients '{"client_name": "Chisholm"}'

# Test hotel search with automatic retry
npm run cli test amadeus-api search_hotels '{"city": "Paris", "check_in": "2024-12-01", "check_out": "2024-12-05"}'

# Show help
npm run cli help
```

### Integration with Existing Code

```javascript
const { EnhancedMCPUseBridge } = require('./dist/mcp-use-bridge');

const bridge = new EnhancedMCPUseBridge();
await bridge.initialize();

// Execute with automatic retry and health checking
const result = await bridge.executeTool('d1-database', 'search_clients', {
  client_name: 'Chisholm'
});

// Execute with chunking for large operations
const chunkedResult = await bridge.executeChunkedOperation(
  'amadeus-api', 
  'search_flights', 
  searchParams,
  10 // chunk size
);

// Get health status
const health = await bridge.getHealthStatus();

// Diagnose specific issues
const diagnosis = await bridge.diagnoseChisholmIssue();
```

## 📊 Monitoring

The service maintains a local SQLite database (`watcher.db`) with:

- **Server Status**: Real-time health of each MCP server
- **Operation History**: All operations with retry attempts and results
- **Performance Metrics**: Response times and failure rates

## 🔧 Configuration

Edit `src/config.ts` to:

- Add/remove MCP servers
- Adjust timeout thresholds
- Configure retry policies
- Set health check intervals

## 🧪 Testing

```bash
# Run basic tests
npm test

# Test chunked operations
node test-watcher.js chunked
```

## 🔍 Diagnostic Features

### Chisholm Data Issue Diagnosis

Based on the previous MCP failures, the service includes specific diagnostic tools:

```bash
npm run cli test d1-database search_clients '{"client_name": "Chisholm"}'
```

This will:
1. Search for all Chisholm client records
2. Check for duplicate trips
3. Identify incomplete data from failed operations
4. Provide cleanup recommendations

## 🏗 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Claude Desktop │    │ MCP Watcher     │    │ Cloudflare      │
│                 │───▶│ Service         │───▶│ Workers         │
│                 │    │ (Local Node.js) │    │ (Remote MCPs)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │
                               ▼
                       ┌─────────────────┐
                       │ SQLite Database │
                       │ (Local Cache)   │
                       └─────────────────┘
```

## 🔄 Recovery Strategies

1. **Immediate Retry** - For transient network issues
2. **Exponential Backoff** - For server overload scenarios  
3. **Operation Chunking** - For complex operations that exceed time limits
4. **Direct Fallback** - Bypass watcher for simple operations
5. **Manual Recovery** - CLI tools for data cleanup and diagnosis

## 📝 Logs

Service logs include:
- Health check results every 10 seconds
- Operation retry attempts
- Server degradation warnings
- Recovery action summaries

Example output:
```
🔍 Monitoring 6 MCP servers
📊 Health Summary: 5 healthy, 1 degraded, 0 down
⚠️  amadeus-api.search_hotels failed (attempt 1/3): timeout
✅ amadeus-api.search_hotels succeeded on retry (attempt 2/3)
```
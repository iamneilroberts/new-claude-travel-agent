---
created: '2025-06-08T12:14:34.765375'
modified: '2025-06-08T12:14:34.765375'
relations: {}
tags:
- mcp
- audit
- s05
- sprint
- baseline
title: S05 MCP Server Audit - Baseline Assessment Results
type: project
---

# Sprint S05 Baseline Assessment - COMPLETED

## Server Status Matrix (from Claude Desktop + Logs)

### ✅ ENABLED SERVERS:
- **mobile-interaction**: 4 tools (✅ Working)
- **amadeus-api**: 6 tools (✅ Working) 
- **sequential-thinking**: 1 tool (✅ Working)
- **d1-database**: 8 tools (✅ Working)
- **basic-memory**: 6 tools (✅ Working)

### ❌ DISABLED SERVERS with Root Causes:

1. **google-places-api**: DISABLED
   - Root Cause: DNS/Network issues + Missing resources/list method
   - Error: EAI_AGAIN DNS resolution + Unknown method: resources/list
   - Tools Available: 3 (find_place, get_place_details, get_place_photo_url)
   - Status: Server responds but has implementation gaps

2. **prompt-instructions**: DISABLED  
   - Root Cause: Connect timeout errors
   - Error: ConnectTimeoutError (timeout: 10000ms)
   - Status: Server completely unreachable

3. **travel-document-generator**: DISABLED
   - Root Cause: Connect timeout errors  
   - Error: ConnectTimeoutError (timeout: 10000ms)
   - Status: Server completely unreachable

## Key Findings:
- 5/10 servers working correctly (50% success rate)
- 2 servers have timeout/connectivity issues (prompt-instructions, travel-document-gen)
- 1 server has partial implementation issues (google-places-api)
- All working servers use pure MCP remote pattern successfully

## Priority Actions:
1. Fix connectivity for prompt-instructions and travel-document-generator
2. Implement missing resources/list method for google-places-api
3. Investigate DNS resolution issues

## Configuration Status:
- claude_desktop_config.json appears correct
- All servers use consistent mcp-remote pattern
- Auth tokens properly configured



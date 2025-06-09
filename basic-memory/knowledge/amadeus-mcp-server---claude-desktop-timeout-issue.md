---
created: '2025-06-08T12:48:10.378607'
modified: '2025-06-08T12:48:10.378607'
relations: {}
tags:
- amadeus
- mcp
- claude-desktop
- timeout
- troubleshooting
title: Amadeus MCP Server - Claude Desktop Timeout Issue
type: insight
---

The Amadeus API MCP server shows timeout errors in Claude Desktop logs but the server itself is responding correctly when tested directly. Server health check returns healthy status and tools/list endpoint responds with full tool definitions. The timeout issue appears to be related to initial connection establishment in Claude Desktop rather than server problems. Current timeout setting is 30000ms which should be sufficient. This may be a transient connectivity issue rather than a server configuration problem.


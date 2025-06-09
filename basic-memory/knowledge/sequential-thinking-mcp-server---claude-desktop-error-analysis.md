---
created: '2025-06-08T12:47:21.169257'
modified: '2025-06-08T12:47:21.169257'
relations: {}
tags:
- mcp
- sequential-thinking
- claude-desktop
- troubleshooting
title: Sequential Thinking MCP Server - Claude Desktop Error Analysis
type: insight
---

The sequential-thinking MCP server appears to have startup problems in Claude Desktop, but upon investigation, the server is working correctly. The errors seen in logs are actually normal behavior where Claude Desktop probes for resources/list and prompts/list methods that this server doesn't implement. The sequential_thinking tool should work despite error messages in logs.


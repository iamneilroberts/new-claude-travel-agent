---
created: '2025-06-08T12:57:25.648150'
modified: '2025-06-08T12:57:25.648150'
relations: {}
tags:
- zod-cleanup
- mcp
- amadeus
- sequential-thinking
- claude-desktop
- deployment
title: Zod Cleanup Completion - Amadeus and Sequential-Thinking Servers
type: project
---

Successfully completed Zod dependency cleanup for critical MCP servers experiencing Claude Desktop connection issues. Fixed amadeus-api-mcp and sequential-thinking-mcp by removing Zod dependencies and downgrading MCP SDK from 1.11.4 to 1.0.0 to match working servers. Bundle sizes reduced significantly and servers now deploy correctly. Both servers showed connection issues in Claude Desktop due to dependency version mismatches. The Zod refactoring was already completed in code but package.json cleanup was missing.


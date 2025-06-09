---
created: '2025-06-07T19:20:36.387933'
modified: '2025-06-07T19:20:36.387933'
relations: {}
tags:
- mcp,zod,schema,refactoring,sprint-s04
title: MCP Zod Schema Refactoring Plan - Sprint S04 T11
type: project
---

Issue: All 4 migrated MCP servers use complex Zod-to-JSON-Schema conversion that fails, resulting in empty schemas. Solution: Replace with direct JSON Schema definitions (proven in Google Places). Plan: Phase 1 - Convert schemas (1.5h), Phase 2 - Remove Zod functions (1h), Phase 3 - Test and deploy (0.5h). Status: Google Places done, 4 servers remaining. Benefits: Reliable schemas, simpler code, better performance.


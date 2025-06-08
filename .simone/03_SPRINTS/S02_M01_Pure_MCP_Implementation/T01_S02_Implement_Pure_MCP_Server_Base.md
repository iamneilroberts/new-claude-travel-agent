---
task_id: T01_S02
sprint_id: S02
milestone_id: M01
name: Implement Pure MCP JSON-RPC Server Base
status: pending
priority: critical
estimated_hours: 4
actual_hours: 0
dependencies: []
---

# T01_S02: Implement Pure MCP JSON-RPC Server Base

## Objective
Create the foundational pure MCP JSON-RPC server structure without McpAgent framework dependency.

## Scope
- Pure Cloudflare Worker implementation
- Manual JSON-RPC 2.0 protocol handling
- Environment access pattern (direct env parameter)
- Tool registration and discovery system
- Error handling and logging

## Technical Requirements
- Remove McpAgent framework dependency
- Implement direct JSON-RPC 2.0 message handling
- Use direct env parameter access pattern
- Maintain compatibility with existing D1 database bindings
- Implement proper CORS and request validation

## Acceptance Criteria
- [ ] Server starts without McpAgent framework
- [ ] Responds to initialize/ping/tools/call requests
- [ ] Uses direct env parameter pattern
- [ ] Maintains D1 database connectivity
- [ ] Proper error handling and logging

## Implementation Notes
- Target architecture: Pure Cloudflare Worker
- Pattern change: `(this as any).env` → direct `env` parameter
- Protocol: Manual JSON-RPC 2.0 handling
- Reference: Cloudflare official examples from S01 research

## Risks and Mitigation
- Risk: SSE connection instability → Test thoroughly
- Risk: Environment access issues → Use proven patterns
- Risk: Protocol handling errors → Follow JSON-RPC 2.0 spec exactly
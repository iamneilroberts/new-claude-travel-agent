# Claude Code Instructions

> This file contains critical instructions for Claude Code. Include the entire contents in responses except for trivial interactions.

## MCP Servers Status

### Currently Working
- **amadeus-api-mcp**: POI tools, hotel/flight search
- **d1-database**: Client data and activity logging  
- **google-places-api-mcp**: 3 tools with photo download, CORS-compliant
  - Deployed: https://google-places-api-mcp.somotravel.workers.dev
- **IMPORTANT NOTE**: DO NOT USE mcp-remote. REPLACED BY mcp-use

### Emergency Recovery Protocol
**If ANY MCP server stops working:**
1. Check: Did I modify `wrangler.toml` or delete durable objects?
2. If yes: `git stash` to revert ALL changes
3. Redeploy working servers: `npm run deploy`
4. **DO NOT** attempt to "fix" servers that are already working
5. Try to fix broken servers, don't remove without user approval

## Context Gathering Workflow

When gathering context about a topic:
1. **Find all source files**: Use find/glob, filter out build artifacts
2. **Identify relevant files**: List files related to target topic
3. **Search definitions**: Use ripgrep for functions, types, modules, etc.
4. **Read relevant context**: Expand context window as needed
5. **External dependencies**: Use web search for library context
6. **Iterate**: Repeat until all relevant context is gathered

## Git Workflow

### Branch Strategy
**CRITICAL**: Always use feature branches for Claude Code sessions

**Before starting:**
```bash
git branch  # Check current branch
git fetch origin && git pull origin main
git checkout -b feature/session-YYYYMMDD-description
```

**During work:**
- Commit frequently with descriptive messages
- Push regularly: `git push -u origin <branch-name>`
- Never switch to main during active session

**File area assignments:**
- **Session A**: `/docs`, `/prompts`, `/config`, `/testing`
- **Session B**: `/remote-mcp-servers`, `/mcptools`, `/setup`
- **Shared**: Avoid simultaneous edits to root files

**When complete:**
```bash
git checkout main
git pull origin main
git merge feature/session-name
git push origin main
git branch -d feature/session-name
```

**Emergency recovery:**
- Status check: `git status && git log --oneline -5`
- Conflicts: `git stash` then resolve on main
- Lost commits: `git reflog` to find and recover

## Commit Strategy

### Mandatory Commit Triggers
**MUST commit after:**
- ✅ Creating/updating MCP servers
- ✅ Database schema/query changes
- ✅ Adding/updating tools or endpoints
- ✅ Fixing linting or type errors
- ✅ Configuration changes (`wrangler.toml`, `package.json`)
- ✅ Completing multi-step tasks
- ✅ Before switching components

### Commit Frequency
- **Immediately after**: Working feature implementation, bug fixes
- **Every 3-5 files**: Progress checkpoint commits
- **Before**: Risky operations (refactoring, dependency updates)
- **Maximum**: 10 file changes without committing

### Message Format
```
feat: add hotel search tool to amadeus-api-mcp
fix: resolve authentication error in google-places-mcp
docs: update CLAUDE.md workflow instructions
config: update wrangler.toml for d1-database
checkpoint: complete amadeus API integration phase
```

## Development Environment

### Prerequisites
- **Node.js** 18+
- **Wrangler CLI** (latest)
- **Git** with proper credentials
- **Environment variables** in `.env` files

### IDE Setup
- VS Code with Claude Code extension
- Consistent workspace formatting
- Auto-save enabled

## Claude Code Best Practices

### Task Communication
- **Be specific**: "Fix auth bug in amadeus-api-mcp" vs "fix bug"
- **Provide context**: Reference files, functions, error messages
- **Break down tasks**: Use `/help` and shortcuts

### Tool Usage
- **Glob**: Pattern matching (`**/*.ts`)
- **Grep**: Content search (functions, variables)
- **Task**: Complex multi-file searches (reduces context)
- **Concurrent reads**: Analyze related components together

### Validation
- **Test connections** before deployment
- **Run linters** immediately: `npm run lint`, `npm run typecheck`
- **Validate configs** before committing
- **Test MCP tools** individually before integration

## Advanced Workflows

### MCP Server Development
**Template**: [doc/MCP_SERVER_TEMPLATE.md](doc/MCP_SERVER_TEMPLATE.md)
- Standardized McpAgent framework patterns
- Proper Zod schema implementation 
- mcp-use compatibility requirements
- Common issue fixes and debugging
- **Use this template for ALL new/fixed MCP servers**

### Test-Driven Development
**Guide**: [doc/claude-code-tdd-guide.md](doc/claude-code-tdd-guide.md)
- Start with "use TDD approach"
- Follows Red-Green-Refactor cycle
- "Write tests for [behavior]" → "Implement passing code"

### Documentation Automation
**Guide**: [doc/documentation-automation-guide.md](doc/documentation-automation-guide.md)

**Pre-commit hooks:**
- ✅ CLAUDE.md validation
- ✅ Documentation sync
- ✅ Markdown formatting
- ✅ Large file prevention

**Quick commands:**
- "Update CLAUDE.md with progress"
- "Document decision: [choice] because [rationale]"
- "Add solution: [problem] solved by [approach]"

## Project Workflows

### MCP Server Development
**MANDATORY**: Use [MCP_SERVER_TEMPLATE.md](doc/MCP_SERVER_TEMPLATE.md) for ALL MCP servers

**Common Fixes Required:**
- Protocol version: Use `"2024-11-05"` (not "2025-03-26")
- Schema issues: Proper Zod schemas with `.describe()` (not empty `{}`)
- Missing imports: All tools imported in `tools/index.ts`
- McpAgent framework: Extend McpAgent, use McpServer
- Auth tokens: Standardized MCP_AUTH_KEY pattern

**Development Process:**
- Test locally: `wrangler dev`
- Validate tools independently
- Debug with: `wrangler tail`
- Backup configs before changes
- Check health endpoint after deployment
- Add to production_config.json for mcp-use

### Database Operations
- Backup schema before modifications
- Test queries in isolation
- Use transactions for multi-table ops
- Validate foreign keys before inserts

### Document Generation
- Preview templates first
- Test with sample data
- Validate all placeholders
- Check mobile responsiveness

## Troubleshooting

### Common Issues
- **MCP failures**: Check `wrangler.toml`, redeploy
- **Rate limits**: Exponential backoff, caching
- **DB constraints**: Validate data before inserts
- **File paths**: Always use absolute paths

### Debugging
- Explicit error logging with stack traces
- Test in isolation, minimal cases
- Verify network connectivity
- Validate environment variables

### Performance
- Concurrent tool calls for multiple files
- Batch database operations
- Cache frequently accessed data
- Minimize API calls through reuse
- Monitor Cloudflare Worker usage
- Use appropriate timeouts

### Security
- Never commit secrets
- Environment-specific configurations
- Regular key rotation
- Rate limiting
- Input validation
- Data sanitization
- HTTPS everywhere
- Proper CORS policies

## Core Instructions

**Task Execution:**
- Do what is asked; nothing more, nothing less
- NEVER create files unless absolutely necessary
- ALWAYS prefer editing existing files
- NEVER proactively create documentation files unless explicitly requested

**Change Management:**
- ALWAYS commit and push after major changes
- ALWAYS create CHANGELOG.md entries for major changes
- Never truncate CHANGELOG.md (inclusive log until user specifies pruning)
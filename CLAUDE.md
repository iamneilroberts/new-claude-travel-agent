# Claude Code Instructions

> This file contains critical instructions for Claude Code. Include the entire contents in responses except for trivial interactions.

## Claude Code Definitions
- "claude-code" means you (claude) running as a terminal based coding assistant
- "basic-memory" = the basic-memory MCP server (same thing, use interchangeably)

## 🧠 Basic Memory System - CRITICAL FOR ALL SESSIONS!
**MANDATORY: USE THIS MCP TO ACCESS STORED PROJECT KNOWLEDGE**

The **basic-memory MCP server** is your primary knowledge source. It contains:
- Project configurations and secrets
- MCP server setup instructions  
- Troubleshooting guides
- Implementation patterns
- Previous session insights

### MCP Tools Available:
- `mcp__basic-memory__search_notes` - Search all stored knowledge
- `mcp__basic-memory__read_note` - Read specific note by ID
- `mcp__basic-memory__recent_activity` - Get recent activity
- `mcp__basic-memory__write_note` - Store new knowledge
- `mcp__basic-memory__project_info` - Get project overview

### 🚨 CRITICAL WORKFLOW - START EVERY SESSION:
1. **ALWAYS** run `mcp__basic-memory__search_notes` for relevant topics FIRST
2. **NEVER** ask user for project details without checking basic-memory
3. **ALWAYS** consult project `.env` file for real API keys/credentials
4. **NEVER** use mock/placeholder data - use real values from `.env`

### Common searches to run:
- Search "configuration" - Config info and API keys
- Search "mcp setup" - MCP server setup procedures
- Search "claude-code" - Claude Code specific instructions
- Search "troubleshooting" - Known issues and solutions
- Search "environment" - .env file and secrets management

### ⚠️ Security & Configuration Protocol:
- **ALWAYS check `/home/neil/dev/new-claude-travel-agent/.env`** for real credentials
- **NEVER create config files with secrets in git repo**
- **USE real API keys** from project .env, not placeholders
- **ADD sensitive files to .gitignore immediately**

**BASIC-MEMORY IS YOUR KNOWLEDGE BASE - USE IT!**

## 🎯 Claude-Simone Project Management Framework

### Overview
**claude-simone** is a structured project management framework designed for complex multi-phase projects. It provides sprint-based planning, task tracking, and milestone management.

**Repository**: https://github.com/Helmi/claude-simone
**Location**: `.simone/` directory in project root

### Framework Structure
```
.simone/
├── 01_PROJECT/           # Project overview and goals
├── 02_MILESTONES/        # Major project milestones  
├── 03_SPRINTS/           # Sprint-based execution
│   ├── S01_M01_*/        # Sprint 1, Milestone 1
│   ├── S02_M01_*/        # Sprint 2, Milestone 1
│   └── S03_M01_*/        # Sprint 3, Milestone 1
└── 04_RESOURCES/         # Shared resources and templates
```

### When to Use Claude-Simone
Use the Simone framework for:
- **Complex multi-phase projects** (3+ weeks of work)
- **Cross-system migrations** (like MCP server migrations)
- **Major architectural changes** requiring careful planning
- **Projects with multiple stakeholders** or dependencies
- **Research → Implementation → Deployment** workflows

### Sprint Planning Process
1. **Research Phase** (S01): Analyze current state, research solutions
2. **Implementation Phase** (S02): Build and test core functionality  
3. **Deployment Phase** (S03): Deploy, integrate, and validate
4. **Mass Migration Phase** (S04): Apply proven patterns at scale

### File Structure and Naming
- **Sprint Meta**: `S[XX]_sprint_meta.md` - Sprint overview and goals
- **Tasks**: `T[XX]_S[XX]_[TaskName].md` - Individual sprint tasks
- **Milestones**: `M[XX]_milestone_meta.md` - Milestone tracking

### Creating New Sprints/Tasks
Use manual file creation in `.simone/03_SPRINTS/` following existing patterns:

```bash
# Create new sprint directory
mkdir -p ".simone/03_SPRINTS/S04_M01_Mass_MCP_Migration"

# Create sprint meta file
# Create individual task files following T[XX]_S[XX]_[TaskName].md pattern
```

### Integration with Basic-Memory
- **Document sprint completions** in basic-memory for future reference
- **Search previous sprints** before starting new ones
- **Cross-reference** Simone tasks with basic-memory insights

### Current Project Status
- ✅ **S01**: D1 MCP Research and Planning - COMPLETED
- ✅ **S02**: Pure MCP Implementation - COMPLETED  
- ✅ **S03**: Deployment and Integration - COMPLETED
- 🟡 **S04**: Mass MCP Migration - READY TO START

### Best Practices
- **Start with sprint meta file** defining goals and success criteria
- **Break large tasks** into 2-4 hour chunks
- **Track dependencies** between tasks and sprints
- **Document lessons learned** for future sprints
- **Use consistent naming** for easy navigation

## 📝 Automatic Memory Updates - WHEN TO ADD NOTES

### 🎯 THREE DISTINCT MEMORY SCENARIOS

#### 1. **User-Requested Documentation** (Immediate Action)
- User explicitly says "remember this" or uses shortcuts (`/note`, `/idea`, `/decision`)
- **Tool**: `mcp__basic-memory__write_note`
- **Purpose**: Preserve user-specified knowledge and insights

#### 2. **Claude Code Auto-Documentation** (Significant Accomplishments)
- Major features, complex solutions, successful deployments, architectural decisions
- **Tool**: `mcp__basic-memory__write_note` 
- **Purpose**: Document significant work for future reference
- **Examples**: Setting up new frameworks, solving complex bugs, major integrations

#### 3. **Session Context Management** (`/compact` - NO ACTION REQUIRED)
- **DO NOT** use `mcp__basic-memory__add_compact_summary` for `/compact` commands
- **Reason**: External daemon monitors Claude conversations and automatically processes `/compact` summaries
- **Claude Code Role**: Only create `/compact` summaries for context management, don't store them

### 🚨 WHEN TO USE `write_note` (Claude Code Auto-Documentation):
1. **After significant accomplishments** - Document major features, fixes, or insights
2. **When user asks to "remember this"** - Explicitly requested memory storage  
3. **After successful deployments** - Record deployment details and status
4. **When solving complex problems** - Save solutions for future reference
5. **After major configuration changes** - Document setup/config for reproducibility
6. **Architectural decisions** - Document choices and reasoning
7. **New tool/framework setup** - Record setup process and lessons learned

### ⚠️ DO NOT use `write_note` for:
- Routine file reads or simple questions
- Temporary debugging or exploration  
- User explicitly says "don't save this"
- Trivial changes or minor tweaks
- `/compact` summaries (handled by external daemon)

### 🚫 NEVER USE `add_compact_summary`:
- This tool is reserved for external daemons that monitor conversation storage
- Claude Code should NOT call `mcp__basic-memory__add_compact_summary`
- `/compact` summaries are for context management only, not documentation

### Basic-Memory Tools Available:
- **For Documentation**: Use Bash tool with basic-memory CLI
- **For Searching**: `mcp__basic-memory__search_notes` - Search existing notes
- **For Reading**: `mcp__basic-memory__read_note` - Read specific note by ID

### ⚠️ IMPORTANT: basic-memory uses CLI interface, NOT MCP tools for writing

### Example Usage:
```bash
# For significant accomplishments or user requests - use Bash tool with QUIET MODE
python basic_memory.py --quiet create "Title Here" "Content here..." --type project --tags tag1 tag2

# For searching existing knowledge - use MCP tool
mcp__basic-memory__search_notes {
  "query": "simone framework migration"
}

# For reading specific notes - use MCP tool  
mcp__basic-memory__read_note {
  "noteId": "note-id-here"
}
```

### 🚨 CRITICAL: Always Use --quiet Flag for CLI Operations
**MANDATORY**: When using basic-memory CLI commands through Bash tool, ALWAYS include `--quiet` flag to prevent terminal flooding and API timeouts:

```bash
# ✅ CORRECT - Prevents terminal flooding
python basic_memory.py --quiet create "Title" "Content" --type project

# ❌ WRONG - Causes verbose output that floods terminal and triggers timeouts
python basic_memory.py create "Title" "Content" --type project
```

The `--quiet` flag:
- Suppresses all non-essential output (confirmations, verbose listings)
- Prevents Claude API timeouts caused by excessive terminal output
- Still allows essential output (note content from read commands)
- Returns minimal data for programmatic use (note IDs only for search/list)

### CLI Documentation Workflow:
1. **Search first**: Use `mcp__basic-memory__search_notes` to check existing knowledge
2. **Document with CLI**: Use Bash + `python basic_memory.py create` for new notes
3. **Reference later**: Use `mcp__basic-memory__read_note` to retrieve stored knowledge

## 🚀 Quick Note Shortcuts & Enhancement System

### 📝 Quick Note Commands
When user uses these shortcuts, automatically expand and save to basic-memory:

#### `/note [brief description]`
- **Purpose**: General notes and observations
- **Type**: "insight" 
- **Action**: Expand with context from current session and related project knowledge

#### `/idea [brief idea]`
- **Purpose**: Feature ideas and future development concepts
- **Type**: "concept"
- **Action**: Expand with implementation considerations, related features, and development timeline estimates

#### `/link [url] [brief description]`
- **Purpose**: Reference links and external resources
- **Type**: "reference"
- **Action**: Fetch page title, summarize content relevance, categorize by project area

#### `/decision [brief decision]`
- **Purpose**: Important architectural or implementation decisions
- **Type**: "decision" (new type)
- **Action**: Document reasoning, alternatives considered, impact assessment

#### `/todo [task description]`
- **Purpose**: Future tasks and action items
- **Type**: "todo" (new type)
- **Action**: Expand with implementation steps, priority assessment, related components

#### `/fix [problem description]`
- **Purpose**: Document solutions to problems for future reference
- **Type**: "solution" (new type)
- **Action**: Include symptoms, root cause, solution steps, prevention measures

### 🎯 Note Enhancement Protocol
When processing quick notes, ALWAYS:

1. **Add Context**: Include current session context, related files, recent changes
2. **Cross-Reference**: Search existing notes for related content and link them
3. **Categorize**: Assign appropriate type and suggest tags
4. **Expand Details**: Add implementation considerations, challenges, next steps
5. **Timestamp**: Include when the note was created and in what context

### 📊 Extended Note Types
Beyond the existing types (entity, project, concept, reference, insight, general), add:

- **🎯 decision**: Architectural and implementation decisions
- **📋 todo**: Future tasks and action items  
- **🔧 solution**: Problem solutions and troubleshooting
- **🔗 link**: External references and bookmarks
- **💭 idea**: Feature ideas and concepts for development
- **🏷️ resource**: Tools, libraries, and development resources

### 🏷️ Automatic Tagging System
When creating/updating notes, automatically suggest tags based on:
- **Technology**: "mcp", "oauth", "typescript", "cloudflare", etc.
- **Component**: "amadeus", "basic-memory", "web-interface", etc.
- **Priority**: "urgent", "nice-to-have", "future", etc.
- **Status**: "completed", "in-progress", "planned", "blocked", etc.

### 🔍 Enhanced Auto-Documentation Triggers
In addition to existing triggers, also auto-document when:

1. **Making API integrations** - Document endpoints, authentication, rate limits
2. **Solving bugs** - Create solution notes with symptoms and fixes
3. **Creating new components** - Document purpose, dependencies, usage
4. **Performance optimizations** - Record metrics before/after, methodology
5. **Security implementations** - Document security measures and considerations
6. **User workflow discoveries** - Note improved processes and shortcuts
7. **Integration patterns** - Document successful patterns for future use

### 📋 Note Template Expansion Examples

**Example `/idea` expansion:**
```markdown
# Feature Idea: [Original Brief Idea]

## Concept
[Expanded description with technical details]

## Implementation Considerations
- Technical requirements
- Dependencies and integrations
- Estimated complexity: [Low/Medium/High]

## Related Features
[Cross-references to existing functionality]

## Development Timeline
- Phase 1: [Core functionality]
- Phase 2: [Enhancements]

Tags: idea, [relevant tech tags], priority-[level]
```

**Example `/decision` expansion:**
```markdown
# Architectural Decision: [Brief Decision]

## Context
[Current session context and problem being solved]

## Decision
[Detailed decision and rationale]

## Alternatives Considered
- Option A: [pros/cons]
- Option B: [pros/cons]

## Impact Assessment
- Affects: [components/systems]
- Benefits: [list]
- Risks: [list]

## Implementation Notes
[Technical details and next steps]

Tags: decision, architecture, [affected components]
```

## 🔧 MCP Server Development & Integration

### Current Architecture
The project uses **officially supported MCP patterns** following Anthropic's recommended practices:

- **Native MCP Protocol**: Direct JSON-RPC over stdio/SSE following MCP specification
- **Standard Libraries**: Using `@modelcontextprotocol/sdk-typescript` for robust implementations
- **Claude Desktop Integration**: Official MCP configuration via `claude_desktop_config.json`
- **Local Development**: Claude Code testing via `.claude/settings.local.json`

### MCP Server Categories

#### Production Travel Servers
- **amadeus-api-mcp** - Flight/hotel search, POI recommendations
- **google-places-api-mcp** - Place search, photo downloads, reviews
- **d1-database-mcp** - Client data, activity logging, database operations
- **r2-storage-mcp** - Image gallery, file storage, presigned URLs
- **template-document-mcp** - Travel documents (itineraries, checklists, budgets)

#### Communication & Integration
- **mobile-interaction-mcp** - WhatsApp, Telegram, SMS integration
- **prompt-instructions-mcp** - Dynamic instructions, mode detection
- **sequential-thinking-mcp** - Step-by-step reasoning chains

### Development Guidelines
- **Follow MCP Standards**: Use official TypeScript SDK and patterns
- **Real Data Only**: No mock/placeholder data in production implementations
- **Environment Variables**: Use `.env` for credentials, never commit secrets
- **Testing**: Test with both Claude Desktop and Claude Code configurations
- **Documentation**: Maintain deployment guides and API documentation

### Configuration Management
- **Claude Desktop**: `~/.config/Claude/claude_desktop_config.json`
- **Claude Code**: `.claude/settings.local.json`
- **Environment**: Project `.env` file for API keys and credentials
- **Templates**: Reference `/doc/MCP_SERVER_TEMPLATE.md` for new servers

### Additional MCP Servers Available
**Cloudflare MCP Server**
- **Installation**: Globally installed at `/usr/local/lib/node_modules/@cloudflare/mcp-server-cloudflare/`
- **Executable**: `/usr/local/lib/node_modules/@cloudflare/mcp-server-cloudflare/dist/index.js`
- **Account ID**: `5c2997e723bf93da998a627e799cd443`
- **Tools**: KV, R2, D1, Workers, Durable Objects, Queues, Workers AI management
- **Authentication**: Uses existing Wrangler auth

**Browserbase MCP Server**
- **Installation**: Local at `/home/neil/dev/new-claude-travel-agent/mcp-server-browserbase/browserbase/`
- **Executable**: `/home/neil/dev/new-claude-travel-agent/mcp-server-browserbase/browserbase/cli.js`
- **Tools**: Browser automation, web scraping, screenshots, form filling
- **Credentials**: ✅ Added to .env (API key: bb_live_hJLBDt2edGv-ld0eBVNgoNlF-Go, Project ID: c78f3700-e7d7-4792-af8b-271d5b738062)

**MCP Omnisearch Server**
- **Installation**: Local at `/home/neil/dev/new-claude-travel-agent/mcp-omnisearch-claude-code/`
- **Executable**: `/home/neil/dev/new-claude-travel-agent/mcp-omnisearch-claude-code/dist/index.js`
- **Tools**: Tavily, Brave, Kagi search; Perplexity AI; Kagi summarizer & enrichment
- **Credentials**: ✅ All major providers configured from .env

**WhatsApp MCP Server**
- **Installation**: Partial at `/home/neil/dev/new-claude-travel-agent/whatsapp-mcp/`
- **Architecture**: Go bridge + Python MCP server (dual process)
- **Requirements**: Go (needs fixing), UV ✅, QR code authentication
- **Status**: 🟡 Repository cloned, needs dependency completion

Ready servers can be added to `.claude/settings.local.json` when needed.

### Repository Management
- Don't allow embedded git repository. Warn the user and exclude the offending sub-repository
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

[... rest of the existing content remains the same ...]

### 🚨 CRITICAL MEMORY - FILE HANDLING INSTRUCTIONS
- NEVER delete files without specific instructions. Rename them or save in a backup or obsolete folder.
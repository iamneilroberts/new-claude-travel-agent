# Travel Agent Project Memory Bank

This directory contains automatically generated documentation about your project's evolution, maintained by git hooks and session tracking.

## Files:

- **activeContext.md** - Real-time log of changes as you work
- **progress.md** - Categorized history of features, fixes, and improvements  
- **systemPatterns.md** - MCP server changes and architecture decisions
- **techContext.md** - Database schema changes and technical updates
- **sessions.md** - Summary of work sessions when you push to GitHub

## Commands:

- `claude-start` - Begin a new session (logs to activeContext.md)
- `claude-end` - End session and save documentation
- `project-status` - Quick overview of uncommitted/unpushed work
- `smart-commit` - Get personalized commit suggestions
- `gs` / `gc` / `gcp` - Git shortcuts with automatic documentation

## How It Works:

Every time you commit, git hooks automatically:
1. Categorize your commit (fix/feature/docs/etc.) 
2. Track which files changed
3. Update relevant documentation files
4. Remind you about unpushed commits
5. Detect MCP server or database changes

This gives you a living history of your project's development without manual note-taking!
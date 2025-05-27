# Documentation Directory

This directory contains comprehensive documentation for the Claude Travel Agent project.

## Available Guides

### Development Workflows
- **[claude-code-tdd-guide.md](claude-code-tdd-guide.md)** - Complete guide to Test-Driven Development with Claude Code
- **[documentation-automation-guide.md](documentation-automation-guide.md)** - Documentation automation and context management strategies

### Project Documentation
- **[SYSTEM_DESCRIPTION.md](SYSTEM_DESCRIPTION.md)** - Overall system architecture and component descriptions
- **[MCP_MIGRATION_GUIDE.md](MCP_MIGRATION_GUIDE.md)** - Guide for migrating and managing MCP servers

## Quick Reference

### Using TDD with Claude Code
Start any feature request with "use TDD approach" to automatically follow the Red-Green-Refactor cycle.

### Documentation Automation
The project uses pre-commit hooks to automatically validate and sync documentation. See the automation guide for details.

### Pre-commit Setup
Pre-commit hooks are configured to:
- Validate CLAUDE.md structure
- Sync documentation with code changes  
- Check markdown formatting
- Prevent large file commits

## Related Documentation

Other documentation can be found in:
- `/prompts/` - System prompts and instructions
- `/features/` - Feature-specific documentation
- `/testing/` - Testing procedures and results
- `/setup/` - Initial setup guides
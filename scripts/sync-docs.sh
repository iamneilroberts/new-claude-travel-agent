#!/bin/bash

# Sync documentation with codebase changes
# This script updates documentation based on recent changes

set -e

echo "Syncing documentation with codebase changes..."

# Get list of modified files from git
MODIFIED_FILES=$(git diff --cached --name-only 2>/dev/null || echo "")

if [ -z "$MODIFIED_FILES" ]; then
    echo "No staged changes found, skipping documentation sync"
    exit 0
fi

echo "Modified files detected:"
echo "$MODIFIED_FILES"

# Check if MCP servers were modified
if echo "$MODIFIED_FILES" | grep -q "remote-mcp-servers/"; then
    echo "MCP server changes detected - consider updating CLAUDE.md deployment status"
fi

# Check if package.json or dependencies were modified
if echo "$MODIFIED_FILES" | grep -q "package\.json\|package-lock\.json\|yarn\.lock\|pnpm-lock\.yaml"; then
    echo "Dependency changes detected - consider updating CLAUDE.md with new commands or setup instructions"
fi

# Check if test files were added/modified
if echo "$MODIFIED_FILES" | grep -q "\.test\.\|\.spec\.\|test/\|tests/"; then
    echo "Test files modified - ensure test commands in CLAUDE.md are up to date"
fi

# Check if configuration files were modified
if echo "$MODIFIED_FILES" | grep -q "wrangler\.toml\|\.env\|config/"; then
    echo "Configuration changes detected - update CLAUDE.md if deployment or setup procedures changed"
fi

# Update timestamp in CLAUDE.md if it has a status section
if grep -q "## Current Development Status" CLAUDE.md 2>/dev/null; then
    echo "Updating development status timestamp in CLAUDE.md"
    sed -i "s/## Current Development Status - .*/## Current Development Status - $(date +%Y-%m-%d)/" CLAUDE.md 2>/dev/null || true
fi

echo "Documentation sync completed"

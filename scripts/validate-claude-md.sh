#!/bin/bash

# Validate CLAUDE.md structure and content
# This script checks for proper markdown formatting and required sections

set -e

CLAUDE_MD_FILE="CLAUDE.md"

echo "Validating CLAUDE.md structure..."

# Check if file exists
if [ ! -f "$CLAUDE_MD_FILE" ]; then
    echo "Error: CLAUDE.md file not found"
    exit 1
fi

# Check for required sections
required_sections=(
    "## Remote MCP Server Fix Memory"
    "## GitHub Workflow for Parallel Claude Code Sessions"
    "## Automatic Commit Strategy"
    "## Claude Code Best Practices"
)

for section in "${required_sections[@]}"; do
    if ! grep -q "$section" "$CLAUDE_MD_FILE"; then
        echo "Warning: Missing required section: $section"
    fi
done

# Check markdown syntax (basic validation)
if command -v markdownlint >/dev/null 2>&1; then
    markdownlint "$CLAUDE_MD_FILE" || echo "Warning: Markdown linting issues found"
else
    echo "Info: markdownlint not found, skipping syntax validation"
fi

# Check for TODOs or FIXME markers that shouldn't be committed
if grep -q "TODO\|FIXME\|XXX" "$CLAUDE_MD_FILE"; then
    echo "Warning: Found TODO/FIXME markers in CLAUDE.md - consider resolving before commit"
fi

echo "CLAUDE.md validation completed"

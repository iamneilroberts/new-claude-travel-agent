---
description: Interactively recover from API timeout by analyzing recent sessions
allowed-tools:
  - Bash
  - Read
  - Write
  - Grep
  - Task
  - LS
---

# 🚨 SESSION RECOVERY COMMAND ACTIVATED 🚨

This is the `/crash-recover` slash command analyzing your Claude Code chat history.

---

## Session Recovery Assistant

● Analyzing recent Claude sessions to help recover from interruptions...

## Current Environment

- **Working Directory**: `!pwd`
- **Current Branch**: `!git branch --show-current 2>/dev/null || echo "Not a git repo"`
- **Uncommitted Changes**:
```
!git status --short 2>/dev/null | head -5 || echo "Not a git repository"
```

## Analyzing Sessions

!cd /home/neil/dev/new-claude-travel-agent && npx tsx .claude/scripts/session-recovery-analyzer.ts $ARGUMENTS

$ARGUMENTS
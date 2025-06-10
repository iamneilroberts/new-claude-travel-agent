#!/bin/bash
# Travel Assistant Shortcuts
# Add these to your ~/.bashrc or ~/.zshrc

# Quick travel mode initialization
alias travel="echo 'travel mode - autonomous mobile lead processing'"
alias travelmode="echo 'initialize travel assistant with mobile-mode detection'"
alias interactive="echo 'initialize travel assistant with interactive-mode detection'"

# Email processing shortcuts
alias emails="echo 'process travel emails from claude-travel-agent label'"
alias chisholm="echo 'search for Chisholm European Vacation 2025 trip details'"

# Claude Desktop shortcuts
alias claude-travel="open -a 'Claude' && echo 'travel mode'"
alias claude-mobile="open -a 'Claude' && echo '[MOBILE] new lead processing'"

# Copy travel initialization to clipboard (macOS)
alias travel-init="echo 'initialize_travel_assistant with first_message: travel mode' | pbcopy"
alias mobile-init="echo 'initialize_travel_assistant with first_message: [MOBILE] lead processing' | pbcopy"

# Memory Bank / ActiveContext browsing shortcuts
alias recent='tail -20 memory-bank/activeContext.md'
alias status='head -10 memory-bank/activeContext.md'
alias context='cat memory-bank/activeContext.md && echo "\n=== Current Git Status ===" && git status'
alias today='grep "$(date +%Y-%m-%d)" memory-bank/activeContext.md'
alias commits-week='grep "$(date -d "7 days ago" +%Y-%m-%d)" memory-bank/activeContext.md -A 1000'
alias commits-month='grep "$(date -d "30 days ago" +%Y-%m-%d)" memory-bank/activeContext.md -A 1000'
alias sessions='grep "Claude Session" memory-bank/activeContext.md | tail -10'
alias full-status='echo "=== Current Focus ===" && head -10 memory-bank/activeContext.md && echo "\n=== Recent Activity ===" && tail -10 memory-bank/activeContext.md && echo "\n=== Git Status ===" && git status'
alias edit-context='${EDITOR:-nano} memory-bank/activeContext.md'
alias focus='grep -A 5 "Current Focus" memory-bank/activeContext.md'

echo "Travel shortcuts loaded!"
echo "Usage: travel, travelmode, interactive, emails, chisholm"
echo "Memory: recent, status, context, today, sessions, full-status, focus"

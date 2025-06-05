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

echo "Travel shortcuts loaded!"
echo "Usage: travel, travelmode, interactive, emails, chisholm"
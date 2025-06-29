#!/bin/bash
# Claude Travel Agent Installer for Mac/Linux

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🌍 Claude Travel Agent Installer"
echo "================================"

# Check prerequisites
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 is not installed${NC}"
        return 1
    else
        echo -e "${GREEN}✅ $1 is installed${NC}"
        return 0
    fi
}

echo -e "\n${YELLOW}Checking prerequisites...${NC}"
MISSING_DEPS=0

check_command "node" || MISSING_DEPS=1
check_command "npm" || MISSING_DEPS=1

# Docker is optional
if check_command "docker"; then
    echo -e "${GREEN}✅ Docker found - local automation will be available${NC}"
    USE_DOCKER=1
else
    echo -e "${YELLOW}⚠️  Docker not found - remote services only${NC}"
    USE_DOCKER=0
fi

if [ $MISSING_DEPS -eq 1 ]; then
    echo -e "\n${RED}Please install missing dependencies first:${NC}"
    echo "- Node.js: https://nodejs.org/"
    exit 1
fi

# Check if Claude Desktop is installed
CLAUDE_CONFIG_DIR=""
if [ -d "$HOME/.config/Claude" ]; then
    CLAUDE_CONFIG_DIR="$HOME/.config/Claude"
elif [ -d "$HOME/Library/Application Support/Claude" ]; then
    CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
else
    echo -e "${YELLOW}⚠️  Claude Desktop config directory not found${NC}"
    echo "Please ensure Claude Desktop is installed"
    read -p "Enter Claude config directory path (or press Enter to use ~/.config/Claude): " CUSTOM_PATH
    CLAUDE_CONFIG_DIR="${CUSTOM_PATH:-$HOME/.config/Claude}"
    mkdir -p "$CLAUDE_CONFIG_DIR"
fi

echo -e "${GREEN}✅ Using Claude config directory: $CLAUDE_CONFIG_DIR${NC}"

# Get configuration details
echo -e "\n${YELLOW}Configuration Setup${NC}"
echo "You'll need:"
echo "1. Your Cloudflare Worker URL (e.g., travel-agent.YOUR-DOMAIN.workers.dev)"
echo "2. Your MCP authentication token"
echo ""
read -p "Enter your Cloudflare Worker domain (without https://): " WORKER_DOMAIN
read -p "Enter your MCP auth token: " AUTH_TOKEN

# Create configuration
echo -e "\n${YELLOW}Creating Claude Desktop configuration...${NC}"

if [ $USE_DOCKER -eq 1 ]; then
    # Full config with Docker
    cat > "$CLAUDE_CONFIG_DIR/claude_desktop_config.json" << EOF
{
  "mcpServers": {
    "travel-agent-remote": {
      "command": "npx",
      "args": ["mcp-use", "https://${WORKER_DOMAIN}"],
      "env": {
        "MCP_USE_AUTH_TOKEN": "${AUTH_TOKEN}"
      }
    },
    "cpmaxx-local": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "--pull", "missing",
        "ghcr.io/iamneilroberts/claude-travel/mcp-cpmaxx-unified:latest"
      ]
    }
  }
}
EOF
else
    # Remote only config
    cat > "$CLAUDE_CONFIG_DIR/claude_desktop_config.json" << EOF
{
  "mcpServers": {
    "travel-agent-remote": {
      "command": "npx",
      "args": ["mcp-use", "https://${WORKER_DOMAIN}"],
      "env": {
        "MCP_USE_AUTH_TOKEN": "${AUTH_TOKEN}"
      }
    }
  }
}
EOF
fi

# Test connection
echo -e "\n${YELLOW}Testing connection...${NC}"
npx mcp-use test "https://${WORKER_DOMAIN}" --token "${AUTH_TOKEN}" 2>/dev/null && {
    echo -e "${GREEN}✅ Connection successful!${NC}"
} || {
    echo -e "${YELLOW}⚠️  Could not verify connection. Please check your credentials after restarting Claude.${NC}"
}

# Success message
echo -e "\n${GREEN}🎉 Installation complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Restart Claude Desktop"
echo "2. Look for 'travel-agent-remote' in the MCP tools"
echo "3. Try asking: 'Search for flights from NYC to Paris next week'"
echo ""
echo "Configuration saved to: $CLAUDE_CONFIG_DIR/claude_desktop_config.json"

if [ $USE_DOCKER -eq 1 ]; then
    echo ""
    echo "Docker container will be downloaded on first use of local automation tools."
fi
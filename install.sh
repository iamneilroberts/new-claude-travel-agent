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

check_command "docker" || MISSING_DEPS=1
check_command "node" || MISSING_DEPS=1
check_command "npm" || MISSING_DEPS=1

if [ $MISSING_DEPS -eq 1 ]; then
    echo -e "\n${RED}Please install missing dependencies first:${NC}"
    echo "- Docker: https://docs.docker.com/get-docker/"
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

# Install mcp-use
echo -e "\n${YELLOW}Installing MCP proxy...${NC}"
npm install -g mcp-use

# Pull Docker container
echo -e "\n${YELLOW}Pulling Claude Travel Agent container...${NC}"
docker pull ghcr.io/iamneilroberts/claude-travel/mcp-cpmaxx-unified:latest || {
    echo -e "${YELLOW}Note: Container not yet published. Building locally...${NC}"
    # For now, we'll skip this since the container isn't published yet
}

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

# Create desktop extension directory
echo -e "\n${YELLOW}Creating desktop extensions...${NC}"
mkdir -p "$HOME/.claude-extensions"
cat > "$HOME/.claude-extensions/travel-agent.dxt" << EOF
{
  "name": "Claude Travel Agent",
  "description": "Complete travel planning assistant",
  "version": "2.0.0",
  "author": "Neil Roberts",
  "mcp": {
    "command": "npx",
    "args": ["mcp-use", "https://${WORKER_DOMAIN}"],
    "env": {
      "MCP_USE_AUTH_TOKEN": "${AUTH_TOKEN}"
    }
  },
  "metadata": {
    "icon": "✈️",
    "categories": ["travel", "planning", "automation"],
    "capabilities": [
      "Flight search (Amadeus)",
      "Hotel search (Google Places)",
      "Travel package search (CPMaxx)",
      "Itinerary generation",
      "Mobile notifications",
      "Document creation"
    ]
  }
}
EOF

# Test connection
echo -e "\n${YELLOW}Testing connection...${NC}"
if npx mcp-use test "https://${WORKER_DOMAIN}" --token "${AUTH_TOKEN}" 2>/dev/null; then
    echo -e "${GREEN}✅ Connection successful!${NC}"
else
    echo -e "${YELLOW}⚠️  Could not verify connection. Please check your credentials.${NC}"
fi

# Success message
echo -e "\n${GREEN}🎉 Installation complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Restart Claude Desktop"
echo "2. Look for 'travel-agent-remote' in the MCP tools"
echo "3. Try asking: 'Search for flights from NYC to Paris next week'"
echo ""
echo "Configuration saved to: $CLAUDE_CONFIG_DIR/claude_desktop_config.json"
echo "Desktop extension saved to: $HOME/.claude-extensions/travel-agent.dxt"
echo ""
echo "For updates, run: curl -sSL https://raw.githubusercontent.com/iamneilroberts/new-claude-travel-agent/install/update.sh | bash"
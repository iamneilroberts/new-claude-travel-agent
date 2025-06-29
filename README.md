# Claude Travel Agent - Quick Install

The easiest way to install Claude Travel Agent on any computer in under 2 minutes!

## 🚀 One-Line Installation

### Mac/Linux:
```bash
curl -sSL https://raw.githubusercontent.com/iamneilroberts/new-claude-travel-agent/install/install.sh | bash
```

### Windows PowerShell (as Administrator):
```powershell
iwr -useb https://raw.githubusercontent.com/iamneilroberts/new-claude-travel-agent/install/install.ps1 | iex
```

## 📋 Prerequisites

- [Claude Desktop](https://claude.ai/download)
- [Docker Desktop](https://docs.docker.com/get-docker/)
- [Node.js](https://nodejs.org/) (v18 or higher)

## 🔧 Manual Installation

If you prefer to install manually:

1. Clone just the install branch:
```bash
git clone -b install --depth 1 https://github.com/iamneilroberts/new-claude-travel-agent.git
cd new-claude-travel-agent
```

2. Run the installer:
```bash
# Mac/Linux
./install.sh

# Windows
.\install.ps1
```

## 📦 What Gets Installed?

- **MCP proxy** (`mcp-use`) - For connecting to remote services
- **Configuration files** - Automatically configured for Claude Desktop
- **Docker container** - Pre-built Chrome automation environment
- **Desktop extension** - Optional .dxt file for new Claude Desktop features

Total download: ~200MB (mostly the Docker container)

## 🔑 You'll Need

During installation, you'll be asked for:
1. Your Cloudflare Worker URL (provided by admin)
2. Your authentication token (provided by admin)

## 🎯 Features

Once installed, you'll have access to:
- ✈️ Flight search and booking (Amadeus)
- 🏨 Hotel recommendations (Google Places)
- 📦 Package deals (American, Delta, etc.)
- 📱 Mobile notifications (SMS/WhatsApp)
- 📄 Document generation (itineraries, packing lists)
- 💾 Personal travel history
- 🎯 Smart recommendations

## 🔄 Updates

To update to the latest version:

```bash
# Mac/Linux
curl -sSL https://raw.githubusercontent.com/iamneilroberts/new-claude-travel-agent/install/update.sh | bash

# Windows
iwr -useb https://raw.githubusercontent.com/iamneilroberts/new-claude-travel-agent/install/update.ps1 | iex
```

## ❓ Troubleshooting

If you encounter issues:

1. Ensure all prerequisites are installed
2. Check Docker is running: `docker --version`
3. Verify Node.js: `node --version`
4. Restart Claude Desktop after installation

## 📞 Support

- Issues: [GitHub Issues](https://github.com/iamneilroberts/new-claude-travel-agent/issues)
- Documentation: [Main Branch](https://github.com/iamneilroberts/new-claude-travel-agent)

---

*This is the minimal install branch. For development, use the main branch.*
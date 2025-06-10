#!/bin/bash
# CPMaxx Integration MCP Local Server Startup Script
# This script starts the CPMaxx MCP server with browser automation locally

echo "🚀 Starting CPMaxx Integration MCP Local Server..."
echo "📁 Working directory: $(pwd)"
echo "🔧 Building TypeScript..."

# Build the project
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix TypeScript errors and try again."
    exit 1
fi

echo "✅ Build successful"
echo "🌐 Starting local MCP server with browser automation..."
echo "📝 Server will run on STDIO for Claude Desktop integration"
echo ""
echo "🔐 Environment variables being used:"
echo "   CP_CENTRAL_LOGIN: ${CP_CENTRAL_LOGIN:-'[not set]'}"
echo "   CP_CENTRAL_PASSWORD: ${CP_CENTRAL_PASSWORD:-'[not set]'}"
echo "   CPMAXX_BASE_URL: ${CPMAXX_BASE_URL:-'https://cpmaxx.cruiseplannersnet.com'}"
echo ""
echo "⚠️  Note: CPMaxx credentials are required for hotel search functionality"
echo "    Set CP_CENTRAL_LOGIN and CP_CENTRAL_PASSWORD environment variables"
echo "    or configure them in your shell profile"
echo ""
echo "🔧 Available tools:"
echo "   • search_hotels - Real browser automation hotel search"
echo "   • download_hotel_photos - Extract hotel photos"
echo "   • test_browser_automation - Test automation with visible browser"
echo ""
echo "📱 To use with Claude Desktop, add this server to your config:"
echo '   "cpmaxx-local": {'
echo '     "command": "node",'
echo '     "args": ["'$(pwd)'/dist/local-server.js"],'
echo '     "cwd": "'$(pwd)'"'
echo '   }'
echo ""
echo "🎬 Starting server now..."
echo "----------------------------------------"

# Start the server
node dist/local-server-standalone.js
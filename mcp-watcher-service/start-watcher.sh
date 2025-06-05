#!/bin/bash

echo "🔍 Starting MCP Watcher Service..."

cd "$(dirname "$0")"

# Build if needed
if [ ! -d "dist" ] || [ "src" -nt "dist" ]; then
    echo "📦 Building service..."
    npm run build
fi

# Start the service
echo "🚀 Starting watcher service on http://localhost:8888"
npm start
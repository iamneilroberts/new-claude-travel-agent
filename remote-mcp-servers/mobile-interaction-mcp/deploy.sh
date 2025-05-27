#!/bin/bash

# Mobile Interaction MCP Deployment Script
# This script sets up Cloudflare resources and deploys the worker

echo "🚀 Deploying Mobile Interaction MCP..."

# Check if wrangler is logged in
if ! wrangler whoami &>/dev/null; then
    echo "❌ Please login to Wrangler first: wrangler auth login"
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    echo "📁 Loading environment variables from .env"
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ .env file not found. Please create one from .env.example"
    exit 1
fi

# Create KV namespace for conversation state
echo "🗄️ Creating KV namespace for conversation state..."
KV_OUTPUT=$(wrangler kv:namespace create "CONVERSATION_STATE" --preview false 2>/dev/null)
if [ $? -eq 0 ]; then
    KV_ID=$(echo "$KV_OUTPUT" | grep -o 'id = "[^"]*"' | cut -d'"' -f2)
    echo "✅ KV namespace created: $KV_ID"

    # Update wrangler.toml with KV ID
    sed -i "s/id = \"conversation-state-namespace-id\"/id = \"$KV_ID\"/" wrangler.toml
    echo "✅ Updated wrangler.toml with KV namespace ID"
else
    echo "⚠️ KV namespace may already exist, continuing..."
fi

# Create KV namespace preview
echo "🗄️ Creating KV namespace preview..."
KV_PREVIEW_OUTPUT=$(wrangler kv:namespace create "CONVERSATION_STATE" --preview true 2>/dev/null)
if [ $? -eq 0 ]; then
    KV_PREVIEW_ID=$(echo "$KV_PREVIEW_OUTPUT" | grep -o 'id = "[^"]*"' | cut -d'"' -f2)
    echo "✅ KV preview namespace created: $KV_PREVIEW_ID"

    # Update wrangler.toml with preview KV ID
    sed -i "s/preview_id = \"conversation-state-preview-id\"/preview_id = \"$KV_PREVIEW_ID\"/" wrangler.toml
    echo "✅ Updated wrangler.toml with KV preview namespace ID"
fi

# Use existing D1 database (shared with other travel MCPs)
echo "🗃️ Using existing D1 database 'travel-assistant-db'..."
DB_LIST=$(wrangler d1 list 2>/dev/null)
if echo "$DB_LIST" | grep -q "travel-assistant-db"; then
    echo "✅ D1 database 'travel-assistant-db' found and configured"
else
    echo "❌ D1 database 'travel-assistant-db' not found. Please ensure your main travel database is set up."
    echo "💡 You may need to run deployment from the d1-mcp-server directory first."
    exit 1
fi

# Set environment variables in Cloudflare
echo "🔐 Setting environment variables..."

if [ ! -z "$TELEGRAM_BOT_TOKEN" ]; then
    wrangler secret put TELEGRAM_BOT_TOKEN --text "$TELEGRAM_BOT_TOKEN" >/dev/null 2>&1
    echo "✅ Set TELEGRAM_BOT_TOKEN"
fi

if [ ! -z "$WHATSAPP_API_TOKEN" ]; then
    wrangler secret put WHATSAPP_API_TOKEN --text "$WHATSAPP_API_TOKEN" >/dev/null 2>&1
    echo "✅ Set WHATSAPP_API_TOKEN"
fi

if [ ! -z "$TWILIO_ACCOUNT_SID" ]; then
    wrangler secret put TWILIO_ACCOUNT_SID --text "$TWILIO_ACCOUNT_SID" >/dev/null 2>&1
    echo "✅ Set TWILIO_ACCOUNT_SID"
fi

if [ ! -z "$TWILIO_AUTH_TOKEN" ]; then
    wrangler secret put TWILIO_AUTH_TOKEN --text "$TWILIO_AUTH_TOKEN" >/dev/null 2>&1
    echo "✅ Set TWILIO_AUTH_TOKEN"
fi

if [ ! -z "$OPENAI_API_KEY" ]; then
    wrangler secret put OPENAI_API_KEY --text "$OPENAI_API_KEY" >/dev/null 2>&1
    echo "✅ Set OPENAI_API_KEY"
fi

# Deploy the worker
echo "🚀 Deploying worker..."
if wrangler deploy; then
    echo "✅ Mobile Interaction MCP deployed successfully!"

    # Get worker URL
    WORKER_URL=$(wrangler subdomain get 2>/dev/null | grep -o 'https://[^[:space:]]*workers.dev' | head -1)
    if [ -z "$WORKER_URL" ]; then
        WORKER_URL="https://mobile-interaction-mcp.YOUR-SUBDOMAIN.workers.dev"
    fi

    echo ""
    echo "🎉 Deployment Complete!"
    echo "📍 Worker URL: $WORKER_URL"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Test health endpoint: $WORKER_URL/health"
    echo "2. Set up webhook URLs in platform consoles:"
    if [ ! -z "$TELEGRAM_BOT_TOKEN" ]; then
        echo "   - Telegram: $WORKER_URL/webhook/telegram"
    fi
    if [ ! -z "$WHATSAPP_API_TOKEN" ]; then
        echo "   - WhatsApp: $WORKER_URL/webhook/whatsapp"
    fi
    echo "3. Add to Claude Desktop config:"
    echo "   \"mobile-interaction-mcp\": {"
    echo "     \"command\": \"mcp-use\","
    echo "     \"args\": [\"$WORKER_URL\"]"
    echo "   }"
    echo ""

else
    echo "❌ Deployment failed"
    exit 1
fi

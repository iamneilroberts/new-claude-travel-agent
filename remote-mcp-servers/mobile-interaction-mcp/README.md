# Mobile Interaction MCP

A mobile-optimized MCP server that enables natural language interactions with the travel agent system via WhatsApp, Telegram, and SMS. Built using proven email ingestion patterns from claude-travel-chat project.

## Features

- **Multi-platform support**: WhatsApp Business API, Telegram Bot API, Twilio SMS
- **Natural language processing**: Intent recognition and entity extraction for travel requests
- **Voice message support**: Automatic transcription using OpenAI Whisper
- **Document processing**: Handle travel invoices, confirmations, and itineraries
- **Conversation management**: Stateful interactions with confirmation workflows
- **Database integration**: Direct integration with travel agent D1 database

## MCP Tools

### Core Tools

1. **`process_mobile_message`**: Parse and process incoming mobile messages
2. **`send_mobile_response`**: Send formatted responses to mobile platforms  
3. **`query_trip_info`**: Retrieve trip information from database
4. **`process_voice_message`**: Transcribe and process voice messages

## Architecture

```
Mobile Input → Message Router → Travel Parser → MCP Bridge → Database → Response Generator
```

### Components

- **Message Parser**: Extracts travel intent from natural language (adapted from email parser)
- **Webhook Handlers**: Process platform-specific webhooks (WhatsApp, Telegram, SMS)
- **Response Formatter**: Optimizes responses for each mobile platform
- **Conversation Manager**: Maintains state using Cloudflare KV storage

## Setup

### 1. Environment Variables

Set these in your Cloudflare Worker dashboard:

```bash
# Platform API Keys
WHATSAPP_API_TOKEN=your-whatsapp-business-api-token
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token

# AI Services
OPENAI_API_KEY=your-openai-api-key-for-transcription

# MCP Authentication
MCP_AUTH_KEY=mobile-interaction-mcp-auth-key-2025
```

### 2. Database Configuration

Update `wrangler.toml` with your D1 database ID:

```toml
[[d1_databases]]
binding = "DB"
database_name = "travel-agent-db"
database_id = "your-d1-database-id"
```

### 3. KV Namespace

Create KV namespace for conversation state:

```bash
wrangler kv:namespace create "CONVERSATION_STATE"
```

Update the namespace ID in `wrangler.toml`.

### 4. Deploy

```bash
npm install
npm run deploy
```

## Webhook Setup

### WhatsApp Business API

1. Set webhook URL: `https://your-worker.workers.dev/webhook/whatsapp`
2. Set verify token: Your `MCP_AUTH_KEY` value
3. Subscribe to message events

### Telegram Bot

1. Create bot with @BotFather
2. Set webhook: `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-worker.workers.dev/webhook/telegram`

### Twilio SMS

1. Configure webhook URL in Twilio console: `https://your-worker.workers.dev/webhook/twilio`
2. Set HTTP method to POST

## Usage Examples

### Query Trip Information

**User:** "What time is the Rome to Barcelona flight for the Thompson trip?"

**Response:** "✈️ Flight details for Thompson's trip: BA1234 departing Rome (FCO) at 14:30, arriving Barcelona (BCN) at 16:45 on July 15th."

### Update Booking

**User:** "Change the Barcelona flight to 8:30 PM"

**Response:** "🤔 I can help you change that flight. Do you want me to update Thompson's Barcelona flight from 2:30 PM to 8:30 PM? Reply 'yes' to confirm."

### Process Documents

**User:** "Process this invoice for the Welford trip" [attaches PDF]

**Response:** "✅ I've processed the invoice from Apple Vacations. Updated total cost to $8,823 and added confirmation numbers. The trip details have been updated."

## Integration with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mobile-interaction-mcp": {
      "command": "mcp-use",
      "args": ["https://your-worker.workers.dev"]
    }
  }
}
```

## Development

### Local Testing

```bash
npm run dev
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint:fix
```

## Security Features

- Webhook signature verification for all platforms
- Rate limiting and abuse prevention
- Secure conversation state management
- Audit logging for all operations

## Dependencies

- `@modelcontextprotocol/sdk`: MCP protocol implementation
- `agents`: MCP agent framework (mcp-use compatible)  
- `zod`: Schema validation
- Cloudflare Workers platform (KV, D1, Durable Objects)

## Architecture Benefits

- **Serverless**: Auto-scaling Cloudflare Workers
- **Proven patterns**: Leverages email ingestion parsing logic
- **Multi-modal**: Text, voice, image, and document support
- **Stateful**: Conversation context preservation
- **Mobile-optimized**: Platform-specific response formatting

## Troubleshooting

### Common Issues

1. **Webhook not receiving messages**: Check platform webhook configuration and URL
2. **Database connection errors**: Verify D1 database ID and binding
3. **Authentication failures**: Ensure API tokens are correctly set
4. **Message parsing errors**: Check console logs for parsing failures

### Debug Endpoints

- Health check: `https://your-worker.workers.dev/health`
- MCP status: `https://your-worker.workers.dev/mcp`
- SSE endpoint: `https://your-worker.workers.dev/sse`
# Template Document MCP Server

A Model Context Protocol (MCP) server for generating travel document templates including itineraries, packing lists, budgets, and checklists.

## Features

### Available Tools

1. **generate_itinerary** - Create comprehensive travel itineraries
   - Daily schedules with activities, locations, and costs
   - Flight and accommodation details
   - Travel checklists and notes

2. **generate_packing_list** - Generate personalized packing lists
   - Climate and season-appropriate items
   - Trip type specific recommendations
   - Traveler-specific items (children, infants)
   - Packing tips and strategies

3. **generate_travel_budget** - Create detailed travel budgets
   - Expense categories (flights, accommodation, food, activities)
   - Budget recommendations by travel style
   - Money-saving tips and advice
   - Currency conversion support

4. **generate_travel_checklist** - Time-based travel preparation checklists
   - Tasks organized by timeline (months, weeks, days before)
   - Document verification for all travelers
   - Health, safety, and digital preparations
   - Day-of-departure and return planning

## Deployment

### Prerequisites
- Node.js 18+
- Wrangler CLI
- Cloudflare Workers account

### Setup
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Deploy to Cloudflare Workers
npm run deploy
```

### Local Development
```bash
# Start local development server
npm run dev
```

### Health Check
After deployment, verify the server is running:
```bash
curl https://your-worker-domain.workers.dev/health
```

## MCP Integration

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "template-document": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://your-worker-domain.workers.dev/sse"
      ],
      "env": {
        "MCP_AUTH_TOKEN": "your-auth-token"
      }
    }
  }
}
```

## Usage Examples

### Generate an Itinerary
```typescript
await generate_itinerary({
  title: "Paris Weekend Getaway",
  destination: "Paris, France",
  start_date: "2024-06-15",
  end_date: "2024-06-17",
  travelers: [
    { name: "John Doe", type: "adult" },
    { name: "Jane Doe", type: "adult" }
  ],
  activities: [
    {
      date: "2024-06-15",
      time: "10:00 AM",
      title: "Eiffel Tower Visit",
      location: "Champ de Mars",
      cost: "€25 per person"
    }
  ]
});
```

### Generate a Packing List
```typescript
await generate_packing_list({
  destination: "Tokyo, Japan",
  trip_type: "city",
  duration: 7,
  season: "spring",
  climate: "temperate",
  travelers: [
    { name: "Alice", type: "adult_female" }
  ]
});
```

## Architecture

Built using the McpAgent framework for reliable MCP protocol handling:
- TypeScript for type safety
- Zod for input validation
- Modular tool architecture
- Cloudflare Workers for deployment
- SSE-based MCP communication

## License

MIT License
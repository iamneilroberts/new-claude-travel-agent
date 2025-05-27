// Direct MCP implementation for Template Document MCP Server
// Based on working r2-storage pattern

interface Env {
  MCP_AUTH_KEY: string;
}

async function handleRequest(json: any, env: Env) {
  const { method, id } = json;

  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {
              listChanged: false
            }
          },
          serverInfo: {
            name: 'Template Document MCP',
            version: '1.0.0'
          }
        }
      };

    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: [
            {
              name: 'generate_itinerary',
              description: 'Generate a comprehensive travel itinerary document with flights, accommodation, activities, and checklists',
              input_schema: {
                type: 'object',
                properties: {
                  title: {
                    type: 'string',
                    description: 'Travel itinerary title'
                  },
                  destination: {
                    type: 'string',
                    description: 'Primary destination'
                  },
                  duration_days: {
                    type: 'number',
                    description: 'Trip duration in days'
                  },
                  traveler_count: {
                    type: 'number',
                    description: 'Number of travelers'
                  },
                  budget_range: {
                    type: 'string',
                    enum: ['budget', 'medium', 'luxury'],
                    description: 'Budget category'
                  },
                  interests: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Traveler interests and preferences'
                  },
                  special_requirements: {
                    type: 'string',
                    description: 'Special requirements or notes'
                  }
                },
                required: ['title', 'destination', 'duration_days', 'traveler_count', 'budget_range', 'interests']
              }
            },
            {
              name: 'generate_packing_list',
              description: 'Generate a personalized packing list based on destination, trip type, season, and traveler requirements',
              input_schema: {
                type: 'object',
                properties: {
                  destination: {
                    type: 'string',
                    description: 'Travel destination'
                  },
                  duration_days: {
                    type: 'number',
                    description: 'Trip duration in days'
                  },
                  season: {
                    type: 'string',
                    enum: ['spring', 'summer', 'fall', 'winter'],
                    description: 'Travel season'
                  },
                  trip_type: {
                    type: 'string',
                    enum: ['business', 'leisure', 'adventure', 'cultural'],
                    description: 'Type of trip'
                  },
                  traveler_profile: {
                    type: 'string',
                    enum: ['solo', 'couple', 'family', 'group'],
                    description: 'Traveler profile'
                  },
                  special_activities: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Special activities planned'
                  }
                },
                required: ['destination', 'duration_days', 'season', 'trip_type', 'traveler_profile']
              }
            },
            {
              name: 'generate_travel_budget',
              description: 'Generate a comprehensive travel budget with expense categories, recommendations, and money-saving tips',
              input_schema: {
                type: 'object',
                properties: {
                  destination: {
                    type: 'string',
                    description: 'Travel destination'
                  },
                  duration_days: {
                    type: 'number',
                    description: 'Trip duration in days'
                  },
                  traveler_count: {
                    type: 'number',
                    description: 'Number of travelers'
                  },
                  budget_range: {
                    type: 'string',
                    enum: ['budget', 'medium', 'luxury'],
                    description: 'Budget category'
                  },
                  trip_type: {
                    type: 'string',
                    enum: ['business', 'leisure', 'adventure', 'cultural'],
                    description: 'Type of trip'
                  },
                  include_flights: {
                    type: 'boolean',
                    description: 'Include flight costs'
                  }
                },
                required: ['destination', 'duration_days', 'traveler_count', 'budget_range', 'trip_type']
              }
            },
            {
              name: 'generate_travel_checklist',
              description: 'Generate a comprehensive, time-based travel checklist with all preparations needed before and during travel',
              input_schema: {
                type: 'object',
                properties: {
                  destination: {
                    type: 'string',
                    description: 'Travel destination'
                  },
                  duration_days: {
                    type: 'number',
                    description: 'Trip duration in days'
                  },
                  trip_type: {
                    type: 'string',
                    enum: ['business', 'leisure', 'adventure', 'cultural'],
                    description: 'Type of trip'
                  },
                  departure_date: {
                    type: 'string',
                    description: 'Departure date (YYYY-MM-DD)'
                  },
                  international_travel: {
                    type: 'boolean',
                    description: 'Is this international travel'
                  },
                  special_requirements: {
                    type: 'string',
                    description: 'Special requirements or notes'
                  }
                },
                required: ['destination', 'duration_days', 'trip_type', 'departure_date', 'international_travel']
              }
            }
          ]
        }
      };

    case 'tools/call':
      const { name: toolName, arguments: args } = json.params;

      if (toolName === 'generate_itinerary') {
        try {
          const itinerary = `# ${args.title}

## Trip Overview
- **Destination**: ${args.destination}
- **Duration**: ${args.duration_days} days
- **Travelers**: ${args.traveler_count} ${args.traveler_count === 1 ? 'person' : 'people'}
- **Budget Range**: ${args.budget_range}

## Interests & Preferences
${args.interests.map((interest: string) => `- ${interest}`).join('\n')}

## Sample Daily Activities
${Array.from({length: Math.min(args.duration_days, 7)}, (_, i) => {
  const day = i + 1;
  return `### Day ${day}
- **Morning**: Explore local attractions
- **Afternoon**: ${args.interests[i % args.interests.length]} activities
- **Evening**: Local dining experience`;
}).join('\n\n')}

${args.special_requirements ? `\n## Special Requirements\n${args.special_requirements}` : ''}

## Travel Tips
- Book accommodations in advance
- Check visa requirements
- Pack according to weather forecast
- Keep digital copies of important documents

---
*Generated by Template Document MCP*`;

          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: itinerary
              }]
            }
          };
        } catch (error) {
          console.error('Error generating itinerary:', error);
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32603,
              message: `Error generating itinerary: ${(error as Error).message}`
            }
          };
        }
      }

      if (toolName === 'generate_packing_list') {
        try {
          const packingList = `# Packing List for ${args.destination}

## Trip Details
- **Destination**: ${args.destination}
- **Duration**: ${args.duration_days} days
- **Season**: ${args.season}
- **Trip Type**: ${args.trip_type}
- **Traveler Profile**: ${args.traveler_profile}

## Essential Items

### Clothing
- ${args.duration_days + 1} days of underwear
- ${Math.ceil(args.duration_days / 2)} pairs of socks
- ${args.season === 'summer' ? 'Light, breathable clothing' : 'Warm layers'}
- ${args.season === 'winter' ? 'Heavy jacket, gloves, hat' : 'Light jacket or sweater'}
- Comfortable walking shoes
- ${args.trip_type === 'business' ? 'Business attire' : 'Casual clothing'}

### Personal Care
- Toothbrush and toothpaste
- Shampoo and body wash
- Deodorant
- Any prescription medications
- Sunscreen
- ${args.traveler_profile === 'family' ? 'Baby/child care items if needed' : ''}

### Electronics
- Phone charger
- Camera
- Power bank
- Universal adapter (for international travel)

### Documents
- Passport/ID
- Travel insurance
- Flight/hotel confirmations
- Emergency contact information

${args.special_activities?.length ? `\n### Special Activity Items\n${args.special_activities.map((activity: string) => `- Items for: ${activity}`).join('\n')}` : ''}

## Tips
- Roll clothes to save space
- Pack essentials in carry-on
- Leave room for souvenirs
- Check weather forecast before departure

---
*Generated by Template Document MCP*`;

          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: packingList
              }]
            }
          };
        } catch (error) {
          console.error('Error generating packing list:', error);
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32603,
              message: `Error generating packing list: ${(error as Error).message}`
            }
          };
        }
      }

      if (toolName === 'generate_travel_budget') {
        try {
          const budgetMultiplier = args.budget_range === 'budget' ? 1 : args.budget_range === 'medium' ? 2 : 3;
          const dailyBase = 50 * budgetMultiplier;

          const budget = `# Travel Budget for ${args.destination}

## Trip Overview
- **Destination**: ${args.destination}
- **Duration**: ${args.duration_days} days
- **Travelers**: ${args.traveler_count}
- **Budget Category**: ${args.budget_range}

## Estimated Costs (USD)

### Accommodation
- **Per night**: $${Math.round(dailyBase * 1.5)}
- **Total (${args.duration_days} nights)**: $${Math.round(dailyBase * 1.5 * args.duration_days * args.traveler_count)}

### Meals
- **Per person per day**: $${Math.round(dailyBase * 0.8)}
- **Total**: $${Math.round(dailyBase * 0.8 * args.duration_days * args.traveler_count)}

${args.include_flights ? `### Flights
- **Per person**: $${Math.round(dailyBase * 8)}
- **Total**: $${Math.round(dailyBase * 8 * args.traveler_count)}` : ''}

### Activities & Entertainment
- **Per day**: $${Math.round(dailyBase * 0.6)}
- **Total**: $${Math.round(dailyBase * 0.6 * args.duration_days)}

### Local Transportation
- **Per day**: $${Math.round(dailyBase * 0.3)}
- **Total**: $${Math.round(dailyBase * 0.3 * args.duration_days)}

### Miscellaneous & Souvenirs
- **Total**: $${Math.round(dailyBase * 2)}

## Total Estimated Budget
**$${Math.round(
  (dailyBase * 1.5 * args.duration_days * args.traveler_count) + // accommodation
  (dailyBase * 0.8 * args.duration_days * args.traveler_count) + // meals
  (args.include_flights ? dailyBase * 8 * args.traveler_count : 0) + // flights
  (dailyBase * 0.6 * args.duration_days) + // activities
  (dailyBase * 0.3 * args.duration_days) + // transport
  (dailyBase * 2) // misc
)}**

## Money-Saving Tips
- Book accommodations and flights in advance
- Look for free activities and attractions
- Use public transportation
- Eat at local restaurants
- Consider travel during off-peak seasons

---
*Generated by Template Document MCP*`;

          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: budget
              }]
            }
          };
        } catch (error) {
          console.error('Error generating budget:', error);
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32603,
              message: `Error generating budget: ${(error as Error).message}`
            }
          };
        }
      }

      if (toolName === 'generate_travel_checklist') {
        try {
          const departureDate = new Date(args.departure_date);
          const now = new Date();
          const daysUntilDeparture = Math.ceil((departureDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          const checklist = `# Travel Checklist for ${args.destination}

## Trip Information
- **Destination**: ${args.destination}
- **Duration**: ${args.duration_days} days
- **Departure**: ${args.departure_date}
- **Days until departure**: ${daysUntilDeparture}
- **International travel**: ${args.international_travel ? 'Yes' : 'No'}

## 8+ Weeks Before
- [ ] Research destination and create itinerary
- [ ] Book flights and accommodation
- [ ] Apply for visa/passport if needed (international travel)
- [ ] Check vaccination requirements

## 4-6 Weeks Before
- [ ] Purchase travel insurance
- [ ] Notify bank and credit card companies
- [ ] Research local customs and etiquette
- [ ] Book major tours or activities

## 2-3 Weeks Before
- [ ] Check-in for flights
- [ ] Print or download boarding passes
- [ ] Confirm hotel reservations
- [ ] Pack essential medications
- [ ] Arrange pet/house care if needed

## 1 Week Before
- [ ] Check weather forecast
- [ ] Start packing
- [ ] Charge all electronic devices
- [ ] Get local currency if needed
- [ ] Download offline maps

## Day Before Departure
- [ ] Finish packing
- [ ] Check flight status
- [ ] Set multiple alarms
- [ ] Double-check all documents
- [ ] Prepare carry-on bag

## Day of Departure
- [ ] Final document check
- [ ] Arrive at airport 2-3 hours early (international)
- [ ] Keep boarding pass and ID easily accessible
- [ ] Stay hydrated
- [ ] Enjoy your trip!

${args.international_travel ? `
## International Travel Specific
- [ ] Passport valid for 6+ months
- [ ] Visa obtained if required
- [ ] Travel insurance purchased
- [ ] Vaccination certificates
- [ ] International phone plan or SIM card
- [ ] Power adapter for destination country` : ''}

${args.special_requirements ? `\n## Special Requirements\n${args.special_requirements.split('\n').map((req: string) => `- [ ] ${req}`).join('\n')}` : ''}

---
*Generated by Template Document MCP*`;

          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: checklist
              }]
            }
          };
        } catch (error) {
          console.error('Error generating checklist:', error);
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32603,
              message: `Error generating checklist: ${(error as Error).message}`
            }
          };
        }
      }

      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Unknown tool: ${toolName}`
        }
      };

    default:
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`
        }
      };
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: "ok",
        service: "Template Document MCP",
        version: "1.0.0",
        tools: ["generate_itinerary", "generate_packing_list", "generate_travel_budget", "generate_travel_checklist"],
        timestamp: new Date().toISOString()
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // SSE endpoint - GET for initial connection
    if (url.pathname === '/sse' && request.method === 'GET') {
      // Check authorization
      const authHeader = request.headers.get('Authorization');
      if (env.MCP_AUTH_KEY && authHeader !== `Bearer ${env.MCP_AUTH_KEY}`) {
        return new Response('Unauthorized', { status: 401 });
      }

      // Generate session ID and return endpoint URL
      const sessionId = crypto.randomUUID();
      const endpointUrl = `${url.origin}/sse/message?sessionId=${sessionId}`;

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Send endpoint event
          controller.enqueue(encoder.encode(`event: endpoint\ndata: ${endpointUrl}\n\n`));
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, mcp-session-id',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Expose-Headers': 'mcp-session-id',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    // SSE message endpoint - POST for message handling
    if (url.pathname.startsWith('/sse/message') && request.method === 'POST') {
      // Check authorization
      const authHeader = request.headers.get('Authorization');
      if (env.MCP_AUTH_KEY && authHeader !== `Bearer ${env.MCP_AUTH_KEY}`) {
        return new Response('Unauthorized', { status: 401 });
      }

      try {
        const json = await request.json();
        const response = await handleRequest(json, env);

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            // Send response as SSE message
            controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify(response)}\n\n`));
            controller.close();
          }
        });

        return new Response(stream, {
          status: 202,
          headers: {
            'Content-Type': 'text/event-stream',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, mcp-session-id',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Expose-Headers': 'mcp-session-id',
            'Access-Control-Max-Age': '86400'
          }
        });
      } catch (error) {
        console.error('Error handling request:', error);
        return new Response(JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32700,
            message: 'Parse error'
          }
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({
      error: "Not found",
      available_endpoints: ["/sse", "/health"]
    }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  },
};

import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MobileMessageParser } from "./messageParser.js";
import { MobileMessage, ConversationContext, MobileResponse } from "./tools/index.js";

interface Env {
  MCP_AUTH_KEY: string;
  WHATSAPP_API_TOKEN: string;
  TELEGRAM_BOT_TOKEN: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  OPENAI_API_KEY: string;
  CONVERSATION_STATE: KVNamespace;
  DB: D1Database;
}

export class MobileInteractionMCP extends McpAgent {
  server = new McpServer({
    name: "Mobile Interaction MCP",
    version: "1.0.0",
  });

  private messageParser = new MobileMessageParser();

  async init() {
    const env = this.env as Env;

    try {
      // Process Mobile Message Tool
      this.server.tool(
        'process_mobile_message',
        {
          platform: z.enum(['whatsapp', 'telegram', 'sms', 'email']).describe('The messaging platform the message came from'),
          sender_id: z.string().describe('Unique identifier for the message sender'),
          message_id: z.string().describe('Unique message identifier'),
          content: z.string().describe('The message content text'),
          message_type: z.enum(['text', 'voice', 'image', 'document']).default('text').describe('Type of message content'),
          attachments: z.array(z.object({
            type: z.string(),
            url: z.string(),
            filename: z.string().optional()
          })).optional().describe('Any attachments with the message')
        },
        async (params) => {
          try {
            const message: MobileMessage = {
              platform: params.platform,
              sender_id: params.sender_id,
              message_id: params.message_id,
              content: params.content,
              message_type: params.message_type,
              timestamp: new Date().toISOString(),
              attachments: params.attachments
            };

            // Parse travel intent from message
            const intent = await this.messageParser.parseTravelIntent(message);
            
            // Get or create conversation context
            const conversationId = `${params.platform}_${params.sender_id}`;
            const context = await this.getConversationContext(conversationId, env.CONVERSATION_STATE);
            
            // Process based on intent and generate response
            const response = await this.processIntent(intent, message, context, env);
            
            // Update conversation context
            await this.updateConversationContext(conversationId, context, env.CONVERSATION_STATE);

            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  intent,
                  response,
                  conversation_id: conversationId,
                  processed_at: new Date().toISOString()
                })
              }]
            };
          } catch (error) {
            console.error('Error processing mobile message:', error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ 
                  status: "error", 
                  message: error instanceof Error ? error.message : 'Unknown error processing message'
                })
              }]
            };
          }
        }
      );

      // Send Mobile Response Tool
      this.server.tool(
        'send_mobile_response',
        {
          platform: z.enum(['whatsapp', 'telegram', 'sms']).describe('Target messaging platform'),
          recipient_id: z.string().describe('Recipient identifier'),
          message: z.string().describe('Response message to send'),
          message_type: z.enum(['text', 'image', 'document']).default('text').describe('Type of response'),
          attachments: z.array(z.object({
            type: z.string(),
            url: z.string(),
            title: z.string()
          })).optional().describe('Any attachments to include')
        },
        async (params) => {
          try {
            const result = await this.sendPlatformMessage(params, env);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  status: "sent",
                  platform: params.platform,
                  recipient: params.recipient_id,
                  sent_at: new Date().toISOString(),
                  result
                })
              }]
            };
          } catch (error) {
            console.error('Error sending mobile response:', error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ 
                  status: "error", 
                  message: error instanceof Error ? error.message : 'Failed to send message'
                })
              }]
            };
          }
        }
      );

      // Query Trip Information Tool
      this.server.tool(
        'query_trip_info',
        {
          trip_reference: z.string().optional().describe('Trip ID or reference'),
          client_name: z.string().optional().describe('Client name to search for'),
          date_range: z.object({
            start: z.string(),
            end: z.string()
          }).optional().describe('Date range to search within')
        },
        async (params) => {
          try {
            const tripInfo = await this.queryTripDatabase(params, env.DB);
            return {
              content: [{
                type: "text",
                text: JSON.stringify(tripInfo)
              }]
            };
          } catch (error) {
            console.error('Error querying trip info:', error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ 
                  status: "error", 
                  message: error instanceof Error ? error.message : 'Failed to query trip information'
                })
              }]
            };
          }
        }
      );

      // Process Voice Message Tool
      this.server.tool(
        'process_voice_message',
        {
          audio_url: z.string().describe('URL to the voice message audio file'),
          platform: z.enum(['whatsapp', 'telegram']).describe('Platform the voice message came from'),
          sender_id: z.string().describe('Sender identifier')
        },
        async (params) => {
          try {
            const transcription = await this.messageParser.processVoiceMessage(
              params.audio_url, 
              env.OPENAI_API_KEY
            );
            
            // Process the transcribed text as a regular message
            const message: MobileMessage = {
              platform: params.platform,
              sender_id: params.sender_id,
              message_id: `voice_${Date.now()}`,
              content: transcription,
              message_type: 'voice',
              timestamp: new Date().toISOString()
            };

            const intent = await this.messageParser.parseTravelIntent(message);
            const conversationId = `${params.platform}_${params.sender_id}`;
            const context = await this.getConversationContext(conversationId, env.CONVERSATION_STATE);
            const processResult = await this.processIntent(intent, message, context, env);

            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  transcription,
                  processing_result: processResult
                })
              }]
            };
          } catch (error) {
            console.error('Error processing voice message:', error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ 
                  status: "error", 
                  message: error instanceof Error ? error.message : 'Failed to process voice message'
                })
              }]
            };
          }
        }
      );

      console.log('Registered 4 Mobile Interaction tools');
    } catch (error) {
      console.error('Failed to initialize Mobile Interaction tools:', error);

      // Fallback test tool
      this.server.tool("test_connection", {}, async () => ({
        content: [{
          type: "text",
          text: "Mobile Interaction MCP initialized but some features may be unavailable. Check environment variables."
        }],
        isError: true
      }));
    }
  }

  /**
   * Get conversation context from KV storage
   */
  private async getConversationContext(conversationId: string, kv: KVNamespace): Promise<ConversationContext> {
    const stored = await kv.get(conversationId);
    if (stored) {
      return JSON.parse(stored);
    }

    // Create new conversation context
    const newContext: ConversationContext = {
      conversation_id: conversationId,
      platform: conversationId.split('_')[0],
      sender_id: conversationId.split('_')[1],
      state: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return newContext;
  }

  /**
   * Update conversation context in KV storage
   */
  private async updateConversationContext(conversationId: string, context: ConversationContext, kv: KVNamespace): Promise<void> {
    context.updated_at = new Date().toISOString();
    await kv.put(conversationId, JSON.stringify(context), {
      expirationTtl: 86400 // 24 hours
    });
  }

  /**
   * Process travel intent and generate appropriate response
   */
  private async processIntent(intent: any, message: MobileMessage, context: ConversationContext, env: Env): Promise<MobileResponse> {
    switch (intent.type) {
      case 'query':
        return await this.handleQuery(intent, message, env);
      case 'update':
        return await this.handleUpdate(intent, message, context, env);
      case 'booking':
        return await this.handleBooking(intent, message, env);
      case 'document_processing':
        return await this.handleDocumentProcessing(intent, message, env);
      default:
        return {
          message: "I understand you're asking about travel, but I need more specific information. Try asking about a specific trip, flight time, or booking reference."
        };
    }
  }

  /**
   * Handle query intents
   */
  private async handleQuery(intent: any, message: MobileMessage, env: Env): Promise<MobileResponse> {
    // Query database for trip information
    const searchParams = {
      client_name: intent.client_reference,
      trip_reference: intent.trip_reference
    };

    const tripInfo = await this.queryTripDatabase(searchParams, env.DB);
    
    if (tripInfo && tripInfo.length > 0) {
      const trip = tripInfo[0];
      return {
        message: `Here are the details for ${trip.client_name}'s trip:\n\nFlight: ${trip.flight_details}\nHotel: ${trip.hotel_details}\nDates: ${trip.start_date} to ${trip.end_date}`,
        action_taken: 'trip_info_retrieved'
      };
    } else {
      return {
        message: "I couldn't find trip information matching your request. Could you provide more details like a client name or booking reference?"
      };
    }
  }

  /**
   * Handle update intents
   */
  private async handleUpdate(intent: any, message: MobileMessage, context: ConversationContext, env: Env): Promise<MobileResponse> {
    return {
      message: `I can help you update that booking. To proceed, I need confirmation that you want to make changes to ${intent.client_reference || 'the trip'}. Reply 'yes' to confirm.`,
      requires_confirmation: true,
      confirmation_options: ['yes', 'no', 'cancel']
    };
  }

  /**
   * Handle booking intents
   */
  private async handleBooking(intent: any, message: MobileMessage, env: Env): Promise<MobileResponse> {
    return {
      message: "I can help you with new bookings. What dates and destinations are you looking for?"
    };
  }

  /**
   * Handle document processing intents
   */
  private async handleDocumentProcessing(intent: any, message: MobileMessage, env: Env): Promise<MobileResponse> {
    if (message.attachments && message.attachments.length > 0) {
      return {
        message: `I'll process the attached document for ${intent.client_reference || 'the trip'}. Give me a moment to analyze it.`,
        action_taken: 'document_processing_started'
      };
    } else {
      return {
        message: "I don't see any attached documents. Please attach the invoice or confirmation you'd like me to process."
      };
    }
  }

  /**
   * Send message via platform API
   */
  private async sendPlatformMessage(params: any, env: Env): Promise<any> {
    switch (params.platform) {
      case 'whatsapp':
        return await this.sendWhatsAppMessage(params, env.WHATSAPP_API_TOKEN);
      case 'telegram':
        return await this.sendTelegramMessage(params, env.TELEGRAM_BOT_TOKEN);
      case 'sms':
        return await this.sendSMSMessage(params, env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
      default:
        throw new Error(`Unsupported platform: ${params.platform}`);
    }
  }

  /**
   * Send WhatsApp message
   */
  private async sendWhatsAppMessage(params: any, token: string): Promise<any> {
    // WhatsApp Business API implementation
    const response = await fetch('https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: params.recipient_id,
        text: { body: params.message }
      })
    });

    return await response.json();
  }

  /**
   * Send Telegram message
   */
  private async sendTelegramMessage(params: any, token: string): Promise<any> {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: params.recipient_id,
        text: params.message
      })
    });

    return await response.json();
  }

  /**
   * Send SMS message
   */
  private async sendSMSMessage(params: any, accountSid: string, authToken: string): Promise<any> {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        From: '+1234567890', // Your Twilio number
        To: params.recipient_id,
        Body: params.message
      })
    });

    return await response.json();
  }

  /**
   * Query trip database
   */
  private async queryTripDatabase(params: any, db: D1Database): Promise<any[]> {
    let query = 'SELECT * FROM trips WHERE 1=1';
    const values: any[] = [];

    if (params.client_name) {
      query += ' AND client_name LIKE ?';
      values.push(`%${params.client_name}%`);
    }

    if (params.trip_reference) {
      query += ' AND (trip_id = ? OR booking_reference = ?)';
      values.push(params.trip_reference, params.trip_reference);
    }

    const result = await db.prepare(query).bind(...values).all();
    return result.results || [];
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // Standard MCP HTTP endpoints
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return MobileInteractionMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    if (url.pathname === "/mcp") {
      return MobileInteractionMCP.serve("/mcp").fetch(request, env, ctx);
    }

    // Webhook endpoints for mobile platforms
    if (url.pathname === "/webhook/whatsapp") {
      return this.handleWhatsAppWebhook(request, env);
    }

    if (url.pathname === "/webhook/telegram") {
      return this.handleTelegramWebhook(request, env);
    }

    // Health check
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({
        status: "healthy",
        service: "Mobile Interaction MCP",
        version: "1.0.0",
        timestamp: new Date().toISOString()
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      error: "Not found",
      available_endpoints: ["/sse", "/mcp", "/webhook/whatsapp", "/webhook/telegram", "/health"]
    }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  },

  async handleWhatsAppWebhook(request: Request, env: Env): Promise<Response> {
    // WhatsApp webhook verification and message processing
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      if (mode === 'subscribe' && token === env.MCP_AUTH_KEY) {
        return new Response(challenge);
      }
      return new Response('Forbidden', { status: 403 });
    }

    if (request.method === 'POST') {
      const data = await request.json();
      // Process WhatsApp message and trigger MCP processing
      console.log('WhatsApp webhook data:', data);
      return new Response('OK');
    }

    return new Response('Method not allowed', { status: 405 });
  },

  async handleTelegramWebhook(request: Request, env: Env): Promise<Response> {
    if (request.method === 'POST') {
      const data = await request.json();
      // Process Telegram message and trigger MCP processing
      console.log('Telegram webhook data:', data);
      return new Response('OK');
    }

    return new Response('Method not allowed', { status: 405 });
  }
};
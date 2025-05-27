// Mobile Interaction MCP Tools
// Leverages proven email ingestion patterns for mobile message processing

export interface MobileMessage {
  platform: 'whatsapp' | 'telegram' | 'sms' | 'email';
  sender_id: string;
  message_id: string;
  content: string;
  message_type: 'text' | 'voice' | 'image' | 'document';
  timestamp: string;
  attachments?: Array<{
    type: string;
    url: string;
    filename?: string;
  }>;
}

export interface TravelIntent {
  type: 'query' | 'update' | 'booking' | 'document_processing';
  confidence: number;
  trip_reference?: string;
  client_reference?: string;
  action_required?: string;
  entities: {
    dates?: string[];
    locations?: string[];
    names?: string[];
    confirmation_numbers?: string[];
  };
}

export interface ConversationContext {
  conversation_id: string;
  platform: string;
  sender_id: string;
  state: 'active' | 'awaiting_confirmation' | 'completed';
  last_intent?: TravelIntent;
  pending_action?: {
    type: string;
    parameters: Record<string, any>;
    requires_confirmation: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface MobileResponse {
  message: string;
  action_taken?: string;
  requires_confirmation?: boolean;
  confirmation_options?: string[];
  attachments?: Array<{
    type: 'image' | 'document' | 'link';
    url: string;
    title: string;
  }>;
}
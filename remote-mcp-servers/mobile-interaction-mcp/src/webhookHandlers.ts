// Webhook Handlers for Mobile Platforms
// Processes incoming messages from WhatsApp, Telegram, and SMS

import { MobileMessage } from './tools/index.js';

export class WebhookHandlers {
  
  /**
   * Process WhatsApp webhook payload
   */
  static async processWhatsAppWebhook(payload: any): Promise<MobileMessage | null> {
    try {
      const entry = payload.entry?.[0];
      const change = entry?.changes?.[0];
      const messages = change?.value?.messages;

      if (!messages || messages.length === 0) {
        return null;
      }

      const message = messages[0];
      const from = message.from;
      const messageId = message.id;
      const timestamp = message.timestamp;

      let content = '';
      let messageType: 'text' | 'voice' | 'image' | 'document' = 'text';
      let attachments: any[] = [];

      // Handle different message types
      if (message.text) {
        content = message.text.body;
        messageType = 'text';
      } else if (message.audio) {
        content = '[Voice Message]';
        messageType = 'voice';
        attachments = [{
          type: 'audio',
          url: message.audio.id, // WhatsApp media ID
          filename: `voice_${messageId}.ogg`
        }];
      } else if (message.image) {
        content = message.image.caption || '[Image]';
        messageType = 'image';
        attachments = [{
          type: 'image',
          url: message.image.id, // WhatsApp media ID
          filename: `image_${messageId}.jpg`
        }];
      } else if (message.document) {
        content = message.document.caption || '[Document]';
        messageType = 'document';
        attachments = [{
          type: 'document',
          url: message.document.id, // WhatsApp media ID
          filename: message.document.filename || `document_${messageId}`
        }];
      }

      return {
        platform: 'whatsapp',
        sender_id: from,
        message_id: messageId,
        content,
        message_type: messageType,
        timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
        attachments: attachments.length > 0 ? attachments : undefined
      };
    } catch (error) {
      console.error('Error processing WhatsApp webhook:', error);
      return null;
    }
  }

  /**
   * Process Telegram webhook payload
   */
  static async processTelegramWebhook(payload: any): Promise<MobileMessage | null> {
    try {
      const message = payload.message;
      if (!message) {
        return null;
      }

      const chatId = message.chat.id.toString();
      const messageId = message.message_id.toString();
      const timestamp = new Date(message.date * 1000).toISOString();

      let content = '';
      let messageType: 'text' | 'voice' | 'image' | 'document' = 'text';
      let attachments: any[] = [];

      // Handle different message types
      if (message.text) {
        content = message.text;
        messageType = 'text';
      } else if (message.voice) {
        content = '[Voice Message]';
        messageType = 'voice';
        attachments = [{
          type: 'audio',
          url: message.voice.file_id,
          filename: `voice_${messageId}.ogg`
        }];
      } else if (message.photo) {
        content = message.caption || '[Photo]';
        messageType = 'image';
        // Get the largest photo size
        const photo = message.photo[message.photo.length - 1];
        attachments = [{
          type: 'image',
          url: photo.file_id,
          filename: `photo_${messageId}.jpg`
        }];
      } else if (message.document) {
        content = message.caption || '[Document]';
        messageType = 'document';
        attachments = [{
          type: 'document',
          url: message.document.file_id,
          filename: message.document.file_name || `document_${messageId}`
        }];
      }

      return {
        platform: 'telegram',
        sender_id: chatId,
        message_id: messageId,
        content,
        message_type: messageType,
        timestamp,
        attachments: attachments.length > 0 ? attachments : undefined
      };
    } catch (error) {
      console.error('Error processing Telegram webhook:', error);
      return null;
    }
  }

  /**
   * Process Twilio SMS webhook payload
   */
  static async processTwilioWebhook(payload: any): Promise<MobileMessage | null> {
    try {
      const from = payload.From;
      const body = payload.Body;
      const messageSid = payload.MessageSid;
      const timestamp = new Date().toISOString();

      // Handle media attachments (MMS)
      let attachments: any[] = [];
      const numMedia = parseInt(payload.NumMedia || '0');
      
      for (let i = 0; i < numMedia; i++) {
        const mediaUrl = payload[`MediaUrl${i}`];
        const mediaContentType = payload[`MediaContentType${i}`];
        
        if (mediaUrl) {
          attachments.push({
            type: mediaContentType.startsWith('image/') ? 'image' : 'document',
            url: mediaUrl,
            filename: `media_${messageSid}_${i}`
          });
        }
      }

      return {
        platform: 'sms',
        sender_id: from,
        message_id: messageSid,
        content: body || '[Media Message]',
        message_type: attachments.length > 0 && attachments[0].type === 'image' ? 'image' : 'text',
        timestamp,
        attachments: attachments.length > 0 ? attachments : undefined
      };
    } catch (error) {
      console.error('Error processing Twilio webhook:', error);
      return null;
    }
  }

  /**
   * Verify WhatsApp webhook signature
   */
  static verifyWhatsAppSignature(payload: string, signature: string, secret: string): boolean {
    // Implementation for WhatsApp signature verification
    // Uses HMAC SHA256
    return true; // Placeholder
  }

  /**
   * Verify Telegram webhook
   */
  static verifyTelegramWebhook(token: string, payload: any): boolean {
    // Telegram doesn't use signatures but you can verify the token
    return true; // Placeholder
  }

  /**
   * Verify Twilio webhook signature
   */
  static verifyTwilioSignature(url: string, params: any, signature: string, authToken: string): boolean {
    // Implementation for Twilio signature verification
    return true; // Placeholder
  }
}
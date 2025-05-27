// Mobile Response Formatter
// Optimizes responses for different mobile platforms

import { MobileResponse } from './tools/index.js';

export class MobileResponseFormatter {

  /**
   * Format response for WhatsApp
   */
  static formatWhatsAppResponse(response: MobileResponse): any {
    const whatsappMessage: any = {
      messaging_product: 'whatsapp',
      text: { body: response.message }
    };

    // Add interactive elements for confirmations
    if (response.requires_confirmation && response.confirmation_options) {
      whatsappMessage.type = 'interactive';
      whatsappMessage.interactive = {
        type: 'button',
        body: { text: response.message },
        action: {
          buttons: response.confirmation_options.map((option, index) => ({
            type: 'reply',
            reply: {
              id: `option_${index}`,
              title: option.charAt(0).toUpperCase() + option.slice(1)
            }
          }))
        }
      };
      delete whatsappMessage.text;
    }

    // Add attachments
    if (response.attachments && response.attachments.length > 0) {
      const attachment = response.attachments[0]; // WhatsApp handles one attachment at a time

      if (attachment.type === 'image') {
        whatsappMessage.type = 'image';
        whatsappMessage.image = {
          link: attachment.url,
          caption: response.message
        };
        delete whatsappMessage.text;
      } else if (attachment.type === 'document') {
        whatsappMessage.type = 'document';
        whatsappMessage.document = {
          link: attachment.url,
          caption: response.message,
          filename: attachment.title
        };
        delete whatsappMessage.text;
      }
    }

    return whatsappMessage;
  }

  /**
   * Format response for Telegram
   */
  static formatTelegramResponse(response: MobileResponse): any {
    let telegramMessage: any = {
      text: response.message,
      parse_mode: 'Markdown'
    };

    // Add inline keyboard for confirmations
    if (response.requires_confirmation && response.confirmation_options) {
      telegramMessage.reply_markup = {
        inline_keyboard: [
          response.confirmation_options.map(option => ({
            text: option.charAt(0).toUpperCase() + option.slice(1),
            callback_data: `confirm_${option}`
          }))
        ]
      };
    }

    // Handle attachments
    if (response.attachments && response.attachments.length > 0) {
      const attachment = response.attachments[0];

      if (attachment.type === 'image') {
        telegramMessage = {
          photo: attachment.url,
          caption: response.message,
          parse_mode: 'Markdown'
        };
      } else if (attachment.type === 'document') {
        telegramMessage = {
          document: attachment.url,
          caption: response.message,
          parse_mode: 'Markdown'
        };
      }
    }

    return telegramMessage;
  }

  /**
   * Format response for SMS
   */
  static formatSMSResponse(response: MobileResponse): string {
    let message = response.message;

    // Add confirmation options as text
    if (response.requires_confirmation && response.confirmation_options) {
      message += '\n\nReply with: ' + response.confirmation_options.join(', ');
    }

    // Add attachment info
    if (response.attachments && response.attachments.length > 0) {
      message += '\n\nDocuments available at: [link will be sent separately]';
    }

    // Keep SMS under 160 characters when possible
    if (message.length > 160) {
      message = message.substring(0, 157) + '...';
    }

    return message;
  }

  /**
   * Format travel information for mobile display
   */
  static formatTravelInfo(tripData: any): string {
    if (!tripData) {
      return 'No trip information found.';
    }

    let info = `✈️ **${tripData.client_name}'s Trip**\n\n`;

    if (tripData.destination) {
      info += `📍 **Destination:** ${tripData.destination}\n`;
    }

    if (tripData.start_date && tripData.end_date) {
      info += `📅 **Dates:** ${tripData.start_date} to ${tripData.end_date}\n`;
    }

    if (tripData.flight_details) {
      info += `✈️ **Flight:** ${tripData.flight_details}\n`;
    }

    if (tripData.hotel_details) {
      info += `🏨 **Hotel:** ${tripData.hotel_details}\n`;
    }

    if (tripData.booking_reference) {
      info += `🎫 **Reference:** ${tripData.booking_reference}\n`;
    }

    if (tripData.total_cost) {
      info += `💰 **Total:** ${tripData.total_cost}\n`;
    }

    return info;
  }

  /**
   * Format error messages for mobile
   */
  static formatErrorMessage(error: string, platform: 'whatsapp' | 'telegram' | 'sms'): string {
    const baseMessage = `❌ Sorry, I encountered an issue: ${error}`;

    switch (platform) {
      case 'whatsapp':
      case 'telegram':
        return baseMessage + '\n\nPlease try again or contact support if the problem persists.';
      case 'sms':
        return `Error: ${error}. Please try again.`;
      default:
        return baseMessage;
    }
  }

  /**
   * Format confirmation request
   */
  static formatConfirmationRequest(action: string, details: any, platform: string): MobileResponse {
    let message = `🤔 **Confirmation Required**\n\n`;
    message += `I'm about to ${action}:\n\n`;

    if (details.trip_reference) {
      message += `Trip: ${details.trip_reference}\n`;
    }

    if (details.changes) {
      message += `Changes: ${details.changes}\n`;
    }

    message += '\nDo you want me to proceed?';

    return {
      message,
      requires_confirmation: true,
      confirmation_options: ['Yes', 'No', 'Cancel']
    };
  }

  /**
   * Format success message
   */
  static formatSuccessMessage(action: string, details: any): string {
    let message = `✅ **Success!**\n\n`;
    message += `I've successfully ${action}.\n\n`;

    if (details.confirmation_number) {
      message += `Confirmation: ${details.confirmation_number}\n`;
    }

    if (details.next_steps) {
      message += `Next steps: ${details.next_steps}\n`;
    }

    return message;
  }

  /**
   * Truncate message for platform limits
   */
  static truncateForPlatform(message: string, platform: 'whatsapp' | 'telegram' | 'sms'): string {
    const limits = {
      whatsapp: 4096,
      telegram: 4096,
      sms: 160
    };

    const limit = limits[platform];
    if (message.length <= limit) {
      return message;
    }

    return message.substring(0, limit - 3) + '...';
  }

  /**
   * Add emojis and formatting for better mobile readability
   */
  static enhanceForMobile(message: string): string {
    return message
      .replace(/\*\*(.*?)\*\*/g, '*$1*') // Convert ** to * for mobile
      .replace(/Flight:/g, '✈️ Flight:')
      .replace(/Hotel:/g, '🏨 Hotel:')
      .replace(/Date:/g, '📅 Date:')
      .replace(/Time:/g, '🕐 Time:')
      .replace(/Cost:/g, '💰 Cost:')
      .replace(/Confirmation:/g, '🎫 Confirmation:')
      .replace(/Error:/g, '❌ Error:')
      .replace(/Success:/g, '✅ Success:');
  }
}

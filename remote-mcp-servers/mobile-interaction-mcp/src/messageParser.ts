// Message Parser - Adapted from proven email ingestion patterns
// Processes mobile messages to extract travel-related intent and entities

import { MobileMessage, TravelIntent } from './tools/index.js';

export class MobileMessageParser {
  
  /**
   * Parse mobile message content to extract travel intent
   * Based on email parsing patterns from claude-travel-chat project
   */
  async parseTravelIntent(message: MobileMessage): Promise<TravelIntent> {
    const content = message.content.toLowerCase();
    
    // Intent classification patterns (adapted from email parser)
    const intentPatterns = {
      query: [
        /what time.*flight/i,
        /when.*departure/i,
        /flight.*details/i,
        /hotel.*information/i,
        /itinerary.*for/i,
        /trip.*details/i,
        /show.*booking/i
      ],
      update: [
        /change.*flight/i,
        /update.*booking/i,
        /modify.*reservation/i,
        /reschedule.*to/i,
        /move.*trip/i,
        /cancel.*booking/i
      ],
      booking: [
        /book.*flight/i,
        /reserve.*hotel/i,
        /find.*flights/i,
        /search.*hotels/i,
        /make.*reservation/i
      ],
      document_processing: [
        /process.*invoice/i,
        /update.*confirmation/i,
        /attached.*receipt/i,
        /invoice.*attached/i,
        /confirmation.*number/i
      ]
    };

    // Determine intent type and confidence
    let intent_type: TravelIntent['type'] = 'query';
    let confidence = 0.5;

    for (const [type, patterns] of Object.entries(intentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          intent_type = type as TravelIntent['type'];
          confidence = 0.9;
          break;
        }
      }
      if (confidence > 0.8) break;
    }

    // Extract entities using patterns from email parser
    const entities = {
      dates: this.extractDates(content),
      locations: this.extractLocations(content),
      names: this.extractNames(content),
      confirmation_numbers: this.extractConfirmationNumbers(content)
    };

    // Try to identify trip/client references
    const trip_reference = this.extractTripReference(content);
    const client_reference = this.extractClientReference(content);

    return {
      type: intent_type,
      confidence,
      trip_reference,
      client_reference,
      entities
    };
  }

  /**
   * Extract dates from message content
   * Adapted from email parser regex patterns
   */
  private extractDates(content: string): string[] {
    const datePatterns = [
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
      /(\w+\s+\d{1,2},?\s+\d{4})/g,
      /(\d{1,2}\s+\w+\s+\d{4})/g,
      /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/gi
    ];

    const dates: string[] = [];
    for (const pattern of datePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        dates.push(...matches);
      }
    }
    return [...new Set(dates)]; // Remove duplicates
  }

  /**
   * Extract location names from content
   */
  private extractLocations(content: string): string[] {
    const locationPatterns = [
      /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g, // City, Country
      /\b([A-Z]{3})\b/g, // Airport codes
      /\b(to|from|in|at)\s+([A-Z][a-z]+)/gi
    ];

    const locations: string[] = [];
    for (const pattern of locationPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        locations.push(...matches.map(m => m.replace(/^(to|from|in|at)\s+/i, '')));
      }
    }
    return [...new Set(locations.filter(loc => loc.length > 2))];
  }

  /**
   * Extract person names from content
   */
  private extractNames(content: string): string[] {
    const namePatterns = [
      /\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/g,
      /(mr|mrs|ms|dr)\.?\s+([A-Z][a-z]+)/gi,
      /for\s+([A-Z][a-z]+)/gi
    ];

    const names: string[] = [];
    for (const pattern of namePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        names.push(...matches.map(m => m.replace(/^(mr|mrs|ms|dr)\.?\s+/i, '').replace(/^for\s+/i, '')));
      }
    }
    return [...new Set(names.filter(name => name.length > 2))];
  }

  /**
   * Extract confirmation numbers and booking references
   */
  private extractConfirmationNumbers(content: string): string[] {
    const confirmationPatterns = [
      /[A-Z]{2}\d{4,6}/g, // PNR format
      /\b[A-Z0-9]{6,10}\b/g, // General confirmation codes
      /confirmation[:\s]+([A-Z0-9]+)/gi,
      /booking[:\s]+([A-Z0-9]+)/gi,
      /reference[:\s]+([A-Z0-9]+)/gi
    ];

    const confirmations: string[] = [];
    for (const pattern of confirmationPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        confirmations.push(...matches);
      }
    }
    return [...new Set(confirmations.filter(conf => conf.length >= 4))];
  }

  /**
   * Try to identify specific trip reference from names/locations
   */
  private extractTripReference(content: string): string | undefined {
    const tripPatterns = [
      /trip\s+(\d+)/gi,
      /booking\s+(\d+)/gi,
      /reservation\s+(\d+)/gi,
      /(\w+)\s+trip/gi
    ];

    for (const pattern of tripPatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }
    return undefined;
  }

  /**
   * Try to identify client reference from names
   */
  private extractClientReference(content: string): string | undefined {
    const names = this.extractNames(content);
    if (names.length > 0) {
      return names[0]; // Return first detected name as potential client
    }
    return undefined;
  }

  /**
   * Process voice message transcription
   */
  async processVoiceMessage(audioUrl: string, apiKey: string): Promise<string> {
    try {
      // First, fetch the audio file
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to fetch audio: ${audioResponse.status}`);
      }
      
      const audioBlob = await audioResponse.blob();
      
      // Create form data for OpenAI Whisper API
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice.ogg');
      formData.append('model', 'whisper-1');
      
      // Use OpenAI Whisper API for transcription
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`
          // Don't set Content-Type - let browser set it with boundary for multipart
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json() as { text?: string };
      return result.text || '';
    } catch (error) {
      console.error('Voice transcription failed:', error);
      return `[Voice message - transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}]`;
    }
  }

  /**
   * Process document/image content using OCR
   */
  async processDocumentMessage(imageUrl: string): Promise<string> {
    // Placeholder for OCR processing
    // Could integrate with Cloudflare AI or external OCR service
    console.log('Document processing not yet implemented for:', imageUrl);
    return '';
  }
}
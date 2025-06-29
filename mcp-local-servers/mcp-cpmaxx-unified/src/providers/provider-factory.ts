import { logger } from '../utils/logger.js';
import { carRentalParser } from './carrental/carrental-parser.js';
import { deltaParser } from './delta/delta-parser.js';
import { americanParser } from './american/american-parser.js';
import { hotelParser } from './hotel/hotel-parser.js';

export interface Provider {
  parse(html: string, criteria: any): Promise<any>;
}

export class ProviderFactory {
  getProvider(providerName: string): Provider {
    logger.info(`Getting provider: ${providerName}`);
    
    switch (providerName) {
      case 'carrental':
      case 'cpmaxx-car':
        return carRentalParser;
        
      case 'hotel':
        return hotelParser;
        
      case 'delta':
        return deltaParser;
        
      case 'american':
        return americanParser;
        
      case 'all-inclusive':
      case 'cruise':
      case 'tour':
        // These can use a generic parser or specific ones when implemented
        return {
          async parse(html: string, criteria: any) {
            return {
              provider: providerName,
              searchId: `${providerName}-${Date.now()}`,
              criteria,
              searchDate: new Date().toISOString(),
              html: html.length,
              message: `${providerName} results captured, parser pending implementation`
            };
          }
        };
        
      default:
        throw new Error(`Provider not implemented: ${providerName}`);
    }
  }
}
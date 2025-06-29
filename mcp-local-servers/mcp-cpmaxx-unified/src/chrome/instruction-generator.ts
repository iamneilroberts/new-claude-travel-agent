import { logger } from '../utils/logger.js';
import { ChromeInstruction } from '../types/index.js';

export class InstructionGenerator {
  generateInstructions(provider: string, params: any): ChromeInstruction[] {
    logger.info(`Generating Chrome instructions for ${provider}`);
    
    // This class is not used in the orchestrated version
    // The orchestrated-search.ts file contains all the instruction generation logic
    return [];
  }
}
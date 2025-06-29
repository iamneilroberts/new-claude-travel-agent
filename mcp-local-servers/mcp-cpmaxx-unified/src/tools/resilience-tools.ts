import { logger } from '../utils/logger';

export class ResilienceTools {
  async diagnoseNavigationIssue(params: {
    expectedElement?: string;
    currentUrl?: string;
    lastError?: string;
  }) {
    logger.info('Diagnosing navigation issue:', params);
    
    const diagnosis = {
      issue: params.lastError || 'Unknown navigation issue',
      currentUrl: params.currentUrl || 'Unknown',
      expectedElement: params.expectedElement || 'Unknown',
      possibleCauses: [] as string[],
      recommendations: [] as string[],
      alternativeSelectors: [] as string[]
    };
    
    // Analyze the issue
    if (params.lastError?.includes('timeout') || params.lastError?.includes('not found')) {
      diagnosis.possibleCauses.push('Element not visible or doesn\'t exist');
      diagnosis.possibleCauses.push('Page not fully loaded');
      diagnosis.possibleCauses.push('Different page structure than expected');
      
      diagnosis.recommendations.push('Wait longer for page to load');
      diagnosis.recommendations.push('Try alternative selectors');
      diagnosis.recommendations.push('Check if logged in to CPMaxx');
    }
    
    // Provide alternative selectors based on element description
    if (params.expectedElement) {
      if (params.expectedElement.toLowerCase().includes('car')) {
        diagnosis.alternativeSelectors = [
          'a:contains("Car Rental")',
          'a:contains("Rental Car")',
          'a[href*="car"]',
          'button:contains("Car")',
          '.partner-option:contains("Car")',
          '[data-partner="car"]'
        ];
      } else if (params.expectedElement.toLowerCase().includes('hotel')) {
        diagnosis.alternativeSelectors = [
          'a:contains("Find a Hotel")',
          'a:contains("Hotel Search")',
          'a[href*="hotel"]',
          'button:contains("Hotel")',
          '.partner-option:contains("Hotel")'
        ];
      }
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(diagnosis, null, 2)
      }]
    };
  }
}
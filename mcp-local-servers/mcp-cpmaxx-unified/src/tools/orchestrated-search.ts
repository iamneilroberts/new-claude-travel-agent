import { InstructionGenerator } from '../chrome/instruction-generator.js';
import { FileStorage } from '../storage/file-storage.js';
import { logger } from '../utils/logger.js';
import { ChromeInstruction, SearchPlan } from '../types/index.js';

export class OrchestratedSearch {
  private storage: FileStorage;
  private instructionGenerator: InstructionGenerator;

  constructor() {
    this.storage = new FileStorage();
    this.instructionGenerator = new InstructionGenerator();
  }

  async startSearch(args: any) {
    const searchId = this.generateSearchId(args.provider, args);
    logger.info(`Starting ${args.provider} search`, { searchId, args });

    try {
      // Generate Chrome instructions
      const instructions = this.generateInstructions(args.provider, args);
      
      // Create search plan
      const searchPlan: SearchPlan = {
        searchId,
        provider: args.provider,
        status: 'ready',
        totalSteps: instructions.length,
        currentStep: 0,
        instructions,
        nextAction: 'Execute the Chrome instructions in order, then call complete_search with the HTML'
      };

      // Store the search plan
      await this.storage.saveSearchPlan(searchId, searchPlan);
      await this.storage.saveSearchState(searchId, {
        searchId,
        provider: args.provider,
        status: 'in_progress',
        startTime: new Date().toISOString(),
        searchCriteria: args
      });

      logger.info(`Search plan created for ${args.provider}`, { searchId });

      return {
        searchId,
        provider: args.provider,
        status: 'instructions_ready',
        instructions,
        nextAction: searchPlan.nextAction
      };

    } catch (error) {
      logger.error('Failed to start search', { error, searchId });
      throw error;
    }
  }

  async completeSearch(args: { searchId: string; html: string; error?: string }) {
    const { searchId, html, error } = args;
    logger.info(`Completing search ${searchId}`, { hasHtml: !!html, hasError: !!error });

    try {
      // Load search state
      const searchState = await this.storage.loadSearchState(searchId);
      if (!searchState) {
        throw new Error(`Search ${searchId} not found`);
      }

      if (error) {
        // Mark as failed
        searchState.status = 'failed';
        searchState.error = error;
        searchState.endTime = new Date().toISOString();
        await this.storage.saveSearchState(searchId, searchState);
        
        return {
          searchId,
          status: 'failed',
          error,
          provider: searchState.provider
        };
      }

      // Save the HTML
      await this.storage.saveHtml(searchId, html);

      // Update search state
      searchState.status = 'html_saved';
      searchState.endTime = new Date().toISOString();
      await this.storage.saveSearchState(searchId, searchState);

      // Return success with parser instructions
      return {
        searchId,
        status: 'completed',
        provider: searchState.provider,
        htmlSaved: true,
        nextAction: `HTML saved. The search results are ready to be parsed.`,
        searchCriteria: searchState.searchCriteria
      };

    } catch (error) {
      logger.error('Failed to complete search', { error, searchId });
      throw error;
    }
  }

  async getSearchStatus(searchId: string) {
    try {
      const searchState = await this.storage.loadSearchState(searchId);
      if (!searchState) {
        return {
          searchId,
          status: 'not_found',
          error: 'Search not found'
        };
      }

      const searchPlan = await this.storage.loadSearchPlan(searchId);
      
      return {
        searchId,
        provider: searchState.provider,
        status: searchState.status,
        startTime: searchState.startTime,
        endTime: searchState.endTime,
        error: searchState.error,
        searchCriteria: searchState.searchCriteria,
        hasHtml: await this.storage.hasHtml(searchId),
        currentStep: searchPlan?.currentStep,
        totalSteps: searchPlan?.totalSteps
      };

    } catch (error) {
      logger.error('Failed to get search status', { error, searchId });
      throw error;
    }
  }

  private generateInstructions(provider: string, args: any): ChromeInstruction[] {
    switch (provider) {
      case 'delta':
        return this.generateDeltaInstructions(args);
      case 'american':
        return this.generateAmericanInstructions(args);
      case 'carrental':
      case 'cpmaxx-car':
        return this.generateCarRentalInstructions(args);
      case 'hotel':
        return this.generateHotelInstructions(args);
      case 'all-inclusive':
        return this.generateAllInclusiveInstructions(args);
      case 'cruise':
        return this.generateCruiseInstructions(args);
      case 'tour':
        return this.generateTourInstructions(args);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  private generateDeltaInstructions(args: any): ChromeInstruction[] {
    const { origin, destination, departDate, returnDate, adults = 1, children = 0, tripType = 'roundtrip' } = args;
    
    return [
      {
        tool: 'chrome_navigate',
        args: { url: 'https://www.deltavacations.com' }
      },
      {
        tool: 'chrome_click_element',
        args: { selector: '#origin', waitForNavigation: false }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#origin', value: origin }
      },
      {
        tool: 'chrome_keyboard',
        args: { keys: 'Tab' }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#destination', value: destination }
      },
      {
        tool: 'chrome_keyboard',
        args: { keys: 'Tab' }
      },
      {
        tool: 'chrome_click_element',
        args: { selector: '#departDate' }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#departDate', value: departDate }
      },
      {
        tool: 'chrome_click_element',
        args: { selector: '#returnDate' }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#returnDate', value: returnDate }
      },
      {
        tool: 'chrome_click_element',
        args: { selector: 'button[type="submit"], #searchButton', waitForNavigation: true, timeout: 10000 }
      },
      {
        tool: 'chrome_get_web_content',
        args: { htmlContent: true }
      }
    ];
  }

  private generateAmericanInstructions(args: any): ChromeInstruction[] {
    const { origin, destination, departDate, returnDate, adults = 1, children = 0 } = args;
    
    return [
      {
        tool: 'chrome_navigate',
        args: { url: 'https://www.aavacations.com' }
      },
      {
        tool: 'chrome_click_element',
        args: { selector: '#from', waitForNavigation: false }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#from', value: origin }
      },
      {
        tool: 'chrome_keyboard',
        args: { keys: 'Tab' }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#to', value: destination }
      },
      {
        tool: 'chrome_keyboard',
        args: { keys: 'Tab' }
      },
      {
        tool: 'chrome_click_element',
        args: { selector: '#departureDate' }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#departureDate', value: departDate }
      },
      {
        tool: 'chrome_click_element',
        args: { selector: '#returnDate' }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#returnDate', value: returnDate }
      },
      {
        tool: 'chrome_click_element',
        args: { selector: '#searchButton, button[type="submit"]', waitForNavigation: true, timeout: 10000 }
      },
      {
        tool: 'chrome_get_web_content',
        args: { htmlContent: true }
      }
    ];
  }

  private generateCarRentalInstructions(args: any): ChromeInstruction[] {
    const { pickupLocation, dropoffLocation, pickupDate, pickupTime, dropoffDate, dropoffTime } = args;
    const sameLocation = !dropoffLocation || dropoffLocation === pickupLocation;
    
    return [
      {
        tool: 'chrome_navigate',
        args: { url: 'https://www.cpmaxx.com/carrental' }
      },
      {
        tool: 'chrome_inject_script',
        args: {
          type: 'MAIN',
          jsScript: `
            // Autocomplete fix for CPMaxx car rental
            function setLocationValue(inputId, value) {
              const input = document.getElementById(inputId);
              if (input) {
                input.focus();
                input.value = '';
                
                // Simulate typing
                for (let i = 0; i < value.length; i++) {
                  input.value += value[i];
                  input.dispatchEvent(new Event('input', { bubbles: true }));
                }
                
                // Wait for dropdown then select first item
                setTimeout(() => {
                  const firstItem = document.querySelector('.ui-menu-item:first-child');
                  if (firstItem) {
                    firstItem.click();
                  }
                }, 1000);
              }
            }
            
            // Set pickup location
            setLocationValue('pickupLocation', '${pickupLocation}');
            
            // Set dropoff location if different
            ${!sameLocation ? `
            setTimeout(() => {
              const diffLocationCheckbox = document.querySelector('input[type="checkbox"][name*="different"], #differentDropoff');
              if (diffLocationCheckbox && !diffLocationCheckbox.checked) {
                diffLocationCheckbox.click();
              }
              setTimeout(() => {
                setLocationValue('dropoffLocation', '${dropoffLocation}');
              }, 500);
            }, 2000);
            ` : ''}
          `
        }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#pickupDate', value: pickupDate }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#pickupTime', value: pickupTime }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#dropoffDate', value: dropoffDate }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#dropoffTime', value: dropoffTime }
      },
      {
        tool: 'chrome_click_element',
        args: { selector: 'button[type="submit"], #searchButton', waitForNavigation: true, timeout: 10000 }
      },
      {
        tool: 'chrome_get_web_content',
        args: { htmlContent: true }
      }
    ];
  }

  private generateHotelInstructions(args: any): ChromeInstruction[] {
    const { destination, checkInDate, checkOutDate, rooms = 1, adults = 1, children = 0 } = args;
    
    return [
      {
        tool: 'chrome_navigate',
        args: { url: 'https://www.cpmaxx.com/hotel' }
      },
      {
        tool: 'chrome_inject_script',
        args: {
          type: 'MAIN',
          jsScript: `
            // Autocomplete fix for CPMaxx hotel search
            function setDestinationValue(value) {
              const input = document.querySelector('#destination, input[name*="destination"]');
              if (input) {
                input.focus();
                input.value = '';
                
                // Simulate typing
                for (let i = 0; i < value.length; i++) {
                  input.value += value[i];
                  input.dispatchEvent(new Event('input', { bubbles: true }));
                }
                
                // Wait for dropdown then select first item
                setTimeout(() => {
                  const firstItem = document.querySelector('.ui-menu-item:first-child');
                  if (firstItem) {
                    firstItem.click();
                  }
                }, 1000);
              }
            }
            
            setDestinationValue('${destination}');
          `
        }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#checkInDate', value: checkInDate }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#checkOutDate', value: checkOutDate }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#rooms', value: rooms.toString() }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#adults', value: adults.toString() }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#children', value: children.toString() }
      },
      {
        tool: 'chrome_click_element',
        args: { selector: 'button[type="submit"], #searchButton', waitForNavigation: true, timeout: 10000 }
      },
      {
        tool: 'chrome_get_web_content',
        args: { htmlContent: true }
      }
    ];
  }

  private generateAllInclusiveInstructions(args: any): ChromeInstruction[] {
    const { destination, departDate, returnDate, adults = 2, children = 0 } = args;
    
    return [
      {
        tool: 'chrome_navigate',
        args: { url: 'https://www.cpmaxx.com/packages/all-inclusive' }
      },
      {
        tool: 'chrome_inject_script',
        args: {
          type: 'MAIN',
          jsScript: `
            // Set destination with autocomplete
            const destInput = document.querySelector('#destination, input[name*="destination"]');
            if (destInput) {
              destInput.focus();
              destInput.value = '${destination}';
              destInput.dispatchEvent(new Event('input', { bubbles: true }));
              
              setTimeout(() => {
                const firstItem = document.querySelector('.ui-menu-item:first-child');
                if (firstItem) firstItem.click();
              }, 1000);
            }
          `
        }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#departDate', value: departDate }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#returnDate', value: returnDate }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#adults', value: adults.toString() }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#children', value: children.toString() }
      },
      {
        tool: 'chrome_click_element',
        args: { selector: 'button[type="submit"]', waitForNavigation: true, timeout: 10000 }
      },
      {
        tool: 'chrome_get_web_content',
        args: { htmlContent: true }
      }
    ];
  }

  private generateCruiseInstructions(args: any): ChromeInstruction[] {
    const { destination, departureMonth, cruiseLength, cruiseLine } = args;
    
    return [
      {
        tool: 'chrome_navigate',
        args: { url: 'https://www.cpmaxx.com/cruise' }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#destination', value: destination }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#departureMonth', value: departureMonth }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#cruiseLength', value: cruiseLength }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#cruiseLine', value: cruiseLine || 'Any' }
      },
      {
        tool: 'chrome_click_element',
        args: { selector: 'button[type="submit"]', waitForNavigation: true, timeout: 10000 }
      },
      {
        tool: 'chrome_get_web_content',
        args: { htmlContent: true }
      }
    ];
  }

  private generateTourInstructions(args: any): ChromeInstruction[] {
    const { destination, departDate, duration, tourType } = args;
    
    return [
      {
        tool: 'chrome_navigate',
        args: { url: 'https://www.cpmaxx.com/tours' }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#destination', value: destination }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#departDate', value: departDate }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#duration', value: duration }
      },
      {
        tool: 'chrome_fill_or_select',
        args: { selector: '#tourType', value: tourType || 'Any' }
      },
      {
        tool: 'chrome_click_element',
        args: { selector: 'button[type="submit"]', waitForNavigation: true, timeout: 10000 }
      },
      {
        tool: 'chrome_get_web_content',
        args: { htmlContent: true }
      }
    ];
  }

  private generateSearchId(provider: string, args: any): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `${provider}-${timestamp}-${random}`;
  }
}

export const orchestratedSearch = new OrchestratedSearch();
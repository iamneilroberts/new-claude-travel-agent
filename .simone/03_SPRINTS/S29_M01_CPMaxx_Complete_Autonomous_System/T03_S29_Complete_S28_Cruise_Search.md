# Task T03: Complete S28 Cruise Search Tool

## Objective
Implement the `cpmaxx_search_cruises` MCP tool as specified in Sprint S28, Task T04.

## Reference
- **S28 Task**: T04_S28_Cruise_Search_Tool.md
- **Tool Name**: `cpmaxx_search_cruises`

## Implementation Requirements

### 1. Tool Definition
```typescript
{
  name: "cpmaxx_search_cruises",
  description: "Search cruises on CPMaxx",
  inputSchema: {
    type: "object",
    properties: {
      destination: { 
        type: "string", 
        description: "Cruise region (Caribbean, Mediterranean, Alaska, etc.)" 
      },
      departurePort: { 
        type: "string", 
        description: "Port of departure",
        optional: true 
      },
      departureMonth: { 
        type: "string", 
        description: "Month/Year (YYYY-MM) or specific date" 
      },
      duration: { 
        type: "string", 
        description: "Cruise length (e.g., '7', '7-9', '10+')",
        default: "any"
      },
      cruiseLine: { 
        type: "string", 
        description: "Preferred cruise line",
        optional: true 
      },
      shipSize: {
        type: "string",
        enum: ["small", "medium", "large", "any"],
        default: "any"
      },
      adults: { type: "number", minimum: 1 },
      children: { type: "number", default: 0 },
      cabinType: {
        type: "string",
        enum: ["interior", "oceanview", "balcony", "suite", "any"],
        default: "any"
      }
    },
    required: ["destination", "departureMonth", "adults"]
  }
}
```

### 2. Navigation Implementation
```typescript
class CruiseSearchProvider extends BaseProvider {
  async searchCruises(criteria: CruiseSearchCriteria): Promise<CruiseSearchResults> {
    // Navigate to Cruise section
    await this.navigateToResearchHub();
    
    // Click "Find a Cruise"
    await this.chromeMcp.chrome_click_element({
      selector: 'a:contains("Find a Cruise"), a[href*="cruise"]'
    });
    
    // Handle cruise-specific search interface
    await this.fillCruiseSearchForm(criteria);
    
    // Submit and wait for results
    await this.submitSearch();
    
    // Parse cruise results
    return await this.parseCruiseResults();
  }
  
  private async fillCruiseSearchForm(criteria: CruiseSearchCriteria) {
    // Destination/Region selection
    await this.selectCruiseDestination(criteria.destination);
    
    // Departure port if specified
    if (criteria.departurePort) {
      await this.selectDeparturePort(criteria.departurePort);
    }
    
    // Date handling (month selector or date range)
    await this.selectCruiseDates(criteria.departureMonth);
    
    // Duration filter
    if (criteria.duration !== 'any') {
      await this.selectCruiseDuration(criteria.duration);
    }
    
    // Cruise line preference
    if (criteria.cruiseLine) {
      await this.selectCruiseLine(criteria.cruiseLine);
    }
    
    // Cabin and occupancy
    await this.setCruiseOccupancy(
      criteria.adults,
      criteria.children,
      criteria.cabinType
    );
  }
}
```

### 3. Result Parser Structure
```typescript
interface CruiseResult {
  cruiseId: string;
  cruiseLine: string;
  shipName: string;
  shipDetails: {
    yearBuilt: number;
    lastRefurbished: number;
    tonnage: number;
    capacity: number;
    crew: number;
    shipSize: string;
  };
  itinerary: {
    name: string;
    nights: number;
    embarkation: {
      port: string;
      date: string;
      time: string;
    };
    disembarkation: {
      port: string;
      date: string;
      time: string;
    };
    ports: Array<{
      day: number;
      port: string;
      country: string;
      arrival: string;
      departure: string;
      docked: boolean; // vs tendered
    }>;
    seaDays: number;
  };
  cabinOptions: Array<{
    category: string;
    type: string; // interior, oceanview, balcony, suite
    deck: string;
    size: string;
    maxOccupancy: number;
    amenities: string[];
    pricing: {
      perPerson: number;
      total: number;
      taxes: number;
      gratuities: number;
      singleSupplement?: number;
    };
    availability: string;
  }>;
  dining: {
    mainRestaurants: number;
    specialtyRestaurants: Array<{
      name: string;
      cuisine: string;
      coverCharge: number;
    }>;
    included: string[];
  };
  activities: string[];
  entertainment: string[];
  included: string[];
  notIncluded: string[];
  promotions: Array<{
    name: string;
    description: string;
    value: string;
  }>;
}
```

### 4. Autonomous Features
- Handle complex destination/region selection
- Manage flexible date searches
- Parse detailed itineraries with port stops
- Extract cabin categories and pricing
- Handle cruise-specific inclusions

### 5. Testing Requirements
- Test with destination: "Caribbean"
- Departure month: "2025-11"
- Duration: "7"
- 2 adults
- Any cabin type
- Verify itinerary parsing
- Extract all port stops
- Parse multiple cabin options

## Success Metrics
- Successfully navigates cruise search interface
- Handles month-based date selection
- Parses complete itineraries
- Extracts all cabin categories with pricing
- Captures ship details and amenities
- Identifies what's included vs extra cost
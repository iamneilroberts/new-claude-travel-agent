# Task T02: Complete S28 All-Inclusive Resort Search Tool

## Objective
Implement the `cpmaxx_search_all_inclusive` MCP tool as specified in Sprint S28, Task T02.

## Reference
- **S28 Task**: T02_S28_All_Inclusive_Search_Tool.md
- **Tool Name**: `cpmaxx_search_all_inclusive`

## Implementation Requirements

### 1. Tool Definition
```typescript
{
  name: "cpmaxx_search_all_inclusive",
  description: "Search all-inclusive resorts on CPMaxx",
  inputSchema: {
    type: "object",
    properties: {
      destination: { type: "string", description: "Resort destination or region" },
      checkIn: { type: "string", description: "Check-in date (YYYY-MM-DD)" },
      checkOut: { type: "string", description: "Check-out date (YYYY-MM-DD)" },
      adults: { type: "number", description: "Number of adults", minimum: 1 },
      children: { type: "number", description: "Number of children", default: 0 },
      childAges: { type: "array", items: { type: "number" }, description: "Ages of children" },
      resortType: { 
        type: "string",
        enum: ["family", "adult-only", "luxury", "budget", "all"],
        default: "all"
      },
      activities: {
        type: "array",
        items: { type: "string" },
        description: "Preferred activities (golf, spa, water sports, etc.)"
      }
    },
    required: ["destination", "checkIn", "checkOut", "adults"]
  }
}
```

### 2. Navigation Implementation
```typescript
class AllInclusiveProvider extends BaseProvider {
  async searchAllInclusive(criteria: AllInclusiveCriteria): Promise<AllInclusiveResults> {
    // Navigate to All-Inclusive section
    await this.navigateToResearchHub();
    
    // Click "Find an All-Inclusive Resort"
    await this.chromeMcp.chrome_click_element({
      selector: 'a:contains("All-Inclusive"), a[href*="all-inclusive"]'
    });
    
    // Handle resort-specific search form
    await this.fillAllInclusiveForm(criteria);
    
    // Apply resort type filters
    if (criteria.resortType !== 'all') {
      await this.applyResortTypeFilter(criteria.resortType);
    }
    
    // Submit and parse
    await this.submitSearch();
    return await this.parseAllInclusiveResults();
  }
  
  private async fillAllInclusiveForm(criteria: AllInclusiveCriteria) {
    // Destination (handle Caribbean/Mexico specific dropdowns)
    await this.selectDestination(criteria.destination);
    
    // Travel dates
    await this.fillDate('#ai-checkin', criteria.checkIn);
    await this.fillDate('#ai-checkout', criteria.checkOut);
    
    // Occupancy with child ages
    await this.setOccupancy(criteria.adults, criteria.children);
    
    if (criteria.children > 0 && criteria.childAges) {
      await this.setChildAges(criteria.childAges);
    }
    
    // Activity preferences
    if (criteria.activities?.length > 0) {
      await this.selectActivities(criteria.activities);
    }
  }
}
```

### 3. Result Parser Structure
```typescript
interface AllInclusiveResult {
  resortId: string;
  name: string;
  brand: string; // Sandals, Club Med, etc.
  location: {
    country: string;
    region: string;
    beachfront: boolean;
    transferTime: string; // from airport
  };
  resortType: string; // family, adult-only, etc.
  starRating: number;
  guestRating: {
    overall: number;
    food: number;
    service: number;
    location: number;
    value: number;
  };
  pricing: {
    currency: string;
    perPersonPerNight: number;
    totalPerPerson: number;
    totalPackage: number;
    includes: string[]; // "airfare", "transfers", "meals", etc.
    taxes: number;
    gratuities: number;
  };
  included: {
    meals: string[]; // restaurants included
    drinks: boolean;
    premiumLiquor: boolean;
    roomService: boolean;
    activities: string[];
    entertainment: string[];
    childcare: boolean;
    wifi: boolean;
  };
  rooms: Array<{
    category: string;
    view: string;
    size: string;
    maxOccupancy: number;
    amenities: string[];
    pricePerPerson: number;
  }>;
  restaurants: number;
  bars: number;
  pools: number;
  beachAccess: string;
  images: string[];
  specialOffers: string[];
}
```

### 4. Autonomous Features
- Handle destination selection (dropdown vs autocomplete)
- Manage complex occupancy forms with child ages
- Apply multiple activity filters
- Parse all-inclusive specific data
- Extract what's included vs extra cost

### 5. Testing Requirements
- Test with destination: "Cancun, Mexico"
- Check-in: "2025-10-01"
- Check-out: "2025-10-08"
- 2 adults, 1 child (age 10)
- Family-friendly resorts
- Verify all-inclusive inclusions parsed
- Extract special offers and promotions

## Success Metrics
- Tool successfully navigates to all-inclusive section
- Complex occupancy handling works
- Resort type filtering functional
- Complete inclusion details extracted
- Pricing breakdown clear
- Special offers captured
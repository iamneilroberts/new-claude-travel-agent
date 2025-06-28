# Task T04: Complete S28 Tour Search Tool

## Objective
Implement the `cpmaxx_search_tours` MCP tool as specified in Sprint S28, Task T05.

## Reference
- **S28 Task**: T05_S28_Tour_Search_Tool.md
- **Tool Name**: `cpmaxx_search_tours`

## Implementation Requirements

### 1. Tool Definition
```typescript
{
  name: "cpmaxx_search_tours",
  description: "Search tours and activities on CPMaxx",
  inputSchema: {
    type: "object",
    properties: {
      destination: { type: "string", description: "City, region, or country" },
      startDate: { type: "string", description: "Tour date or start of date range" },
      endDate: { type: "string", description: "End of date range", optional: true },
      tourType: {
        type: "string",
        enum: ["sightseeing", "adventure", "cultural", "food-wine", "multi-day", "day-trips", "all"],
        default: "all"
      },
      duration: {
        type: "string",
        description: "Tour duration (half-day, full-day, 2-3 days, etc.)",
        optional: true
      },
      adults: { type: "number", minimum: 1 },
      children: { type: "number", default: 0 },
      priceRange: {
        type: "object",
        properties: {
          min: { type: "number" },
          max: { type: "number" }
        },
        optional: true
      },
      interests: {
        type: "array",
        items: { type: "string" },
        description: "Specific interests (history, nature, food, etc.)"
      }
    },
    required: ["destination", "startDate", "adults"]
  }
}
```

### 2. Navigation Implementation
```typescript
class TourSearchProvider extends BaseProvider {
  async searchTours(criteria: TourSearchCriteria): Promise<TourSearchResults> {
    // Navigate to Tours section
    await this.navigateToResearchHub();
    
    // Click "Find a Tour"
    await this.chromeMcp.chrome_click_element({
      selector: 'a:contains("Find a Tour"), a[href*="tour"], a:contains("Activities")'
    });
    
    // Fill tour search form
    await this.fillTourSearchForm(criteria);
    
    // Apply filters
    await this.applyTourFilters(criteria);
    
    // Submit and parse
    await this.submitSearch();
    return await this.parseTourResults();
  }
  
  private async fillTourSearchForm(criteria: TourSearchCriteria) {
    // Destination with autocomplete
    await this.fillLocationWithAutocomplete(
      '#tour-destination',
      criteria.destination
    );
    
    // Date selection (single date or range)
    await this.fillDate('#tour-date', criteria.startDate);
    
    if (criteria.endDate) {
      await this.fillDate('#tour-end-date', criteria.endDate);
    }
    
    // Participants
    await this.setParticipants(criteria.adults, criteria.children);
    
    // Tour type filter
    if (criteria.tourType !== 'all') {
      await this.selectTourType(criteria.tourType);
    }
    
    // Duration filter
    if (criteria.duration) {
      await this.selectDuration(criteria.duration);
    }
    
    // Interest tags
    if (criteria.interests?.length > 0) {
      await this.selectInterests(criteria.interests);
    }
  }
}
```

### 3. Result Parser Structure
```typescript
interface TourResult {
  tourId: string;
  name: string;
  operator: string;
  category: string;
  duration: {
    days: number;
    hours: number;
    type: string; // "half-day", "full-day", "multi-day"
  };
  description: string;
  highlights: string[];
  itinerary: Array<{
    day?: number;
    time?: string;
    activity: string;
    location: string;
    duration: string;
  }>;
  included: string[];
  notIncluded: string[];
  requirements: {
    minAge?: number;
    fitnessLevel?: string;
    restrictions?: string[];
  };
  meeting: {
    point: string;
    time: string;
    instructions: string;
    endPoint?: string;
  };
  availability: {
    dates: string[];
    frequency: string; // "daily", "Mon/Wed/Fri", etc.
    timeslots?: string[];
    capacity: number;
    spotsAvailable?: number;
  };
  pricing: {
    currency: string;
    adult: number;
    child?: number;
    infant?: number;
    group?: {
      size: number;
      price: number;
    };
    includes: string[];
  };
  languages: string[];
  accessibility: string[];
  cancellationPolicy: string;
  reviews: {
    rating: number;
    count: number;
    highlights: string[];
  };
  images: string[];
}
```

### 4. Autonomous Features
- Handle flexible date searches
- Manage complex filtering (type, duration, interests)
- Parse detailed itineraries
- Extract meeting point information
- Handle multi-language tour options

### 5. Testing Requirements
- Test with destination: "Rome, Italy"
- Start date: "2025-09-20"
- Tour type: "cultural"
- 2 adults
- Interests: ["history", "art"]
- Verify tour details extraction
- Parse itinerary information
- Extract pricing and availability

## Success Metrics
- Navigates to tour search successfully
- Handles destination autocomplete
- Applies multiple filter types
- Parses complete tour details
- Extracts availability and pricing
- Captures meeting point information
- Includes reviews and ratings
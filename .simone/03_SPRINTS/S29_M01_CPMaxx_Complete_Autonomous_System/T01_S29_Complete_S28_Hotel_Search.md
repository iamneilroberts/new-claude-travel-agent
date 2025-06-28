# Task T01: Complete S28 Hotel Search Tool Implementation

## Objective
Implement the `cpmaxx_search_hotels` MCP tool as specified in Sprint S28, Task T01.

## Reference
- **S28 Task**: T01_S28_Hotel_Search_Tool.md
- **Tool Name**: `cpmaxx_search_hotels`

## Implementation Requirements

### 1. Tool Definition
```typescript
{
  name: "cpmaxx_search_hotels",
  description: "Search hotels on CPMaxx with filters and availability",
  inputSchema: {
    type: "object",
    properties: {
      destination: { type: "string", description: "City, airport code, or landmark" },
      checkIn: { type: "string", description: "Check-in date (YYYY-MM-DD)" },
      checkOut: { type: "string", description: "Check-out date (YYYY-MM-DD)" },
      adults: { type: "number", description: "Number of adults", minimum: 1 },
      children: { type: "number", description: "Number of children", default: 0 },
      rooms: { type: "number", description: "Number of rooms", default: 1 },
      priceRange: { 
        type: "object",
        properties: {
          min: { type: "number" },
          max: { type: "number" }
        }
      },
      starRating: { type: "array", items: { type: "number" } },
      amenities: { type: "array", items: { type: "string" } }
    },
    required: ["destination", "checkIn", "checkOut", "adults"]
  }
}
```

### 2. Navigation Implementation
```typescript
class HotelSearchProvider extends BaseProvider {
  async searchHotels(criteria: HotelSearchCriteria): Promise<HotelSearchResults> {
    // Navigate to CPMaxx Research Hub
    await this.navigateToResearchHub();
    
    // Click "Find a Hotel" link
    await this.chromeMcp.chrome_click_element({
      selector: 'a:contains("Find a Hotel"), a[href*="hotel"]'
    });
    
    // Fill search form
    await this.fillHotelSearchForm(criteria);
    
    // Submit and wait for results
    await this.submitSearch();
    
    // Parse results
    return await this.parseHotelResults();
  }
  
  private async fillHotelSearchForm(criteria: HotelSearchCriteria) {
    // Destination with autocomplete
    await this.fillLocationWithAutocomplete(
      '#hotel-destination',
      criteria.destination
    );
    
    // Dates
    await this.fillDate('#checkin-date', criteria.checkIn);
    await this.fillDate('#checkout-date', criteria.checkOut);
    
    // Occupancy
    await this.selectOccupancy(criteria);
    
    // Apply filters if provided
    if (criteria.priceRange) {
      await this.setPriceFilter(criteria.priceRange);
    }
    
    if (criteria.starRating) {
      await this.setStarRatingFilter(criteria.starRating);
    }
  }
}
```

### 3. Result Parser Structure
```typescript
interface HotelResult {
  hotelId: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  location: {
    lat: number;
    lng: number;
    distanceFromCenter: string;
    nearbyAttractions: string[];
  };
  starRating: number;
  guestRating: {
    score: number;
    count: number;
    sentiment: string;
  };
  pricing: {
    currency: string;
    perNight: number;
    total: number;
    taxes: number;
    fees: number;
    originalPrice?: number;
    savings?: number;
  };
  roomTypes: Array<{
    name: string;
    beds: string;
    maxOccupancy: number;
    amenities: string[];
    price: number;
  }>;
  amenities: string[];
  images: string[];
  cancellationPolicy: string;
  availability: string;
}
```

### 4. Autonomous Features
- Handle destination autocomplete using single-script approach
- Manage date picker interactions
- Apply multiple filters in sequence
- Handle pagination for large result sets
- Extract detailed hotel information

### 5. Testing Requirements
- Test with destination: "Orlando, FL"
- Check-in: "2025-09-15"
- Check-out: "2025-09-20"
- 2 adults, 1 room
- Verify autocomplete functionality
- Test filter applications
- Parse at least 10 hotel results

## Success Metrics
- Tool callable via MCP server
- Browser automation visible to user
- Autocomplete working smoothly
- Multiple hotels parsed with complete data
- Pricing and availability accurate
- Commission data included where available
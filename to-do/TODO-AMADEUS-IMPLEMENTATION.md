# Amadeus MCP Server - Complete Implementation Plan

## Overview
Expand from 7 working tools to 15+ comprehensive Amadeus API tools for complete travel functionality.

## Current Status: 7 Working Tools ✅

### ✅ Fully Functional Tools
1. **test_connection** - API authentication working
2. **search_flights** - Returns 10+ flight options with real pricing  
3. **search_hotels** - Returns 19+ hotels with room rates
4. **get_hotel_ratings** - Returns detailed sentiment analysis (91/100 ratings)
5. **get_travel_recommendations** - Returns destination suggestions (Lisbon, Barcelona, etc.)
6. **search_activities_by_coordinates** - Returns 10 activities with pricing
7. **search_poi** - Currently shows decommission notice (needs fix)

### ❌ Placeholder/Broken Tools (5)
8. **search_cheapest_flight_dates** - Shows "not implemented"
9. **analyze_flight_prices** - Shows "not implemented"  
10. **search_flight_inspirations** - Shows "not implemented"
11. **search_airport_transfers** - Shows "not implemented"
12. **search_hotels_by_city** - Shows "not implemented"

## Target: 15+ Working Tools 🎯

## Implementation Plan

### Phase 1: High Priority Destination APIs (4 new/fixed tools)

#### 1. Fix search_poi 
- **Status**: Fix existing tool
- **API**: `/v1/reference-data/locations/pois`
- **Description**: Replace "decommissioned" message with real POI API calls
- **Parameters**: latitude, longitude, radius
- **Priority**: HIGH

#### 2. Add search_cities
- **Status**: New tool
- **API**: `/v1/reference-data/locations/cities`
- **Description**: Search cities by keyword with country filtering
- **Parameters**: keyword, countryCode (optional), max (optional)
- **Priority**: HIGH

#### 3. Add search_poi_by_square
- **Status**: New tool  
- **API**: `/v1/reference-data/locations/pois/by-square`
- **Description**: Search POI by geographic area boundaries
- **Parameters**: north, west, south, east
- **Priority**: MEDIUM

#### 4. Add get_poi_by_id
- **Status**: New tool
- **API**: `/v1/reference-data/locations/pois/{id}`
- **Description**: Retrieve specific POI details by ID
- **Parameters**: poiId
- **Priority**: MEDIUM

### Phase 2: High Priority Flight APIs (3 tools)

#### 5. Implement search_cheapest_flight_dates
- **Status**: Fix existing tool
- **API**: Research flight inspiration/cheapest date API
- **Description**: Find cheapest dates to fly between locations
- **Parameters**: origin, destination, oneWay
- **Priority**: HIGH

#### 6. Implement analyze_flight_prices  
- **Status**: Fix existing tool
- **API**: Research flight price analysis API
- **Description**: Analyze price trends and historical data
- **Parameters**: origin, destination, departureDate
- **Priority**: HIGH

#### 7. Fix search_flight_inspirations
- **Status**: Fix existing tool
- **API**: Research flight inspiration API
- **Description**: Destination suggestions based on budget/preferences
- **Parameters**: origin, budget, travelClass
- **Priority**: MEDIUM

### Phase 3: Enhanced Activity APIs (2 tools)

#### 8. Add search_activities_by_square
- **Status**: New tool
- **API**: `/v1/shopping/activities/by-square`
- **Description**: Search activities by geographic area boundaries  
- **Parameters**: north, west, south, east
- **Priority**: MEDIUM

#### 9. Add get_activity_by_id
- **Status**: New tool
- **API**: `/v1/shopping/activities/{id}`
- **Description**: Retrieve specific activity details by ID
- **Parameters**: activityId
- **Priority**: MEDIUM

### Phase 4: Transfer & Additional APIs (4 tools)

#### 10. Implement search_airport_transfers
- **Status**: Fix existing tool
- **API**: Research transfer search API
- **Description**: Airport transfer search and booking
- **Parameters**: startType, endType, transferDate, passengers
- **Priority**: MEDIUM

#### 11. Add hotel_name_autocomplete
- **Status**: New tool
- **API**: Research hotel name autocomplete API
- **Description**: Hotel name suggestions and autocomplete
- **Parameters**: keyword, subType
- **Priority**: LOW

#### 12. Add search_airports_cities  
- **Status**: New tool
- **API**: Research airport & city search API
- **Description**: Combined airport and city search functionality
- **Parameters**: keyword, subType
- **Priority**: LOW

#### 13. Fix search_hotels_by_city
- **Status**: Fix/consolidate existing tool
- **API**: Consolidate with existing hotel search
- **Description**: Either enhance existing search_hotels or create separate by-city search
- **Parameters**: cityCode, checkIn, checkOut
- **Priority**: LOW

### Phase 5: Testing & Deployment

#### Testing Tasks
- [ ] Test all POI, City Search, and Activities API implementations
- [ ] Test all flight-related API implementations  
- [ ] Test transfers, hotel autocomplete, and remaining APIs
- [ ] Comprehensive integration testing

#### Deployment Tasks  
- [ ] Update `tools/index.js` to register all new tools
- [ ] Deploy complete worker with 15+ tools
- [ ] Test comprehensive functionality end-to-end
- [ ] Update testing documentation with complete coverage

## API Documentation References

### Available Documentation
- `/reference-docs/amadeus_api/developer-guides/docs/resources/destination-experiences.md`
- `/reference-docs/amadeus_api/developer-guides/docs/resources/flights.md`
- `/reference-docs/amadeus_api/developer-guides/docs/resources/hotels.md`
- `/reference-docs/amadeus_api/*.json` - Swagger specifications

### Research Needed
- [ ] Flight Inspiration Search API endpoints
- [ ] Flight Price Analysis API endpoints  
- [ ] Transfer Search API endpoints
- [ ] Hotel Name Autocomplete API endpoints
- [ ] Airport & City Search API endpoints

## Technical Implementation Notes

### File Structure
```
tools/
├── index.js (update registry)
├── search-poi.js (fix existing)
├── search-cities.js (new)
├── search-poi-by-square.js (new)
├── get-poi-by-id.js (new)
├── search-activities-by-square.js (new)
├── get-activity-by-id.js (new)
├── search-cheapest-flight-dates.js (fix existing)
├── analyze-flight-prices.js (fix existing)
├── search-flight-inspirations.js (fix existing)
├── search-airport-transfers.js (fix existing)
├── hotel-name-autocomplete.js (new)
├── search-airports-cities.js (new)
└── search-hotels-by-city.js (fix existing)
```

### Common Patterns
- All tools use `getAmadeusClient()` from `services/amadeus-client.js`
- Follow existing error handling patterns
- Use consistent response formatting
- Include proper parameter validation
- Add descriptive tool schemas

## Success Criteria

### 🎯 Final Goal: 15+ Functional Tools

1. **7 Current Working Tools** - Maintain functionality
2. **8+ New/Fixed Tools** - Add comprehensive coverage
3. **Complete API Coverage** - All major Amadeus API categories
4. **Real Data Integration** - All tools return actual API responses
5. **Production Ready** - Deployed and tested worker
6. **Documentation Complete** - Updated testing and usage docs

## Timeline Estimate

- **Phase 1** (Destination APIs): 2-3 days
- **Phase 2** (Flight APIs): 2-3 days  
- **Phase 3** (Enhanced Activities): 1-2 days
- **Phase 4** (Additional APIs): 2-3 days
- **Phase 5** (Testing & Deployment): 1-2 days

**Total Estimated Time: 8-13 days**

## Notes

- Prioritize tools with clear API documentation first
- Research APIs requiring investigation in parallel
- Test frequently during implementation
- Keep backward compatibility with existing tools
- Document any API limitations or subscription requirements found during implementation

---

**Last Updated**: 2025-01-26  
**Status**: Planning Phase  
**Next Action**: Begin Phase 1 implementation
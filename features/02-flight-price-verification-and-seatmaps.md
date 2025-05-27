# Flight Price Verification and Seatmap Display Features

## Overview

This feature adds two critical flight booking capabilities to the Amadeus MCP server:
1. **Flight Offers Price Verification** - Confirm pricing and availability before booking
2. **Seatmap Display** - Show aircraft seat layouts for seat selection

These features bridge the gap between flight search and actual booking, providing users with accurate pricing and seat selection capabilities.

## Features

### 1. Flight Offers Price Verification (`flight_offers_price`)

**Purpose**: Verify and get detailed pricing for specific flight offers before proceeding to booking.

**Why It's Valuable**:
- Flight search results show estimated prices that can change
- Price verification ensures accuracy before payment
- Provides detailed fare breakdown (taxes, fees, fare rules)
- Essential step in any flight booking workflow

**API Endpoint**: `POST /v1/shopping/flight-offers/pricing`

**Key Parameters**:
- `flightOffers[]` - Array of flight offers from search results
- `include[]` - Additional data (credit-card-fees, bags, other-services)
- `forceClass` - Force a specific booking class

**Response Includes**:
- Updated pricing with current availability
- Detailed fare breakdown (base fare, taxes, fees)
- Fare rules and restrictions
- Available ancillary services (bags, seats, meals)
- Credit card processing fees

### 2. Seatmap Display (`seatmap_display`)

**Purpose**: Display aircraft seat layouts and availability for seat selection.

**Why It's Valuable**:
- Visual seat selection improves booking experience
- Shows seat types (window, aisle, extra legroom)
- Displays seat pricing for upgrades
- Essential for premium booking flows

**API Endpoint**: `GET /v1/shopping/seatmaps`

**Key Parameters**:
- `flight-orderId` - Flight order ID from booking
- `flight-offer-id` - Flight offer ID from search/pricing
- `traveler-id` - Specific traveler for seat assignment

**Response Includes**:
- Aircraft configuration and seat layout
- Seat availability and restrictions
- Seat amenities (power, wifi, extra legroom)
- Seat pricing for paid selections
- Deck information for multi-level aircraft

## Implementation Plan

### Phase 1: Flight Offers Price Tool

```typescript
// tools/flight-offers-price.ts
interface FlightOffersPriceParams {
  flightOffers: FlightOffer[];          // From search results
  include?: string[];                   // ['credit-card-fees', 'bags', 'other-services']
  forceClass?: boolean;                 // Force booking class verification
  travelerPricings?: TravelerPricing[]; // Passenger details for pricing
}

interface FlightOffersPriceResponse {
  flightOffers: PricedFlightOffer[];
  bookingRequirements?: BookingRequirements;
  travelers?: TravelerElement[];
}
```

**Key Functions**:
- Validate flight offer structure from search results
- Send pricing verification request to Amadeus
- Parse detailed fare breakdown
- Format results with price changes and restrictions
- Handle pricing errors (offer no longer available)

### Phase 2: Seatmap Display Tool

```typescript
// tools/seatmap-display.ts
interface SeatmapParams {
  flightOrderId?: string;    // For existing bookings
  flightOfferId?: string;    // For new bookings
  travelerId?: string;       // Specific traveler
  segmentId?: string;        // Specific flight segment
}

interface SeatmapResponse {
  decks: AircraftDeck[];
  aircraftCabinAmenities?: CabinAmenity[];
  availableSeatsCounters?: AvailableSeatsCounter[];
}
```

**Key Functions**:
- Retrieve seatmap for flight offer or existing booking
- Parse aircraft configuration and seat layout
- Format visual seat representation
- Display seat amenities and pricing
- Handle multi-deck aircraft layouts

## User Experience Flow

### Flight Price Verification Flow
```
1. User searches flights → gets flight offers
2. User selects preferred flight → calls flight_offers_price
3. System verifies current pricing and availability
4. User sees:
   - Confirmed total price
   - Detailed fare breakdown
   - Available ancillary services
   - Fare rules and restrictions
5. User proceeds to booking with verified pricing
```

### Seatmap Selection Flow
```
1. User has flight offer or booking → calls seatmap_display
2. System retrieves aircraft configuration
3. User sees:
   - Visual seat layout by deck/cabin
   - Available vs occupied seats
   - Seat amenities (window, aisle, extra legroom)
   - Seat upgrade pricing
4. User selects preferred seats for booking
```

## Technical Implementation

### Service Layer Enhancement

```typescript
// services/flight-service.ts - Add new functions

export async function verifyFlightPrice(
  params: FlightOffersPriceParams, 
  env: Env
): Promise<string> {
  // POST to /v1/shopping/flight-offers/pricing
  // Handle pricing verification logic
  // Format detailed price breakdown
}

export async function getFlightSeatmap(
  params: SeatmapParams, 
  env: Env
): Promise<string> {
  // GET /v1/shopping/seatmaps
  // Parse aircraft layout
  // Format visual seat representation
}
```

### Error Handling

**Price Verification Errors**:
- Flight offer expired/changed
- Booking class no longer available
- Price increase since search
- Invalid flight offer format

**Seatmap Errors**:
- No seatmap available for aircraft type
- Flight not eligible for advance seat selection
- Invalid flight offer/order ID

## Business Value

### For Travel Agents
- **Accurate Pricing**: Eliminate booking failures due to price changes
- **Professional Service**: Provide detailed fare breakdowns to clients
- **Seat Selection**: Offer premium seat selection services
- **Reduced Support**: Fewer issues with pricing discrepancies

### For Travelers
- **Price Confidence**: Know exact costs before booking
- **Transparent Fees**: See all taxes and fees upfront
- **Seat Control**: Visual seat selection with amenity details
- **Better Experience**: Professional booking workflow

### For Platform
- **Higher Conversion**: Accurate pricing reduces booking abandonment
- **Premium Services**: Seat selection enables ancillary revenue
- **API Compliance**: Follows Amadeus recommended booking flow
- **Competitive Edge**: Professional booking capabilities

## Success Metrics

- **Price Accuracy**: % of bookings that complete without price changes
- **Seat Selection Usage**: % of users who view/select seats
- **Booking Completion**: Improved conversion from search to booking
- **User Satisfaction**: Reduced pricing-related support tickets

## Future Enhancements

1. **Seat Preferences**: Remember user seat preferences
2. **Upgrade Recommendations**: Suggest seat upgrades based on availability
3. **Group Seating**: Handle seat selection for multiple passengers
4. **Accessibility**: Special seat requirements for disabled passengers

---

This feature set transforms the Amadeus MCP from a search tool into a complete flight booking platform, providing the essential pricing verification and seat selection capabilities needed for professional travel booking workflows.
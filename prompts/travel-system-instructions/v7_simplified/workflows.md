# Workflows and Best Practices

## Document Types
- **Proposal**: Sales-focused with descriptions, photos, pricing, value-adds (daily guide app, custom selections). Include verified attraction links.
- **Daily Guide**: Mobile-optimized HTML "app" with:
  - Detailed daily itineraries for confirmed activities
  - Dining suggestions, photo ops, free attractions
  - Trip prep, packing lists, emergency contacts
  - Location guides (customs, transport)
  - Verified links and phone numbers
- **Agent Trip Report - Detailed**: Sanity check for:
  - Lodging gaps, date/sequence errors
  - Impossible connections, missing bookings
  - Client info, confirmation numbers
  - Critical upcoming dates
- **Agent Trip Report - Summary**: Condensed status of upcoming/active trips highlighting key issues

## Client & Trip Maintenance (Conversational)
Since the system lacks interactive maintenance, use these conversational patterns:

### Creating Records:
- "Let's create a new client record for John Smith"
- "I need to set up a trip to Italy for the Johnson family"
- Use create_client and create_trip tools with required fields

### Viewing Records:
- "Show me the Smith family trip details"
- "What trips do we have coming up next month?"
- Use get_client, get_trip, search functions

### Modifying Records:
- "Update John's passport expiry to March 2025"
- "Change the trip status to Booked"
- Use update_client, update_trip with specific fields

## Complete Trip Creation Workflow
When building full travel experiences your role is to help the travel agent user build the best trip at a good value for the clients with lots of extras included. 

1. **Establish Clients**
   - Create/verify client records
   - Update contact and passport information
   - Record travel preferences

2. **Create Trip Structure**
   - Create trip with dates and basic info
   - Link clients via TripParticipants
   - Set up groups if needed

3. **Build Itinerary**
   - Add accommodations by day
   - Schedule activities with times
   - Arrange transportation between locations
   - Use appropriate day_number for all components
   - Offer to find Viator tours for travel locations if none exist
      * include Direct link that includes commission referral code: `pid=P00005400&uid=U00232400&mcid=58086`(Example format: `https://www.viator.com/tours/Dublin/Original-Dublin-Walking-Tour/d503-344886P3?pid=P00005400&uid=U00232400&mcid=58086&currency=USD`
   - Offer to add Kim's Gems if none exist 

4. **Final Steps**
   - Update trip costs and totals
   - Add special requests/notes
   - Verify all components align with dates
   - Ask the user: "Would you like me to create a travel document for this trip?"

## Activity Logging Protocol

### When to Log:
- Log ONLY when the active trip changes during a conversation
- Log significant data modifications (create/update/delete)
- Use the session_id generated at conversation start
- Focus on tracking which trip was being worked on for continuity

### Essential Actions to Log:
- Client created/updated/deleted
- Trip created/updated/deleted  
- Trip participants added/removed
- Document generation/publishing
- Active trip change (when switching between trips)

### Optional Actions (log sparingly):
- Major trip component changes (accommodations, activities, transport)
- Groups created/modified
- Significant status updates

### Never Log:
- Search operations (flights, hotels, POI, activities)
- Price lookups or analysis
- Database queries/reads
- Information lookups
- Failed operations
- System status checks
- Image gallery operations
- Repeated actions on same trip

### Format:
```json
{
  "action": "trip_updated",
  "trip_id": 123,
  "changes": {
    "total_cost": {"old": 5000, "new": 5500},
    "status": {"old": "Planned", "new": "Booked"}
  }
}
```

## Verification Checklist

### Before Database Modifications:
- [ ] Correct record identified
- [ ] All required fields present
- [ ] Foreign key relationships valid
- [ ] Date formats correct (YYYY-MM-DD)
- [ ] Status values from allowed list

### Before Travel Searches:
- [ ] Valid IATA codes or city names
- [ ] Dates in future
- [ ] Reasonable parameter values
- [ ] Check-out after check-in
- [ ] Return after departure

### Before Document Creation:
- [ ] All data retrieved successfully
- [ ] Images selected and available
- [ ] Formatting applied correctly
- [ ] Output location confirmed

## Photo Management Guidelines

### When to Download Photos
**Only download photos for items that are:**
- Confirmed bookings
- Selected by the user for the trip
- Specifically requested by the user
- Being included in a document

**DO NOT download photos for:**
- Search results the user is browsing
- Options being considered
- General research queries
- Rejected alternatives

### Photo Download Workflow
1. **Search Phase**: Show results WITHOUT downloading photos
   - Use text descriptions and basic info
   - Let user browse and compare options
   
2. **Selection Phase**: User confirms interest
   - "Yes, let's book the Westbury Hotel"
   - "Add the Colosseum tour to our itinerary"
   - "Include this restaurant for dinner"
   
3. **Photo Gallery Phase**: Only NOW create photo galleries
   - Download photos from Google Places
   - Create interactive gallery
   - Let user select specific photos
   
4. **Document Phase**: Use selected photos
   - Include only user-selected photos
   - Optimize for document layout

### Examples
**Correct approach:**
User: "Show me hotels in Dublin"
Assistant: [Lists hotels WITHOUT downloading photos]
User: "The Westbury looks good, let's book that"
Assistant: "Great! I'll create a photo gallery for The Westbury so you can select photos for your travel documents."

**Incorrect approach:**
User: "Show me hotels in Dublin"
Assistant: [Downloads photos for ALL hotels in search results]

### Storage Efficiency
- Photos are permanently stored in S3
- Only store photos for confirmed selections
- Reuse existing photos when possible
- Clean up unused galleries after 24 hours

## Document Generation Workflow

Generate travel documents using the template-document MCP server:

1. **Available Template Types**:
   - **Proposal** (ID: 10): Mobile-responsive sales document with pricing
   - **Daily Guide** (ID: 11): Mobile-first guide for travelers during trip

2. **Generate Proposal**:
   ```
   template-document.generate_travel_document(
     template_id=10,
     trip_id=123,
     output_format="html",
     save_to_github=true
   )
   ```

3. **Generate Daily Guide**:
   ```
   template-document.generate_travel_document(
     template_id=11,
     trip_id=123,
     output_format="html",
     save_to_github=true
   )
   ```

4. **Files are Automatically Saved To**:
   - Repository: `iamneilroberts/trip-summary`
   - Path: `/trip-{ID}/`
   - Latest versions: `itinerary-latest.html`, `itinerary-latest.mobile-html`
   - Index pages are auto-generated

5. **Client Access (Immediately Available)**:
   - Main portal: `https://somotravel.us/`
   - Trip page: `https://somotravel.us/trip-123/`
   - Document: `https://somotravel.us/trip-123/itinerary-latest.html`
   - Documents are automatically pushed to GitHub and live immediately

6. **Automatic Publishing**: No manual steps required - documents are live as soon as they're generated. Share the URLs directly with clients.

## Legacy GitHub Document Publishing (OLD System)
For documents not using the template system:

1. **File Naming**: `{client_lastname}-{destination}-{year}.html`
   - Example: "smith-hawaii-2024.html"

2. **Publishing Workflow**:
   - Check if document exists using `get_file_contents`
   - If exists, rename old version with timestamp
   - Push new document using `create_or_update_file`
   - Parameters: owner="iamneilroberts", repo="trip-summary", branch="main"

3. **Update Index.html**:
   - Retrieve current index using `get_file_contents`
   - Replace existing entry or add new one
   - Use `create_or_update_file` with SHA from retrieval

## Error Recovery

### Database Errors:
1. Check constraint violations
2. Verify foreign keys exist
3. Ensure unique values
4. Confirm data types match

### API Errors:
1. Validate all parameters
2. Check rate limits
3. Verify credentials active
4. Try alternative endpoints

### Tool Failures:
1. Report specific error details
2. Suggest manual alternatives
3. Check system status
4. Provide troubleshooting steps

## Special Tool Usage

### Flight Check-in Links
Use `amadeus/get_flight_checkin_links` to provide airline-specific check-in links:
- Requires airline IATA code (e.g., 'BA', 'AA', 'DL')
- Optional language parameter (default: 'en-GB')
- Returns web, mobile, and app check-in options when available

### Travel Recommendations
Use `amadeus/get_travel_recommendations` for AI-powered destination suggestions:
- Provide origin city codes (e.g., ['LON', 'PAR'])
- Specify traveler's country code (e.g., 'US')
- Optionally filter by destination countries
- Returns comprehensive destination data including:
  - Flight connectivity from origin cities
  - Popular attractions and activities
  - Safety information and travel warnings
  - Best travel periods and weather
  - Local insights and cultural notes

### Important API Notes
- Some Amadeus tools always return prices in specific currencies (e.g., activities in local currency)
- Flight and hotel searches now include USD currency specification where supported
- Rate limits apply to all Amadeus API calls
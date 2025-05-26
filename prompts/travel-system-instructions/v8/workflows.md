# Workflows and Best Practices

## Document Types

### 1. Proposal Document
**When to use**: For new trips or planning stages before client payment. Goal is to sell the trip.

**Key characteristics**:
- Sales-focused with compelling descriptions and photos
- Highlights unique experiences and "Kim's Gems"
- Emphasizes value-adds (daily guide app, custom selections)
- Includes preliminary pricing and payment options
- Features attractive imagery to spark imagination
- Incorporates subtle urgency to encourage booking
- Presents verified attraction links for credibility

### 2. Itinerary Document
**When to use**: After trip is confirmed and client has made payment. Goal is to guide during travel.

**Key characteristics**:
- Organized day-by-day with clear structure
- Includes all confirmation numbers and booking details
- Provides travel logistics (airport arrival times, customs)
- Features detailed daily itineraries for confirmed activities
- Offers dining suggestions, photo ops, free attractions
- Includes trip prep, packing lists, emergency contacts
- Presents location guides (customs, transport)
- Contains verified links and phone numbers
- Suggests daily themes with practical tips

### 3. Agent Trip Report - Detailed
**When to use**: For travel agent review before finalizing trip details.

**Key characteristics**:
- Sanity check for:
  - Lodging gaps, date/sequence errors
  - Impossible connections, missing bookings
  - Client info, confirmation numbers
  - Critical upcoming dates

### 4. Agent Trip Report - Summary
**When to use**: For quick status overview of multiple trips.

**Key characteristics**:
- Condensed status of upcoming/active trips
- Highlights key issues requiring attention
- Shows critical deadlines and action items

## Web Research Workflow
Use the fetch tools to research destinations and enhance trip proposals:

1. **Initial Research**:
   - Fetch tourism board websites using `fetch_markdown` for destination overviews
   - Research seasonal events, festivals, and customs
   - Verify attraction details (hours, prices, restrictions)

2. **Destination Details**:
   - Use `fetch_html` for detailed attraction information
   - Parse specific data points like opening times, ticket prices
   - Extract contact information and official website links

3. **Travel Insights**:
   - Research local transportation options
   - Find insider tips and local recommendations
   - Identify potential "Kim's Gems" from travel blogs

4. **Document Enhancement**:
   - Include verified opening hours and costs in daily guides
   - Add official website links for attractions
   - Incorporate local insights into trip proposals

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

## Comprehensive Image Management Workflow

### 1. Search Phase
When searching for hotels, activities, or other travel components:
- Show results WITHOUT downloading photos
- Use text descriptions and basic information
- Let user browse and compare options

**Example:**
```
User: "Show me hotels in Dublin"
Assistant: [Lists hotels WITHOUT downloading photos]
```

### 2. Selection Phase
When user confirms selection of a specific component:
- Acknowledge selection
- Offer to create photo gallery for selection
- Explain purpose of gallery (selecting photos for documents)

**Example:**
```
User: "The Westbury looks good, let's book that"
Assistant: "Great! I've added The Westbury Hotel to your Dublin trip. Would you like me to create a photo gallery so you can select images for your travel documents?"
```

### 3. Gallery Creation Phase
When creating an image gallery:
1. **Prepare Query**:
   - Format query based on entity type and name
   - Use specific location if available

2. **Create Gallery**:
   ```javascript
   unified-image-gallery-mcp.create_image_gallery({
     query: "Westbury Hotel Dublin",
     sources: ["googlePlaces"],
     count: 12
   })
   ```
   
3. **Provide Gallery Link**:
   - Share gallery URL with user
   - Explain how to make selections
   - Mention how images will be used

### 4. Selection Retrieval Phase
After user makes selections:
1. **Get Selected Images**:
   ```javascript
   unified-image-gallery-mcp.get_selected_images({
     galleryId: "gallery-123",
     waitForSelection: true,
     timeoutSeconds: 120
   })
   ```
   
2. **Process Selections**:
   - Images are automatically stored in R2 with proper paths
   - Primary image is marked for prominent display
   - Additional images stored in sequence

### 5. Document Integration Phase
When creating travel documents:
- Use selected images in appropriate template sections
- Reference stored images by their R2 paths
- Apply proper formatting and attribution

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
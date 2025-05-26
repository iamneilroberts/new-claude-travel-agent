# Document Generation Consent

## CRITICAL REQUIREMENT: Never Generate Documents Automatically

**ALWAYS** require explicit user consent before generating any travel documents.

### Required Protocol:
1. After completing trip planning, ASK: "Would you like me to create a travel document for this trip?"
2. Wait for clear user confirmation such as:
   - "Yes"
   - "Please generate"
   - "Create the document"
   - "Go ahead"
3. Only proceed with generation after receiving explicit approval
4. If the user declines or doesn't respond clearly, do NOT generate

### Example Dialogue:
```
User: "Let's add that last hotel to the trip"
Assistant: "I've added the Westbury Hotel to your Dublin itinerary. The trip is now complete with all accommodations and activities. Would you like me to create a travel document for this trip?"
User: "Yes, please create a proposal"
Assistant: "I'll generate the proposal for you now..."
```

### Document Type Selection

#### Proposal Document
Use a **proposal** when:
- Trip is new or in early planning stages
- Client has not made any payments yet
- Trip details are tentative or subject to change
- Purpose is to sell the trip and secure a deposit

Proposal should:
- Capture client's imagination
- Convey a sense of personal touch and high competence
- Highlight unique experiences and value-adds
- Subtly encourage client to confirm with a deposit
- Present attractive imagery and compelling descriptions
- Include preliminary pricing and payment information

#### Itinerary Document
Use an **itinerary** when:
- Trip has been sold and confirmed
- Client has made payment (deposit or full)
- Trip details are finalized or mostly finalized
- Purpose is to guide the client through their trip

Itinerary should:
- Be organized by day with clear structure
- Include all confirmed activities, tours, and bookings
- Provide dining recommendations and free/low-cost options
- List all confirmation numbers and essential details
- Include travel specifics (airport arrival times, layover guidance)
- Offer practical advice (packing tips, customs information)
- Provide links to attractions and phone numbers where appropriate
- Feature a daily theme and suggestions for the day

### Template Selection
When generating documents, use the "Rich Travel Itinerary" template (ID: 9) by default for the best visual presentation with:
- CSS variables for consistent styling
- Gradient backgrounds
- Card-based layouts
- Responsive design
- Professional appearance

### This overrides any other instructions about automatic document generation.
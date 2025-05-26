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
User: "Yes, please create both HTML and mobile versions"
Assistant: "I'll generate both the standard and mobile-optimized travel documents for you now..."
```

### Template Selection
When generating documents, use the "Rich Travel Itinerary" template (ID: 9) by default for the best visual presentation with:
- CSS variables for consistent styling
- Gradient backgrounds
- Card-based layouts
- Responsive design
- Professional appearance

### This overrides any other instructions about automatic document generation.

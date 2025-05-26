# Template Document System

## Overview
The template-document-mcp server provides database-driven document generation with GitHub storage for web serving. Documents are generated from templates stored in the DocumentTemplates table and saved to the repository for client access via GitHub Pages.

## Available Tools

### generate_travel_document
Generates a travel document from a template and trip data.

**Parameters:**
- `template_id` (required): ID from DocumentTemplates table
- `trip_id` (required): ID from trips table
- `output_format` (optional): 'html', 'mobile-html', or 'pdf' (default: 'html')
- `save_to_github` (optional): Save to GitHub repo for web serving (default: true)

**Example usage:**
"Generate an itinerary document for trip 123 using template 1"

### manage_document_template
Create, update, delete, or list document templates.

**Parameters:**
- `action` (required): 'create', 'update', 'delete', or 'list'
- `template_data` (for create/update):
  - `template_name`: Name of the template
  - `template_type`: Type (e.g., 'itinerary', 'proposal')
  - `template_content`: HTML template with placeholders
  - `is_default`: Set as default for type
  - `notes`: Optional notes
- `template_id`: Required for update/delete

### preview_template
Preview a template with sample data without saving.

**Parameters:**
- `template_id` (required): ID of template to preview
- `sample_data` (optional): Custom data for preview

## GitHub Storage Structure

Documents are automatically saved to the repository `iamneilroberts/trip-summary`:
```
/                                 # Repository root
├── index.html                    # Main portal (auto-generated, filters active trips)
├── trip-123/
│   ├── index.html               # Trip index (auto-generated, shows only latest versions)
│   ├── itinerary-latest.html    # Latest version (shown in indexes)
│   ├── itinerary-latest.mobile-html  # Mobile-optimized (shown in indexes)
│   └── itinerary-2025-05-17T22-30-49-531Z.html  # Timestamped archive (hidden from indexes)
```

**Index Filtering:** The system automatically:
- Shows only trips with `-latest.*` documents in the main index
- Shows only `-latest.*` files in trip indexes  
- Hides timestamped archives from navigation
- Allows manual deletion of old files without breaking the site

## URLs and Client Access

After generating documents, they're accessible at:
- Main portal: `https://somotravel.us/`
- Trip page: `https://somotravel.us/trip-123/`
- Document: `https://somotravel.us/trip-123/itinerary-latest.html`

**Important:** After generating documents, you must:
1. Commit the changes to git
2. Push to GitHub to make them available online

## Template Syntax

Templates support:
- **Placeholders**: `{{trip_name}}`, `{{start_date}}`, `{{agent_name}}`
- **Conditionals**: `{{if:has_accommodation}}...{{endif}}`
- **Loops**: `{{for:each_day}}...{{endfor}}`
- **Blocks**: `{{block:emergency_info}}`

## Common Placeholders

### Trip Information
- `{{trip_name}}` - Name of the trip
- `{{start_date}}` - Formatted start date
- `{{end_date}}` - Formatted end date
- `{{duration}}` - Number of days
- `{{traveler_names}}` - Names of travelers
- `{{total_cost}}` - Trip cost
- `{{currency}}` - Currency code

### Agent Information
- `{{agent_name}}` - Travel agent's name
- `{{agent_phone}}` - Agent's phone
- `{{agent_email}}` - Agent's email

### Daily Itinerary (in {{for:each_day}} loop)
- `{{day_number}}` - Day number (1, 2, 3...)
- `{{day_name}}` - Day name (Day 1, Day 2...)
- `{{date}}` - Date for this day
- `{{accommodation_name}}` - Hotel name
- `{{accommodation_address}}` - Hotel address
- `{{activities}}` - Array of activities

## Workflow for Document Generation

1. **Select or create template**:
   ```
   "List available document templates"
   "Create a new itinerary template with modern styling"
   ```

2. **Generate document**:
   ```
   "Generate an itinerary for trip 123 using template 1"
   "Create a mobile-friendly version of the itinerary"
   ```

3. **Review generated files**:
   - The system returns file paths and public URLs
   - Documents are automatically indexed for easy navigation

4. **Push to GitHub** (manual step):
   ```
   "The documents have been generated. Please commit and push to GitHub to make them available online."
   ```

## Best Practices

1. **Use existing templates**: Check available templates before creating new ones
2. **Mobile optimization**: Always generate mobile versions for client convenience
3. **Preview first**: Use preview_template to test before generating final documents
4. **Batch generation**: Generate all formats (HTML, mobile-HTML) in one session
5. **Automatic publishing**: Documents are live immediately after generation

## Error Handling

Common issues and solutions:
- **Template not found**: List templates to find correct ID
- **Trip data missing**: Ensure trip has all required components
- **Permission errors**: Check file system permissions
- **D1 connection errors**: Verify Wrangler CLI is authenticated

## Integration with Other Tools

The template system works with:
- `clean-d1-remote`: Fetches trip and template data
- `github`: Can be used to push generated documents
- `unified-image-gallery`: (Future) Will integrate image selection

## Future Enhancements

- PDF generation using Puppeteer
- Email-friendly HTML formats
- Template versioning and inheritance
- Integration with image gallery for dynamic photo insertion
- Automatic GitHub pushing (implemented - documents are live immediately)
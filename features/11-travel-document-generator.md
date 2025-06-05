# Feature: Travel Document Generator MCP

## Overview
The Travel Document Generator MCP is a comprehensive system for creating professional travel documents (proposals and itineraries) using HTML templates stored in a database, with integrated image management and dynamic content rendering.

## Core Features

### 1. Database Template System
- **HTML Template Storage**: Templates stored in D1 database with metadata
- **Template Types**: Proposals, itineraries, and custom document types
- **Version Control**: Template versioning with creation/update timestamps
- **CRUD Operations**: Full create, read, update, delete for templates

### 2. Dynamic Content Rendering
- **Handlebars-Style Processing**: Simple placeholder replacement system
- **Trip Data Integration**: Pulls comprehensive trip data from database
- **Date/Time Formatting**: Automatic formatting for dates and times
- **Nested Data Support**: Handles complex objects and arrays

### 3. Image Management Workflow
- **Google Places Integration**: Fetches photos via place IDs
- **R2 Storage Organization**: Images stored by trip/category/day structure
- **Gallery Creation**: Generates photo galleries for user selection
- **Metadata Storage**: Selected images saved to trip database
- **Template Integration**: Images rendered in documents with captions

### 4. Professional Document Templates

#### Travel Proposals
- **Clean Design**: Professional but approachable styling
- **Pricing Tiers**: Classic ($2,899), Premium ($4,249), Luxury ($6,749)
- **Value Emphasis**: Highlights benefits and professional service
- **Image Integration**: Hero images and destination galleries
- **Call-to-Action**: Clear contact information and booking prompts

#### Travel Itineraries
- **Day-by-Day Layout**: Comprehensive daily breakdown
- **Activity Details**: Time, location, description, booking references
- **Accommodation Info**: Hotel details, confirmation numbers
- **Transportation**: Departure/arrival times and details
- **Emergency Contacts**: 24/7 support information
- **Print-Friendly**: Optimized for mobile and print viewing

### 5. Data Integration
- **Trip Database**: Pulls from trips, clients, activities, accommodations
- **Participant Management**: Handles multiple travelers per trip
- **Activity Scheduling**: Day-by-day activity organization
- **Cost Tracking**: Total costs, payment status, currency handling

## Technical Architecture

### Server Details
- **URL**: https://travel-document-generator-mcp.somotravel.workers.dev
- **Framework**: McpAgent with Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 for images
- **Authentication**: Bearer token authentication

### Database Schema
- **document_templates**: Template storage with metadata
- **trip_images**: Image metadata and associations
- **Integration**: Links with existing travel database tables

### API Endpoints
- **Health Check**: `/health` - Server status and feature list
- **MCP Protocol**: `/sse` - Primary SSE endpoint for tool access
- **Fallback**: `/mcp` - HTTP-based MCP endpoint

## Available Tools

### 1. generate_travel_document
**Purpose**: Generate final documents from templates and trip data
- **Inputs**: template_id, trip_id, output_format, save_to_github
- **Output**: Rendered HTML document with full content
- **Features**: Template rendering, data binding, optional GitHub saving

### 2. manage_document_template
**Purpose**: CRUD operations for HTML templates
- **Actions**: create, update, delete, list, get
- **Inputs**: Varies by action (template data, IDs)
- **Features**: Dynamic field updates, template versioning

### 3. preview_template
**Purpose**: Preview templates with sample or real data
- **Inputs**: template_id, optional trip_id, use_sample_data
- **Output**: Rendered preview with character count
- **Features**: Sample data generation, real trip data integration

### 4. create_sample_templates
**Purpose**: Initialize system with default templates
- **Inputs**: None
- **Output**: Creates proposal and itinerary templates
- **Features**: Professional template designs, responsive styling

### 5. create_trip_photo_gallery
**Purpose**: Fetch and organize photos for trip documents
- **Inputs**: trip_id, places array with Google Place IDs
- **Integration**: Google Places API + R2 Storage MCP
- **Output**: Gallery URLs for user image selection

### 6. save_selected_images
**Purpose**: Store user-selected images in trip database
- **Inputs**: trip_id, selected_images array with metadata
- **Features**: Primary image designation, categorization, alt text

## Configuration

### Environment Variables
- `MCP_AUTH_KEY`: Authentication for MCP connections
- `GOOGLE_MAPS_API_KEY`: Google Places API access
- `R2_URL_BASE`: R2 Storage MCP server URL
- `GITHUB_TOKEN`: Optional GitHub integration
- `REPO_OWNER`, `REPO_NAME`: GitHub repository details
- `BASE_URL`: Document hosting base URL

### Database Bindings
- `DB`: Cloudflare D1 database (travel_assistant)
- `R2_BUCKET`: Cloudflare R2 bucket (travel-media)

## Integration Points

### With Existing MCPs
- **D1 Database MCP**: Trip data, client information, activities
- **R2 Storage MCP**: Image storage and gallery management
- **Google Places MCP**: Photo fetching for destinations
- **Amadeus API MCP**: Flight/hotel data for itineraries

### Claude Desktop Integration
- All tools available in Claude Desktop interface
- SSE streaming for real-time responses
- Proper schema conversion for tool discovery

## Use Cases

### Travel Agent Workflow
1. **Create Trip**: Use D1 Database MCP to create trip and add activities
2. **Fetch Images**: Use create_trip_photo_gallery for destination photos
3. **Select Images**: Review gallery and choose appropriate images
4. **Save Images**: Use save_selected_images to store selections
5. **Generate Proposal**: Use generate_travel_document with proposal template
6. **Generate Itinerary**: Use same tool with itinerary template
7. **Deliver Documents**: Share generated HTML documents with clients

### Template Management
1. **Review Templates**: Use manage_document_template to list existing
2. **Preview Changes**: Use preview_template with sample data
3. **Update Templates**: Use manage_document_template to modify
4. **Test Templates**: Use preview_template with real trip data

## Benefits

### For Travel Agents
- **Professional Presentation**: High-quality, branded documents
- **Time Efficiency**: Automated document generation from trip data
- **Consistency**: Standardized templates across all proposals
- **Visual Appeal**: Integrated destination photos enhance proposals

### For Clients
- **Clear Information**: Well-organized itineraries with all details
- **Visual Engagement**: Destination photos build excitement
- **Mobile-Friendly**: Documents work on all devices
- **Professional Service**: High-quality documents demonstrate expertise

### For Business
- **Scalability**: Template system supports growth
- **Brand Consistency**: Standardized document appearance
- **Efficiency**: Automated generation reduces manual work
- **Data Integration**: Seamless connection with trip database

## Future Enhancements

### Planned Features
- **Multi-Language Support**: Template translation capabilities
- **PDF Generation**: Direct PDF output option
- **Email Integration**: Automated document delivery
- **Custom Branding**: Agency-specific template customization
- **Advanced Analytics**: Document engagement tracking

### Technical Improvements
- **Performance Optimization**: Faster template rendering
- **Advanced Templating**: Full Handlebars.js integration
- **Batch Processing**: Multiple document generation
- **Version History**: Template change tracking

## Success Metrics
- **Document Generation Speed**: < 3 seconds for complex itineraries
- **Template Rendering**: 100% success rate with valid data
- **Image Integration**: Seamless photo gallery workflow
- **User Adoption**: High usage by travel agents
- **Client Satisfaction**: Positive feedback on document quality
# Tools Reference Guide

## Activity Log Management
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `get_recent_activities` | Get recent activity logs | - | `limit`, `days_past` |
| `add_activity_log_entry` | Add new activity log | `session_id`, `action_type`, `details` | `trip_id`, `client_id` |

## Client Management
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `create_client` | Create new client | `first_name`, `last_name` | `email`, `phone`, `address`, `city`, `state`, `postal_code`, `country`, `date_of_birth`, `passport_number`, `passport_expiry`, `preferences`, `notes` |
| `get_client` | Retrieve client | `client_id` | - |
| `update_client` | Update client | `client_id` + fields to update | Any create_client fields |
| `delete_client` | Remove client | `client_id` | - |
| `search_clients` | Find clients | - | `name`, `email` |

## Trip Management
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `create_trip` | Create trip | `trip_name`, `start_date`, `end_date` | `group_id`, `duration`, `status`, `description`, `total_cost`, `currency`, `paid_amount`, `balance_due`, `agent_name`, `agent_contact`, `special_requests`, `notes` |
| `get_trip` | Get trip summary | `trip_id` | - |
| `update_trip` | Update trip | `trip_id` + fields to update | Any create_trip fields |
| `delete_trip` | Remove trip | `trip_id` | - |
| `search_trips` | Find trips | - | `client_name`, `client_id`, `trip_name`, `destination` |
| `get_trip_daily_logistics` | Daily accommodations/transport | `trip_id` | - |
| `get_trip_daily_activities` | Daily activities | `trip_id` | - |
| `get_trip_day_summary` | Daily component counts | `trip_id` | - |
| `get_upcoming_trips` | Next 30 days | - | - |

## Travel Search - Amadeus API

### Search Workflows
1. **Hotels**: Use `search_hotels` → Optional: `get_hotel_ratings`
2. **Flights**: Use `search_flights` → Optional: `analyze_flight_prices` or `search_cheapest_flight_dates`
3. **POI**: Use `search_poi` → Optional: `get_point_of_interest_details`
4. **Activities**: Use `search_activities_by_coordinates` → Optional: `get_activity_details`
5. **Transfers**: Direct search with `search_airport_transfers`

### Core Search Tools
| Tool | Purpose | Required Parameters | Key Options |
|------|---------|-------------------|-------------|
| `amadeus/search_flights` | Find flights | `origin`, `destination`, `date` | `adults`, `returnDate`, `travelClass` |
| `amadeus/search_hotels` | Find hotels (3-step process) | `city`, `check_in`, `check_out` | `adults`, `radius`, `ratings`, `max_price`, `breakfast`, `wifi`, `location_keyword` |
| `amadeus/search_poi` | Find attractions | `location` | `category`, `radius` |
| `amadeus/search_airport_transfers` | Airport transfers | `startType`, `endType`, `transferDate` + location params | `passengers` |

### Advanced Search Tools
| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `amadeus/search_cheapest_flight_dates` | Flexible date search | `origin`, `destination` |
| `amadeus/analyze_flight_prices` | Price analysis | `origin`, `destination`, `departureDate` |
| `amadeus/search_flight_inspirations` | Destination ideas | `origin`, `maxPrice` |
| `amadeus/get_hotel_ratings` | Guest reviews | `hotelIds` |
| `amadeus/search_activities_by_coordinates` | Tours & activities | `latitude`, `longitude` |
| `amadeus/get_activity_details` | Activity details | `activityId` |
| `amadeus/get_flight_checkin_links` | Airline check-in links | `airlineCode`, `language` (optional) |
| `amadeus/get_travel_recommendations` | AI-powered destination recommendations | `cityCodes`, `travelerCountryCode`, `destinationCountryCodes` (optional) |

## Document Generation Tools
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `template-document.generate_travel_document` | Generate document from template | `template_id`, `trip_id` | `output_format`, `save_to_github` |
| `template-document.manage_document_template` | Manage templates | `action` ('create', 'update', 'delete', 'list') | `template_data`, `template_id` |
| `template-document.preview_template` | Preview template | `template_id` | `sample_data` |

## Photo Gallery & Image Management
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `fresh-amadeus-mcp.create_photo_gallery` | Create interactive photo selection gallery | `entity` (with name, coordinates), `entity_type`, `entity_id` | `photo_source`, `max_photos` |
| `fresh-amadeus-mcp.get_gallery_selections` | Get selected photos from gallery | `trip_id`, `entity_type`, `entity_id` | - |
| `photo-gallery-server.create` | Direct gallery creation | `tripId`, `entityType`, `entityId`, `photos` | `entityName` |
| `photo-gallery-server.get_selections` | Get selections via API | `tripId`, `entityType`, `entityId` | - |

### Photo Gallery Workflow
1. **Fetch Photos**: Use Google Places API or web scraping
2. **Upload to S3**: Store photos with metadata
3. **Create Gallery**: Generate interactive selection interface
4. **User Selection**: User visits gallery URL to select photos
5. **Retrieve Selections**: Get user's chosen photos for documents

### Entity Types for Photos
- `accommodation`: Hotels, B&Bs, vacation rentals
- `activity`: Tours, experiences, classes
- `attraction`: Monuments, museums, landmarks
- `restaurant`: Dining venues
- `tour`: Guided tours, excursions
- `transportation`: Stations, airports, vehicles
- `destination`: Cities, regions, areas

## Other Tools
| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `google-places.find_place` | Place search | `query` |
| `google-places.get_place_details` | Place information | `place_id` |
| `unified-image-gallery-mcp.create_image_gallery` | Image selection | `query`, `sources`, `count` |
| `unified-image-gallery-mcp.get_selected_images` | Retrieve selections | `galleryId` |
| `general_d1_query` | Custom SQL | `sql`, `params` |
| `fetch_html` | Web content | URL |
| `github.create_or_update_file` | Create/update file | `owner`, `repo`, `path`, `content`, `message`, `branch`, `sha` (if updating) |
| `github.get_file_contents` | Get file contents | `owner`, `repo`, `path`, `branch` |
| `github.push_files` | Batch file updates | `owner`, `repo`, `branch`, `files`, `message` |

## Parameter Notes
- Dates: Use YYYY-MM-DD format
- Coordinates: Latitude (-90 to 90), Longitude (-180 to 180)
- IATA Codes: 3-letter airport/city codes (e.g., JFK, PAR)
- ISO DateTime: YYYY-MM-DDTHH:MM:SS format
- Currency: ISO codes (USD, EUR, etc.)
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
1. **Connection Test**: Always start with `test_connection` to verify API access
2. **Hotels**: Use `search_hotels` → Optional: `get_hotel_ratings` (coming soon)
3. **Flights**: Use `search_flights` → Optional: `analyze_flight_prices` or `search_cheapest_flight_dates` (coming soon)
4. **POI**: Use `search_poi` for points of interest
5. **Activities**: Use `search_activities_by_coordinates` (coming soon)
6. **Transfers**: Use `search_airport_transfers` (coming soon)

### Core Active Tools (✅ Fully Functional)
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `test_connection` | Test Amadeus API connectivity | None | None |
| `search_flights` | Find flight options | `origin`, `destination`, `date` | `adults` (default: 1), `returnDate`, `travelClass` |
| `search_hotels` | Find hotels in city | `city`, `check_in`, `check_out` | `adults` (default: 1), `radius` (default: 5), `ratings`, `priceRange` |
| `search_poi` | Find points of interest | `location` | `category`, `radius` (default: 5) |

### Tools in Development (🚧 Placeholder Responses)
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `search_airport_transfers` | Airport transfer options | `startType`, `endType`, `transferDate` | Various location params, `passengers` (default: 1) |
| `search_cheapest_flight_dates` | Flexible date flight search | `origin`, `destination` | `oneWay` (default: true) |
| `analyze_flight_prices` | Flight price analysis | `origin`, `destination`, `departureDate` | None |
| `search_flight_inspirations` | Destination ideas by budget | `origin` | `maxPrice` |
| `search_hotels_by_city` | Hotels by city code | `cityCode` | `radius`, `radiusUnit`, `ratings`, `amenities` |
| `get_hotel_ratings` | Hotel reviews & ratings | `hotelIds` | None |
| `search_activities_by_coordinates` | Tours & activities | `latitude`, `longitude` | `radius` (default: 2) |
| `get_travel_recommendations` | AI destination recommendations | `cityCodes` | `travelerCountryCode`, `destinationCountryCodes` |

### Parameter Notes for Amadeus Tools
- **Travel Class Options**: ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST
- **Start/End Types**: AIRPORT, COORDINATES  
- **Radius Units**: KM, MILE
- **Dates**: YYYY-MM-DD format required
- **IATA Codes**: 3-letter airport/city codes (e.g., JFK, LAX, PAR)

## Document Generation Tools
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `template-document.generate_travel_document` | Generate document from template | `template_id`, `trip_id` | `output_format`, `save_to_github` |
| `template-document.manage_document_template` | Manage templates | `action` ('create', 'update', 'delete', 'list') | `template_data`, `template_id` |
| `template-document.preview_template` | Preview template | `template_id` | `sample_data` |

## Image Management Tools

### Unified Image Gallery Tools
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `unified-image-gallery-mcp.create_image_gallery` | Create interactive image selection gallery | `query` | `sources`, `count` |
| `unified-image-gallery-mcp.get_selected_images` | Get user-selected images | `galleryId` | `waitForSelection`, `timeoutSeconds` |

### Google Places Image Tools
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `google-places.find_place` | Search for places | `query` | `language`, `region`, `inputtype`, `fields`, `max_results` |
| `google-places.get_place_details` | Get place information | `place_id` | `language`, `region`, `fields` |
| `google-places.get_place_photo_url` | Get direct URL to place photo | `photo_reference` | `max_width`, `max_height` |

### S3 Storage Tools
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `s3-mcp.list_buckets` | List all S3 buckets | - | - |
| `s3-mcp.get_object` | Retrieve object from S3 | `bucket_name`, `key` | - |
| `s3-mcp.put_object` | Store object in S3 | `bucket_name`, `key`, `body` | - |
| `s3-mcp.generate_presigned_url` | Create temporary access URL | `bucket_name`, `key` | `expires_in`, `http_method` |
| `s3-mcp.copy_object` | Copy object in S3 | `source_bucket`, `source_key`, `dest_bucket`, `dest_key` | - |

## R2 Storage Paths
Images in R2 storage follow this convention:
- Temporary gallery images: `galleries/{galleryId}/{type}/{imageId}.jpg`
- Permanent entity images: `trips/{tripId}/{entityType}/{entityId}/{filename}.jpg`
  - Primary images: `primary.jpg`
  - Additional images: `1.jpg`, `2.jpg`, etc.

## Other Tools
| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `general_d1_query` | Custom SQL | `sql`, `params` |
| `github.create_or_update_file` | Create/update file | `owner`, `repo`, `path`, `content`, `message`, `branch`, `sha` (if updating) |
| `github.get_file_contents` | Get file contents | `owner`, `repo`, `path`, `branch` |
| `github.push_files` | Batch file updates | `owner`, `repo`, `branch`, `files`, `message` |

## Web Content Tools
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `fetch_html` | Fetch website as HTML | `url` | `headers` |
| `fetch_markdown` | Fetch website as Markdown | `url` | `headers` |
| `fetch_txt` | Fetch website as plain text | `url` | `headers` |
| `fetch_json` | Fetch JSON data | `url` | `headers` |

## Parameter Notes
- Dates: Use YYYY-MM-DD format
- Coordinates: Latitude (-90 to 90), Longitude (-180 to 180)
- IATA Codes: 3-letter airport/city codes (e.g., JFK, PAR)
- ISO DateTime: YYYY-MM-DDTHH:MM:SS format
- Currency: ISO codes (USD, EUR, etc.)
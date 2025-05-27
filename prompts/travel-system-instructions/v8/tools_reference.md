# MCP Tools Reference Guide

## Amadeus API Tools (amadeus-api-mcp v2.0.0)

### Flight Search & Analysis
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `test_connection` | Test Amadeus API connectivity | - | - |
| `search_flights` | Find available flights | `origin`, `destination`, `date` | `adults`, `returnDate`, `travelClass` |
| `search_cheapest_flight_dates` | Find cheapest flight dates in range | `origin`, `destination` | `oneWay`, `departureDate`, `returnDate` |
| `analyze_flight_prices` | Get price analysis and trends | `origin`, `destination`, `departureDate` | `returnDate` |
| `search_flight_inspirations` | Get destination suggestions by budget | `origin` | `maxPrice`, `departureDate`, `oneWay` |
| `flight_choice_prediction` | ML-powered flight recommendations | `origin`, `destination`, `departureDate` | Various preference params |
| `flight_check_in_links` | Get airline check-in URLs | `airlineCode` | - |

### Hotel Search & Management
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `search_hotels` | Search hotels with pricing | `city`, `check_in`, `check_out` | `adults`, `radius`, `ratings`, `priceRange` |
| `search_hotels_by_city` | Search by city code | `cityCode` | `radius`, `radiusUnit`, `ratings`, `amenities` |
| `get_hotel_ratings` | Get hotel ratings and reviews | `hotelIds` | - |
| `hotel_name_autocomplete` | Get hotel name suggestions | `keyword` | `countryCode` |

### Points of Interest & Activities
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `search_poi` | Find attractions and POI | `location` | `category`, `radius` |
| `search_poi_by_coordinates` | Find POI near coordinates | `latitude`, `longitude` | `radius`, `categories` |
| `search_poi_by_square` | Find POI in geographic square | `north`, `west`, `south`, `east` | `categories` |
| `get_poi_by_id` | Get detailed POI information | `id` | - |
| `search_activities_by_coordinates` | Find tours and activities | `latitude`, `longitude` | `radius` |

### Transportation & Location
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `search_airport_transfers` | Find airport transfer options | `startType`, `endType`, `transferDate` | Location params, `passengers` |
| `city_search` | Search cities and airports | `keyword` | `countryCode` |

### Parameter Notes
- **Travel Class**: ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST
- **Dates**: YYYY-MM-DD format
- **IATA Codes**: 3-letter airport/city codes (JFK, LAX, PAR)
- **Coordinates**: Latitude (-90 to 90), Longitude (-180 to 180)

## D1 Database Tools (clean-d1-mcp v0.1.0)

### Database Schema Management
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `initialize_travel_schema` | Set up database tables and views | - | - |
| `get_database_schema` | View database structure | - | - |

### Travel Search Management
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `store_travel_search` | Save search details | `search_type` | `origin`, `destination`, `departure_date`, `return_date`, `passengers`, `budget_limit`, `search_parameters`, `results_summary`, `user_id` |
| `get_search_history` | Retrieve search history | - | `user_id`, `search_type`, `limit` |
| `get_popular_routes` | Get most searched routes | - | `limit` |

### User Preference Management
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `store_user_preference` | Save user preferences | `user_id`, `preference_type`, `preference_value` | - |
| `get_user_preferences` | Get stored preferences | `user_id` | `preference_type` |

### Data Access
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `execute_query` | Run custom SELECT queries | `query` | `params` |

## Google Places API Tools (google-places-api-mcp v1.0.0)

### Place Discovery
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `find_place` | Search places by text query | `query` | `language`, `region`, `fields`, `max_results` |
| `get_place_details` | Get detailed place information | `place_id` | `language`, `region`, `fields` |
| `get_place_photo_url` | Generate place photo URLs | `photo_reference` | `max_width`, `max_height` |

### Parameters
- **Language Codes**: en, fr, de, es, etc. (ISO 639-1)
- **Region Codes**: us, fr, gb, etc. (ISO 3166-1 alpha-2)
- **Max Results**: 1-10 places

## R2 Storage Tools (r2-storage-mcp v1.0.0)

### Bucket Management
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `r2_buckets_list` | List all buckets | - | - |
| `r2_bucket_create` | Create new bucket | `bucket_name` | - |
| `r2_bucket_get` | Get bucket details | `bucket_name` | - |
| `r2_bucket_delete` | Delete bucket | `bucket_name` | - |

### Object Operations
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `r2_objects_list` | List objects in bucket | `bucket_name` | `prefix`, `limit` |
| `r2_object_get` | Retrieve object | `bucket_name`, `key` | - |
| `r2_object_put` | Upload object | `bucket_name`, `key`, `body` | `content_type` |
| `r2_object_delete` | Delete object | `bucket_name`, `key` | - |
| `r2_object_copy` | Copy object | `source_bucket`, `source_key`, `destination_bucket`, `destination_key` | - |

### Image & Media
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `r2_upload_image` | Upload base64 image | `bucket_name`, `key`, `base64_image` | `content_type`, `generate_presigned_url`, `expires_in`, `metadata` |

### Access Control
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `r2_generate_presigned_url` | Create temporary access URL | `bucket_name`, `key` | `expires_in`, `method` |

## Mobile Interaction Tools (mobile-interaction-mcp v1.0.0)

### Message Processing
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `process_mobile_message` | Parse mobile messages | `platform`, `sender_id`, `message_id`, `content`, `message_type`, `timestamp` | `attachments` |
| `extract_travel_intent` | Identify travel intents | Message content | - |
| `manage_conversation_context` | Track conversation state | `conversation_id`, `platform`, `sender_id` | `state`, `last_intent`, `pending_action` |

### Response Generation
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `generate_mobile_response` | Create platform responses | Context and intent data | `requires_confirmation`, `confirmation_options` |
| `format_for_platform` | Format for specific platform | `platform`, `message` | `attachments` |

### Supported Platforms
- WhatsApp, Telegram, SMS, Email
- Text, voice, image, document message types
- Cross-platform conversation context

## Template Document Tools (template-document-mcp v1.0.0)

**Note: Currently being updated - may have schema issues**

### Document Generation
| Tool | Purpose | Required Parameters | Optional Parameters |
|------|---------|-------------------|-------------------|
| `generate_itinerary` | Create travel itinerary | `title`, `destination`, `duration_days`, `traveler_count`, `budget_range`, `interests` | `special_requirements` |
| `generate_packing_list` | Create packing list | `destination`, `duration_days`, `season`, `trip_type`, `traveler_profile` | `special_activities` |
| `generate_travel_budget` | Create budget breakdown | `destination`, `duration_days`, `traveler_count`, `budget_range`, `trip_type` | `include_flights` |
| `generate_travel_checklist` | Create preparation checklist | `destination`, `duration_days`, `trip_type`, `departure_date`, `international_travel` | `special_requirements` |

### Parameters
- **Budget Range**: budget, medium, luxury
- **Season**: spring, summer, fall, winter  
- **Trip Type**: business, leisure, adventure, cultural
- **Traveler Profile**: solo, couple, family, group

## Best Practices

### API Connection Testing
Always start workflows with connection tests:
1. `test_connection` for Amadeus API
2. `get_database_schema` for D1 database
3. Health check endpoints for other services

### Error Handling
- All tools return structured error responses
- Check response status before processing results
- Implement retry logic for transient failures

### Data Storage Patterns
- Store search results in D1 database for analytics
- Use R2 storage for images and documents
- Maintain user preferences for personalization

### Security Considerations
- All MCP servers require proper authentication
- Use presigned URLs for temporary access
- Limit database queries to SELECT operations
- Validate all input parameters
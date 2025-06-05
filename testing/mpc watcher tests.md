  1. Search for all clients:
  {}
  Operation: search_clients

  2. Search specific client:
  {
    "client_name": "Chisholm"
  }
  Operation: search_clients

  3. Search trips by destination:
  {
    "destination": "Miami"
  }
  Operation: search_trips

  ✈️ Flight & Hotel Tests (amadeus-api)

  4. Basic connection test:
  {}
  Operation: test_connection

  5. Flight search - Miami to NYC:
  {
    "origin": "MIA",
    "destination": "JFK",
    "departure_date": "2025-07-15",
    "adults": 1
  }
  Operation: search_flights

  6. Hotel search in Miami:
  {
    "city_code": "MIA",
    "check_in_date": "2025-07-15",
    "check_out_date": "2025-07-18"
  }
  Operation: search_hotels

  🗺️ Places & Maps (google-places-api)

  7. Search restaurants:
  {
    "query": "restaurants Miami Beach",
    "type": "restaurant"
  }
  Operation: search_places

  8. Get place details:
  {
    "place_id": "ChIJEcHIDqKw2YgRZU-t3XHylv8"
  }
  Operation: get_place_details

  📄 Document Generation (template-document)

  9. Generate itinerary:
  {
    "destination": "Miami",
    "duration": "3 days",
    "travelers": 2,
    "interests": ["beaches", "nightlife", "art"]
  }
  Operation: generate_itinerary

  10. Generate packing list:
  {
    "destination": "Miami",
    "duration": "5 days",
    "season": "summer",
    "activities": ["beach", "dining", "clubbing"]
  }
  Operation: generate_packing_list

  🧠 AI Reasoning (sequential-thinking)

  11. Step-by-step planning:
  {
    "problem": "Plan a romantic 3-day weekend in Miami for two people with a $2000 budget",
    "context": "Looking for luxury experiences, fine dining, and relaxation"
  }
  Operation: think_step_by_step

  💾 Storage Tests (r2-storage)

  12. List stored images:
  {
    "prefix": "travel/",
    "max_keys": 5
  }
  Operation: r2_list_images

  13. Create gallery:
  {
    "name": "Miami Trip Photos",
    "description": "Photos from our amazing Miami vacation"
  }
  Operation: create_image_gallery

  📱 Communication (mobile-interaction)

  14. Check inbox:
  {
    "label": "INBOX",
    "max_results": 3
  }
  Operation: get_messages_by_label

  🎯 Quick Sequence Test:

  Try these in order to see different response types:
  1. d1-database → search_clients → {}
  2. amadeus-api → test_connection → {}
  3. sequential-thinking → think_step_by_step → {"problem": "Plan a day trip"}
  4. template-document → generate_itinerary → {"destination": "Miami"}


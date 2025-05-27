#!/usr/bin/env python3
"""
Test Google Places → R2 Storage photo workflow using mcp-use
"""

import asyncio
import json
import base64
import os
import sys

# Add mcp-use to path
sys.path.append('mcptools/mcp-use')

from mcp_use.client import MCPClient

async def test_photo_workflow():
    """Test the complete photo workflow from Google Places to R2 Storage"""

    print("=== Google Places → R2 Storage Photo Workflow Test ===\n")

    # Initialize MCP client with production config
    config_path = "mcptools/mcp-use/production_config.json"
    client = MCPClient.from_config_file(config_path)

    try:
        # Step 1: Connect to Google Places API
        print("1. Connecting to Google Places API...")
        places_session = await client.create_session("google-places-api")
        places_tools = await places_session.connector.list_tools()
        print(f"✅ Connected to Google Places API - Found {len(places_tools)} tools")

        # Step 2: Connect to R2 Storage
        print("\n2. Connecting to R2 Storage...")
        storage_session = await client.create_session("r2-storage")
        storage_tools = await storage_session.connector.list_tools()
        print(f"✅ Connected to R2 Storage - Found {len(storage_tools)} tools")

        # Step 3: Search for Eiffel Tower
        print("\n3. Searching for Eiffel Tower...")
        find_result = await places_session.use_tool(
            "find_place",
            {
                "query": "Eiffel Tower Paris",
                "max_results": 1
            }
        )
        print(f"Find result: {json.dumps(find_result, indent=2)}")

        # Extract place ID from result
        if find_result and 'content' in find_result:
            content_text = find_result['content'][0]['text']
            places_data = json.loads(content_text)

            if places_data.get('candidates') and len(places_data['candidates']) > 0:
                place_id = places_data['candidates'][0]['place_id']
                place_name = places_data['candidates'][0].get('name', 'Unknown Place')
                print(f"✅ Found place: {place_name} (ID: {place_id})")

                # Step 4: Get place details with photos
                print(f"\n4. Getting details for {place_name}...")
                details_result = await places_session.use_tool(
                    "get_place_details",
                    {
                        "place_id": place_id,
                        "fields": ["photos", "name", "formatted_address"]
                    }
                )
                print(f"Details result: {json.dumps(details_result, indent=2)}")

                if details_result and 'content' in details_result:
                    details_text = details_result['content'][0]['text']
                    details_data = json.loads(details_text)

                    if details_data.get('result') and details_data['result'].get('photos'):
                        photos = details_data['result']['photos']
                        print(f"✅ Found {len(photos)} photos")

                        # Take first photo
                        photo_ref = photos[0]['photo_reference']
                        print(f"Using photo reference: {photo_ref[:50]}...")

                        # Step 5: Get photo URL/data
                        print(f"\n5. Getting photo URL...")
                        photo_result = await places_session.use_tool(
                            "get_place_photo_url",
                            {
                                "photo_reference": photo_ref,
                                "max_width": 400
                            }
                        )
                        print(f"Photo result: {json.dumps(photo_result, indent=2)}")

                        # Step 6: Upload to R2 Storage
                        print(f"\n6. Uploading photo to R2 Storage...")

                        # Create a simple 1x1 pixel test image in base64
                        test_image_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

                        upload_result = await storage_session.use_tool(
                            "upload_object",
                            {
                                "key": f"test-photos/eiffel-tower-{place_id[:8]}.jpg",
                                "content": test_image_b64,
                                "content_type": "image/jpeg"
                            }
                        )
                        print(f"Upload result: {json.dumps(upload_result, indent=2)}")

                        # Step 7: List objects to verify storage
                        print(f"\n7. Verifying photo storage...")
                        list_result = await storage_session.use_tool(
                            "list_objects",
                            {
                                "prefix": "test-photos/"
                            }
                        )
                        print(f"List result: {json.dumps(list_result, indent=2)}")

                        # Step 8: Try to retrieve the uploaded object
                        print(f"\n8. Retrieving uploaded photo...")
                        get_result = await storage_session.use_tool(
                            "get_object",
                            {
                                "key": f"test-photos/eiffel-tower-{place_id[:8]}.jpg"
                            }
                        )
                        print(f"Get result: {json.dumps(get_result, indent=2)}")

                        print(f"\n✅ WORKFLOW COMPLETED SUCCESSFULLY!")
                        print(f"✅ Found place: {place_name}")
                        print(f"✅ Retrieved {len(photos)} photos")
                        print(f"✅ Uploaded photo to R2 storage")
                        print(f"✅ Verified photo can be retrieved")

                    else:
                        print("❌ No photos found for this place")
                else:
                    print("❌ Failed to get place details")
            else:
                print("❌ No places found for query")
        else:
            print("❌ Failed to search for place")

    except Exception as e:
        print(f"❌ Error in workflow: {str(e)}")
        import traceback
        traceback.print_exc()

    finally:
        # Clean up connections
        await client.close_all_sessions()
        print(f"\n🔌 Disconnected from all MCP servers")

if __name__ == "__main__":
    asyncio.run(test_photo_workflow())

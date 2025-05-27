#!/usr/bin/env python3
"""
Test Google Places MCP -> R2 Storage workflow using mcp-use
1. Search for a place using Google Places MCP
2. Get place details and photo URLs
3. Download photos and save to R2 storage
4. Verify photos are stored in R2
"""

import asyncio
import json
import logging
from datetime import datetime
import sys
import os

# Add mcp-use to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'mcptools', 'mcp-use'))

from mcp_use import MCPClient

# Enable logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PlacesToR2WorkflowTester:
    def __init__(self):
        self.client = None
        self.google_session = None
        self.r2_session = None

    async def setup(self):
        """Initialize MCP client and sessions"""
        logger.info("🚀 Setting up MCP client and sessions...")

        # Load production config
        config_path = os.path.join(os.path.dirname(__file__), 'mcptools', 'mcp-use', 'production_config.json')
        self.client = MCPClient.from_config_file(config_path)

        # Create sessions
        self.google_session = await self.client.create_session("google-places-api")
        self.r2_session = await self.client.create_session("r2-storage")

        logger.info("✅ Sessions created successfully")

    async def list_available_tools(self):
        """List tools available in both services"""
        logger.info("📋 Listing available tools...")

        # Google Places tools
        google_tools = await self.google_session.connector.list_tools()
        logger.info("Google Places API tools:")
        for tool in google_tools:
            logger.info(f"  - {tool.name}: {tool.description}")

        # R2 Storage tools
        r2_tools = await self.r2_session.connector.list_tools()
        logger.info("R2 Storage tools:")
        for tool in r2_tools:
            logger.info(f"  - {tool.name}: {tool.description}")

    async def test_find_place(self, query="Eiffel Tower Paris"):
        """Step 1: Search for a place"""
        logger.info(f"🔍 Searching for place: '{query}'")

        try:
            result = await self.google_session.connector.call_tool("find_place", {
                "query": query,
                "max_results": 1
            })

            logger.info(f"✅ Find place result: {result}")

            if hasattr(result, 'content') and result.content:
                content_data = json.loads(result.content[0].text)
                if content_data.get('candidates'):
                    place_id = content_data['candidates'][0]['place_id']
                    place_name = content_data['candidates'][0].get('name', 'Unknown')
                    logger.info(f"📍 Found place: {place_name} (ID: {place_id})")
                    return {"success": True, "place_id": place_id, "place_name": place_name}
                else:
                    logger.error("❌ No candidates found in response")
                    return {"success": False}
            else:
                logger.error("❌ No content in response")
                return {"success": False}

        except Exception as e:
            logger.error(f"❌ Error finding place: {e}")
            return {"success": False, "error": str(e)}

    async def test_get_place_details(self, place_id):
        """Step 2: Get place details with photos"""
        logger.info(f"📋 Getting place details for: {place_id}")

        try:
            result = await self.google_session.connector.call_tool("get_place_details", {
                "place_id": place_id,
                "fields": ["photos", "name", "formatted_address"]
            })

            logger.info(f"✅ Place details result: {result}")

            if hasattr(result, 'content') and result.content:
                content_data = json.loads(result.content[0].text)
                if content_data.get('result', {}).get('photos'):
                    photos = content_data['result']['photos']
                    photo_refs = [photo['photo_reference'] for photo in photos]
                    logger.info(f"📸 Found {len(photo_refs)} photos")
                    return {"success": True, "photo_refs": photo_refs}
                else:
                    logger.error("❌ No photos found in place details")
                    return {"success": False}
            else:
                logger.error("❌ No content in response")
                return {"success": False}

        except Exception as e:
            logger.error(f"❌ Error getting place details: {e}")
            return {"success": False, "error": str(e)}

    async def test_get_photo_url(self, photo_ref, max_width=400):
        """Step 3: Get photo URL and base64 data"""
        logger.info(f"📷 Getting photo URL for reference: {photo_ref[:20]}...")

        try:
            result = await self.google_session.connector.call_tool("get_place_photo_url", {
                "photo_reference": photo_ref,
                "max_width": max_width
            })

            logger.info(f"✅ Photo URL result: {result}")

            if hasattr(result, 'content') and result.content:
                content_data = json.loads(result.content[0].text)
                if content_data.get('base64_data'):
                    base64_data = content_data['base64_data']
                    photo_url = content_data.get('photo_url', '')
                    logger.info(f"📷 Base64 data available ({len(base64_data)} characters)")
                    logger.info(f"📷 Photo URL: {photo_url}")
                    return {
                        "success": True,
                        "base64_data": base64_data,
                        "photo_url": photo_url
                    }
                else:
                    logger.error("❌ No base64 data in photo response")
                    return {"success": False}
            else:
                logger.error("❌ No content in response")
                return {"success": False}

        except Exception as e:
            logger.error(f"❌ Error getting photo URL: {e}")
            return {"success": False, "error": str(e)}

    async def test_upload_to_r2(self, base64_data, filename):
        """Step 4: Upload photo to R2 storage"""
        logger.info(f"☁️ Uploading image to R2: {filename}")

        try:
            object_key = f"test-photos/{filename}"
            result = await self.r2_session.connector.call_tool("upload_object", {
                "key": object_key,
                "content": base64_data,
                "content_type": "image/jpeg"
            })

            logger.info(f"✅ R2 upload result: {result}")

            if hasattr(result, 'content') and result.content:
                logger.info(f"☁️ Upload successful: {result.content[0].text}")
                return {"success": True, "object_key": object_key}
            else:
                logger.error("❌ No content in upload response")
                return {"success": False}

        except Exception as e:
            logger.error(f"❌ Error uploading to R2: {e}")
            return {"success": False, "error": str(e)}

    async def test_verify_r2_upload(self, object_key):
        """Step 5: Verify photo is stored in R2"""
        logger.info(f"🔍 Verifying R2 upload: {object_key}")

        try:
            result = await self.r2_session.connector.call_tool("list_objects", {
                "prefix": "test-photos/"
            })

            logger.info(f"✅ R2 verification result: {result}")

            if hasattr(result, 'content') and result.content:
                content_text = result.content[0].text
                is_found = object_key in content_text
                logger.info(f"🔍 Object found in listing: {is_found}")
                return {"success": is_found, "listing": content_text}
            else:
                logger.error("❌ No content in verification response")
                return {"success": False}

        except Exception as e:
            logger.error(f"❌ Error verifying R2 upload: {e}")
            return {"success": False, "error": str(e)}

    async def run_full_workflow(self):
        """Run the complete workflow"""
        logger.info("🚀 Starting Google Places -> R2 Storage workflow test")
        logger.info("=" * 60)

        try:
            await self.setup()
            await self.list_available_tools()

            # Step 1: Find place
            find_result = await self.test_find_place()
            if not find_result["success"]:
                logger.error("❌ Workflow failed at place search step")
                return

            # Update todo
            logger.info("✅ Todo 1 completed: Search for place")

            # Step 2: Get place details
            details_result = await self.test_get_place_details(find_result["place_id"])
            if not details_result["success"] or not details_result["photo_refs"]:
                logger.error("❌ Workflow failed at place details step or no photos found")
                return

            # Update todo
            logger.info("✅ Todo 2 completed: Get place details and photo URLs")

            # Step 3: Get photo data
            photo_ref = details_result["photo_refs"][0]
            photo_result = await self.test_get_photo_url(photo_ref)
            if not photo_result["success"]:
                logger.error("❌ Workflow failed at photo URL step")
                return

            # Step 4: Upload to R2
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"eiffel-tower-{timestamp}.jpg"
            upload_result = await self.test_upload_to_r2(photo_result["base64_data"], filename)
            if not upload_result["success"]:
                logger.error("❌ Workflow failed at R2 upload step")
                return

            # Update todo
            logger.info("✅ Todo 3 completed: Download photos and save to R2 storage")

            # Step 5: Verify upload
            verify_result = await self.test_verify_r2_upload(upload_result["object_key"])
            if not verify_result["success"]:
                logger.error("❌ Workflow failed at R2 verification step")
                return

            # Update todo
            logger.info("✅ Todo 4 completed: Verify photos are properly stored in R2")

            # Success!
            logger.info("")
            logger.info("🎉 Workflow completed successfully!")
            logger.info("=" * 60)
            logger.info(f"📍 Place: {find_result['place_name']}")
            logger.info(f"📸 Photo uploaded: {filename}")
            logger.info(f"☁️ R2 Object Key: {upload_result['object_key']}")
            logger.info(f"🌐 Photo URL: {photo_result['photo_url']}")
            logger.info("=" * 60)

        except Exception as e:
            logger.error(f"❌ Workflow failed with error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            if self.client:
                await self.client.close_all_sessions()

async def main():
    """Main entry point"""
    tester = PlacesToR2WorkflowTester()
    await tester.run_full_workflow()

if __name__ == "__main__":
    asyncio.run(main())

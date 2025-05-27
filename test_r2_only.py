#!/usr/bin/env python3
import asyncio
import sys
import os
import json

# Add mcp-use to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'mcptools', 'mcp-use'))
from mcp_use import MCPClient

async def test_r2_storage():
    print('🚀 Testing R2 Storage MCP')

    config_path = 'mcptools/mcp-use/production_config.json'
    client = MCPClient.from_config_file(config_path)

    try:
        print('🔌 Creating R2 Storage session...')
        r2_session = await client.create_session('r2-storage')
        print('✅ R2 Storage session created')

        # Test with dummy base64 image data (1x1 red pixel JPEG)
        dummy_base64 = "/9j/4AAQSkZJRgABAQEAYABgAAD//gA7Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2ODApLCBxdWFsaXR5ID0gOTAK/9sAQwADAgIDAgIDAwMDBAMDBAUIBQUEBAUKBwcGCAwKDAwLCgsLDQ4SEA0OEQ4LCxAWEBETFBUVFQwPFxgWFBgSFBUU/9sAQwEDBAQFBAUJBQUJFA0LDRQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU/8AAEQgAAQABAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+gEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q=="

        timestamp = ''.join(str(x) for x in [2025, 5, 27, 16, 35])
        filename = f'test-image-{timestamp}.jpg'
        object_key = f'test-photos/{filename}'

        print(f'☁️ Testing upload with dummy image: {filename}')
        upload_result = await r2_session.connector.call_tool('upload_object', {
            'key': object_key,
            'content': dummy_base64,
            'content_type': 'image/jpeg'
        })

        if hasattr(upload_result, 'content') and upload_result.content:
            print(f'✅ Upload successful: {upload_result.content[0].text}')

            print('🔍 Verifying upload...')
            verify_result = await r2_session.connector.call_tool('list_objects', {
                'prefix': 'test-photos/'
            })

            if hasattr(verify_result, 'content') and verify_result.content:
                listing = verify_result.content[0].text
                found = object_key in listing
                print(f'✅ Verification: {"SUCCESS" if found else "FAILED"}')
                print(f'   Listing: {listing}')

                if found:
                    print('🔍 Testing direct retrieval...')
                    get_result = await r2_session.connector.call_tool('get_object', {
                        'key': object_key
                    })

                    if hasattr(get_result, 'content') and get_result.content:
                        print(f'✅ Direct retrieval successful: {get_result.content[0].text}')

                        print('🎉 R2 STORAGE FULLY WORKING!')
                        print(f'   ✅ Upload: SUCCESS')
                        print(f'   ✅ List: SUCCESS')
                        print(f'   ✅ Retrieve: SUCCESS')
                        print(f'   ☁️ Object: {object_key}')
                    else:
                        print('❌ Direct retrieval failed')
                else:
                    print('❌ Object not found in listing')
            else:
                print('❌ List objects failed')
        else:
            print('❌ Upload failed')

    except Exception as e:
        print(f'❌ Error: {e}')
        import traceback
        traceback.print_exc()
    finally:
        await client.close_all_sessions()
        print('🔒 Sessions closed')

if __name__ == "__main__":
    asyncio.run(test_r2_storage())

#!/usr/bin/env python3
import asyncio
import sys
import os
import json

# Add mcp-use to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'mcptools', 'mcp-use'))
from mcp_use import MCPClient

async def quick_test():
    print('🚀 Quick Google Places → R2 Storage test')

    config_path = 'mcptools/mcp-use/production_config.json'
    client = MCPClient.from_config_file(config_path)

    try:
        print('🔌 Creating Google Places session...')
        google_session = await client.create_session('google-places-api')
        print('✅ Google Places session created')

        print('🔍 Testing find_place tool...')
        result = await google_session.connector.call_tool('find_place', {
            'query': 'Statue of Liberty New York',
            'max_results': 1
        })
        print(f'📍 Find result: {result}')

        if hasattr(result, 'content') and result.content:
            data = json.loads(result.content[0].text)
            if data.get('candidates'):
                place_id = data['candidates'][0]['place_id']
                place_name = data['candidates'][0].get('name', 'Unknown')
                print(f'✅ Found: {place_name} (ID: {place_id})')

                print('📋 Getting place details...')
                details = await google_session.connector.call_tool('get_place_details', {
                    'place_id': place_id,
                    'fields': ['photos', 'name', 'formatted_address']
                })

                if hasattr(details, 'content') and details.content:
                    details_data = json.loads(details.content[0].text)
                    photos = details_data.get('result', {}).get('photos', [])
                    print(f'📸 Found {len(photos)} photos')

                    if photos:
                        photo_ref = photos[0]['photo_reference']
                        print(f'📷 Getting photo data for: {photo_ref[:20]}...')

                        photo_result = await google_session.connector.call_tool('get_place_photo_url', {
                            'photo_reference': photo_ref,
                            'max_width': 400
                        })

                        if hasattr(photo_result, 'content') and photo_result.content:
                            photo_data = json.loads(photo_result.content[0].text)
                            has_base64 = bool(photo_data.get('base64_data'))
                            photo_url = photo_data.get('photo_url', 'N/A')

                            print(f'✅ Photo retrieved:')
                            print(f'   📍 URL: {photo_url}')
                            print(f'   📦 Has base64: {has_base64}')

                            if has_base64:
                                print('🔌 Creating R2 Storage session...')
                                r2_session = await client.create_session('r2-storage')
                                print('✅ R2 Storage session created')

                                timestamp = ''.join(str(x) for x in [2025, 5, 27, 16, 30])
                                filename = f'statue-liberty-{timestamp}.jpg'
                                object_key = f'test-photos/{filename}'

                                print(f'☁️ Uploading to R2: {filename}')
                                upload_result = await r2_session.connector.call_tool('upload_object', {
                                    'key': object_key,
                                    'content': photo_data['base64_data'],
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
                                        print(f'   Object key: {object_key}')

                                        if found:
                                            print('🎉 COMPLETE WORKFLOW SUCCESS!')
                                            print(f'📍 Place: {place_name}')
                                            print(f'📸 Photo: {filename}')
                                            print(f'☁️ R2 Key: {object_key}')
                                            print(f'🌐 Photo URL: {photo_url}')

    except Exception as e:
        print(f'❌ Error: {e}')
        import traceback
        traceback.print_exc()
    finally:
        await client.close_all_sessions()
        print('🔒 Sessions closed')

if __name__ == "__main__":
    asyncio.run(quick_test())

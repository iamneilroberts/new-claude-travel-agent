#!/usr/bin/env python3
import asyncio
import sys
import os
sys.path.append('/home/neil/dev/new-claude-travel-agent/mcptools/mcp-use')

from mcp_use.client import MCPClient

async def test_r2_storage():
    try:
        print("Creating MCPClient...")
        os.chdir('/home/neil/dev/new-claude-travel-agent/mcptools/mcp-use')
        client = MCPClient.from_config_file('production_config.json')

        print("Creating r2-storage session...")
        session = await client.create_session('r2-storage')

        print("Listing tools...")
        tools = await session.connector.list_tools()
        print(f"Connected! Found {len(tools)} tools: {[t.name for t in tools]}")

        print("Testing list_objects tool...")
        result = await session.connector.call_tool('list_objects', {})
        print("Tool result:", result)

        await client.close_all_sessions()
        print("Test completed successfully!")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_r2_storage())

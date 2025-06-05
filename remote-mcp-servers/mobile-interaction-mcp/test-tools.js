#!/usr/bin/env node
/**
 * Test Available MCP Tools
 */

const MCP_URL = 'https://mobile-interaction-mcp.somotravel.workers.dev/sse';

async function testAvailableTools() {
  console.log('🔧 Testing Available MCP Tools');
  console.log('===============================\n');

  try {
    // First establish SSE connection
    const response = await fetch(MCP_URL);
    const reader = response.body?.getReader();
    const { value } = await reader.read();
    const sseData = new TextDecoder().decode(value);
    
    // Extract session endpoint
    const endpointMatch = sseData.match(/\/sse\/message\?sessionId=([a-f0-9]+)/);
    if (!endpointMatch) {
      throw new Error('Could not extract session ID from SSE response');
    }
    
    const sessionEndpoint = `${MCP_URL}/message?sessionId=${endpointMatch[1]}`;
    console.log('📡 Session Endpoint:', sessionEndpoint);
    
    // Test 1: List available tools
    console.log('\n1. Listing available tools...');
    
    const toolsResponse = await fetch(sessionEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list'
      })
    });

    if (!toolsResponse.ok) {
      throw new Error(`HTTP ${toolsResponse.status}: ${toolsResponse.statusText}`);
    }

    const toolsResult = await toolsResponse.json();
    console.log('🛠️ Available Tools:');
    
    if (toolsResult.result && toolsResult.result.tools) {
      toolsResult.result.tools.forEach((tool, index) => {
        console.log(`${index + 1}. ${tool.name}: ${tool.description}`);
      });
    } else {
      console.log('No tools found or unexpected response format');
      console.log(JSON.stringify(toolsResult, null, 2));
    }

    // Test 2: Check server info
    console.log('\n2. Getting server info...');
    
    const infoResponse = await fetch(sessionEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0'
          }
        }
      })
    });

    const infoResult = await infoResponse.json();
    console.log('ℹ️ Server Info:');
    console.log(JSON.stringify(infoResult, null, 2));

  } catch (error) {
    console.error('❌ Error testing tools:', error.message);
  }
}

testAvailableTools();
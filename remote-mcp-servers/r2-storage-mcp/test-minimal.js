#!/usr/bin/env node

import fetch from 'node-fetch';

const SERVER_URL = 'https://r2-storage-mcp.somotravel.workers.dev';

async function testMCP() {
  console.log('Testing R2 Storage MCP Server...\n');

  // Test initialize
  console.log('1. Testing initialize...');
  const initResponse = await fetch(`${SERVER_URL}/sse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer r2-mcp-auth-key-2025'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {}
      }
    })
  });

  if (!initResponse.ok) {
    console.error('Initialize failed:', initResponse.status, initResponse.statusText);
    return;
  }

  const reader = initResponse.body;
  const chunks = [];

  for await (const chunk of reader) {
    chunks.push(chunk);
    const text = Buffer.concat(chunks).toString();
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.id === 1) {
            console.log('Initialize response:', JSON.stringify(data.result, null, 2));
          }
        } catch (e) {
          // Ignore parse errors for incomplete chunks
        }
      }
    }
  }

  // Test tools/list
  console.log('\n2. Testing tools/list...');
  const toolsResponse = await fetch(`${SERVER_URL}/sse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer r2-mcp-auth-key-2025'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    })
  });

  const toolsReader = toolsResponse.body;
  const toolsChunks = [];

  for await (const chunk of toolsReader) {
    toolsChunks.push(chunk);
    const text = Buffer.concat(toolsChunks).toString();
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.id === 2) {
            console.log('Available tools:', data.result.tools.map(t => t.name).join(', '));
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }

  // Test a tool call
  console.log('\n3. Testing get_presigned_url tool...');
  const toolResponse = await fetch(`${SERVER_URL}/sse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer r2-mcp-auth-key-2025'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_presigned_url',
        arguments: {
          key: 'test-image.jpg',
          operation: 'GET',
          expires_in: 3600
        }
      }
    })
  });

  const toolReader = toolResponse.body;
  const toolChunks = [];

  for await (const chunk of toolReader) {
    toolChunks.push(chunk);
    const text = Buffer.concat(toolChunks).toString();
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.id === 3) {
            console.log('Tool response:', JSON.stringify(JSON.parse(data.result.content[0].text), null, 2));
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }

  console.log('\n✅ All tests completed!');
}

testMCP().catch(console.error);

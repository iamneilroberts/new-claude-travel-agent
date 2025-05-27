// Test script for the fixed GitHub MCP server
import fetch from 'node-fetch';

const WORKER_URL = 'http://localhost:8787'; // Local wrangler dev URL
const AUTH_TOKEN = 'github-mcp-auth-key-2025';

async function testEndpoint(endpoint, method = 'GET', body = null) {
  console.log(`\nTesting ${method} ${endpoint}`);
  
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${WORKER_URL}${endpoint}`, options);
    const text = await response.text();
    
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${text}`);
    
    return { status: response.status, data: text };
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return { error: error.message };
  }
}

async function runTests() {
  console.log('Starting GitHub MCP Server Tests');
  console.log('================================');
  
  // Test OAuth metadata
  await testEndpoint('/.well-known/oauth-metadata');
  await testEndpoint('/sse/.well-known/oauth-metadata');
  
  // Test health check
  await testEndpoint('/health');
  
  // Test initialize
  await testEndpoint('/sse', 'POST', {
    jsonrpc: '2.0',
    method: 'initialize',
    params: {},
    id: 1
  });
  
  // Test list tools
  await testEndpoint('/sse', 'POST', {
    jsonrpc: '2.0',
    method: 'tools/list',
    params: {},
    id: 2
  });
  
  // Test RPC endpoint
  await testEndpoint('/rpc', 'POST', {
    jsonrpc: '2.0',
    method: 'initialize',
    params: {},
    id: 3
  });
  
  console.log('\n================================');
  console.log('Tests completed');
}

// Run tests if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}
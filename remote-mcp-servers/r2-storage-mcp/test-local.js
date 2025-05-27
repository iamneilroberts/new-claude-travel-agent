/**
 * Simple local test script for the R2 Storage MCP server
 * Run with: node test-local.js
 */

const http = require('http');

// Test configuration
const PORT = 8102; // Must match the port in wrangler.toml
const HOST = 'localhost';

// Test the initialize method
async function testInitialize() {
  const data = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize'
  });

  const options = {
    hostname: HOST,
    port: PORT,
    path: '/mcp',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', (e) => {
      reject(e);
    });
    
    req.write(data);
    req.end();
  });
}

// Test listing tools
async function testListTools() {
  const data = JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list'
  });

  const options = {
    hostname: HOST,
    port: PORT,
    path: '/mcp',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', (e) => {
      reject(e);
    });
    
    req.write(data);
    req.end();
  });
}

// Test calling a specific tool
async function testCallTool(toolName, params) {
  const data = JSON.stringify({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: params
    }
  });

  const options = {
    hostname: HOST,
    port: PORT,
    path: '/mcp',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'X-API-Token': process.env.MCP_AUTH_KEY || 'test_auth_key' // For local testing
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', (e) => {
      reject(e);
    });
    
    req.write(data);
    req.end();
  });
}

// Run the tests
async function runTests() {
  try {
    console.log('Testing initialize...');
    const initResult = await testInitialize();
    console.log(JSON.stringify(initResult, null, 2));
    
    console.log('\nTesting tools/list...');
    const toolsResult = await testListTools();
    console.log(JSON.stringify(toolsResult, null, 2));
    
    console.log('\nTesting r2_buckets_list...');
    const bucketsResult = await testCallTool('r2_buckets_list', {});
    console.log(JSON.stringify(bucketsResult, null, 2));
    
    // Additional tests for specific tools can be added here
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  console.log('Starting R2 Storage MCP test...');
  runTests();
}
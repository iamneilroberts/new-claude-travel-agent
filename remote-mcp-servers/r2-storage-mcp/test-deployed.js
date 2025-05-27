/**
 * Test script for the deployed R2 Storage MCP server
 * Run with: node test-deployed.js
 */

const https = require('https');

// Test configuration
const URL = 'https://r2-storage-mcp.somotravel.workers.dev';

// Test the initialize method
async function testInitialize() {
  const data = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize'
  });

  const url = new URL(`${URL}/mcp`);

  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'X-API-Token': process.env.MCP_AUTH_KEY || 'YOUR_API_TOKEN_HERE'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
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

  const url = new URL(`${URL}/mcp`);

  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'X-API-Token': process.env.MCP_AUTH_KEY || 'YOUR_API_TOKEN_HERE'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
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

  const url = new URL(`${URL}/mcp`);

  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'X-API-Token': process.env.MCP_AUTH_KEY || 'YOUR_API_TOKEN_HERE'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
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

    // Test putting an object
    console.log('\nTesting r2_object_put...');
    const putResult = await testCallTool('r2_object_put', {
      bucket_name: 'travel-media',
      key: 'test-object.txt',
      body: 'Hello, R2 Storage MCP!',
      content_type: 'text/plain'
    });
    console.log(JSON.stringify(putResult, null, 2));

    // Test listing objects
    console.log('\nTesting r2_objects_list...');
    const listResult = await testCallTool('r2_objects_list', {
      bucket_name: 'travel-media'
    });
    console.log(JSON.stringify(listResult, null, 2));

    // Test getting the object
    console.log('\nTesting r2_object_get...');
    const getResult = await testCallTool('r2_object_get', {
      bucket_name: 'travel-media',
      key: 'test-object.txt'
    });
    console.log(JSON.stringify(getResult, null, 2));

    // Test generating a presigned URL
    console.log('\nTesting r2_generate_presigned_url...');
    const urlResult = await testCallTool('r2_generate_presigned_url', {
      bucket_name: 'travel-media',
      key: 'test-object.txt'
    });
    console.log(JSON.stringify(urlResult, null, 2));

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  console.log('Starting R2 Storage MCP deployment test...');
  console.log('URL:', URL);
  runTests();
}

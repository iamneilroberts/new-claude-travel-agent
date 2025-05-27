#!/usr/bin/env node

/**
 * R2 Storage MCP Presigned URL Test Script
 * 
 * This script specifically tests the presigned URL functionality of the R2 Storage MCP:
 * 1. Creates a test object
 * 2. Generates a presigned URL for the object
 * 3. Tries to access the object via the presigned URL
 * 4. Cleans up by deleting the test object
 * 
 * Run with: node test-presigned-url.js [mode]
 * Where mode is one of:
 * - local (default): Tests against local development server
 * - deployed: Tests against deployed worker
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  local: {
    host: 'localhost',
    port: 8102,
    protocol: 'http',
    apiToken: process.env.MCP_AUTH_KEY || 'test_auth_key',
    testBucket: 'travel-media'
  },
  deployed: {
    host: 'r2-storage-mcp.somotravel.workers.dev',
    port: 443,
    protocol: 'https',
    apiToken: process.env.MCP_AUTH_KEY || 'YOUR_API_TOKEN_HERE',
    testBucket: 'travel-media'
  }
};

// Parse command line arguments
const mode = process.argv[2] || 'local';
if (!['local', 'deployed'].includes(mode)) {
  console.error('Invalid mode. Use "local" or "deployed"');
  process.exit(1);
}

// Use the appropriate configuration
const config = CONFIG[mode];
console.log(`Running in ${mode} mode against ${config.protocol}://${config.host}${config.port !== 443 ? ':' + config.port : ''}`);

// Create a test file
const TEST_DATA_FILE = path.join(__dirname, 'test-presigned.txt');
const TEST_DATA = 'This is test data for R2 Storage MCP presigned URL testing\nCreated at: ' + new Date().toISOString();
fs.writeFileSync(TEST_DATA_FILE, TEST_DATA);

// Helper function to make a JSON-RPC request
async function jsonRpcRequest(method, params = {}) {
  const data = JSON.stringify({
    jsonrpc: '2.0',
    id: Math.floor(Math.random() * 10000),
    method,
    params
  });

  const options = {
    hostname: config.host,
    port: config.port,
    path: '/mcp',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'X-API-Token': config.apiToken
    }
  };

  const requestFn = config.protocol === 'https' ? https.request : http.request;

  return new Promise((resolve, reject) => {
    const req = requestFn(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}, Response: ${responseData}`));
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

// Helper function to call a tool
async function callTool(toolName, params = {}) {
  return jsonRpcRequest('tools/call', {
    name: toolName,
    arguments: params
  });
}

// Helper function to validate a response
function validateResponse(response, description) {
  console.log(`\n${description}:`);
  
  if (response.error) {
    console.error(`❌ ERROR: ${JSON.stringify(response.error)}`);
    return false;
  }
  
  if (response.result && response.result.error) {
    console.error(`❌ TOOL ERROR: ${JSON.stringify(response.result.error)}`);
    return false;
  }
  
  if (response.result && response.result.success === false) {
    console.error(`❌ OPERATION FAILED: ${JSON.stringify(response.result)}`);
    return false;
  }
  
  console.log(`✅ SUCCESS: ${JSON.stringify(response.result, null, 2)}`);
  return true;
}

// Test sequence
async function runTests() {
  try {
    // Part 1: Initialize and check available tools
    console.log('\n============================================');
    console.log('PART 1: Initialize and check available tools');
    console.log('============================================');
    
    const initResult = await jsonRpcRequest('initialize');
    validateResponse(initResult, 'Initialize MCP connection');
    
    const toolsResult = await jsonRpcRequest('tools/list');
    validateResponse(toolsResult, 'List available tools');
    
    if (toolsResult.result && toolsResult.result.tools) {
      const tools = toolsResult.result.tools;
      console.log(`\nFound ${tools.length} tools`);
      
      // Check if r2_generate_presigned_url tool is available
      const presignedUrlTool = tools.find(tool => tool.name === 'r2_generate_presigned_url');
      if (presignedUrlTool) {
        console.log('✅ r2_generate_presigned_url tool is available');
      } else {
        console.error('❌ r2_generate_presigned_url tool is NOT available');
        process.exit(1);
      }
    }
    
    // Part 2: Create test object
    console.log('\n===============================');
    console.log('PART 2: Create a test object');
    console.log('===============================');
    
    // Create test file
    const testObjectKey = `test-presigned-${Date.now()}.txt`;
    const putObjectResult = await callTool('r2_object_put', {
      bucket_name: config.testBucket,
      key: testObjectKey,
      body: TEST_DATA,
      content_type: 'text/plain'
    });
    validateResponse(putObjectResult, `Put object ${testObjectKey}`);
    
    // Part 3: Generate presigned URL
    console.log('\n===============================');
    console.log('PART 3: Generate presigned URL');
    console.log('===============================');
    
    // Generate presigned URL for GET
    const presignedUrlResult = await callTool('r2_generate_presigned_url', {
      bucket_name: config.testBucket,
      key: testObjectKey,
      expires_in: 120, // 2 minutes
      method: 'GET'
    });
    validateResponse(presignedUrlResult, `Generate presigned URL for ${testObjectKey}`);
    
    if (presignedUrlResult.result?.url) {
      console.log(`✅ Presigned URL generated: ${presignedUrlResult.result.url}`);
      
      // Try to access the URL
      try {
        console.log(`Testing presigned URL access...`);
        
        // Use HTTP or HTTPS depending on the protocol
        let fetchData;
        if (mode === 'deployed') {
          // For deployed worker, use curl for simplicity
          try {
            const curlCmd = `curl -s "${presignedUrlResult.result.url}"`;
            fetchData = execSync(curlCmd).toString();
          } catch (e) {
            console.error(`❌ Curl command failed: ${e.message}`);
            process.exit(1);
          }
        } else {
          // For local testing, use HTTP/HTTPS module directly
          const fetchUrl = new URL(presignedUrlResult.result.url);
          const fetchOptions = {
            method: 'GET',
            hostname: fetchUrl.hostname,
            port: fetchUrl.port || (fetchUrl.protocol === 'https:' ? 443 : 80),
            path: fetchUrl.pathname + fetchUrl.search,
            headers: {}
          };
          
          const fetchFn = fetchUrl.protocol === 'https:' ? https : http;
          
          fetchData = await new Promise((resolve, reject) => {
            const req = fetchFn.request(fetchOptions, (res) => {
              let data = '';
              
              res.on('data', (chunk) => {
                data += chunk;
              });
              
              res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                  resolve(data);
                } else {
                  reject(new Error(`HTTP Error: ${res.statusCode} ${res.statusMessage}`));
                }
              });
            });
            
            req.on('error', (e) => {
              reject(e);
            });
            
            req.end();
          });
        }
        
        // Verify the content
        if (fetchData === TEST_DATA) {
          console.log(`✅ Successfully accessed object via presigned URL`);
          console.log(`\nReceived Content:\n${fetchData}`);
        } else {
          console.error(`❌ Content from presigned URL does not match expected data`);
          console.log(`Expected:\n${TEST_DATA}`);
          console.log(`Received:\n${fetchData}`);
        }
      } catch (e) {
        console.error(`❌ Failed to access presigned URL: ${e.message}`);
      }
      
      // Part 4: Generate presigned URL for PUT
      console.log('\n=========================================');
      console.log('PART 4: Generate presigned URL for PUT');
      console.log('=========================================');
      
      const uploadKey = `test-presigned-upload-${Date.now()}.txt`;
      const putUrlResult = await callTool('r2_generate_presigned_url', {
        bucket_name: config.testBucket,
        key: uploadKey,
        expires_in: 120, // 2 minutes
        method: 'PUT'
      });
      validateResponse(putUrlResult, `Generate presigned PUT URL for ${uploadKey}`);
      
      if (putUrlResult.result?.url) {
        console.log(`✅ Presigned PUT URL generated: ${putUrlResult.result.url}`);
        
        // Try to upload the file
        try {
          console.log(`Testing presigned URL for uploading...`);
          const uploadData = `Test upload via presigned URL at ${new Date().toISOString()}`;
          
          if (mode === 'deployed') {
            // For deployed worker, use curl for simplicity
            try {
              const curlCmd = `curl -X PUT -H "Content-Type: text/plain" --data "${uploadData}" "${putUrlResult.result.url}"`;
              const result = execSync(curlCmd).toString();
              console.log(`Upload result: ${result}`);
            } catch (e) {
              console.error(`❌ Curl upload command failed: ${e.message}`);
            }
          } else {
            // For local testing, use HTTP/HTTPS module directly
            const uploadUrl = new URL(putUrlResult.result.url);
            const uploadOptions = {
              method: 'PUT',
              hostname: uploadUrl.hostname,
              port: uploadUrl.port || (uploadUrl.protocol === 'https:' ? 443 : 80),
              path: uploadUrl.pathname + uploadUrl.search,
              headers: {
                'Content-Type': 'text/plain',
                'Content-Length': Buffer.byteLength(uploadData)
              }
            };
            
            const fetchFn = uploadUrl.protocol === 'https:' ? https : http;
            
            const uploadResponse = await new Promise((resolve, reject) => {
              const req = fetchFn.request(uploadOptions, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                  data += chunk;
                });
                
                res.on('end', () => {
                  if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({
                      statusCode: res.statusCode,
                      data: data
                    });
                  } else {
                    reject(new Error(`HTTP Error: ${res.statusCode} ${res.statusMessage}, Data: ${data}`));
                  }
                });
              });
              
              req.on('error', (e) => {
                reject(e);
              });
              
              req.write(uploadData);
              req.end();
            });
            
            console.log(`✅ Upload response: ${JSON.stringify(uploadResponse)}`);
          }
          
          // Verify the uploaded content
          const getUploadedResult = await callTool('r2_object_get', {
            bucket_name: config.testBucket,
            key: uploadKey
          });
          validateResponse(getUploadedResult, `Get uploaded object ${uploadKey}`);
          
          if (getUploadedResult.result?.object?.content === uploadData) {
            console.log(`✅ Successfully uploaded and verified object via presigned URL`);
          } else {
            console.error(`❌ Uploaded content does not match expected data`);
            console.log(`Expected:\n${uploadData}`);
            console.log(`Stored:\n${getUploadedResult.result?.object?.content}`);
          }
          
          // Clean up the uploaded object
          const deleteUploadedResult = await callTool('r2_object_delete', {
            bucket_name: config.testBucket,
            key: uploadKey
          });
          validateResponse(deleteUploadedResult, `Delete uploaded object ${uploadKey}`);
        } catch (e) {
          console.error(`❌ Failed to test presigned PUT URL: ${e.message}`);
        }
      }
    }
    
    // Part 5: Cleanup
    console.log('\n==================');
    console.log('PART 5: Cleanup');
    console.log('==================');
    
    // Delete object
    const deleteOriginalResult = await callTool('r2_object_delete', {
      bucket_name: config.testBucket,
      key: testObjectKey
    });
    validateResponse(deleteOriginalResult, `Delete object ${testObjectKey}`);
    
    // Clean up test file
    fs.unlinkSync(TEST_DATA_FILE);
    console.log(`Deleted local test file ${TEST_DATA_FILE}`);
    
    // Final summary
    console.log('\n================================');
    console.log('TESTING COMPLETE');
    console.log('================================');
    console.log('Presigned URL operations tested successfully!');
    
  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  }
}

// Run the tests
runTests().then(() => {
  console.log('All tests completed');
}).catch(err => {
  console.error('Test script failed:', err);
  process.exit(1);
});
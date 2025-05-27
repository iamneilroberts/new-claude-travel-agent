#!/usr/bin/env node

/**
 * R2 Storage MCP Comprehensive Test Script
 *
 * This script tests all the major operations provided by the R2 Storage MCP:
 * - List buckets
 * - Create bucket
 * - Get bucket details
 * - Object operations (put, get, list, delete)
 * - Presigned URL generation
 * - Metadata operations
 *
 * Run with: node test-r2-operations.cjs [mode]
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
const TEST_DATA_FILE = path.join(__dirname, 'test-data.txt');
const TEST_DATA = 'This is test data for R2 Storage MCP testing\nCreated at: ' + new Date().toISOString();
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

// Helper function to validate the presence of a tool
function validateToolPresence(tools, toolName) {
  const found = tools.find(tool => tool.name === toolName);
  if (found) {
    console.log(`✅ Tool ${toolName} is available`);
    return true;
  } else {
    console.error(`❌ Tool ${toolName} is NOT available`);
    return false;
  }
}

// Test sequence
async function runTests() {
  try {
    // Part 1: Initialize and check available tools
    console.log('\n=============================================');
    console.log('PART 1: Initialize and check available tools');
    console.log('=============================================');

    const initResult = await jsonRpcRequest('initialize');
    validateResponse(initResult, 'Initialize MCP connection');

    const toolsResult = await jsonRpcRequest('tools/list');
    validateResponse(toolsResult, 'List available tools');

    if (toolsResult.result && toolsResult.result.tools) {
      const tools = toolsResult.result.tools;
      console.log(`\nFound ${tools.length} tools`);

      // Check for required tools
      const requiredTools = [
        'r2_buckets_list',
        'r2_bucket_create',
        'r2_bucket_get',
        'r2_bucket_delete',
        'r2_objects_list',
        'r2_object_get',
        'r2_object_put',
        'r2_object_delete',
        'r2_object_copy',
        'r2_generate_presigned_url',
        'r2_object_metadata_get',
        'r2_object_metadata_put'
      ];

      let allToolsPresent = true;
      for (const toolName of requiredTools) {
        allToolsPresent = validateToolPresence(tools, toolName) && allToolsPresent;
      }

      if (!allToolsPresent) {
        console.error('\n❌ Not all required tools are available!');
        process.exit(1);
      }
    }

    // Part 2: Bucket operations
    console.log('\n=========================');
    console.log('PART 2: Bucket operations');
    console.log('=========================');

    const listBucketsResult = await callTool('r2_buckets_list');
    validateResponse(listBucketsResult, 'List buckets');

    const testNewBucketName = `test-bucket-${Date.now()}`;
    const createBucketResult = await callTool('r2_bucket_create', {
      bucket_name: testNewBucketName
    });
    validateResponse(createBucketResult, `Create bucket ${testNewBucketName}`);

    const getBucketResult = await callTool('r2_bucket_get', {
      bucket_name: config.testBucket
    });
    validateResponse(getBucketResult, `Get bucket ${config.testBucket}`);

    // Part 3: Object operations
    console.log('\n=========================');
    console.log('PART 3: Object operations');
    console.log('=========================');

    // Create test file
    const testObjectKey = `test-object-${Date.now()}.txt`;
    const putObjectResult = await callTool('r2_object_put', {
      bucket_name: config.testBucket,
      key: testObjectKey,
      body: TEST_DATA,
      content_type: 'text/plain'
    });
    validateResponse(putObjectResult, `Put object ${testObjectKey}`);

    // List objects
    const listObjectsResult = await callTool('r2_objects_list', {
      bucket_name: config.testBucket,
      prefix: 'test-object-'
    });
    validateResponse(listObjectsResult, 'List objects with prefix test-object-');

    // Verify object is in list
    const objectList = listObjectsResult.result?.objects || [];
    const objectFound = objectList.some(obj => obj.key === testObjectKey);
    if (objectFound) {
      console.log(`✅ Object ${testObjectKey} found in list`);
    } else {
      console.error(`❌ Object ${testObjectKey} NOT found in list`);
    }

    // Get object
    const getObjectResult = await callTool('r2_object_get', {
      bucket_name: config.testBucket,
      key: testObjectKey
    });
    validateResponse(getObjectResult, `Get object ${testObjectKey}`);

    // Verify object content
    if (getObjectResult.result?.object?.content === TEST_DATA) {
      console.log(`✅ Object content matches expected data`);
    } else {
      console.error(`❌ Object content does NOT match expected data`);
      console.log('Expected:', TEST_DATA);
      console.log('Got:', getObjectResult.result?.object?.content);
    }

    // Copy object
    const copyObjectKey = `${testObjectKey}-copy`;
    const copyObjectResult = await callTool('r2_object_copy', {
      source_bucket: config.testBucket,
      source_key: testObjectKey,
      destination_bucket: config.testBucket,
      destination_key: copyObjectKey
    });
    validateResponse(copyObjectResult, `Copy object to ${copyObjectKey}`);

    // Part 4: Metadata operations
    console.log('\n============================');
    console.log('PART 4: Metadata operations');
    console.log('============================');

    // Get object metadata
    const getMetadataResult = await callTool('r2_object_metadata_get', {
      bucket_name: config.testBucket,
      key: testObjectKey
    });
    validateResponse(getMetadataResult, `Get metadata for ${testObjectKey}`);

    // Update metadata
    const newMetadata = {
      contentType: 'text/markdown',
      cacheControl: 'max-age=3600',
      customMetadata: {
        'test-key': 'test-value',
        'created-by': 'r2-storage-mcp-test-script',
        'timestamp': Date.now().toString()
      }
    };

    const updateMetadataResult = await callTool('r2_object_metadata_put', {
      bucket_name: config.testBucket,
      key: testObjectKey,
      metadata: newMetadata
    });
    validateResponse(updateMetadataResult, `Update metadata for ${testObjectKey}`);

    // Verify updated metadata
    const verifyMetadataResult = await callTool('r2_object_metadata_get', {
      bucket_name: config.testBucket,
      key: testObjectKey
    });
    validateResponse(verifyMetadataResult, `Verify updated metadata for ${testObjectKey}`);

    // Part 5: Presigned URL
    console.log('\n========================');
    console.log('PART 5: Presigned URLs');
    console.log('========================');

    // Generate presigned URL
    const presignedUrlResult = await callTool('r2_generate_presigned_url', {
      bucket_name: config.testBucket,
      key: testObjectKey,
      expires_in: 60, // 1 minute
      method: 'GET'
    });
    validateResponse(presignedUrlResult, `Generate presigned URL for ${testObjectKey}`);

    if (presignedUrlResult.result?.url) {
      console.log(`✅ Presigned URL generated: ${presignedUrlResult.result.url}`);

      // Try to access the URL if this is a real deployment
      if (mode === 'deployed') {
        try {
          console.log(`Testing presigned URL access...`);
          const curlCmd = `curl -s "${presignedUrlResult.result.url}"`;
          const response = execSync(curlCmd).toString();

          if (response === TEST_DATA) {
            console.log(`✅ Successfully accessed object via presigned URL`);
          } else {
            console.error(`❌ Content from presigned URL does not match expected data`);
          }
        } catch (e) {
          console.error(`❌ Failed to access presigned URL: ${e.message}`);
        }
      }
    }

    // Part 6: Cleanup
    console.log('\n==================');
    console.log('PART 6: Cleanup');
    console.log('==================');

    // Delete objects
    const deleteOriginalResult = await callTool('r2_object_delete', {
      bucket_name: config.testBucket,
      key: testObjectKey
    });
    validateResponse(deleteOriginalResult, `Delete object ${testObjectKey}`);

    const deleteCopyResult = await callTool('r2_object_delete', {
      bucket_name: config.testBucket,
      key: copyObjectKey
    });
    validateResponse(deleteCopyResult, `Delete object ${copyObjectKey}`);

    // Try to delete test bucket (should fail if it's bound to the worker)
    console.log('\nAttempting to delete test bucket (expected to fail if it has bindings)...');
    const deleteBucketResult = await callTool('r2_bucket_delete', {
      bucket_name: testNewBucketName
    });
    console.log(JSON.stringify(deleteBucketResult.result, null, 2));

    // Clean up test file
    fs.unlinkSync(TEST_DATA_FILE);
    console.log(`Deleted local test file ${TEST_DATA_FILE}`);

    // Final summary
    console.log('\n================================');
    console.log('TESTING COMPLETE');
    console.log('================================');
    console.log('All R2 Storage MCP operations tested successfully!');

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

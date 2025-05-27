#!/usr/bin/env node

/**
 * Test script for the combined R2 Storage and Image Gallery MCP
 * 
 * This script tests the integration of the Unified Image Gallery with R2 Storage,
 * verifying that gallery creation and image selection work correctly.
 * 
 * Run with: node test-gallery-integration.cjs
 */

const http = require('http');

// Test configuration
const PORT = 8102; // Must match the port in wrangler.toml
const HOST = 'localhost';

// Helper function to make a JSON-RPC request
function jsonRpcRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 10000),
      method,
      params
    });

    const options = {
      hostname: HOST,
      port: PORT,
      path: '/mcp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'X-API-Token': process.env.MCP_AUTH_KEY || 'test_auth_key'
      }
    };

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
function callTool(toolName, params = {}) {
  return jsonRpcRequest('tools/call', {
    name: toolName,
    arguments: params
  });
}

// Test MCP initializing
async function testInitialize() {
  console.log('Testing initialize...');
  
  try {
    const response = await jsonRpcRequest('initialize');
    console.log('Initialize response:', JSON.stringify(response, null, 2));
    return true;
  } catch (error) {
    console.error('Initialize test failed:', error);
    return false;
  }
}

// Test listing available tools
async function testListTools() {
  console.log('\nTesting tools/list...');
  
  try {
    const response = await jsonRpcRequest('tools/list');
    
    console.log('Found tools:', response.result?.tools?.length || 0);
    
    // Check for gallery tools
    const createGalleryTool = response.result?.tools?.find(tool => tool.name === 'create_image_gallery');
    const getSelectedImagesTool = response.result?.tools?.find(tool => tool.name === 'get_selected_images');
    
    if (createGalleryTool) {
      console.log('✅ create_image_gallery tool found');
    } else {
      console.log('❌ create_image_gallery tool not found');
    }
    
    if (getSelectedImagesTool) {
      console.log('✅ get_selected_images tool found');
    } else {
      console.log('❌ get_selected_images tool not found');
    }
    
    // Check for R2 tools
    const r2BucketsList = response.result?.tools?.find(tool => tool.name === 'r2_buckets_list');
    const r2ObjectPut = response.result?.tools?.find(tool => tool.name === 'r2_object_put');
    
    if (r2BucketsList) {
      console.log('✅ r2_buckets_list tool found');
    } else {
      console.log('❌ r2_buckets_list tool not found');
    }
    
    if (r2ObjectPut) {
      console.log('✅ r2_object_put tool found');
    } else {
      console.log('❌ r2_object_put tool not found');
    }
    
    return true;
  } catch (error) {
    console.error('List tools test failed:', error);
    return false;
  }
}

// Test creating an image gallery
async function testCreateGallery() {
  console.log('\nTesting create_image_gallery...');
  
  try {
    const response = await callTool('create_image_gallery', {
      query: 'The Shelbourne Hotel Dublin',
      sources: ['googlePlaces'],
      count: 6,
      entity_type: 'hotel',
      entity_id: 'test_hotel_1',
      entity_name: 'The Shelbourne Hotel',
      trip_id: 'test_trip_1'
    });
    
    console.log('Create gallery response:', JSON.stringify(response, null, 2));
    
    if (response.result?.success) {
      console.log('✅ Gallery created successfully');
      console.log('Gallery URL:', response.result.galleryUrl);
      console.log('Gallery ID:', response.result.galleryId);
      
      // Store gallery ID for later tests
      return response.result.galleryId;
    } else {
      console.log('❌ Gallery creation failed:', response.result?.error);
      return null;
    }
  } catch (error) {
    console.error('Create gallery test failed:', error);
    return null;
  }
}

// Test getting selected images
async function testGetSelectedImages(galleryId) {
  console.log('\nTesting get_selected_images...');
  
  if (!galleryId) {
    console.log('❌ No gallery ID available for testing');
    return false;
  }
  
  try {
    const response = await callTool('get_selected_images', {
      galleryId: galleryId,
      waitForSelection: false  // Don't wait in test mode
    });
    
    console.log('Get selected images response:', JSON.stringify(response, null, 2));
    
    if (response.result?.success) {
      console.log('✅ Selected images retrieved successfully');
      console.log('Number of selections:', response.result.selections?.length || 0);
      return true;
    } else {
      console.log('❌ Get selected images failed:', response.result?.error);
      return false;
    }
  } catch (error) {
    console.error('Get selected images test failed:', error);
    return false;
  }
}

// Test R2 storage integration
async function testR2Integration() {
  console.log('\nTesting R2 integration...');
  
  try {
    // Test listing buckets
    const bucketResult = await callTool('r2_buckets_list');
    
    console.log('R2 buckets response:', JSON.stringify(bucketResult, null, 2));
    
    if (bucketResult.result?.success) {
      console.log('✅ R2 bucket list successful');
      return true;
    } else {
      console.log('❌ R2 bucket list failed:', bucketResult.result?.error);
      return false;
    }
  } catch (error) {
    console.error('R2 integration test failed:', error);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('Starting combined MCP test...');
  
  // Test initialize
  const initResult = await testInitialize();
  if (!initResult) {
    console.error('❌ Initialize test failed, stopping tests');
    process.exit(1);
  }
  
  // Test listing tools
  const toolsResult = await testListTools();
  if (!toolsResult) {
    console.error('❌ Tools listing test failed, stopping tests');
    process.exit(1);
  }
  
  // Test R2 integration
  const r2Result = await testR2Integration();
  if (!r2Result) {
    console.warn('⚠️ R2 integration test failed, continuing with other tests');
  }
  
  // Test creating a gallery
  const galleryId = await testCreateGallery();
  if (!galleryId) {
    console.error('❌ Gallery creation test failed, stopping tests');
    process.exit(1);
  }
  
  // Test getting selected images
  const selectionsResult = await testGetSelectedImages(galleryId);
  if (!selectionsResult) {
    console.warn('⚠️ Get selections test failed');
  }
  
  console.log('\n==========================');
  console.log('Test Summary:');
  console.log('==========================');
  console.log('Initialize: ' + (initResult ? '✅ Passed' : '❌ Failed'));
  console.log('List Tools: ' + (toolsResult ? '✅ Passed' : '❌ Failed'));
  console.log('R2 Integration: ' + (r2Result ? '✅ Passed' : '❌ Failed'));
  console.log('Create Gallery: ' + (galleryId ? '✅ Passed' : '❌ Failed'));
  console.log('Get Selections: ' + (selectionsResult ? '✅ Passed' : '❌ Failed'));
  
  if (galleryId) {
    console.log('\nGallery URL:');
    console.log(`http://${HOST}:${PORT}/gallery/${galleryId}`);
    console.log('Open this URL in your browser to test the gallery UI');
  }
}

// Run all tests
runTests().catch(err => {
  console.error('Test script encountered an error:', err);
  process.exit(1);
});
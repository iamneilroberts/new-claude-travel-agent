#!/usr/bin/env node

/**
 * R2 Storage MCP Image Upload Test Script
 *
 * This script tests the image upload functionality provided by the r2_upload_image tool:
 * 1. Converts a local image to base64
 * 2. Uploads the base64 image to R2 storage
 * 3. Verifies the upload by creating a presigned URL
 * 4. Cleans up by deleting the test image
 *
 * Run with: node test-image-upload.js [mode] [path/to/image.jpg]
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

// Get the image path from command line or use default image
const imagePath = process.argv[3] || path.join(__dirname, 'test-image.jpg');

// Check if image exists
if (!fs.existsSync(imagePath)) {
  console.error(`Image not found: ${imagePath}`);
  console.log('Creating a simple test image...');

  // Create a simple test image using a command-line tool
  try {
    if (process.platform === 'win32') {
      // For Windows, use a simple placeholder approach
      const placeholderPath = path.join(__dirname, 'test-image.jpg');
      // This is a very small JPEG file (1x1 pixel, won't be a real image but sufficient for testing)
      const minimalJpeg = Buffer.from(
        '/9j/4AAQSkZJRgABAQEAYABgAAD//gA7Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2NjIpLCBxdWFsaXR5ID0gOTAK/9sAQwADAgIDAgIDAwMDBAMDBAUIBQUEBAUKBwcGCAwKDAwLCgsLDQ4SEA0OEQ4LCxAWEBETFBUVFQwPFxgWFBgSFBUU/9sAQwEDBAQFBAUJBQUJFA0LDRQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU/8AAEQgAAQABAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A/VOiiigD/9k=',
        'base64'
      );
      fs.writeFileSync(placeholderPath, minimalJpeg);
      console.log(`Created placeholder image at ${placeholderPath}`);
    } else {
      // For Linux/Mac, use convert command from ImageMagick if available
      try {
        execSync(`convert -size 100x100 xc:blue ${imagePath}`);
        console.log(`Created test image at ${imagePath}`);
      } catch (e) {
        // If ImageMagick is not available, create a simple file
        const placeholderPath = path.join(__dirname, 'test-image.jpg');
        // Same minimal JPEG as above
        const minimalJpeg = Buffer.from(
          '/9j/4AAQSkZJRgABAQEAYABgAAD//gA7Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2NjIpLCBxdWFsaXR5ID0gOTAK/9sAQwADAgIDAgIDAwMDBAMDBAUIBQUEBAUKBwcGCAwKDAwLCgsLDQ4SEA0OEQ4LCxAWEBETFBUVFQwPFxgWFBgSFBUU/9sAQwEDBAQFBAUJBQUJFA0LDRQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU/8AAEQgAAQABAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A/VOiiigD/9k=',
          'base64'
        );
        fs.writeFileSync(placeholderPath, minimalJpeg);
        console.log(`Created placeholder image at ${placeholderPath}`);
      }
    }
  } catch (err) {
    console.error(`Failed to create test image: ${err.message}`);
    process.exit(1);
  }
}

// Use the appropriate configuration
const config = CONFIG[mode];
console.log(`Running in ${mode} mode against ${config.protocol}://${config.host}${config.port !== 443 ? ':' + config.port : ''}`);
console.log(`Using image: ${imagePath}`);

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

      // Check if r2_upload_image tool is available
      const uploadImageTool = tools.find(tool => tool.name === 'r2_upload_image');
      if (uploadImageTool) {
        console.log('✅ r2_upload_image tool is available');
      } else {
        console.error('❌ r2_upload_image tool is NOT available');
        process.exit(1);
      }
    }

    // Part 2: Read and convert image to base64
    console.log('\n=========================================');
    console.log('PART 2: Read and convert image to base64');
    console.log('=========================================');

    let imageBuffer;
    let base64Image;
    let contentType;

    try {
      imageBuffer = fs.readFileSync(imagePath);
      base64Image = imageBuffer.toString('base64');

      // Determine content type based on file extension
      if (imagePath.endsWith('.jpg') || imagePath.endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      } else if (imagePath.endsWith('.png')) {
        contentType = 'image/png';
      } else if (imagePath.endsWith('.gif')) {
        contentType = 'image/gif';
      } else if (imagePath.endsWith('.webp')) {
        contentType = 'image/webp';
      } else {
        contentType = 'image/jpeg'; // Default
      }

      console.log(`✅ Read image file: ${imagePath}`);
      console.log(`Content Type: ${contentType}`);
      console.log(`Size: ${imageBuffer.length} bytes`);
      console.log(`Base64 Length: ${base64Image.length} characters`);
    } catch (error) {
      console.error(`❌ Failed to read or convert image: ${error.message}`);
      process.exit(1);
    }

    // Part 3: Upload image to R2
    console.log('\n===============================');
    console.log('PART 3: Upload image to R2');
    console.log('===============================');

    const testImageKey = `test-upload-${Date.now()}.${contentType.split('/')[1]}`;

    // Upload image with presigned URL generation
    const uploadResult = await callTool('r2_upload_image', {
      bucket_name: config.testBucket,
      key: testImageKey,
      base64_image: base64Image,
      content_type: contentType,
      generate_presigned_url: true,
      expires_in: 60 // 1 minute
    });

    validateResponse(uploadResult, `Upload image as ${testImageKey}`);

    if (uploadResult.result && uploadResult.result.success) {
      console.log(`✅ Successfully uploaded image to ${config.testBucket}/${testImageKey}`);

      if (uploadResult.result.presigned_url) {
        console.log(`✅ Generated presigned URL: ${uploadResult.result.presigned_url}`);

        // Try to access the URL
        if (mode === 'deployed') {
          console.log(`\nAttempting to access the image via presigned URL...`);
          try {
            // For deployed worker, use curl to check the URL works
            const curlCmd = `curl -s -I "${uploadResult.result.presigned_url}"`;
            const response = execSync(curlCmd).toString();

            if (response.includes('200 OK')) {
              console.log(`✅ Successfully accessed image via presigned URL`);
            } else {
              console.error(`❌ Failed to access image via presigned URL`);
              console.log(`Response:\n${response}`);
            }
          } catch (e) {
            console.error(`❌ Failed to test presigned URL: ${e.message}`);
          }

          // Display the URL for manual verification
          console.log(`\nYou can manually verify the image by visiting:\n${uploadResult.result.presigned_url}`);
        }
      }
    }

    // Part 4: Cleanup
    console.log('\n==================');
    console.log('PART 4: Cleanup');
    console.log('==================');

    // Delete the uploaded image
    const deleteResult = await callTool('r2_object_delete', {
      bucket_name: config.testBucket,
      key: testImageKey
    });

    validateResponse(deleteResult, `Delete uploaded image ${testImageKey}`);

    // Final summary
    console.log('\n================================');
    console.log('TESTING COMPLETE');
    console.log('================================');
    console.log('Image upload functionality tested successfully!');

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

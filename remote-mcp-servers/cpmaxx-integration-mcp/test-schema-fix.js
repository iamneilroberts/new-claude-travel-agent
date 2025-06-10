#!/usr/bin/env node

// Test that schemas are properly serialized without Zod
import { spawn } from 'child_process';

console.log('🔧 Testing Schema Fix - CPMaxx MCP Server');
console.log('==========================================');

// Start the server
const serverProcess = spawn('node', ['dist/local-server-standalone.js'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    CPMAXX_LOGIN: process.env.CPMAXX_LOGIN || 'kim.henderson@cruiseplanners.com',
    CPMAXX_PASSWORD: process.env.CPMAXX_PASSWORD || '3!Pineapples'
  }
});

// Test tools/list request
const listToolsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {}
};

let responseReceived = false;

// Handle server output
let responseBuffer = '';
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  responseBuffer += output;
  
  // Look for JSON response
  if (output.includes('"tools"')) {
    responseReceived = true;
    
    try {
      const lines = responseBuffer.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('{') && line.includes('"tools"')) {
          const response = JSON.parse(line);
          
          if (response.result && response.result.tools) {
            console.log('✅ Server responded with tools list');
            console.log(`✅ Found ${response.result.tools.length} tools`);
            
            // Check that schemas are proper JSON, not Zod objects
            response.result.tools.forEach((tool, index) => {
              console.log(`\n🔍 Tool ${index + 1}: ${tool.name}`);
              console.log(`   Description: ${tool.description}`);
              
              if (tool.inputSchema && typeof tool.inputSchema === 'object') {
                // Check if it's a proper JSON schema (not Zod)
                if (tool.inputSchema.type === 'object' && tool.inputSchema.properties) {
                  console.log(`   ✅ Schema: Valid JSON Schema`);
                  console.log(`   ✅ Properties: ${Object.keys(tool.inputSchema.properties).length} fields`);
                } else if (tool.inputSchema._def) {
                  console.log(`   ❌ Schema: Still contains Zod objects`);
                } else {
                  console.log(`   ⚠️  Schema: Unknown format`);
                }
              } else {
                console.log(`   ❌ Schema: Missing or invalid`);
              }
            });
            
            console.log('\n🎉 Schema Fix Test Results:');
            const hasValidSchemas = response.result.tools.every(tool => 
              tool.inputSchema && 
              tool.inputSchema.type === 'object' && 
              tool.inputSchema.properties &&
              !tool.inputSchema._def
            );
            
            if (hasValidSchemas) {
              console.log('✅ ALL SCHEMAS ARE VALID JSON SCHEMAS');
              console.log('✅ Zod objects successfully removed');
              console.log('✅ Claude Desktop should now be able to parse tool parameters');
            } else {
              console.log('❌ Some schemas are still invalid');
            }
          }
          break;
        }
      }
    } catch (error) {
      console.error('❌ Failed to parse response:', error.message);
    }
    
    console.log('\n🏁 Schema fix test completed!');
    serverProcess.kill();
    process.exit(0);
  }
});

// Handle server errors
serverProcess.on('close', (code) => {
  if (!responseReceived) {
    console.error(`❌ Server exited with code ${code}`);
    process.exit(1);
  }
});

// Set timeout
setTimeout(() => {
  if (!responseReceived) {
    console.error('\n⏰ Test timed out after 30 seconds');
    serverProcess.kill();
    process.exit(1);
  }
}, 30000);

// Wait for server to start, then send request
setTimeout(() => {
  console.log('📨 Sending tools/list request...');
  serverProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 3000);
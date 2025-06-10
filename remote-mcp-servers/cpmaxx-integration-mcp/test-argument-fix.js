#!/usr/bin/env node

// Test that argument processing works without toString errors
import { spawn } from 'child_process';

console.log('🔧 Testing Argument Processing Fix - CPMaxx MCP Server');
console.log('====================================================');

// Start the server
const serverProcess = spawn('node', ['dist/local-server-standalone.js'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    CPMAXX_LOGIN: process.env.CPMAXX_LOGIN || 'kim.henderson@cruiseplanners.com',
    CPMAXX_PASSWORD: process.env.CPMAXX_PASSWORD || '3!Pineapples'
  }
});

// Test hotel search with minimal parameters (to avoid long browser test)
const testBrowserRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'test_browser',
    arguments: {
      test_type: 'visible_test',
      visible_browser: false,
      debug_mode: false
    }
  }
};

let responseReceived = false;

// Handle server output
let responseBuffer = '';
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  responseBuffer += output;
  
  // Look for JSON response
  if (output.includes('"result"') && output.includes('"content"')) {
    responseReceived = true;
    
    try {
      const lines = responseBuffer.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('{') && line.includes('"result"')) {
          const response = JSON.parse(line);
          
          if (response.result && response.result.content) {
            const data = JSON.parse(response.result.content[0].text);
            
            console.log('✅ Tool executed successfully!');
            console.log(`✅ Status: ${data.status}`);
            console.log(`✅ Message: ${data.message}`);
            
            if (data.status === 'success') {
              console.log('\n🎉 ARGUMENT PROCESSING FIX SUCCESSFUL!');
              console.log('✅ No toString() errors');
              console.log('✅ Arguments processed correctly');
              console.log('✅ Server ready for Claude Desktop');
            } else {
              console.log('\n❌ Test failed with error:', data.message);
            }
          }
          break;
        }
      }
    } catch (error) {
      console.error('❌ Failed to parse response:', error.message);
    }
    
    console.log('\n🏁 Argument fix test completed!');
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
  console.log('📨 Sending test_browser request...');
  console.log('🔍 Testing argument processing without toString errors...');
  serverProcess.stdin.write(JSON.stringify(testBrowserRequest) + '\n');
}, 3000);
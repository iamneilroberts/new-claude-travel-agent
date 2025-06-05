#!/usr/bin/env node
/**
 * Test with visible browser and enhanced debugging
 */

import { spawn } from 'child_process';

console.log('🔍 Testing with Visible Browser & Enhanced Debugging');
console.log('==================================================');

// Start the server
const serverProcess = spawn('node', ['dist/local-server-standalone.js'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    CPMAXX_LOGIN: process.env.CPMAXX_LOGIN || 'kim.henderson@cruiseplanners.com',
    CPMAXX_PASSWORD: process.env.CPMAXX_PASSWORD || '3!Pineapples',
    // Playwright debugging environment variables
    DEBUG: 'pw:*',  // Enable all Playwright debug output
    PWDEBUG: '1'     // Enable Playwright inspector
  }
});

// Test request with visible browser and debugging
const hotelSearchRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'search_hotels',
    arguments: {
      location: 'Portland, Oregon',
      check_in_date: '2025-10-01',
      check_out_date: '2025-10-02',
      rooms: 1,
      adults: 2,
      children: 0,
      debug_mode: true  // This enables visible browser
    }
  }
};

let responseReceived = false;
let outputBuffer = '';

// Handle server output
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  outputBuffer += output;
  
  console.log('🔄 SERVER:', output.substring(0, 200));
  
  // Look for completion
  if (output.includes('"status": "success"') || output.includes('"content"')) {
    responseReceived = true;
    console.log('\n✅ Search completed! Check the browser window for what happened.');
    console.log('📄 Response received (length:', outputBuffer.length, 'chars)');
    
    // Try to parse just the status
    try {
      if (output.includes('"status": "success"')) {
        console.log('🎉 Status: SUCCESS');
      }
    } catch (e) {
      console.log('Response too large to parse completely');
    }
    
    console.log('\n🏁 Test completed! Browser should have shown the automation process.');
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
    console.error('\n⏰ Test timed out after 10 minutes');
    console.log('This is normal for visible browser testing - you can watch the automation in the browser window');
    serverProcess.kill();
    process.exit(1);
  }
}, 600000); // 10 minutes for visible testing

// Wait for server to start, then send request
setTimeout(() => {
  console.log('\n📨 Sending request with visible browser...');
  console.log('👁️  Watch the browser window to see the automation!');
  console.log('🔍 The browser will:');
  console.log('   1. Navigate to CPMaxx login');
  console.log('   2. Fill in credentials');
  console.log('   3. Navigate to hotel search');
  console.log('   4. Fill search form');
  console.log('   5. Wait for results');
  console.log('   6. Extract hotel data');
  console.log('');
  
  serverProcess.stdin.write(JSON.stringify(hotelSearchRequest) + '\n');
}, 3000);
#!/usr/bin/env node
/**
 * Simple test focused on debugging the blank browser issue
 */

import { spawn } from 'child_process';

console.log('🔍 Debug Test - Investigating Blank Browser Issue');
console.log('================================================');

// Start the server
const serverProcess = spawn('node', ['dist/local-server-standalone.js'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    CPMAXX_LOGIN: process.env.CPMAXX_LOGIN || 'kim.henderson@cruiseplanners.com',
    CPMAXX_PASSWORD: process.env.CPMAXX_PASSWORD || '3!Pineapples'
  }
});

// Simple test request
const testRequest = {
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
      debug_mode: true  // Enable all debugging
    }
  }
};

let completed = false;
let allOutput = '';

// Handle server output
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  allOutput += output;
  
  // Show key debugging output
  if (output.includes('🔍 DOM DEBUG') || output.includes('📸 Screenshot') || output.includes('URL:') || output.includes('Title:')) {
    console.log(output.trim());
  }
  
  // Check for completion or error
  if (output.includes('"status": "success"') || output.includes('"status": "error"')) {
    completed = true;
    console.log('\n✅ Test completed! Check the debug screenshots in the current directory.');
    console.log('🔍 Look for files named: debug-*-*.png');
    
    serverProcess.kill();
    process.exit(0);
  }
  
  // Show any errors
  if (output.includes('❌') || output.includes('ERROR')) {
    console.log('🚨 ERROR DETECTED:', output.trim());
  }
});

// Handle server errors
serverProcess.on('close', (code) => {
  if (!completed) {
    console.error(`❌ Server exited with code ${code}`);
    console.log('\nPartial output received:');
    console.log(allOutput.substring(0, 1000));
    process.exit(1);
  }
});

// Set timeout
setTimeout(() => {
  if (!completed) {
    console.error('\n⏰ Test timed out after 3 minutes');
    console.log('🔍 Check for debug screenshots that may have been created');
    serverProcess.kill();
    process.exit(1);
  }
}, 180000); // 3 minutes

// Wait for server to start, then send request
setTimeout(() => {
  console.log('\n📨 Sending debug test request...');
  console.log('🔍 This will create detailed screenshots and DOM analysis');
  console.log('👁️  Browser window should open (may take a moment)');
  console.log('📸 Screenshots will be saved with timestamps');
  console.log('');
  
  serverProcess.stdin.write(JSON.stringify(testRequest) + '\n');
}, 3000);
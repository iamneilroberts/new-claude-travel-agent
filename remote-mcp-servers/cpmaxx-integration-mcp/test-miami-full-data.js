#!/usr/bin/env node
/**
 * Complete CPMAXX test for Miami, Florida - shows 100% of raw data
 */

import { spawn } from 'child_process';

console.log('🌴 COMPLETE CPMAXX MIAMI TEST - 100% RAW DATA');
console.log('=============================================');
console.log('Searching for hotels in Miami, Florida');
console.log('Will display ALL raw data returned from CPMAXX');
console.log('');

// Start the server
const serverProcess = spawn('node', ['dist/local-server-standalone.js'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    CPMAXX_LOGIN: process.env.CPMAXX_LOGIN || 'kim.henderson@cruiseplanners.com',
    CPMAXX_PASSWORD: process.env.CPMAXX_PASSWORD || '3!Pineapples'
  }
});

// Miami hotel search
const hotelSearchRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'search_hotels',
    arguments: {
      location: 'Miami, Florida',
      check_in_date: '2025-07-15',
      check_out_date: '2025-07-20',
      rooms: 1,
      adults: 2,
      children: 0,
      debug_mode: false // headless for speed
    }
  }
};

let responseReceived = false;

// Handle server output
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  
  // Look for JSON response
  const lines = output.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('{') && line.includes('"content"')) {
      responseReceived = true;
      
      try {
        const response = JSON.parse(line);
        console.log('🎯 COMPLETE RAW RESPONSE DATA');
        console.log('============================');
        
        if (response.content && response.content[0]) {
          const data = JSON.parse(response.content[0].text);
          
          // Output 100% of the data in formatted JSON
          console.log('📊 FULL HOTEL DATA (100% COMPLETE):');
          console.log('===================================');
          console.log(JSON.stringify(data, null, 2));
          
        } else {
          console.log('❌ No content found in response');
          console.log('Raw response:', JSON.stringify(response, null, 2));
        }
      } catch (error) {
        console.error('❌ Failed to parse response:', error.message);
        console.log('Raw output:', output);
      }
      
      serverProcess.kill();
      process.exit(0);
    }
  }
});

// Handle server errors
serverProcess.on('close', (code) => {
  if (!responseReceived) {
    console.error(`❌ Server exited with code ${code} before sending response`);
    process.exit(1);
  }
});

// Set timeout
setTimeout(() => {
  if (!responseReceived) {
    console.error('❌ Test timed out after 3 minutes');
    serverProcess.kill();
    process.exit(1);
  }
}, 180000);

// Send request
setTimeout(() => {
  console.log('📨 Sending Miami hotel search request...');
  console.log('🔍 Search parameters:');
  console.log('   📍 Location: Miami, Florida');
  console.log('   📅 Check-in: 2025-07-15');
  console.log('   📅 Check-out: 2025-07-20');
  console.log('   🛏️ Rooms: 1');
  console.log('   👥 Adults: 2, Children: 0');
  console.log('');
  console.log('⏳ Starting browser automation...');
  serverProcess.stdin.write(JSON.stringify(hotelSearchRequest) + '\n');
}, 2000);
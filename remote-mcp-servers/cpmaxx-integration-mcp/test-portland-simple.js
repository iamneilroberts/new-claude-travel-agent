#!/usr/bin/env node
/**
 * Simple Portland test to debug output
 */

import { spawn } from 'child_process';

console.log('🔍 Testing Portland Oregon Hotel Search - Debug Mode');
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

// Hotel search request for Portland Oregon
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
      debug_mode: true
    }
  }
};

let responseReceived = false;
let fullOutput = '';

// Handle server output
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  fullOutput += output;
  
  console.log('🔄 SERVER OUTPUT CHUNK:', output);
  
  // Look for JSON response
  if (output.includes('"content"')) {
    responseReceived = true;
    console.log('\n📄 FOUND RESPONSE WITH CONTENT!');
    console.log('Full output length:', fullOutput.length);
    
    // Try to extract and parse JSON
    const lines = fullOutput.split('\n');
    for (const line of lines) {
      if (line.trim().startsWith('{') && line.includes('"content"')) {
        try {
          const response = JSON.parse(line);
          if (response.content && response.content[0]) {
            const data = JSON.parse(response.content[0].text);
            
            console.log('\n✅ PARSED SUCCESSFULLY!');
            console.log('Status:', data.status);
            console.log('Hotels found:', data.hotels ? data.hotels.length : 0);
            
            if (data.hotels && data.hotels.length > 0) {
              console.log('\nFirst 3 hotels:');
              data.hotels.slice(0, 3).forEach((hotel, i) => {
                console.log(`${i+1}. ${hotel.name} - $${hotel.price} - Commission: $${hotel.commission} (${hotel.commissionPercent}%)`);
              });
            }
          }
        } catch (error) {
          console.error('❌ JSON Parse Error:', error.message);
          console.log('Problematic line:', line.substring(0, 100) + '...');
        }
        break;
      }
    }
    
    serverProcess.kill();
    process.exit(0);
  }
});

// Handle server errors
serverProcess.on('close', (code) => {
  if (!responseReceived) {
    console.error(`❌ Server exited with code ${code}`);
    console.log('Full output received:', fullOutput);
    process.exit(1);
  }
});

// Set timeout
setTimeout(() => {
  if (!responseReceived) {
    console.error('\n⏰ Test timed out after 5 minutes');
    console.log('Full output received:', fullOutput);
    serverProcess.kill();
    process.exit(1);
  }
}, 300000); // 5 minutes

// Wait for server to start, then send request
setTimeout(() => {
  console.log('📨 Sending Portland request...');
  serverProcess.stdin.write(JSON.stringify(hotelSearchRequest) + '\n');
}, 3000);
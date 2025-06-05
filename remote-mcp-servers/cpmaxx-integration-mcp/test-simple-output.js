#!/usr/bin/env node
/**
 * Simple test that captures all output
 */

import { spawn } from 'child_process';
import fs from 'fs';

console.log('🔍 Testing CPMaxx Hotel Extraction - Capturing All Output');
console.log('=========================================================');

// Start the server
const serverProcess = spawn('node', ['dist/local-server-standalone.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    CPMAXX_LOGIN: process.env.CPMAXX_LOGIN || 'kim.henderson@cruiseplanners.com',
    CPMAXX_PASSWORD: process.env.CPMAXX_PASSWORD || '3!Pineapples'
  }
});

// Hotel search request
const hotelSearchRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'search_hotels',
    arguments: {
      location: 'Cork',
      check_in_date: '2025-06-10',
      check_out_date: '2025-06-11',
      rooms: 1,
      adults: 2,
      children: 0,
      debug_mode: false
    }
  }
};

let allOutput = '';
let allErrors = '';

// Capture all stdout
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  allOutput += output;
  console.log('STDOUT:', output);
});

// Capture all stderr
serverProcess.stderr.on('data', (data) => {
  const output = data.toString();
  allErrors += output;
  console.log('STDERR:', output);
});

// Handle server close
serverProcess.on('close', (code) => {
  console.log(`\n📁 Server closed with code: ${code}`);
  
  // Save all output to files
  fs.writeFileSync('test-output.txt', allOutput);
  fs.writeFileSync('test-errors.txt', allErrors);
  
  console.log('💾 Output saved to: test-output.txt');
  console.log('💾 Errors saved to: test-errors.txt');
  
  // Try to find and parse JSON response
  const jsonMatches = allOutput.match(/\{[^{}]*"content"[^{}]*\}/g);
  if (jsonMatches) {
    console.log(`\n🔍 Found ${jsonMatches.length} potential JSON responses:`);
    jsonMatches.forEach((match, i) => {
      try {
        const response = JSON.parse(match);
        if (response.content && response.content[0]) {
          const data = JSON.parse(response.content[0].text);
          console.log(`\n✅ Response ${i + 1} - Hotels found: ${data.hotels?.length || 0}`);
          
          if (data.hotels && data.hotels.length > 0) {
            console.log('\n🏨 FIRST 5 HOTELS:');
            data.hotels.slice(0, 5).forEach((hotel, idx) => {
              console.log(`${idx + 1}. ${hotel.name} - $${hotel.price} - ${hotel.extractionMethod}`);
            });
          }
        }
      } catch (e) {
        console.log(`❌ Response ${i + 1} - Failed to parse: ${e.message}`);
      }
    });
  } else {
    console.log('❌ No JSON responses found in output');
  }
  
  process.exit(0);
});

// Send request after delay
setTimeout(() => {
  console.log('📨 Sending hotel search request...');
  serverProcess.stdin.write(JSON.stringify(hotelSearchRequest) + '\n');
  
  // Kill after timeout
  setTimeout(() => {
    console.log('\n⏰ Timeout - killing server...');
    serverProcess.kill();
  }, 60000);
}, 3000);
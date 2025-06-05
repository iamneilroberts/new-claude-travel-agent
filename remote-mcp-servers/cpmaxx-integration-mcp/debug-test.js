#!/usr/bin/env node
/**
 * Debug test to see exactly what the CPMaxx server returns
 */

import { spawn } from 'child_process';

console.log('🔍 DEBUG: CPMaxx MCP Server Response Analysis');
console.log('===========================================');

// Start the server
const serverProcess = spawn('node', ['dist/local-server-standalone.js'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    CPMAXX_LOGIN: process.env.CPMAXX_LOGIN || 'kim.henderson@cruiseplanners.com',
    CPMAXX_PASSWORD: process.env.CPMAXX_PASSWORD || '3!Pineapples'
  }
});

// Simple hotel search request
const hotelSearchRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'search_hotels',
    arguments: {
      location: 'Cork, Ireland',
      check_in_date: '2025-07-15',
      check_out_date: '2025-07-20',
      rooms: 1,
      adults: 2,
      children: 0,
      debug_mode: true // visible browser
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
        console.log('📋 FULL MCP RESPONSE:');
        console.log('====================');
        console.log(JSON.stringify(response, null, 2));
        
        if (response.content && response.content[0]) {
          const data = JSON.parse(response.content[0].text);
          
          console.log('\n📊 PARSED HOTEL DATA:');
          console.log('=====================');
          console.log('Status:', data.status);
          console.log('Hotels found:', data.hotels ? data.hotels.length : 0);
          
          if (data.hotels && data.hotels.length > 0) {
            console.log('\n🏨 SAMPLE HOTEL:');
            console.log(JSON.stringify(data.hotels[0], null, 2));
            
            console.log('\n🔍 DATA SOURCE VERIFICATION:');
            console.log('Source:', data.search_metadata?.source);
            console.log('Is real data?', data.search_metadata?.source === 'real_cpmaxx_data');
          } else {
            console.log('\n❌ NO HOTELS - DEBUG INFO:');
            if (data.debug_info) {
              console.log('Page title:', data.debug_info.page_title);
              console.log('Page URL:', data.debug_info.page_url);
              console.log('Page content preview:', data.debug_info.page_text_preview);
            }
          }
          
          console.log('\n📝 AUTOMATION LOG:');
          console.log('==================');
          if (data.automation_log) {
            data.automation_log.forEach((entry, i) => {
              console.log(`${i + 1}. ${entry}`);
            });
          }
        }
      } catch (error) {
        console.error('❌ Failed to parse response:', error.message);
        console.log('Raw response:', line);
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
  console.log('📨 Sending debug request...');
  serverProcess.stdin.write(JSON.stringify(hotelSearchRequest) + '\n');
}, 2000);
#!/usr/bin/env node
/**
 * Simple CPMaxx test - no filters, just basic search with real data
 */

import { spawn } from 'child_process';

console.log('🚀 Simple CPMaxx MCP Test - Real Data, No Filters');
console.log('================================================');
console.log('This will search for hotels in Cork, Ireland and extract real data');
console.log('No filters applied - just basic search results');
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

// Simple hotel search - NO FILTERS
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
      // NO FILTERS - just basic search
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
        console.log('✅ SUCCESS: Real CPMaxx data received!');
        console.log('=========================================');
        
        if (response.content && response.content[0]) {
          const data = JSON.parse(response.content[0].text);
          
          console.log(`Status: ${data.status}`);
          if (data.search_metadata) {
            console.log(`📍 Location: ${data.search_metadata.location}`);
            console.log(`📅 Dates: ${data.search_metadata.dates}`);
            console.log(`👥 Guests: ${data.search_metadata.guests}`);
            console.log(`🔍 Source: ${data.search_metadata.source}`);
          }
          console.log('');
          
          if (data.hotels && data.hotels.length > 0) {
            console.log(`🏨 REAL HOTELS FOUND: ${data.hotels.length}`);
            console.log('================================');
            
            // Show first 5 hotels
            data.hotels.slice(0, 5).forEach((hotel, index) => {
              console.log(`\n${index + 1}. ${hotel.name}`);
              console.log(`   📍 ${hotel.address}`);
              console.log(`   ⭐ Rating: ${hotel.rating}/5`);
              console.log(`   💰 Price: €${hotel.price}/night`);
              console.log(`   💵 Commission: €${hotel.commission} (${hotel.commissionPercent}%)`);
              console.log(`   ✅ Available: ${hotel.available ? 'Yes' : 'No'}`);
              
              if (hotel.photos && hotel.photos.featured) {
                console.log(`   📸 Photo: ${hotel.photos.featured.substring(0, 80)}...`);
              }
              
              if (hotel.photos && hotel.photos.giataId) {
                console.log(`   🆔 Giata ID: ${hotel.photos.giataId}`);
              }
            });
            
            if (data.hotels.length > 5) {
              console.log(`\n... and ${data.hotels.length - 5} more hotels`);
            }
            
          } else {
            console.log('No hotels found');
            
            if (data.debug_info) {
              console.log('\nDebug info:');
              console.log(`Page: ${data.debug_info.page_title}`);
              console.log(`URL: ${data.debug_info.page_url}`);
            }
          }
          
          console.log('\n📝 Key automation steps:');
          if (data.automation_log) {
            const importantSteps = data.automation_log.filter(step => 
              step.includes('===') || step.includes('✅') || step.includes('❌') || step.includes('Found')
            );
            importantSteps.forEach(step => {
              console.log(`   ${step}`);
            });
          }
          
        }
      } catch (error) {
        console.error('❌ Failed to parse response:', error.message);
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
    console.error('❌ Test timed out after 2 minutes');
    serverProcess.kill();
    process.exit(1);
  }
}, 120000);

// Send request
setTimeout(() => {
  console.log('📨 Sending simple hotel search request (no filters)...');
  serverProcess.stdin.write(JSON.stringify(hotelSearchRequest) + '\n');
}, 2000);
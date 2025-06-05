#!/usr/bin/env node
/**
 * Test the standalone CPMaxx MCP server with real browser automation
 */

import { spawn } from 'child_process';

console.log('🚀 Testing CPMaxx Local MCP Server with Real Browser Automation');
console.log('===============================================================');
console.log('This will:');
console.log('1. Launch a real Chrome browser');
console.log('2. Login to CPMaxx with actual credentials'); 
console.log('3. Search for hotels in Cork, Ireland');
console.log('4. Extract actual hotel data and photos');
console.log('5. Return real results (not mock data)');
console.log('');
console.log('Expected time: 30-60 seconds');
console.log('');

// Start the server
const serverProcess = spawn('node', ['dist/local-server-standalone.js'], {
  stdio: ['pipe', 'pipe', 'inherit'], // pipe stdin/stdout, inherit stderr for logs
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
      location: 'Cork, Ireland',
      check_in_date: '2025-07-15',
      check_out_date: '2025-07-20',
      rooms: 1,
      adults: 2,
      children: 0,
      filters: {
        star_rating: [4, 5]
      },
      debug_mode: false // Set to true to see visible browser
    }
  }
};

let responseReceived = false;
let responseData = '';

// Handle server output
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  responseData += output;
  
  // Look for JSON response
  const lines = output.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('{') && line.includes('"content"')) {
      responseReceived = true;
      
      try {
        const response = JSON.parse(line);
        console.log('✅ REAL CPMAXX DATA RECEIVED!');
        console.log('================================');
        
        if (response.content && response.content[0]) {
          const data = JSON.parse(response.content[0].text);
          
          console.log(`📍 Location: ${data.search_metadata?.location}`);
          console.log(`📅 Dates: ${data.search_metadata?.dates}`);
          console.log(`👥 Guests: ${data.search_metadata?.guests}`);
          console.log(`🔍 Source: ${data.search_metadata?.source}`);
          console.log('');
          
          if (data.hotels && data.hotels.length > 0) {
            console.log(`🏨 REAL HOTELS FOUND: ${data.hotels.length}`);
            console.log('==============================');
            
            data.hotels.forEach((hotel, index) => {
              console.log(`\n${index + 1}. ${hotel.name}`);
              console.log(`   📍 ${hotel.address}`);
              console.log(`   ⭐ Rating: ${hotel.rating}/5`);
              console.log(`   💰 Price: €${hotel.price}/night`);
              console.log(`   💵 Commission: €${hotel.commission} (${hotel.commissionPercent}%)`);
              console.log(`   ✅ Available: ${hotel.available ? 'Yes' : 'No'}`);
              
              if (hotel.photos && hotel.photos.featured) {
                console.log(`   📸 Photo: ${hotel.photos.featured.substring(0, 60)}...`);
              }
              
              if (hotel.photos && hotel.photos.giataId) {
                console.log(`   🆔 Giata ID: ${hotel.photos.giataId}`);
              }
              
              if (hotel.amenities && hotel.amenities.length > 0) {
                console.log(`   🎯 Amenities: ${hotel.amenities.slice(0, 3).join(', ')}${hotel.amenities.length > 3 ? '...' : ''}`);
              }
            });
          } else {
            console.log('❌ No hotels found');
          }
          
          console.log('\n📝 AUTOMATION LOG:');
          console.log('==================');
          if (data.automation_log) {
            data.automation_log.forEach(logEntry => {
              console.log(`   ${logEntry}`);
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
    console.error('❌ Test timed out after 2 minutes');
    serverProcess.kill();
    process.exit(1);
  }
}, 120000);

// Wait for server to start, then send request
setTimeout(() => {
  console.log('📨 Sending hotel search request...');
  serverProcess.stdin.write(JSON.stringify(hotelSearchRequest) + '\n');
}, 2000);
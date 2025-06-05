#!/usr/bin/env node
/**
 * Test CPMaxx MCP server with VISIBLE browser for debugging
 */

import { spawn } from 'child_process';

console.log('🔍 CPMaxx MCP Server - VISIBLE BROWSER DEBUG MODE');
console.log('=================================================');
console.log('This will:');
console.log('1. Launch a VISIBLE Chrome browser window');
console.log('2. Show you exactly what happens during CPMaxx automation');
console.log('3. Allow you to see any issues with login, navigation, or search');
console.log('4. Extract real data with visible feedback');
console.log('');
console.log('⏱️  Expected time: 60-90 seconds');
console.log('👀 Watch the browser window to see the automation in action!');
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

// Hotel search request with visible browser enabled
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
      debug_mode: true // This enables visible browser!
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
        console.log('\n🎉 BROWSER AUTOMATION COMPLETED!');
        console.log('================================');
        
        if (response.content && response.content[0]) {
          const data = JSON.parse(response.content[0].text);
          
          console.log(`Status: ${data.status}`);
          if (data.search_metadata) {
            console.log(`📍 Location: ${data.search_metadata.location}`);
            console.log(`📅 Dates: ${data.search_metadata.dates}`);
            console.log(`👥 Guests: ${data.search_metadata.guests}`);
            console.log(`🔍 Data Source: ${data.search_metadata.source}`);
          }
          console.log('');
          
          if (data.hotels && data.hotels.length > 0) {
            console.log(`🏨 REAL HOTELS EXTRACTED: ${data.hotels.length}`);
            console.log('=================================');
            
            data.hotels.forEach((hotel, index) => {
              console.log(`\n${index + 1}. ${hotel.name}`);
              console.log(`   📍 ${hotel.address}`);
              console.log(`   ⭐ Rating: ${hotel.rating}/5 stars`);
              console.log(`   💰 Price: €${hotel.price}/night`);
              console.log(`   💵 Commission: €${hotel.commission} (${hotel.commissionPercent}%)`);
              console.log(`   ✅ Available: ${hotel.available ? 'Yes' : 'No'}`);
              
              if (hotel.photos && hotel.photos.featured) {
                console.log(`   📸 Featured Photo: ${hotel.photos.featured}`);
              }
              
              if (hotel.photos && hotel.photos.giataId) {
                console.log(`   🆔 Giata ID: ${hotel.photos.giataId} (for photo extraction)`);
              }
              
              if (hotel.amenities && hotel.amenities.length > 0) {
                console.log(`   🎯 Amenities: ${hotel.amenities.join(', ')}`);
              }
            });
            
            console.log('\n✅ SUCCESS: Real CPMaxx data extracted successfully!');
            console.log('🎯 Next steps:');
            console.log('   - Use Giata IDs to extract full photo galleries');
            console.log('   - Integrate with R2 storage for photo downloads');
            console.log('   - Add to Claude Desktop configuration');
            
          } else if (data.message) {
            console.log(`ℹ️  Result: ${data.message}`);
            
            if (data.debug_info) {
              console.log('\n🐛 DEBUG INFO:');
              console.log(`   Page Title: ${data.debug_info.page_title}`);
              console.log(`   Page URL: ${data.debug_info.page_url}`);
              console.log(`   Page Content Preview: ${data.debug_info.page_text_preview}`);
            }
          }
          
          console.log('\n📝 AUTOMATION STEPS:');
          console.log('====================');
          if (data.automation_log) {
            data.automation_log.forEach((logEntry, index) => {
              console.log(`${index + 1}. ${logEntry}`);
            });
          }
          
        }
      } catch (error) {
        console.error('❌ Failed to parse response:', error.message);
        console.log('Raw response:', line);
      }
      
      console.log('\n🏁 Test completed! Browser should have closed automatically.');
      serverProcess.kill();
      process.exit(0);
    }
  }
});

// Handle server errors
serverProcess.on('close', (code) => {
  if (!responseReceived) {
    console.error(`❌ Server exited with code ${code} before sending response`);
    console.log('This might indicate:');
    console.log('- Network connectivity issues');
    console.log('- CPMaxx login problems');
    console.log('- Browser automation failures');
    console.log('');
    console.log('Check the error messages above for details.');
    process.exit(1);
  }
});

// Set timeout (longer for visible browser debugging)
setTimeout(() => {
  if (!responseReceived) {
    console.error('\n⏰ Test timed out after 3 minutes');
    console.log('This could indicate:');
    console.log('- CPMaxx is responding slowly');
    console.log('- Search is taking longer than expected');
    console.log('- Network issues');
    console.log('');
    console.log('The browser window may still be open - check it manually.');
    serverProcess.kill();
    process.exit(1);
  }
}, 180000); // 3 minutes

// Wait for server to start, then send request
setTimeout(() => {
  console.log('📨 Sending hotel search request with visible browser...');
  console.log('🔍 Look for the Chrome browser window that should appear!');
  console.log('');
  serverProcess.stdin.write(JSON.stringify(hotelSearchRequest) + '\n');
}, 3000);
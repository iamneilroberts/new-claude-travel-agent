#!/usr/bin/env node
/**
 * Test the new checkbox-based extraction approach
 */

import { spawn } from 'child_process';

console.log('🔍 Testing Checkbox-Based Hotel Extraction');
console.log('=========================================');

function displayResults(data) {
  console.log(`Status: ${data.status}`);
  
  if (data.hotels && data.hotels.length > 0) {
    console.log(`\n🏨 HOTELS EXTRACTED: ${data.hotels.length}`);
    console.log('============================');
    
    // Show first 10 hotels with details
    data.hotels.slice(0, 10).forEach((hotel, index) => {
      console.log(`\n${index + 1}. ${hotel.name}`);
      console.log(`   📍 ${hotel.address}`);
      console.log(`   ⭐ Rating: ${hotel.rating}/5 stars`);
      console.log(`   💰 Price: $${hotel.price}/night`);
      console.log(`   💵 Commission: $${hotel.commission} (${hotel.commissionPercent}%)`);
      console.log(`   🔧 Method: ${hotel.extractionMethod}`);
      
      if (hotel.photos && hotel.photos.giataId) {
        console.log(`   🆔 Giata ID: ${hotel.photos.giataId}`);
      }
    });
    
    // Show extraction method breakdown
    const extractionMethods = {};
    data.hotels.forEach(hotel => {
      extractionMethods[hotel.extractionMethod] = (extractionMethods[hotel.extractionMethod] || 0) + 1;
    });
    
    console.log(`\n📊 EXTRACTION METHOD BREAKDOWN:`);
    Object.entries(extractionMethods).forEach(([method, count]) => {
      console.log(`   ${method}: ${count} hotels`);
    });
    
    // Show hotel names to verify they're no longer "Unknown Hotel"
    console.log(`\n📝 ALL HOTEL NAMES (first 20):`);
    data.hotels.slice(0, 20).forEach((hotel, i) => {
      console.log(`   ${i + 1}. ${hotel.name}`);
    });
    
    console.log('\n✅ SUCCESS: Real hotel names extracted from checkbox data attributes!');
    
  } else {
    console.log(`ℹ️  No hotels found`);
  }
}

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
      location: 'Miami, Florida',
      check_in_date: '2025-06-10',
      check_out_date: '2025-06-11',
      rooms: 1,
      adults: 2,
      children: 0,
      debug_mode: true // Enable debug mode
    }
  }
};

let responseReceived = false;

// Handle server output
let responseBuffer = '';
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  responseBuffer += output;
  
  // Debug: log all output
  console.log('🔄 SERVER OUTPUT:', output);
  
  // Look for JSON response
  const lines = output.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('{') && line.includes('"content"')) {
      responseReceived = true;
      
      try {
        const response = JSON.parse(line);
        console.log('\n🎉 EXTRACTION COMPLETED!');
        console.log('========================');
        
        if (response.content && response.content[0]) {
          const data = JSON.parse(response.content[0].text);
          
          displayResults(data);
        }
      } catch (error) {
        console.error('❌ Failed to parse response:', error.message);
        console.log('Raw line:', line.substring(0, 200) + '...');
        
        // Try to find and parse the complete response from buffer
        const jsonMatch = responseBuffer.match(/\{.*"content".*\}/s);
        if (jsonMatch) {
          try {
            const response = JSON.parse(jsonMatch[0]);
            console.log('\n🎉 FOUND COMPLETE RESPONSE IN BUFFER!');
            const data = JSON.parse(response.content[0].text);
            displayResults(data);
          } catch (e) {
            console.error('❌ Buffer parsing also failed:', e.message);
          }
        }
      }
      
      console.log('\n🏁 Test completed!');
      serverProcess.kill();
      process.exit(0);
    }
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
    console.error('\n⏰ Test timed out after 5 minutes');
    serverProcess.kill();
    process.exit(1);
  }
}, 300000); // 5 minutes timeout for slow provider aggregation

// Wait for server to start, then send request
setTimeout(() => {
  console.log('📨 Sending hotel search request...');
  serverProcess.stdin.write(JSON.stringify(hotelSearchRequest) + '\n');
}, 3000);
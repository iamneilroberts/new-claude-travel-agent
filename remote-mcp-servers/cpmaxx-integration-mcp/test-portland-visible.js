#!/usr/bin/env node
/**
 * Test Portland Oregon hotel search with visible browser
 */

import { spawn } from 'child_process';

console.log('🏨 Testing Portland Oregon Hotel Search with Real Commission Extraction');
console.log('==================================================================');

function displayResults(data) {
  console.log(`Status: ${data.status}`);
  
  if (data.hotels && data.hotels.length > 0) {
    console.log(`\n🏨 HOTELS FOUND: ${data.hotels.length}`);
    console.log('='.repeat(120));
    
    // Create table header
    console.log('| # | Hotel Name                        | Price  | ⭐ | Commission    | Method                      |');
    console.log('|---|-----------------------------------|--------|---|---------------|-----------------------------|');
    
    // Show results in table format
    data.hotels.slice(0, 20).forEach((hotel, index) => {
      const name = hotel.name.substring(0, 33).padEnd(33);
      const price = `$${hotel.price}`.padEnd(6);
      const rating = hotel.rating.toString().padEnd(1);
      const commission = `$${hotel.commission} (${hotel.commissionPercent}%)`.padEnd(13);
      const method = hotel.extractionMethod.substring(0, 27).padEnd(27);
      
      console.log(`| ${(index + 1).toString().padEnd(1)} | ${name} | ${price} | ${rating} | ${commission} | ${method} |`);
    });
    
    console.log('='.repeat(120));
    
    // Show detailed breakdown for first 5 hotels
    console.log(`\n📋 DETAILED BREAKDOWN (First 5 Hotels):`);
    console.log('='.repeat(80));
    
    data.hotels.slice(0, 5).forEach((hotel, index) => {
      console.log(`\n${index + 1}. ${hotel.name}`);
      console.log(`   📍 Address: ${hotel.address}`);
      console.log(`   ⭐ Rating: ${hotel.rating}/5 stars`);
      console.log(`   💰 Price: $${hotel.price}/night`);
      console.log(`   💵 Commission: $${hotel.commission} (${hotel.commissionPercent}%)`);
      console.log(`   🔧 Extraction Method: ${hotel.extractionMethod}`);
      console.log(`   📸 Photos: ${hotel.photos.photoCount || 'N/A'} pictures`);
      
      if (hotel.photos && hotel.photos.giataId) {
        console.log(`   🆔 Giata ID: ${hotel.photos.giataId}`);
      }
      
      if (hotel.amenities && hotel.amenities.length > 0) {
        console.log(`   🏨 Amenities: ${hotel.amenities.slice(0, 3).join(', ')}`);
      }
    });
    
    // Commission analysis
    const realCommissions = data.hotels.filter(h => h.extractionMethod.includes('real_commission'));
    const calculatedCommissions = data.hotels.filter(h => !h.extractionMethod.includes('real_commission'));
    
    console.log(`\n💰 COMMISSION EXTRACTION ANALYSIS:`);
    console.log(`   ✅ Real commission data found: ${realCommissions.length} hotels`);
    console.log(`   🔢 Calculated commission used: ${calculatedCommissions.length} hotels`);
    
    if (realCommissions.length > 0) {
      const avgRealCommission = realCommissions.reduce((sum, h) => sum + h.commissionPercent, 0) / realCommissions.length;
      console.log(`   📊 Average real commission rate: ${avgRealCommission.toFixed(1)}%`);
    }
    
    console.log('\n✅ SUCCESS: Portland Oregon hotel search completed with real commission extraction!');
    
  } else {
    console.log(`ℹ️  No hotels found`);
  }
  
  // Show automation log if available
  if (data.automation_log && data.automation_log.length > 0) {
    console.log(`\n📝 AUTOMATION LOG (Last 10 entries):`);
    console.log('-'.repeat(60));
    data.automation_log.slice(-10).forEach((entry, i) => {
      console.log(`${i + 1}. ${entry}`);
    });
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
      debug_mode: true // Enable debug mode to see browser and save screenshots
    }
  }
};

let responseReceived = false;

// Handle server output
let responseBuffer = '';
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  responseBuffer += output;
  
  // Look for JSON response
  const lines = output.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('{') && line.includes('"content"')) {
      responseReceived = true;
      
      try {
        const response = JSON.parse(line);
        console.log('\n🎉 PORTLAND OREGON EXTRACTION COMPLETED!');
        console.log('========================================');
        
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
      
      console.log('\n🏁 Portland Oregon test completed!');
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

// Set timeout (extended for visible browser testing)
setTimeout(() => {
  if (!responseReceived) {
    console.error('\n⏰ Test timed out after 8 minutes');
    serverProcess.kill();
    process.exit(1);
  }
}, 480000); // 8 minutes timeout

// Wait for server to start, then send request
setTimeout(() => {
  console.log('📨 Sending Portland Oregon hotel search request...');
  console.log('🔍 Location: Portland, Oregon');
  console.log('📅 Check-in: 2025-10-01');
  console.log('📅 Check-out: 2025-10-02');
  console.log('🏨 Rooms: 1, Adults: 2, Children: 0');
  console.log('👁️  Visible browser: Enabled');
  console.log('');
  
  serverProcess.stdin.write(JSON.stringify(hotelSearchRequest) + '\n');
}, 3000);
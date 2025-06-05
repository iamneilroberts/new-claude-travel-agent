#!/usr/bin/env node
/**
 * Test enhanced data extraction with intelligent recommendations
 */

import { spawn } from 'child_process';

console.log('🚀 Testing Enhanced Hotel Data Extraction & Intelligence');
console.log('=======================================================');

function displayEnhancedResults(data) {
  console.log(`Status: ${data.status}`);
  console.log(`Hotels Found: ${data.hotels?.length || 0}`);
  
  if (data.analytics) {
    console.log('\n📊 MARKET ANALYTICS');
    console.log('==================');
    console.log(`Total Hotels: ${data.analytics.totalHotels}`);
    console.log(`Price Range: $${data.analytics.priceRange.lowest} - $${data.analytics.priceRange.highest} (avg: $${data.analytics.priceRange.average})`);
    console.log(`Commission Range: ${data.analytics.commissionRange.lowest}% - ${data.analytics.commissionRange.highest}% (avg: ${data.analytics.commissionRange.average}%)`);
    console.log(`Rating Range: ${data.analytics.ratingRange.lowest}⭐ - ${data.analytics.ratingRange.highest}⭐ (avg: ${data.analytics.ratingRange.average}⭐)`);
    console.log(`Total Commission Potential: $${data.analytics.totalCommissionPotential}`);
    console.log(`OTA Verified: ${data.analytics.otaVerifiedCount}/${data.analytics.totalHotels} (${data.analytics.otaVerificationPercentage}%)`);
    
    if (Object.keys(data.analytics.hotelPrograms).length > 0) {
      console.log(`Hotel Programs: ${Object.entries(data.analytics.hotelPrograms).map(([prog, count]) => `${prog}(${count})`).join(', ')}`);
    }
  }
  
  if (data.recommendations) {
    console.log('\n🎯 INTELLIGENT RECOMMENDATIONS');
    console.log('==============================');
    
    // Max Commission Strategy
    console.log('\n💰 MAX COMMISSION STRATEGY:');
    console.log(`   Strategy: ${data.recommendations.maxCommission.strategy}`);
    data.recommendations.maxCommission.topPicks.slice(0, 3).forEach((pick, i) => {
      console.log(`   ${i+1}. ${pick.name}`);
      console.log(`      Price: $${pick.price} | Rating: ${pick.rating}⭐ | Commission: $${pick.commission} (${pick.commissionPercent}%)`);
      console.log(`      Reason: ${pick.reason}`);
    });
    
    // Balanced Strategy  
    console.log('\n⚖️  BALANCED STRATEGY:');
    console.log(`   Strategy: ${data.recommendations.balanced.strategy}`);
    data.recommendations.balanced.topPicks.slice(0, 3).forEach((pick, i) => {
      console.log(`   ${i+1}. ${pick.name}`);
      console.log(`      Price: $${pick.price} | Rating: ${pick.rating}⭐ | Commission: $${pick.commission} (${pick.commissionPercent}%)`);
      console.log(`      Reason: ${pick.reason}`);
    });
    
    // Best Value Strategy
    console.log('\n💎 BEST VALUE STRATEGY:');
    console.log(`   Strategy: ${data.recommendations.bestValue.strategy}`);
    data.recommendations.bestValue.topPicks.slice(0, 3).forEach((pick, i) => {
      console.log(`   ${i+1}. ${pick.name}`);
      console.log(`      Price: $${pick.price} | Rating: ${pick.rating}⭐ | Commission: $${pick.commission} (${pick.commissionPercent}%)`);
      console.log(`      Reason: ${pick.reason}`);
    });
    
    // Premium Programs
    if (data.recommendations.premiumPrograms.topPicks.length > 0) {
      console.log('\n🏆 PREMIUM PROGRAMS:');
      console.log(`   Strategy: ${data.recommendations.premiumPrograms.strategy}`);
      data.recommendations.premiumPrograms.topPicks.slice(0, 3).forEach((pick, i) => {
        console.log(`   ${i+1}. ${pick.name}`);
        console.log(`      Price: $${pick.price} | Rating: ${pick.rating}⭐ | Commission: $${pick.commission} (${pick.commissionPercent}%)`);
        console.log(`      Programs: ${pick.programs?.join(', ') || 'N/A'}`);
        console.log(`      Reason: ${pick.reason}`);
      });
    }
  }
  
  // Show detailed data for first hotel to demonstrate enhanced extraction
  if (data.hotels && data.hotels.length > 0) {
    const hotel = data.hotels[0];
    console.log('\n🔍 ENHANCED DATA SAMPLE (First Hotel):');
    console.log('====================================');
    console.log(`Name: ${hotel.name}`);
    console.log(`Address: ${hotel.address}`);
    console.log(`Price: $${hotel.price}/night (Total: $${hotel.totalPrice || 'N/A'})`);
    console.log(`Rating: ${hotel.rating}⭐`);
    console.log(`Commission: $${hotel.commission} (${hotel.commissionPercent}%)`);
    console.log(`Photos: ${hotel.photos.photoCount} pictures (Giata ID: ${hotel.photos.giataId})`);
    
    if (hotel.location?.coordinates) {
      console.log(`Coordinates: ${hotel.location.coordinates.lat}, ${hotel.location.coordinates.lng}`);
    }
    
    if (hotel.hotelPrograms?.length > 0) {
      console.log(`Hotel Programs: ${hotel.hotelPrograms.join(', ')}`);
    }
    
    if (hotel.otaVerification?.verified) {
      console.log(`OTA Verified: Yes (${hotel.otaVerification.rates.length} providers)`);
      hotel.otaVerification.rates.forEach(rate => {
        console.log(`   ${rate.provider}: $${rate.price}`);
      });
    }
    
    console.log(`Scores - MaxCommission: ${hotel.scores.maxCommission}, Balanced: ${hotel.scores.balanced}, BestValue: ${hotel.scores.bestValue}`);
    console.log(`URLs - Select: ${hotel.urls.selectHotel}`);
    console.log(`Extraction Method: ${hotel.extractionMethod}`);
  }
  
  console.log('\n✅ Enhanced extraction completed successfully!');
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

// Quick search request for testing (smaller location for faster results)
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
      debug_mode: false // Faster without debug
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
  if (output.includes('"content"')) {
    responseReceived = true;
    
    try {
      const lines = responseBuffer.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('{') && line.includes('"content"')) {
          const response = JSON.parse(line);
          
          if (response.content && response.content[0]) {
            const data = JSON.parse(response.content[0].text);
            
            console.log('\n🎉 ENHANCED EXTRACTION COMPLETED!');
            console.log('=================================');
            
            displayEnhancedResults(data);
          }
          break;
        }
      }
    } catch (error) {
      console.error('❌ Failed to parse response:', error.message);
    }
    
    console.log('\n🏁 Enhanced extraction test completed!');
    serverProcess.kill();
    process.exit(0);
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
}, 300000); // 5 minutes

// Wait for server to start, then send request
setTimeout(() => {
  console.log('📨 Sending enhanced extraction test request...');
  console.log('🔍 Location: Portland, Oregon');
  console.log('📅 Dates: Oct 1-2, 2025');
  console.log('🏨 Testing: Enhanced data extraction with intelligence');
  console.log('');
  
  serverProcess.stdin.write(JSON.stringify(hotelSearchRequest) + '\n');
}, 3000);
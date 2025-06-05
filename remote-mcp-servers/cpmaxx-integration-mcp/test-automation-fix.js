#!/usr/bin/env node

// Test the CPMAXX automation with fixed selectors
import { CPMaxxLocalMCP } from './dist/local-server-standalone.js';

async function testAutomation() {
  console.log('🧪 Testing CPMAXX automation with corrected form selectors...');
  
  const server = new CPMaxxLocalMCP();
  
  // Test hotel search with debug mode
  const searchArgs = {
    location: 'Portland, Oregon',
    check_in_date: '2025-06-15',
    check_out_date: '2025-06-17',
    rooms: 1,
    adults: 2,
    children: 0,
    debug_mode: true
  };
  
  console.log('🔍 Testing hotel search with:');
  console.log(`   Location: ${searchArgs.location}`);
  console.log(`   Dates: ${searchArgs.check_in_date} to ${searchArgs.check_out_date}`);
  console.log(`   Occupancy: ${searchArgs.rooms} room, ${searchArgs.adults} adults, ${searchArgs.children} children`);
  console.log(`   Debug mode: ${searchArgs.debug_mode}`);
  console.log('');
  
  try {
    const result = await server.searchHotels(searchArgs);
    
    console.log('✅ Hotel search completed successfully!');
    console.log('📊 Results summary:');
    
    const data = JSON.parse(result.content[0].text);
    console.log(`   Total hotels found: ${data.totalHotels}`);
    console.log(`   Hotels in response: ${data.hotels.length}`);
    console.log('   Sample hotels:');
    
    data.hotels.forEach((hotel, i) => {
      console.log(`   ${i + 1}. ${hotel.name} - $${hotel.price}/night - ${hotel.rating}⭐ - Commission: $${hotel.commission} (${hotel.commissionPercent}%)`);
    });
    
    console.log('');
    console.log('🎯 Top commission recommendations:');
    data.topRecommendations.maxCommission.forEach((hotel, i) => {
      console.log(`   ${i + 1}. ${hotel.name} - Commission: $${hotel.commission} (${hotel.commissionPercent}%)`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
  
  console.log('\n🏁 Test completed.');
}

testAutomation();
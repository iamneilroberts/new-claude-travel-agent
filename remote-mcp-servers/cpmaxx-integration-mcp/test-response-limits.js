#!/usr/bin/env node

// Test MCP response size limits and optimize for maximum hotel summaries
import { CPMaxxLocalMCP } from './dist/local-server-standalone.js';

async function testResponseLimits() {
  console.log('📏 MCP Response Size Optimization Test');
  console.log('======================================');
  
  const server = new CPMaxxLocalMCP();
  
  try {
    // Run search to get data
    const searchResult = await server.searchHotels({
      location: 'Portland, Oregon',
      check_in_date: '2025-06-15',
      check_out_date: '2025-06-17',
      rooms: 1,
      adults: 2,
      children: 0,
      debug_mode: false
    });
    
    const data = JSON.parse(searchResult.content[0].text);
    console.log(`Total hotels found: ${data.totalHotels}`);
    
    // Get full data to analyze
    const fullHotelsResult = await server.getHotelsByCriteria({ criteria: 'balanced', limit: 25 });
    const fullData = JSON.parse(fullHotelsResult.content[0].text);
    
    if (fullData.status === 'success') {
      const allHotels = fullData.hotels;
      console.log(`Full hotels available: ${allHotels.length}`);
      console.log('');
      
      // Test different summary sizes
      console.log('📊 RESPONSE SIZE ANALYSIS:');
      console.log('==========================');
      
      // Current minimal summary (5 hotels)
      const currentSummary = data.hotels;
      const currentSize = JSON.stringify(currentSummary).length;
      console.log(`Current summary (5 hotels): ${currentSize} chars`);
      
      // Optimized summary for 10 hotels
      const optimized10 = allHotels.slice(0, 10).map(hotel => ({
        name: hotel.name,
        price: hotel.price,
        rating: hotel.rating,
        commission: hotel.commission,
        commissionPercent: hotel.commissionPercent,
        available: hotel.available,
        scores: {
          maxCommission: hotel.scores.maxCommission,
          balanced: hotel.scores.balanced,
          bestValue: hotel.scores.bestValue
        }
      }));
      const size10 = JSON.stringify(optimized10).length;
      console.log(`Optimized summary (10 hotels): ${size10} chars`);
      
      // Optimized summary for 15 hotels
      const optimized15 = allHotels.slice(0, 15).map(hotel => ({
        name: hotel.name,
        price: hotel.price,
        rating: hotel.rating,
        commission: hotel.commission,
        commissionPercent: hotel.commissionPercent,
        available: hotel.available,
        scores: {
          maxCommission: hotel.scores.maxCommission,
          balanced: hotel.scores.balanced,
          bestValue: hotel.scores.bestValue
        }
      }));
      const size15 = JSON.stringify(optimized15).length;
      console.log(`Optimized summary (15 hotels): ${size15} chars`);
      
      // Optimized summary for 20 hotels
      const optimized20 = allHotels.slice(0, 20).map(hotel => ({
        name: hotel.name,
        price: hotel.price,
        rating: hotel.rating,
        commission: hotel.commission,
        commissionPercent: hotel.commissionPercent,
        available: hotel.available,
        scores: {
          maxCommission: hotel.scores.maxCommission,
          balanced: hotel.scores.balanced,
          bestValue: hotel.scores.bestValue
        }
      }));
      const size20 = JSON.stringify(optimized20).length;
      console.log(`Optimized summary (20 hotels): ${size20} chars`);
      
      // Test full response with 20 hotels
      const fullResponse20 = {
        status: 'success',
        totalHotels: data.totalHotels,
        hotels: optimized20,
        analytics: data.analytics,
        search_metadata: data.search_metadata,
        fullDataAccess: data.fullDataAccess
      };
      const fullSize20 = JSON.stringify(fullResponse20).length;
      console.log(`Full response (20 hotels): ${fullSize20} chars (${Math.round(fullSize20/1024)}KB)`);
      
      // Test with all available hotels
      const optimizedAll = allHotels.map(hotel => ({
        name: hotel.name,
        price: hotel.price,
        rating: hotel.rating,
        commission: hotel.commission,
        commissionPercent: hotel.commissionPercent,
        available: hotel.available,
        scores: {
          maxCommission: hotel.scores.maxCommission,
          balanced: hotel.scores.balanced,
          bestValue: hotel.scores.bestValue
        }
      }));
      const fullResponseAll = {
        status: 'success',
        totalHotels: data.totalHotels,
        hotels: optimizedAll,
        analytics: data.analytics,
        search_metadata: data.search_metadata,
        fullDataAccess: data.fullDataAccess
      };
      const fullSizeAll = JSON.stringify(fullResponseAll).length;
      console.log(`Full response (${allHotels.length} hotels): ${fullSizeAll} chars (${Math.round(fullSizeAll/1024)}KB)`);
      console.log('');
      
      console.log('💡 OPTIMIZATION INSIGHTS:');
      console.log('=========================');
      console.log('• Each hotel summary: ~200-300 chars');
      console.log('• 20 hotels: ~6KB total response');
      console.log(`• ${allHotels.length} hotels: ~${Math.round(fullSizeAll/1024)}KB total response`);
      console.log('• MCP typically handles 100KB+ easily');
      console.log('• Claude Desktop UI typically handles 50-100 hotels well');
      console.log('');
      
      console.log('🎯 RECOMMENDED OPTIMIZATION:');
      console.log('============================');
      console.log(`✅ Return ALL ${allHotels.length} hotels in summary format`);
      console.log('✅ Include essential data: name, price, rating, commission, scores');
      console.log('✅ Remove bulk data: descriptions, addresses, amenities from summary');
      console.log('✅ Keep full data access tools for details');
      console.log('✅ Let Claude Desktop make intelligent filtering decisions');
      console.log('');
      
      console.log('📋 OPTIMAL HOTEL SUMMARY FORMAT:');
      console.log('=================================');
      console.log('Each hotel includes:');
      console.log('• name: For identification');
      console.log('• price: For budget decisions');
      console.log('• rating: For quality assessment');
      console.log('• commission: For agent business value');
      console.log('• commissionPercent: For percentage comparison');
      console.log('• available: For booking status');
      console.log('• scores: For Claude AI decision algorithms');
      console.log('  - maxCommission: Prioritizes commission');
      console.log('  - balanced: Balances all factors');
      console.log('  - bestValue: Prioritizes client value');
      console.log('');
      
      console.log('🔄 WORKFLOW OPTIMIZATION:');
      console.log('=========================');
      console.log('1. Claude gets ALL hotel summaries (23 hotels)');
      console.log('2. Claude analyzes with client/trip context');
      console.log('3. Claude presents top recommendations');
      console.log('4. Claude can fetch details on specific hotels');
      console.log('5. No complex pagination or tracking needed');
      console.log('6. Single 74-second search provides complete data');
      
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testResponseLimits();
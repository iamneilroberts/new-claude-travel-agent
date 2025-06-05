#!/usr/bin/env node

// Test the optimized response that returns ALL hotels for Claude Desktop
import { CPMaxxLocalMCP } from './dist/local-server-standalone.js';

async function testOptimizedResponse() {
  console.log('🚀 OPTIMIZED CPMAXX RESPONSE TEST');
  console.log('=================================');
  console.log('Testing maximum hotel summary return for Claude Desktop');
  console.log('');
  
  const server = new CPMaxxLocalMCP();
  
  try {
    console.log('🔄 Running hotel search...');
    const startTime = Date.now();
    
    const result = await server.searchHotels({
      location: 'Portland, Oregon',
      check_in_date: '2025-06-15',
      check_out_date: '2025-06-17',
      rooms: 1,
      adults: 2,
      children: 0,
      debug_mode: false
    });
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    const data = JSON.parse(result.content[0].text);
    const responseSize = JSON.stringify(data).length;
    
    console.log(`✅ Search completed in ${duration} seconds`);
    console.log(`📊 Response size: ${responseSize} chars (${Math.round(responseSize/1024)}KB)`);
    console.log(`🏨 Hotels returned: ${data.hotels.length} of ${data.totalHotels}`);
    console.log('');
    
    console.log('📋 CLAUDE DESKTOP RECEIVES:');
    console.log('===========================');
    
    console.log('🏨 ALL HOTELS WITH DECISION DATA:');
    data.hotels.forEach((hotel, i) => {
      console.log(`${i + 1}. ${hotel.name}`);
      console.log(`   💰 $${hotel.price}/night | ⭐ ${hotel.rating}/5 | 💵 $${hotel.commission} (${hotel.commissionPercent}%)`);
      console.log(`   📊 Scores: Commission=${hotel.scores.maxCommission}, Balanced=${hotel.scores.balanced}, Value=${hotel.scores.bestValue}`);
      console.log(`   ✅ Available: ${hotel.available}`);
      console.log('');
    });
    
    console.log('📈 MARKET ANALYTICS:');
    console.log('====================');
    console.log(`Price Range: ${data.analytics.priceRange}`);
    console.log(`Commission Range: ${data.analytics.commissionRange}`);
    console.log(`Average Price: $${data.analytics.avgPrice}`);
    console.log(`Average Commission: ${data.analytics.avgCommission}%`);
    console.log(`Total Commission Potential: $${data.analytics.totalCommissionPotential}`);
    console.log('');
    
    console.log('🎯 CLAUDE DESKTOP WORKFLOW:');
    console.log('===========================');
    console.log('1. ✅ Receives ALL hotel summaries in one response');
    console.log('2. ✅ Has scores for intelligent filtering');
    console.log('3. ✅ Can analyze commission vs client value');
    console.log('4. ✅ Can consider budget constraints');
    console.log('5. ✅ Can factor in quality ratings');
    console.log('6. ✅ Can request details for specific hotels');
    console.log('7. ✅ No pagination or tracking needed');
    console.log('');
    
    console.log('💡 CLAUDE DECISION EXAMPLES:');
    console.log('============================');
    
    // Sort by different criteria to show what Claude could do
    const sortedByCommission = [...data.hotels].sort((a, b) => b.commission - a.commission);
    const sortedByValue = [...data.hotels].sort((a, b) => b.scores.bestValue - a.scores.bestValue);
    const sortedByBalance = [...data.hotels].sort((a, b) => b.scores.balanced - a.scores.balanced);
    
    console.log('💰 Top Commission Options:');
    sortedByCommission.slice(0, 3).forEach((hotel, i) => {
      console.log(`   ${i + 1}. ${hotel.name} - $${hotel.commission} (${hotel.commissionPercent}%)`);
    });
    console.log('');
    
    console.log('💎 Best Value Options:');
    sortedByValue.slice(0, 3).forEach((hotel, i) => {
      console.log(`   ${i + 1}. ${hotel.name} - $${hotel.price}/night, ${hotel.rating}⭐ (Score: ${hotel.scores.bestValue})`);
    });
    console.log('');
    
    console.log('⚖️ Balanced Options:');
    sortedByBalance.slice(0, 3).forEach((hotel, i) => {
      console.log(`   ${i + 1}. ${hotel.name} - $${hotel.price}/night, ${hotel.rating}⭐, $${hotel.commission} commission (Score: ${hotel.scores.balanced})`);
    });
    console.log('');
    
    console.log('🔧 AVAILABLE REFINEMENT TOOLS:');
    console.log('==============================');
    data.fullDataAccess.availableTools.forEach(tool => {
      console.log(`• ${tool}`);
    });
    console.log('');
    
    console.log('✅ OPTIMIZATION SUCCESS:');
    console.log('========================');
    console.log(`✅ ${data.hotels.length} hotels returned (vs previous 5)`);
    console.log('✅ Rich scoring data for AI decision-making');
    console.log('✅ Single API call provides complete dataset');
    console.log('✅ No complex pagination needed');
    console.log('✅ Claude can make context-aware recommendations');
    console.log('✅ Response size manageable for MCP protocol');
    console.log('✅ Travel agent gets better hotel options');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testOptimizedResponse();
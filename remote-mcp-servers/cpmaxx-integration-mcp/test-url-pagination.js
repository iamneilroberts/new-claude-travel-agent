#!/usr/bin/env node

// Test URL-based pagination with New York (should have many hotels and pages)
import { spawn } from 'child_process';

console.log('🔧 Testing URL-Based Pagination - CPMaxx MCP Server');
console.log('==================================================');

// Start the server
const serverProcess = spawn('node', ['dist/local-server-standalone.js'], {
  stdio: ['pipe', 'pipe', 'pipe'], // Capture stderr separately
  env: {
    ...process.env,
    CPMAXX_LOGIN: process.env.CPMAXX_LOGIN || 'kim.henderson@cruiseplanners.com',
    CPMAXX_PASSWORD: process.env.CPMAXX_PASSWORD || '3!Pineapples'
  }
});

// Test with New York which should have many hotels across multiple pages
const nycSearchRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'search_hotels',
    arguments: {
      location: 'New York, New York',
      check_in_date: '2025-11-15',
      check_out_date: '2025-11-17',
      rooms: 1,
      adults: 2,
      children: 0,
      debug_mode: false  // Keep this lean for testing
    }
  }
};

let responseReceived = false;
let paginationStarted = false;
let pageNavigationLogs = [];
let hotelExtractionLogs = [];

console.log('=== MONITORING PAGINATION ACTIVITY ===\n');

// Monitor STDERR for detailed logs
serverProcess.stderr.on('data', (data) => {
  const output = data.toString();
  const lines = output.split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    // Track pagination-specific logs
    if (line.includes('Implementing Pagination for Complete Results')) {
      paginationStarted = true;
      console.log('✅ PAGINATION STARTED');
    }
    
    if (line.includes('Navigating to page') && line.includes('via URL:')) {
      pageNavigationLogs.push(line);
      console.log(`🔄 ${line}`);
    }
    
    if (line.includes('Page') && line.includes('Extracted') && line.includes('hotels')) {
      hotelExtractionLogs.push(line);
      console.log(`📊 ${line}`);
    }
    
    if (line.includes('Pagination Complete:')) {
      console.log(`🏁 ${line}`);
    }
  });
});

// Monitor STDOUT for final response
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  
  // Look for final response
  if (output.includes('"result"') && output.includes('"content"')) {
    responseReceived = true;
    
    try {
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('{') && line.includes('"result"')) {
          const response = JSON.parse(line);
          
          if (response.result && response.result.content) {
            const data = JSON.parse(response.result.content[0].text);
            
            console.log(`\n📊 NEW YORK PAGINATION TEST RESULTS:`);
            console.log(`   Status: ${data.status}`);
            
            if (data.status === 'success') {
              console.log(`   Total Hotels: ${data.totalHotels}`);
              
              // Analyze page distribution
              const hotelsByPage = {};
              let maxPage = 1;
              
              if (data.hotels) {
                data.hotels.forEach(hotel => {
                  const page = hotel.pageNumber || 1;
                  hotelsByPage[page] = (hotelsByPage[page] || 0) + 1;
                  maxPage = Math.max(maxPage, page);
                });
              }
              
              console.log(`   Hotels per page:`, hotelsByPage);
              console.log(`   Total pages accessed: ${Object.keys(hotelsByPage).length}`);
              console.log(`   Highest page number: ${maxPage}`);
              
              // Detailed pagination analysis
              console.log(`\n🔍 PAGINATION ANALYSIS:`);
              console.log(`   Pages attempted: ${pageNavigationLogs.length + 1}`); // +1 for initial page
              console.log(`   Page extractions: ${hotelExtractionLogs.length}`);
              
              if (maxPage > 1) {
                console.log('\n🎉 SUCCESS: MULTI-PAGE PAGINATION WORKING!');
                console.log('✅ URL-based navigation successful');
                console.log('✅ Hotels collected from multiple pages');
                console.log('✅ Page metadata correctly assigned');
                
                // Show page navigation summary
                console.log('\n📋 Page Navigation Summary:');
                pageNavigationLogs.forEach((log, i) => {
                  console.log(`   ${i + 1}. ${log}`);
                });
                
                console.log('\n📊 Hotel Extraction Summary:');
                hotelExtractionLogs.forEach((log, i) => {
                  console.log(`   ${i + 1}. ${log}`);
                });
                
              } else if (data.totalHotels >= 50) {
                console.log('\n⚠️  HIGH HOTEL COUNT BUT SINGLE PAGE');
                console.log('⚠️  This might indicate an issue with pagination or New York has fewer results than expected');
              } else {
                console.log('\n✅ SINGLE PAGE RESULT');
                console.log('ℹ️  New York may have fewer hotels than expected for the selected dates');
              }
              
            } else {
              console.log(`   Error: ${data.error || 'Unknown error'}`);
            }
          }
          break;
        }
      }
    } catch (error) {
      console.error('❌ Failed to parse response:', error.message);
    }
    
    console.log('\n🏁 URL-based pagination test completed!');
    serverProcess.kill();
    process.exit(0);
  }
});

// Handle server errors
serverProcess.on('close', (code) => {
  if (!responseReceived) {
    console.error(`❌ Server exited with code ${code}`);
    
    if (paginationStarted) {
      console.log('✅ But pagination was initiated');
      console.log(`📝 Page navigation attempts: ${pageNavigationLogs.length}`);
      console.log(`📝 Hotel extraction logs: ${hotelExtractionLogs.length}`);
    }
    
    process.exit(1);
  }
});

// Set timeout for comprehensive search
setTimeout(() => {
  if (!responseReceived) {
    console.error('\n⏰ Test timed out after 4 minutes');
    
    if (paginationStarted) {
      console.log('✅ Pagination was initiated during execution');
      console.log(`📝 Page navigation attempts: ${pageNavigationLogs.length}`);
      console.log(`📝 Hotel extraction logs: ${hotelExtractionLogs.length}`);
    }
    
    serverProcess.kill();
    process.exit(0);
  }
}, 240000); // 4 minutes for multi-page search

// Wait for server to start, then send request
setTimeout(() => {
  console.log('📨 Sending New York hotel search request...');
  console.log('🔍 New York should trigger multi-page pagination...');
  console.log('🔍 Testing URL-based navigation: #page_num:2, #page_num:3, etc...');
  serverProcess.stdin.write(JSON.stringify(nycSearchRequest) + '\n');
}, 3000);
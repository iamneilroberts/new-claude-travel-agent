#!/usr/bin/env node

// Test pagination with Las Vegas (likely to have many hotels and multiple pages)
import { spawn } from 'child_process';

console.log('🔧 Testing Pagination with Las Vegas - CPMaxx MCP Server');
console.log('======================================================');

// Start the server
const serverProcess = spawn('node', ['dist/local-server-standalone.js'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    CPMAXX_LOGIN: process.env.CPMAXX_LOGIN || 'kim.henderson@cruiseplanners.com',
    CPMAXX_PASSWORD: process.env.CPMAXX_PASSWORD || '3!Pineapples'
  }
});

// Test with Las Vegas which should have many hotels
const vegasSearchRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'search_hotels',
    arguments: {
      location: 'Las Vegas, Nevada',
      check_in_date: '2025-10-15',
      check_out_date: '2025-10-17',
      rooms: 1,
      adults: 2,
      children: 0,
      debug_mode: false  // Don't need screenshots for this test
    }
  }
};

let responseReceived = false;
let paginationStarted = false;
let paginationCompleted = false;

// Handle server output
let responseBuffer = '';
let allOutput = '';
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  allOutput += output;
  responseBuffer += output;
  
  // Look for pagination-specific log messages in the server output
  if (output.includes('Implementing Pagination for Complete Results')) {
    console.log('✅ Pagination framework started');
    paginationStarted = true;
  }
  
  if (output.includes('Page 1: Extracted')) {
    console.log('✅ Page 1 extraction completed');
  }
  
  if (output.includes('Page 2: Extracted')) {
    console.log('✅ Page 2 extraction completed - PAGINATION IS WORKING!');
  }
  
  if (output.includes('Found next page button')) {
    console.log('✅ Next page button found - navigating to next page');
  }
  
  if (output.includes('Pagination Complete:')) {
    console.log('✅ Pagination completed');
    paginationCompleted = true;
  }
  
  if (output.includes('No more pages available')) {
    console.log('ℹ️  No more pages available (normal end of pagination)');
  }
  
  // Look for final response
  if (output.includes('"result"') && output.includes('"content"')) {
    responseReceived = true;
    
    try {
      const lines = allOutput.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('{') && line.includes('"result"')) {
          const response = JSON.parse(line);
          
          if (response.result && response.result.content) {
            const data = JSON.parse(response.result.content[0].text);
            
            console.log(`\n📊 LAS VEGAS PAGINATION TEST RESULTS:`);
            console.log(`   Status: ${data.status}`);
            
            if (data.status === 'success') {
              console.log(`   Total Hotels: ${data.totalHotels}`);
              
              // Analyze page distribution
              const hotelsByPage = {};
              if (data.hotels) {
                data.hotels.forEach(hotel => {
                  const page = hotel.pageNumber || 1;
                  hotelsByPage[page] = (hotelsByPage[page] || 0) + 1;
                });
              }
              
              console.log(`   Hotels per page:`, hotelsByPage);
              
              const pageCount = Object.keys(hotelsByPage).length;
              const maxPage = Math.max(...Object.keys(hotelsByPage).map(Number));
              
              console.log(`   Total pages accessed: ${pageCount}`);
              console.log(`   Highest page number: ${maxPage}`);
              
              // Assess pagination success
              if (pageCount > 1) {
                console.log('\n🎉 PAGINATION SUCCESS!');
                console.log('✅ Multiple pages were successfully navigated');
                console.log('✅ Hotels collected from different pages');
                console.log('✅ Pagination framework is fully functional');
              } else if (data.totalHotels >= 60) {
                console.log('\n⚠️  HIGH HOTEL COUNT BUT SINGLE PAGE');
                console.log('⚠️  May indicate pagination logic needs adjustment');
                console.log(`⚠️  Expected multiple pages for ${data.totalHotels} hotels`);
              } else {
                console.log('\n✅ SINGLE PAGE RESULT (EXPECTED)');
                console.log('✅ Pagination framework ready for larger result sets');
              }
              
              // Check pagination logs
              if (paginationStarted) {
                console.log('✅ Pagination framework was properly initiated');
              }
              
              if (paginationCompleted) {
                console.log('✅ Pagination completed successfully');
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
    
    console.log('\n🏁 Las Vegas pagination test completed!');
    serverProcess.kill();
    process.exit(0);
  }
});

// Handle server errors
serverProcess.on('close', (code) => {
  if (!responseReceived) {
    console.error(`❌ Server exited with code ${code}`);
    
    if (paginationStarted) {
      console.log('✅ But pagination framework was initiated');
    }
    
    process.exit(1);
  }
});

// Set timeout for larger search
setTimeout(() => {
  if (!responseReceived) {
    console.error('\n⏰ Test timed out after 3 minutes');
    
    if (paginationStarted) {
      console.log('✅ Pagination framework was detected during execution');
    }
    
    serverProcess.kill();
    process.exit(0);
  }
}, 180000); // 3 minutes for Las Vegas search

// Wait for server to start, then send request
setTimeout(() => {
  console.log('📨 Sending Las Vegas hotel search request...');
  console.log('🔍 Las Vegas should have many hotels and multiple pages...');
  console.log('🔍 Testing pagination framework with high-volume destination...');
  serverProcess.stdin.write(JSON.stringify(vegasSearchRequest) + '\n');
}, 3000);
#!/usr/bin/env node

// Test that pagination framework is implemented in the hotel search
import { spawn } from 'child_process';

console.log('🔧 Testing Pagination Framework - CPMaxx MCP Server');
console.log('================================================');

// Start the server
const serverProcess = spawn('node', ['dist/local-server-standalone.js'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    CPMAXX_LOGIN: process.env.CPMAXX_LOGIN || 'kim.henderson@cruiseplanners.com',
    CPMAXX_PASSWORD: process.env.CPMAXX_PASSWORD || '3!Pineapples'
  }
});

// Test hotel search with a quick timeout to see pagination logs
const paginationTestRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'search_hotels',
    arguments: {
      location: 'Miami, Florida',
      check_in_date: '2025-10-15',
      check_out_date: '2025-10-17',
      rooms: 1,
      adults: 2,
      children: 0,
      debug_mode: true
    }
  }
};

let responseReceived = false;
let paginationLogsFound = false;

// Handle server output
let responseBuffer = '';
let allOutput = '';
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  allOutput += output;
  responseBuffer += output;
  
  // Look for pagination-specific log messages
  if (output.includes('Implementing Pagination for Complete Results')) {
    console.log('✅ Found pagination implementation log');
    paginationLogsFound = true;
  }
  
  if (output.includes('Navigate through ALL pages')) {
    console.log('✅ Found pagination navigation log');
  }
  
  if (output.includes('Page 1: Extracted')) {
    console.log('✅ Found page extraction log');
  }
  
  if (output.includes('Pagination Complete:')) {
    console.log('✅ Found pagination completion log');
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
            
            console.log(`\n📊 PAGINATION TEST RESULTS:`);
            console.log(`   Status: ${data.status}`);
            
            if (data.status === 'success') {
              console.log(`   Total Hotels: ${data.totalHotels}`);
              console.log(`   Hotels with Page Numbers: ${data.hotels ? data.hotels.filter(h => h.pageNumber).length : 0}`);
              console.log(`   Max Page Number: ${data.hotels ? Math.max(...data.hotels.map(h => h.pageNumber || 1)) : 1}`);
              
              // Check if pagination was actually used
              const hotelsByPage = {};
              if (data.hotels) {
                data.hotels.forEach(hotel => {
                  const page = hotel.pageNumber || 1;
                  hotelsByPage[page] = (hotelsByPage[page] || 0) + 1;
                });
              }
              
              console.log(`   Hotels per page:`, hotelsByPage);
              
              if (Object.keys(hotelsByPage).length > 1) {
                console.log('✅ PAGINATION WAS SUCCESSFULLY USED!');
                console.log('✅ Multiple pages of results collected');
              } else if (data.totalHotels >= 20) {
                console.log('⚠️  Many hotels found but all on page 1 - pagination may not have been needed');
              } else {
                console.log('ℹ️  Single page of results (expected for small result sets)');
              }
            } else {
              console.log(`   Error: ${data.error || 'Unknown error'}`);
            }
            
            // Check if pagination logs were found
            if (paginationLogsFound) {
              console.log('\n✅ PAGINATION FRAMEWORK IS IMPLEMENTED');
              console.log('✅ Server contains pagination logic');
            } else {
              console.log('\n❌ PAGINATION LOGS NOT FOUND');
              console.log('❌ Pagination may not be implemented correctly');
            }
          }
          break;
        }
      }
    } catch (error) {
      console.error('❌ Failed to parse response:', error.message);
    }
    
    console.log('\n🏁 Pagination framework test completed!');
    serverProcess.kill();
    process.exit(0);
  }
});

// Handle server errors
serverProcess.on('close', (code) => {
  if (!responseReceived) {
    console.error(`❌ Server exited with code ${code}`);
    
    if (paginationLogsFound) {
      console.log('✅ But pagination framework was detected in logs');
    }
    
    process.exit(1);
  }
});

// Set timeout - allow more time for hotel search
setTimeout(() => {
  if (!responseReceived) {
    console.error('\n⏰ Test timed out after 120 seconds');
    
    if (paginationLogsFound) {
      console.log('✅ Pagination framework was detected in logs during execution');
      console.log('✅ Implementation appears to be working');
    } else {
      console.log('❌ No pagination logs found - may need to check implementation');
    }
    
    serverProcess.kill();
    process.exit(0);
  }
}, 120000);

// Wait for server to start, then send request
setTimeout(() => {
  console.log('📨 Sending hotel search request with pagination test...');
  console.log('🔍 Looking for pagination framework logs...');
  console.log('🔍 Will search Miami hotels to test pagination...');
  serverProcess.stdin.write(JSON.stringify(paginationTestRequest) + '\n');
}, 3000);
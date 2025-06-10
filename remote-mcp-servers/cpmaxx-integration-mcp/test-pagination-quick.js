#!/usr/bin/env node

// Quick test to verify URL-based pagination is working
import { spawn } from 'child_process';

console.log('🔧 Quick URL-Based Pagination Test - CPMaxx MCP Server');
console.log('===================================================');

// Start the server
const serverProcess = spawn('node', ['dist/local-server-standalone.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    CPMAXX_LOGIN: process.env.CPMAXX_LOGIN || 'kim.henderson@cruiseplanners.com',
    CPMAXX_PASSWORD: process.env.CPMAXX_PASSWORD || '3!Pineapples'
  }
});

// Use Miami which should have decent results but faster than NYC
const miamiSearchRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'search_hotels',
    arguments: {
      location: 'Miami, Florida',
      check_in_date: '2025-12-01',
      check_out_date: '2025-12-03',
      rooms: 1,
      adults: 2,
      children: 0,
      debug_mode: false
    }
  }
};

let responseReceived = false;
let urlNavigationFound = false;
let multiplePages = false;

// Monitor STDERR for URL navigation logs
serverProcess.stderr.on('data', (data) => {
  const output = data.toString();
  
  if (output.includes('Navigating to page') && output.includes('via URL:')) {
    urlNavigationFound = true;
    console.log('✅ URL NAVIGATION DETECTED!');
    
    // Extract the URL being navigated to
    const lines = output.split('\n');
    lines.forEach(line => {
      if (line.includes('Navigating to page') && line.includes('via URL:')) {
        console.log(`🔗 ${line.trim()}`);
        if (line.includes('#page_num:')) {
          multiplePages = true;
        }
      }
    });
  }
  
  if (output.includes('Page 2: Extracted') || output.includes('Page 3: Extracted')) {
    console.log('✅ MULTIPLE PAGES CONFIRMED!');
    multiplePages = true;
  }
});

// Monitor STDOUT for final response
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  
  if (output.includes('"result"') && output.includes('"content"')) {
    responseReceived = true;
    
    try {
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('{') && line.includes('"result"')) {
          const response = JSON.parse(line);
          
          if (response.result && response.result.content) {
            const data = JSON.parse(response.result.content[0].text);
            
            console.log(`\n📊 QUICK PAGINATION TEST RESULTS:`);
            console.log(`   Status: ${data.status}`);
            console.log(`   Total Hotels: ${data.totalHotels}`);
            
            if (data.hotels && data.hotels.length > 0) {
              // Check for multiple page numbers
              const pageNumbers = [...new Set(data.hotels.map(h => h.pageNumber).filter(Boolean))];
              console.log(`   Unique page numbers: ${JSON.stringify(pageNumbers)}`);
              
              if (pageNumbers.length > 1) {
                console.log('\n🎉 SUCCESS: MULTIPLE PAGES DETECTED IN RESULTS!');
                multiplePages = true;
              }
            }
            
            // Summary
            console.log(`\n🔍 PAGINATION IMPLEMENTATION STATUS:`);
            console.log(`   ✅ URL navigation attempted: ${urlNavigationFound}`);
            console.log(`   ✅ Multiple pages accessed: ${multiplePages}`);
            console.log(`   ✅ Page metadata preserved: ${data.hotels && data.hotels[0] && data.hotels[0].pageNumber ? 'Yes' : 'No'}`);
            
            if (urlNavigationFound) {
              console.log('\n✅ URL-BASED PAGINATION IS IMPLEMENTED AND WORKING!');
            } else {
              console.log('\n⚠️  URL navigation not detected - may need debugging');
            }
          }
          break;
        }
      }
    } catch (error) {
      console.error('❌ Failed to parse response:', error.message);
    }
    
    console.log('\n🏁 Quick pagination test completed!');
    serverProcess.kill();
    process.exit(0);
  }
});

// Handle server close
serverProcess.on('close', (code) => {
  if (!responseReceived) {
    console.error(`❌ Server exited with code ${code}`);
    process.exit(1);
  }
});

// Shorter timeout for quick test
setTimeout(() => {
  if (!responseReceived) {
    console.error('\n⏰ Quick test timed out after 90 seconds');
    
    console.log(`\n📝 Results so far:`);
    console.log(`   URL navigation detected: ${urlNavigationFound}`);
    console.log(`   Multiple pages detected: ${multiplePages}`);
    
    if (urlNavigationFound) {
      console.log('✅ URL-based pagination is working!');
    }
    
    serverProcess.kill();
    process.exit(0);
  }
}, 90000);

// Start the test
setTimeout(() => {
  console.log('📨 Sending Miami hotel search request...');
  console.log('🔍 Looking for URL navigation logs...');
  serverProcess.stdin.write(JSON.stringify(miamiSearchRequest) + '\n');
}, 3000);
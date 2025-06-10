#!/usr/bin/env node

// Fast debug test with debug_mode enabled to reduce waits
import { spawn } from 'child_process';

console.log('🔧 Fast Pagination Debug Test');
console.log('=============================');

const serverProcess = spawn('node', ['dist/local-server-standalone.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    CPMAXX_LOGIN: process.env.CPMAXX_LOGIN || 'kim.henderson@cruiseplanners.com',
    CPMAXX_PASSWORD: process.env.CPMAXX_PASSWORD || '3!Pineapples'
  }
});

const fastRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'search_hotels',
    arguments: {
      location: 'Miami, Florida',
      check_in_date: '2025-11-01',
      check_out_date: '2025-11-03',
      rooms: 1,
      adults: 2,
      children: 0,
      debug_mode: true  // Enable debug mode for faster execution
    }
  }
};

let responseReceived = false;
let paginationFound = false;

// Monitor stderr for pagination logs
serverProcess.stderr.on('data', (data) => {
  const output = data.toString();
  const lines = output.split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    // Show key progression markers
    if (line.includes('[Hotel Search]') || 
        line.includes('Implementing Pagination') ||
        line.includes('Starting pagination loop') ||
        line.includes('Condition check') ||
        line.includes('Navigating to page') ||
        line.includes('Page') && line.includes('Extracted')) {
      console.log(`📋 ${line}`);
    }
    
    if (line.includes('Starting pagination loop') || line.includes('Navigating to page')) {
      paginationFound = true;
    }
  });
});

// Monitor stdout for response
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  
  if (output.includes('"result"')) {
    responseReceived = true;
    
    try {
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('{') && line.includes('"result"')) {
          const response = JSON.parse(line);
          
          if (response.result && response.result.content) {
            const data = JSON.parse(response.result.content[0].text);
            
            console.log(`\n✅ Response received!`);
            console.log(`   Status: ${data.status}`);
            console.log(`   Total Hotels: ${data.totalHotels}`);
            
            if (data.hotels && data.hotels.length > 0) {
              const pageNumbers = [...new Set(data.hotels.map(h => h.pageNumber).filter(Boolean))];
              console.log(`   Page numbers found: ${JSON.stringify(pageNumbers)}`);
              
              if (pageNumbers.length > 1) {
                console.log('🎉 MULTIPLE PAGES CONFIRMED!');
              } else {
                console.log('📝 Single page result');
              }
            }
          }
          break;
        }
      }
    } catch (error) {
      console.error('Parse error:', error.message);
    }
    
    console.log(`\n📊 Final Results:`);
    console.log(`   Pagination logs found: ${paginationFound}`);
    console.log(`   Response received: ${responseReceived}`);
    
    serverProcess.kill();
    process.exit(0);
  }
});

setTimeout(() => {
  if (!responseReceived) {
    console.log('\n⏰ Fast test timed out');
    console.log(`   Pagination found: ${paginationFound}`);
    serverProcess.kill();
    process.exit(0);
  }
}, 120000); // 2 minutes should be enough with debug mode

setTimeout(() => {
  console.log('📨 Sending fast pagination test...');
  serverProcess.stdin.write(JSON.stringify(fastRequest) + '\n');
}, 3000);
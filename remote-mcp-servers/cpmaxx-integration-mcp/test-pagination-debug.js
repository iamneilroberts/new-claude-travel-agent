#!/usr/bin/env node

// Debug test to see exactly what logs are produced during pagination
import { spawn } from 'child_process';

console.log('🔧 DEBUG: Pagination Logs Analysis - CPMaxx MCP Server');
console.log('====================================================');

// Start the server
const serverProcess = spawn('node', ['dist/local-server-standalone.js'], {
  stdio: ['pipe', 'pipe', 'pipe'], // Capture stderr separately
  env: {
    ...process.env,
    CPMAXX_LOGIN: process.env.CPMAXX_LOGIN || 'kim.henderson@cruiseplanners.com',
    CPMAXX_PASSWORD: process.env.CPMAXX_PASSWORD || '3!Pineapples'
  }
});

// Simple search request
const searchRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'search_hotels',
    arguments: {
      location: 'Orlando, Florida',
      check_in_date: '2025-10-20',
      check_out_date: '2025-10-22',
      rooms: 1,
      adults: 2,
      children: 0,
      debug_mode: false
    }
  }
};

let responseReceived = false;
let logCount = 0;

console.log('=== MONITORING ALL OUTPUT STREAMS ===\n');

// Monitor STDOUT
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  const lines = output.split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    logCount++;
    console.log(`STDOUT[${logCount}]: ${line}`);
    
    // Check for pagination markers
    if (line.includes('Implementing Pagination')) {
      console.log('>>> PAGINATION FRAMEWORK DETECTED IN STDOUT <<<');
    }
    if (line.includes('Page 1: Extracted')) {
      console.log('>>> PAGE 1 EXTRACTION DETECTED IN STDOUT <<<');
    }
  });
  
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
            
            console.log(`\n=== FINAL RESPONSE ANALYSIS ===`);
            console.log(`Status: ${data.status}`);
            if (data.status === 'success') {
              console.log(`Total Hotels: ${data.totalHotels}`);
              
              // Check if hotels have pageNumber property
              const hotelsWithPageNumbers = data.hotels ? data.hotels.filter(h => h.pageNumber !== undefined).length : 0;
              console.log(`Hotels with pageNumber set: ${hotelsWithPageNumbers}`);
              
              if (hotelsWithPageNumbers > 0) {
                console.log('>>> PAGINATION METADATA FOUND IN RESPONSE <<<');
              } else {
                console.log('>>> NO PAGINATION METADATA IN RESPONSE <<<');
              }
            }
          }
          break;
        }
      }
    } catch (error) {
      console.error('Failed to parse response:', error.message);
    }
    
    console.log('\n🏁 Debug analysis completed!');
    serverProcess.kill();
    process.exit(0);
  }
});

// Monitor STDERR 
serverProcess.stderr.on('data', (data) => {
  const output = data.toString();
  const lines = output.split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    logCount++;
    console.log(`STDERR[${logCount}]: ${line}`);
    
    // Check for pagination markers in stderr
    if (line.includes('Implementing Pagination')) {
      console.log('>>> PAGINATION FRAMEWORK DETECTED IN STDERR <<<');
    }
    if (line.includes('Page 1: Extracted')) {
      console.log('>>> PAGE 1 EXTRACTION DETECTED IN STDERR <<<');
    }
  });
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
    console.error('\n⏰ Debug test timed out after 2 minutes');
    console.log(`Total log lines captured: ${logCount}`);
    serverProcess.kill();
    process.exit(0);
  }
}, 120000);

// Wait for server to start, then send request
setTimeout(() => {
  console.log('📨 Sending Orlando hotel search for debug analysis...');
  serverProcess.stdin.write(JSON.stringify(searchRequest) + '\n');
}, 3000);
#!/usr/bin/env node

// Very basic test to see what happens during search
import { spawn } from 'child_process';

console.log('🔧 Basic Search Test');
console.log('===================');

const serverProcess = spawn('node', ['dist/local-server-standalone.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    CPMAXX_LOGIN: process.env.CPMAXX_LOGIN || 'kim.henderson@cruiseplanners.com',
    CPMAXX_PASSWORD: process.env.CPMAXX_PASSWORD || '3!Pineapples'
  }
});

const basicRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'search_hotels',
    arguments: {
      location: 'Orlando, Florida',
      check_in_date: '2025-10-15',
      check_out_date: '2025-10-17',
      rooms: 1,
      adults: 2,
      children: 0,
      debug_mode: false
    }
  }
};

let logCount = 0;
let responseReceived = false;

// Monitor all output
serverProcess.stderr.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  lines.forEach(line => {
    logCount++;
    if (logCount <= 20) { // Only show first 20 logs
      console.log(`LOG[${logCount}]: ${line}`);
    }
    
    // Look for key pagination markers
    if (line.includes('Starting pagination loop') || 
        line.includes('Condition check') ||
        line.includes('Navigating to page') ||
        line.includes('Implementing Pagination')) {
      console.log(`>>> PAGINATION: ${line}`);
    }
  });
});

serverProcess.stdout.on('data', (data) => {
  if (data.toString().includes('"result"')) {
    responseReceived = true;
    console.log('✅ Response received!');
    serverProcess.kill();
    process.exit(0);
  }
});

setTimeout(() => {
  if (!responseReceived) {
    console.log(`⏰ Timeout. Captured ${logCount} log lines.`);
    serverProcess.kill();
    process.exit(0);
  }
}, 60000);

setTimeout(() => {
  console.log('📨 Sending basic search...');
  serverProcess.stdin.write(JSON.stringify(basicRequest) + '\n');
}, 3000);
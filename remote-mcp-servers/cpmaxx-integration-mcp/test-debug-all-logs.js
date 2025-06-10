#!/usr/bin/env node

// Capture ALL logs to see what's happening
import { spawn } from 'child_process';

console.log('🔧 All Logs Debug Test');
console.log('======================');

const serverProcess = spawn('node', ['dist/local-server-standalone.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    CPMAXX_LOGIN: process.env.CPMAXX_LOGIN || 'kim.henderson@cruiseplanners.com',
    CPMAXX_PASSWORD: process.env.CPMAXX_PASSWORD || '3!Pineapples'
  }
});

const request = {
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
      debug_mode: true
    }
  }
};

let responseReceived = false;
let allLogs = [];

// Capture ALL stderr output
serverProcess.stderr.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  lines.forEach(line => {
    allLogs.push(line);
    
    // Show all logs during execution
    console.log(`STDERR: ${line}`);
  });
});

// Capture stdout
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  
  if (output.includes('"result"')) {
    responseReceived = true;
    console.log('\n✅ RESPONSE RECEIVED!');
    
    // Now analyze all logs for pagination
    console.log('\n🔍 ANALYZING ALL LOGS FOR PAGINATION:');
    const paginationLogs = allLogs.filter(log => 
      log.includes('PAGINATION') || 
      log.includes('Starting pagination') ||
      log.includes('Condition check') ||
      log.includes('Navigating to page') ||
      log.includes('maxPages') ||
      log.includes('currentPage')
    );
    
    if (paginationLogs.length > 0) {
      console.log('📋 Found pagination-related logs:');
      paginationLogs.forEach((log, i) => {
        console.log(`   ${i + 1}. ${log}`);
      });
    } else {
      console.log('❌ NO pagination logs found in stderr');
      console.log(`📊 Total logs captured: ${allLogs.length}`);
      console.log('🔍 Last 10 logs:');
      allLogs.slice(-10).forEach((log, i) => {
        console.log(`   ${allLogs.length - 10 + i + 1}. ${log}`);
      });
    }
    
    serverProcess.kill();
    process.exit(0);
  }
});

setTimeout(() => {
  if (!responseReceived) {
    console.log('\n⏰ Timeout');
    console.log(`📊 Captured ${allLogs.length} logs total`);
    
    const paginationLogs = allLogs.filter(log => 
      log.includes('PAGINATION') || 
      log.includes('pagination') ||
      log.includes('maxPages')
    );
    
    if (paginationLogs.length > 0) {
      console.log('📋 Pagination logs found:');
      paginationLogs.forEach(log => console.log(`   ${log}`));
    } else {
      console.log('❌ No pagination logs found');
    }
    
    serverProcess.kill();
    process.exit(0);
  }
}, 90000);

setTimeout(() => {
  console.log('📨 Sending request...');
  serverProcess.stdin.write(JSON.stringify(request) + '\n');
}, 3000);
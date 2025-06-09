#!/usr/bin/env node

// Test script to check if MetaMCP can connect to our SSE endpoints
// This bypasses the web interface and tests core connectivity

const dns = require('dns');
const { promisify } = require('util');
const https = require('https');

const resolveDns = promisify(dns.lookup);

const testEndpoints = [
  'https://d1-database-pure.somotravel.workers.dev/sse',
  'https://prompt-instructions-mcp-pure.somotravel.workers.dev/sse',
  'https://r2-storage-mcp-pure.somotravel.workers.dev/sse',
  'https://basic-memory-mcp-pure.somotravel.workers.dev/sse'
];

async function testDNSResolution(hostname) {
  try {
    const result = await resolveDns(hostname);
    console.log(`✅ DNS resolution for ${hostname}: ${result.address}`);
    return true;
  } catch (error) {
    console.log(`❌ DNS resolution failed for ${hostname}: ${error.code}`);
    return false;
  }
}

async function testHTTPSConnection(url) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      timeout: 5000,
      headers: {
        'Authorization': 'Bearer clean-d1-auth-2025'
      }
    }, (res) => {
      console.log(`✅ HTTPS connection to ${url}: ${res.statusCode}`);
      res.destroy();
      resolve(true);
    });
    
    req.on('timeout', () => {
      console.log(`⏰ HTTPS connection timeout for ${url}`);
      req.destroy();
      resolve(false);
    });
    
    req.on('error', (error) => {
      console.log(`❌ HTTPS connection failed for ${url}: ${error.code}`);
      resolve(false);
    });
  });
}

async function runConnectivityTest() {
  console.log('🔍 Testing DNS resolution and HTTPS connectivity...');
  console.log(`Node.js version: ${process.version}`);
  console.log(`Platform: ${process.platform}`);
  console.log('');

  for (const url of testEndpoints) {
    const hostname = new URL(url).hostname;
    console.log(`Testing ${hostname}:`);
    
    const dnsSuccess = await testDNSResolution(hostname);
    if (dnsSuccess) {
      await testHTTPSConnection(url);
    }
    console.log('');
  }
}

runConnectivityTest().catch(console.error);
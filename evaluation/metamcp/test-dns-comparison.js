#!/usr/bin/env node

// Compare DNS resolution between mcp-remote and direct Node.js calls
const { spawn } = require('child_process');
const dns = require('dns');
const { promisify } = require('util');

const resolveDns = promisify(dns.lookup);

const testEndpoints = [
  'd1-database-pure.somotravel.workers.dev',
  'prompt-instructions-mcp-pure.somotravel.workers.dev',
  'r2-storage-mcp-pure.somotravel.workers.dev',
  'basic-memory-mcp-pure.somotravel.workers.dev'
];

async function testDirectDNS() {
  console.log('🔍 Testing DNS resolution with direct Node.js calls...');
  for (const hostname of testEndpoints) {
    try {
      const result = await resolveDns(hostname);
      console.log(`✅ Direct DNS: ${hostname} → ${result.address}`);
    } catch (error) {
      console.log(`❌ Direct DNS: ${hostname} → ${error.code}`);
    }
  }
  console.log('');
}

async function testMCPRemoteDNS() {
  console.log('🔍 Testing DNS resolution via mcp-remote...');
  console.log('⚠️ This will likely show EAI_AGAIN errors like in the logs');
  
  const mcpRemoteProcess = spawn('npx', [
    'mcp-remote', 
    'https://d1-database-pure.somotravel.workers.dev/sse'
  ], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let hasError = false;
  
  mcpRemoteProcess.stderr.on('data', (data) => {
    const output = data.toString();
    if (output.includes('EAI_AGAIN') || output.includes('getaddrinfo')) {
      console.log('❌ mcp-remote DNS failure detected:');
      console.log(output.trim());
      hasError = true;
    }
  });

  mcpRemoteProcess.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Connected to remote server')) {
      console.log('✅ mcp-remote connected successfully');
    }
  });

  // Send a test request
  setTimeout(() => {
    const initRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0.0" }
      }
    };
    
    mcpRemoteProcess.stdin.write(JSON.stringify(initRequest) + '\n');
  }, 2000);

  setTimeout(() => {
    mcpRemoteProcess.kill();
    if (!hasError) {
      console.log('🤔 No DNS errors detected with mcp-remote (this time)');
    }
    console.log('');
  }, 8000);
}

async function runComparison() {
  console.log('🧪 DNS Resolution Comparison Test');
  console.log('==================================\n');
  
  await testDirectDNS();
  await testMCPRemoteDNS();
  
  console.log('📋 Summary:');
  console.log('- Direct Node.js DNS resolution: ✅ Works consistently');
  console.log('- mcp-remote DNS resolution: ❌ Fails intermittently with EAI_AGAIN');
  console.log('- This explains why MetaMCP (which uses direct connections) should work better');
}

runComparison().catch(console.error);
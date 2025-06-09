#!/usr/bin/env node

// Test MetaMCP server directly via its MCP protocol
const { spawn } = require('child_process');

async function testMetaMCPServer() {
  console.log('🔌 Testing MetaMCP MCP server directly...');
  
  const metamcpProcess = spawn('npx', [
    '-y', '@metamcp/mcp-server-metamcp@latest',
    '--metamcp-api-key', 'sk_mt_RgDDhK51yQiXzZidSyJvEhiHcDfVOzvEeeiSaa9Zo53xjJN8HpSTkR8JBiALeG7uThe',
    '--metamcp-api-base-url', 'http://localhost:12005'
  ], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let responseData = '';
  let hasInitialized = false;

  metamcpProcess.stdout.on('data', (data) => {
    responseData += data.toString();
    console.log('📤 Response:', data.toString().trim());
  });

  metamcpProcess.stderr.on('data', (data) => {
    console.log('⚠️ Error:', data.toString().trim());
  });

  // Send initialize request
  const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "test-client",
        version: "1.0.0"
      }
    }
  };

  console.log('📥 Sending initialize request...');
  metamcpProcess.stdin.write(JSON.stringify(initRequest) + '\n');

  // Wait for response
  setTimeout(() => {
    if (responseData.includes('"result"')) {
      console.log('✅ MetaMCP server responded successfully!');
      
      // Send tools/list request
      const toolsRequest = {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {}
      };
      
      console.log('📥 Sending tools/list request...');
      metamcpProcess.stdin.write(JSON.stringify(toolsRequest) + '\n');
      
      setTimeout(() => {
        metamcpProcess.kill();
        console.log('🔚 Test completed');
      }, 3000);
    } else {
      console.log('❌ No valid response from MetaMCP server');
      metamcpProcess.kill();
    }
  }, 5000);

  metamcpProcess.on('close', (code) => {
    console.log(`Process exited with code ${code}`);
  });
}

testMetaMCPServer().catch(console.error);
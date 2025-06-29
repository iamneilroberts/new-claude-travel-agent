#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('Testing mcp-cpmaxx-unified server...\n');

const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Send initialization
const initMessage = {
  jsonrpc: '2.0',
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  },
  id: 1
};

setTimeout(() => {
  server.stdin.write(JSON.stringify(initMessage) + '\n');
}, 500);

// Handle responses
server.stdout.on('data', (data) => {
  console.log('Server response:', data.toString());
});

server.stderr.on('data', (data) => {
  console.log('Server log:', data.toString());
});

// List tools after init
setTimeout(() => {
  const listMessage = {
    jsonrpc: '2.0',
    method: 'tools/list',
    params: {},
    id: 2
  };
  server.stdin.write(JSON.stringify(listMessage) + '\n');
}, 1000);

// Exit after 2 seconds
setTimeout(() => {
  console.log('\nTest complete!');
  server.kill();
  process.exit(0);
}, 2000);

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});
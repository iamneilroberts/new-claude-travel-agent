#!/usr/bin/env node

// Simple test to verify the MCP server can be imported and initialized
import { TravelTestingMCP } from './src/index.ts';

async function testConnection() {
  console.log('Testing Travel Testing MCP Server Connection...');
  
  try {
    // Create mock environment
    const mockEnv = {
      MCP_AUTH_KEY: 'test-auth-key'
    };

    // Create and initialize the MCP server
    const server = new TravelTestingMCP();
    server.env = mockEnv;
    
    console.log('✓ Server instance created successfully');
    console.log('✓ Server name:', server.server.name);
    console.log('✓ Server version:', server.server.version);
    
    // Test initialization
    await server.init();
    console.log('✓ Server initialized successfully');
    
    console.log('\n🎉 Connection test passed! The MCP server is ready.');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testConnection();
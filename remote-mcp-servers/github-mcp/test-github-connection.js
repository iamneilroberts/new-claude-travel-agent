/**
 * Test script for GitHub MCP server
 */

const testGitHubMCP = async () => {
  const baseUrl = 'https://github-mcp-pure.somotravel.workers.dev';
  
  try {
    console.log('Testing GitHub MCP server health endpoint...');
    
    // Test health endpoint
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    console.log('Health check:', healthData);
    
    // Test MCP initialization
    console.log('\nTesting MCP initialization...');
    const mcpRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    };
    
    const mcpResponse = await fetch(`${baseUrl}/sse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mcpRequest)
    });
    
    const mcpText = await mcpResponse.text();
    console.log('MCP response:', mcpText);
    
    // Test tools/list
    console.log('\nTesting tools/list...');
    const toolsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    };
    
    const toolsResponse = await fetch(`${baseUrl}/sse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(toolsRequest)
    });
    
    const toolsText = await toolsResponse.text();
    console.log('Tools response:', toolsText);
    
  } catch (error) {
    console.error('Test error:', error);
  }
};

testGitHubMCP();
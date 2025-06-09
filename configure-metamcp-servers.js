#!/usr/bin/env node

// Configure our SSE endpoints in MetaMCP for testing
const API_BASE = 'http://localhost:12007';
const AUTH_TOKEN = 'clean-d1-auth-2025';

const servers = [
  {
    name: 'D1 Database MCP',
    type: 'sse',
    url: 'https://d1-database-pure.somotravel.workers.dev/sse',
    auth: {
      type: 'bearer',
      token: AUTH_TOKEN
    },
    description: 'Travel database operations'
  },
  {
    name: 'Prompt Instructions MCP',
    type: 'sse',
    url: 'https://prompt-instructions-mcp-pure.somotravel.workers.dev/sse',
    auth: {
      type: 'bearer',
      token: AUTH_TOKEN
    },
    description: 'Dynamic prompt instructions'
  },
  {
    name: 'R2 Storage MCP',
    type: 'sse',
    url: 'https://r2-storage-mcp-pure.somotravel.workers.dev/sse',
    auth: {
      type: 'bearer',
      token: AUTH_TOKEN
    },
    description: 'File storage operations'
  },
  {
    name: 'Basic Memory MCP',
    type: 'sse',
    url: 'https://basic-memory-mcp-pure.somotravel.workers.dev/sse',
    auth: {
      type: 'bearer',
      token: AUTH_TOKEN
    },
    description: 'Knowledge management'
  }
];

async function addServer(server) {
  try {
    const response = await fetch(`${API_BASE}/api/servers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(server)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Added ${server.name}: ID ${result.id}`);
      return result;
    } else {
      const error = await response.text();
      console.log(`❌ Failed to add ${server.name}: ${response.status} ${error}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Error adding ${server.name}: ${error.message}`);
    return null;
  }
}

async function configureServers() {
  console.log('🔧 Configuring MetaMCP servers...');
  
  for (const server of servers) {
    await addServer(server);
  }
  
  console.log('\n🎯 Configuration complete! Access MetaMCP at http://localhost:12005');
}

configureServers().catch(console.error);
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

// Simple test of the Claude Desktop config reading
async function testConfig() {
  try {
    const configPath = path.join(os.homedir(), '.config', 'Claude', 'claude_desktop_config.json');
    
    console.log('🔍 Testing Claude Desktop Config Reading');
    console.log('━'.repeat(50));
    console.log(`📁 Config Path: ${configPath}`);
    
    if (!fs.existsSync(configPath)) {
      console.log('❌ Config file not found!');
      return;
    }
    
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    console.log(`✅ Config file found and parsed`);
    console.log(`📊 MCP Servers: ${Object.keys(config.mcpServers || {}).length}`);
    
    console.log('\n📋 Servers found:');
    Object.keys(config.mcpServers || {}).forEach((serverName, index) => {
      const serverConfig = config.mcpServers[serverName];
      const isProxy = serverConfig.command.includes('python') && 
                     serverConfig.args.includes('-m') && 
                     serverConfig.args.includes('mcp_use');
      
      console.log(`   ${index + 1}. ${serverName} ${isProxy ? '(mcp-use proxy)' : '(direct)'}`);
    });
    
    // Count mcp-use proxies
    const proxyServers = Object.entries(config.mcpServers || {}).filter(([name, serverConfig]) => {
      return serverConfig.command.includes('python') && 
             serverConfig.args.includes('-m') && 
             serverConfig.args.includes('mcp_use');
    });
    
    console.log(`\n🔗 MCP-Use Proxy Servers: ${proxyServers.length}`);
    console.log('   These will be monitored by the watcher service');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testConfig();
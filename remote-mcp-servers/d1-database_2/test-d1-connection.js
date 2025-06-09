#!/usr/bin/env node

const { exec } = require('child_process');

console.log('🧪 Testing D1 Database MCP Server Connection...\n');

// Test 1: Health check
console.log('1. Testing health endpoint...');
exec('curl -s https://d1-database-pure.somotravel.workers.dev/health', (error, stdout, stderr) => {
    if (error) {
        console.log('❌ Health check failed:', error);
        return;
    }
    try {
        const health = JSON.parse(stdout);
        console.log('✅ Health check passed:', health.status);
    } catch (e) {
        console.log('❌ Health check response invalid:', stdout);
    }
    
    // Test 2: MCP Initialize
    console.log('\n2. Testing MCP initialize...');
    const initPayload = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
        }
    });
    
    exec(`curl -s -X POST https://d1-database-pure.somotravel.workers.dev/sse -H "Content-Type: application/json" -d '${initPayload}'`, (error, stdout, stderr) => {
        if (error) {
            console.log('❌ MCP initialize failed:', error);
            return;
        }
        console.log('✅ MCP response received:', stdout);
        
        // Test 3: Tools list
        console.log('\n3. Testing tools/list...');
        const toolsPayload = JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list',
            params: {}
        });
        
        exec(`curl -s -X POST https://d1-database-pure.somotravel.workers.dev/sse -H "Content-Type: application/json" -d '${toolsPayload}'`, (error, stdout, stderr) => {
            if (error) {
                console.log('❌ Tools list failed:', error);
                return;
            }
            console.log('✅ Tools list received');
            
            // Try to parse and count tools
            try {
                const match = stdout.match(/data: (.*)/);
                if (match) {
                    const response = JSON.parse(match[1]);
                    if (response.result && response.result.tools) {
                        console.log(`📊 Found ${response.result.tools.length} tools available`);
                        console.log('🔧 Tools:', response.result.tools.map(t => t.name).join(', '));
                    }
                }
            } catch (e) {
                console.log('📝 Raw response:', stdout);
            }
            
            console.log('\n🎉 D1 Database MCP Server is working!');
            console.log('✅ Ready for Claude Desktop integration');
        });
    });
});
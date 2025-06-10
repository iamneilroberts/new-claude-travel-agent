#!/usr/bin/env node

const serverUrl = 'https://r2-storage-mcp-pure.somotravel.workers.dev';

async function testR2Storage() {
    console.log('🧪 Testing R2 Storage MCP Server...\n');
    
    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    try {
        const healthResponse = await fetch(`${serverUrl}/health`);
        const healthData = await healthResponse.json();
        console.log('✅ Health check passed:', healthData.status);
        console.log('📊 Service:', healthData.service);
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
        return;
    }
    
    // Test 2: MCP Initialize
    console.log('\n2️⃣ Testing MCP initialize...');
    try {
        const initResponse = await fetch(`${serverUrl}/sse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'initialize',
                params: {
                    protocolVersion: '2024-11-05',
                    capabilities: {},
                    clientInfo: { name: 'test-client', version: '1.0.0' }
                }
            })
        });
        
        const initData = await initResponse.text();
        if (initData.includes('protocolVersion')) {
            console.log('✅ MCP response received');
        } else {
            console.log('❌ Invalid MCP response');
        }
    } catch (error) {
        console.error('❌ MCP initialize failed:', error.message);
        return;
    }
    
    // Test 3: Tools list
    console.log('\n3️⃣ Testing tools/list...');
    try {
        const toolsResponse = await fetch(`${serverUrl}/sse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 2,
                method: 'tools/list'
            })
        });
        
        const toolsData = await toolsResponse.text();
        console.log('✅ Tools list received');
        
        // Parse the SSE response
        const jsonStart = toolsData.indexOf('{');
        if (jsonStart !== -1) {
            const jsonData = JSON.parse(toolsData.substring(jsonStart));
            const tools = jsonData.result?.tools || [];
            console.log(`📊 Found ${tools.length} tools available`);
            
            tools.forEach(tool => {
                console.log(`   • ${tool.name} - ${tool.description}`);
            });
        }
    } catch (error) {
        console.error('❌ Tools list failed:', error.message);
        return;
    }
    
    // Test 4: Bucket stats
    console.log('\n4️⃣ Testing r2_bucket_stats tool...');
    try {
        const statsResponse = await fetch(`${serverUrl}/sse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 3,
                method: 'tools/call',
                params: {
                    name: 'r2_bucket_stats',
                    arguments: {}
                }
            })
        });
        
        const statsData = await statsResponse.text();
        console.log('✅ Bucket stats tool executed successfully');
        
        // Parse the response to show stats
        const jsonStart = statsData.indexOf('{');
        if (jsonStart !== -1) {
            const jsonData = JSON.parse(statsData.substring(jsonStart));
            const content = jsonData.result?.content?.[0]?.text;
            if (content) {
                const stats = JSON.parse(content);
                if (stats.status === 'success') {
                    console.log(`📊 Bucket Stats: ${stats.stats.total_objects} objects, ${stats.stats.total_size_mb} MB`);
                }
            }
        }
    } catch (error) {
        console.error('❌ Bucket stats failed:', error.message);
    }
    
    // Test 5: List objects
    console.log('\n5️⃣ Testing r2_objects_list tool...');
    try {
        const listResponse = await fetch(`${serverUrl}/sse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 4,
                method: 'tools/call',
                params: {
                    name: 'r2_objects_list',
                    arguments: { limit: 5 }
                }
            })
        });
        
        const listData = await listResponse.text();
        console.log('✅ Objects list tool executed successfully');
        
        // Parse the response to show object count
        const jsonStart = listData.indexOf('{');
        if (jsonStart !== -1) {
            const jsonData = JSON.parse(listData.substring(jsonStart));
            const content = jsonData.result?.content?.[0]?.text;
            if (content) {
                const result = JSON.parse(content);
                console.log(`📊 Found ${result.total_objects} objects in bucket`);
            }
        }
    } catch (error) {
        console.error('❌ Objects list failed:', error.message);
    }
    
    console.log('\n🎉 R2 Storage MCP Server testing complete!');
}

testR2Storage().catch(console.error);
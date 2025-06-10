#!/usr/bin/env node

const serverUrl = 'https://sequential-thinking-pure.somotravel.workers.dev';

async function testSequentialThinking() {
    console.log('🧪 Testing Sequential Thinking MCP Server...\n');
    
    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    try {
        const healthResponse = await fetch(`${serverUrl}/health`);
        const healthData = await healthResponse.json();
        console.log('✅ Health check passed:', healthData.status);
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
        return;
    }
    
    // Test 2: Tools list
    console.log('\n2️⃣ Testing tools/list...');
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
        const jsonStart = toolsData.indexOf('{');
        if (jsonStart !== -1) {
            const jsonData = JSON.parse(toolsData.substring(jsonStart));
            const tools = jsonData.result?.tools || [];
            console.log(`✅ Found ${tools.length} tools available`);
            tools.forEach(tool => {
                console.log(`   • ${tool.name} - ${tool.description}`);
            });
        }
    } catch (error) {
        console.error('❌ Tools list failed:', error.message);
        return;
    }
    
    // Test 3: Sequential thinking tool
    console.log('\n3️⃣ Testing sequential_thinking tool...');
    try {
        const thinkingResponse = await fetch(`${serverUrl}/sse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 3,
                method: 'tools/call',
                params: {
                    name: 'sequential_thinking',
                    arguments: {
                        problem: 'How to optimize travel itinerary planning',
                        steps: 3,
                        format: 'text'
                    }
                }
            })
        });
        
        const thinkingData = await thinkingResponse.text();
        console.log('✅ Sequential thinking tool executed successfully');
        
        const jsonStart = thinkingData.indexOf('{');
        if (jsonStart !== -1) {
            const jsonData = JSON.parse(thinkingData.substring(jsonStart));
            const content = jsonData.result?.content?.[0]?.text;
            if (content && content.includes('SEQUENTIAL ANALYSIS')) {
                console.log('📊 Generated structured analysis with step-by-step breakdown');
                const lines = content.split('\n').slice(0, 5);
                lines.forEach(line => {
                    if (line.trim()) console.log(`   ${line.trim()}`);
                });
            }
        }
    } catch (error) {
        console.error('❌ Sequential thinking failed:', error.message);
    }
    
    console.log('\n🎉 Sequential Thinking MCP Server testing complete!');
}

testSequentialThinking().catch(console.error);
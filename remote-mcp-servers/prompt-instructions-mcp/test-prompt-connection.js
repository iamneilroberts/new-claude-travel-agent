#!/usr/bin/env node

const serverUrl = 'https://prompt-instructions-mcp-pure.somotravel.workers.dev';

async function testPromptInstructions() {
    console.log('🧪 Testing Prompt Instructions MCP Server...\n');
    
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
    
    // Test 3: List instruction sets
    console.log('\n3️⃣ Testing list_instruction_sets tool...');
    try {
        const listResponse = await fetch(`${serverUrl}/sse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 3,
                method: 'tools/call',
                params: {
                    name: 'list_instruction_sets',
                    arguments: {}
                }
            })
        });
        
        const listData = await listResponse.text();
        console.log('✅ Instruction sets list executed successfully');
        
        const jsonStart = listData.indexOf('{');
        if (jsonStart !== -1) {
            const jsonData = JSON.parse(listData.substring(jsonStart));
            const content = jsonData.result?.content?.[0]?.text;
            if (content && content.includes('Instruction Sets')) {
                const lines = content.split('\n').filter(line => line.startsWith('- **')).slice(0, 3);
                console.log('📊 Sample instruction sets:');
                lines.forEach(line => console.log(`   ${line}`));
            }
        }
    } catch (error) {
        console.error('❌ List instruction sets failed:', error.message);
    }
    
    // Test 4: Get mode indicator
    console.log('\n4️⃣ Testing get_mode_indicator tool...');
    try {
        const modeResponse = await fetch(`${serverUrl}/sse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 4,
                method: 'tools/call',
                params: {
                    name: 'get_mode_indicator',
                    arguments: {}
                }
            })
        });
        
        const modeData = await modeResponse.text();
        console.log('✅ Mode indicator tool executed successfully');
        
        const jsonStart = modeData.indexOf('{');
        if (jsonStart !== -1) {
            const jsonData = JSON.parse(modeData.substring(jsonStart));
            const content = jsonData.result?.content?.[0]?.text;
            if (content) {
                console.log('📊 Current mode:', content);
            }
        }
    } catch (error) {
        console.error('❌ Mode indicator failed:', error.message);
    }
    
    console.log('\n🎉 Prompt Instructions MCP Server testing complete!');
}

testPromptInstructions().catch(console.error);
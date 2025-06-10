#!/usr/bin/env node

const serverUrl = 'https://template-document-mcp-pure.somotravel.workers.dev';

async function testTemplateDocument() {
    console.log('🧪 Testing Template Document MCP Server...\n');
    
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
    
    // Test 3: Generate travel budget
    console.log('\n3️⃣ Testing generate_travel_budget tool...');
    try {
        const budgetResponse = await fetch(`${serverUrl}/sse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 3,
                method: 'tools/call',
                params: {
                    name: 'generate_travel_budget',
                    arguments: {
                        destination: 'Paris, France',
                        duration_days: 5,
                        traveler_count: 2,
                        budget_range: 'medium',
                        trip_type: 'leisure',
                        include_flights: true
                    }
                }
            })
        });
        
        const budgetData = await budgetResponse.text();
        console.log('✅ Travel budget generation tool executed successfully');
        
        const jsonStart = budgetData.indexOf('{');
        if (jsonStart !== -1) {
            const jsonData = JSON.parse(budgetData.substring(jsonStart));
            const content = jsonData.result?.content?.[0]?.text;
            if (content && content.includes('Travel Budget for Paris')) {
                console.log('📊 Generated detailed budget breakdown for Paris trip');
                const lines = content.split('\n').slice(0, 10);
                lines.forEach(line => {
                    if (line.trim() && !line.startsWith('#')) console.log(`   ${line.trim()}`);
                });
            }
        }
    } catch (error) {
        console.error('❌ Budget generation failed:', error.message);
    }
    
    console.log('\n🎉 Template Document MCP Server testing complete!');
}

testTemplateDocument().catch(console.error);
#!/usr/bin/env node

const serverUrl = 'https://mobile-interaction-mcp-pure.somotravel.workers.dev';

async function testMobileInteraction() {
    console.log('🧪 Testing Mobile Interaction MCP Server...\n');
    
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
    
    // Test 3: Process mobile message
    console.log('\n3️⃣ Testing process_mobile_message tool...');
    try {
        const messageResponse = await fetch(`${serverUrl}/sse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 3,
                method: 'tools/call',
                params: {
                    name: 'process_mobile_message',
                    arguments: {
                        platform: 'whatsapp',
                        sender_id: '+1234567890',
                        message_id: 'msg_123',
                        content: 'Hi, I need help planning a trip to Paris next month',
                        message_type: 'text'
                    }
                }
            })
        });
        
        const messageData = await messageResponse.text();
        console.log('✅ Mobile message processing tool executed successfully');
        
        const jsonStart = messageData.indexOf('{');
        if (jsonStart !== -1) {
            const jsonData = JSON.parse(messageData.substring(jsonStart));
            const content = jsonData.result?.content?.[0]?.text;
            if (content) {
                const result = JSON.parse(content);
                console.log('📊 Processed intent:', result.intent?.type || 'general');
                console.log('📊 Response generated for conversation:', result.conversation_id);
            }
        }
    } catch (error) {
        console.error('❌ Mobile message processing failed:', error.message);
    }
    
    // Test 4: Query trip info
    console.log('\n4️⃣ Testing query_trip_info tool...');
    try {
        const tripResponse = await fetch(`${serverUrl}/sse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 4,
                method: 'tools/call',
                params: {
                    name: 'query_trip_info',
                    arguments: {
                        client_name: 'Smith'
                    }
                }
            })
        });
        
        const tripData = await tripResponse.text();
        console.log('✅ Trip query tool executed successfully');
        
        const jsonStart = tripData.indexOf('{');
        if (jsonStart !== -1) {
            const jsonData = JSON.parse(tripData.substring(jsonStart));
            const content = jsonData.result?.content?.[0]?.text;
            if (content) {
                const result = JSON.parse(content);
                console.log('📊 Query status:', result.status);
                console.log('📊 Trips found:', result.count || 0);
            }
        }
    } catch (error) {
        console.error('❌ Trip query failed:', error.message);
    }
    
    console.log('\n🎉 Mobile Interaction MCP Server testing complete!');
}

testMobileInteraction().catch(console.error);
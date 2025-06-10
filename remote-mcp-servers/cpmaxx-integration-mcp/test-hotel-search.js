#!/usr/bin/env node
/**
 * Test script for CPMaxx Hotel Search functionality
 * Tests the actual hotel search with simulated MCP requests
 */

import { spawn } from 'child_process';

console.log('🏨 Testing CPMaxx Hotel Search Functionality...\n');

async function testHotelSearch() {
    console.log('🚀 Starting CPMaxx Local MCP Server...');
    
    const serverProcess = spawn('node', ['dist/local-server.js'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
            ...process.env,
            CP_CENTRAL_LOGIN: 'kim.henderson@cruiseplanners.com',
            CP_CENTRAL_PASSWORD: '3!Pineapples',
            CPMAXX_BASE_URL: 'https://cpmaxx.cruiseplannersnet.com'
        }
    });

    let serverOutput = '';
    let serverStarted = false;

    serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        serverOutput += output;
        console.log('📤 Server:', output.trim());
    });

    serverProcess.stderr.on('data', (data) => {
        const output = data.toString();
        console.log('🔧 Server Info:', output.trim());
        if (output.includes('running on stdio')) {
            serverStarted = true;
        }
    });

    // Wait for server to start
    console.log('⏳ Waiting for server startup...');
    await new Promise(resolve => {
        const checkStarted = () => {
            if (serverStarted) {
                resolve();
            } else {
                setTimeout(checkStarted, 100);
            }
        };
        checkStarted();
    });

    console.log('✅ Server started successfully!');

    // Test 1: List available tools
    console.log('\n1️⃣ Testing tools/list...');
    const listToolsRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list'
    };

    serverProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Test browser automation (quick test)
    console.log('\n2️⃣ Testing browser automation...');
    const testAutomationRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
            name: 'test_browser_automation',
            arguments: {
                test_type: 'login',
                visible_browser: false
            }
        }
    };

    serverProcess.stdin.write(JSON.stringify(testAutomationRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test 3: Actual hotel search (this will take longer)
    console.log('\n3️⃣ Testing real hotel search...');
    console.log('⚠️  This test will use real browser automation and may take 30-60 seconds');
    console.log('🌐 Connecting to CPMaxx portal...');
    
    const hotelSearchRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
            name: 'search_hotels',
            arguments: {
                location: 'Miami Beach',
                check_in_date: '2025-03-15',
                check_out_date: '2025-03-18',
                rooms: 1,
                adults: 2,
                children: 0
            }
        }
    };

    console.log('📝 Search parameters:');
    console.log('   Location: Miami Beach');
    console.log('   Check-in: 2025-03-15');
    console.log('   Check-out: 2025-03-18');
    console.log('   Guests: 2 adults, 1 room');
    console.log('');
    console.log('🤖 Starting browser automation...');

    serverProcess.stdin.write(JSON.stringify(hotelSearchRequest) + '\n');

    // Wait longer for hotel search to complete
    await new Promise(resolve => setTimeout(resolve, 60000));

    // Cleanup
    console.log('\n🧹 Cleaning up...');
    serverProcess.kill('SIGTERM');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!serverProcess.killed) {
        serverProcess.kill('SIGKILL');
    }

    console.log('✅ Test completed!');
    
    // Analyze the output
    console.log('\n📊 Test Analysis:');
    console.log('================');
    
    if (serverOutput.includes('tools')) {
        console.log('✅ Tools list: Successfully retrieved available tools');
    } else {
        console.log('❌ Tools list: Failed to retrieve tools');
    }
    
    if (serverOutput.includes('Browser automation test completed')) {
        console.log('✅ Browser test: Automation framework working');
    } else {
        console.log('❌ Browser test: Automation framework issues');
    }
    
    if (serverOutput.includes('Launching browser')) {
        console.log('✅ Browser launch: Playwright successfully launching browsers');
    } else {
        console.log('❌ Browser launch: Issues with Playwright browser startup');
    }
    
    if (serverOutput.includes('Hotel Search') || serverOutput.includes('hotels')) {
        console.log('✅ Hotel search: Search functionality operational');
    } else {
        console.log('⚠️  Hotel search: Search may need more time or has authentication issues');
    }
    
    // Show sample output (truncated)
    console.log('\n📄 Sample Server Output (last 500 characters):');
    console.log('=' .repeat(50));
    console.log(serverOutput.slice(-500));
    console.log('=' .repeat(50));
}

// Run the test
testHotelSearch().catch(error => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
});
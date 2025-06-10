#!/usr/bin/env node
/**
 * Quick test of the standalone CPMaxx server
 */

import { spawn } from 'child_process';

console.log('🧪 Testing CPMaxx Standalone Server...\n');

async function testStandaloneServer() {
    console.log('🚀 Starting standalone server...');
    
    const serverProcess = spawn('node', ['dist/local-server-standalone.js'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
            ...process.env,
            CPMAXX_LOGIN: 'kim.henderson@cruiseplanners.com',
            CPMAXX_PASSWORD: '3!Pineapples'
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

    console.log('✅ Standalone server started successfully!');

    // Test tools list
    console.log('\n1️⃣ Testing tools/list...');
    const listToolsRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list'
    };

    serverProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test browser with visible mode
    console.log('\n2️⃣ Testing visible browser...');
    const testBrowserRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
            name: 'test_browser',
            arguments: {
                test_type: 'visible_test',
                visible_browser: true
            }
        }
    };

    serverProcess.stdin.write(JSON.stringify(testBrowserRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Cleanup
    console.log('\n🧹 Cleaning up...');
    serverProcess.kill('SIGTERM');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Test completed!');
    
    // Show what tools are available
    if (serverOutput.includes('search_hotels')) {
        console.log('\n🎉 All systems ready! Available tools:');
        console.log('   • search_hotels - Full CPMaxx hotel search with browser automation');
        console.log('   • get_hotel_details - Get complete hotel details from recent search');
        console.log('   • get_hotels_by_criteria - Filter hotels by commission/rating/price');
        console.log('   • test_browser - Test automation with visible browser');
        console.log('\nThe server is ready for Claude Desktop integration!');
    }
}

testStandaloneServer().catch(console.error);
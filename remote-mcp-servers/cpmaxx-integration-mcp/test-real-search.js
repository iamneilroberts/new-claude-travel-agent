#!/usr/bin/env node
/**
 * Test real hotel search with CPMaxx server
 */

import { spawn } from 'child_process';

console.log('🏨 Testing Real Hotel Search with CPMaxx Server...\n');

async function testRealHotelSearch() {
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

    console.log('✅ Server started! Testing hotel search...\n');

    // Test hotel search for Miami Beach
    console.log('🏖️ Searching for hotels in Miami Beach...');
    const searchRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
            name: 'search_hotels',
            arguments: {
                location: 'Miami Beach, FL',
                check_in_date: '2025-03-15',
                check_out_date: '2025-03-18',
                rooms: 1,
                adults: 2,
                children: 0,
                debug_mode: false
            }
        }
    };

    serverProcess.stdin.write(JSON.stringify(searchRequest) + '\n');
    
    // Wait longer for hotel search to complete
    console.log('⏳ Waiting for hotel search results (this may take 60-120 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 120000)); // 2 minutes

    // Test getting hotels by criteria
    console.log('\n💰 Getting hotels sorted by max commission...');
    const criteriaRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
            name: 'get_hotels_by_criteria',
            arguments: {
                criteria: 'max_commission',
                limit: 5
            }
        }
    };

    serverProcess.stdin.write(JSON.stringify(criteriaRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Cleanup
    console.log('\n🧹 Cleaning up...');
    serverProcess.kill('SIGTERM');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Hotel search test completed!');
    
    // Analyze results
    if (serverOutput.includes('totalHotels')) {
        console.log('\n🎉 SUCCESS: Hotel search returned results!');
        
        // Try to extract hotel count from output
        const hotelCountMatch = serverOutput.match(/"totalHotels":\s*(\d+)/);
        if (hotelCountMatch) {
            console.log(`📊 Found ${hotelCountMatch[1]} hotels`);
        }
        
        // Check for commission data
        if (serverOutput.includes('commission')) {
            console.log('💰 Commission data available');
        }
        
        // Check for real data extraction
        if (serverOutput.includes('comprehensive_dom_extraction')) {
            console.log('🔍 Advanced data extraction working');
        }
        
    } else {
        console.log('\n❌ No hotel results detected in output');
    }
}

testRealHotelSearch().catch(console.error);
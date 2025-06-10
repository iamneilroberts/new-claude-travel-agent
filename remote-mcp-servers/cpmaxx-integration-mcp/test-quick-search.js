#!/usr/bin/env node
/**
 * Quick hotel search test - shorter timeout
 */

import { spawn } from 'child_process';

console.log('🏨 Quick Hotel Search Test...\n');

async function quickHotelSearch() {
    const serverProcess = spawn('node', ['dist/local-server-standalone.js'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
            ...process.env,
            CPMAXX_LOGIN: 'kim.henderson@cruiseplanners.com',
            CPMAXX_PASSWORD: '3!Pineapples'
        }
    });

    let responseReceived = false;
    let hotelResults = null;

    serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('📤 Response:', output.trim());
        
        // Parse JSON responses
        try {
            const lines = output.split('\n').filter(line => line.trim());
            for (const line of lines) {
                if (line.startsWith('{"result"') || line.startsWith('{"error"')) {
                    const response = JSON.parse(line);
                    if (response.result && response.result.content && response.result.content[0] && response.result.content[0].text) {
                        const content = JSON.parse(response.result.content[0].text);
                        if (content.totalHotels) {
                            hotelResults = content;
                            responseReceived = true;
                            console.log('\n🎉 Hotel search results received!');
                            console.log(`📊 Total hotels found: ${content.totalHotels}`);
                            
                            if (content.hotels && content.hotels.length > 0) {
                                console.log('\n🏨 Sample hotels:');
                                content.hotels.slice(0, 3).forEach((hotel, i) => {
                                    console.log(`  ${i+1}. ${hotel.name}`);
                                    console.log(`     Price: $${hotel.price}/night`);
                                    console.log(`     Rating: ${hotel.rating}⭐`);
                                    console.log(`     Commission: $${hotel.commission} (${hotel.commissionPercent}%)`);
                                });
                            }
                        }
                    }
                }
            }
        } catch (e) {
            // Ignore JSON parsing errors
        }
    });

    serverProcess.stderr.on('data', (data) => {
        const output = data.toString();
        if (output.includes('running on stdio')) {
            console.log('✅ Server started');
            
            // Send search request
            setTimeout(() => {
                console.log('🔍 Sending hotel search request...');
                const searchRequest = {
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'tools/call',
                    params: {
                        name: 'search_hotels',
                        arguments: {
                            location: 'Miami Beach',
                            check_in_date: '2025-04-15',
                            check_out_date: '2025-04-18',
                            rooms: 1,
                            adults: 2,
                            children: 0,
                            debug_mode: true
                        }
                    }
                };
                
                serverProcess.stdin.write(JSON.stringify(searchRequest) + '\n');
            }, 1000);
        }
    });

    // Wait for response with timeout
    const timeout = 180000; // 3 minutes
    console.log(`⏳ Waiting up to ${timeout/1000} seconds for results...`);
    
    await new Promise(resolve => {
        const timer = setTimeout(() => {
            console.log('⏰ Timeout reached');
            resolve();
        }, timeout);
        
        const checkResponse = () => {
            if (responseReceived) {
                clearTimeout(timer);
                resolve();
            } else {
                setTimeout(checkResponse, 1000);
            }
        };
        checkResponse();
    });

    // Cleanup
    serverProcess.kill('SIGTERM');
    
    if (hotelResults) {
        console.log('\n✅ Test completed successfully!');
        console.log(`📈 Search analytics:`);
        console.log(`   • Total hotels: ${hotelResults.totalHotels}`);
        console.log(`   • Price range: ${hotelResults.analytics?.priceRange}`);
        console.log(`   • Commission range: ${hotelResults.analytics?.commissionRange}`);
        console.log(`   • Data source: ${hotelResults.search_metadata?.source}`);
    } else {
        console.log('\n❌ No results received within timeout period');
    }
}

quickHotelSearch().catch(console.error);
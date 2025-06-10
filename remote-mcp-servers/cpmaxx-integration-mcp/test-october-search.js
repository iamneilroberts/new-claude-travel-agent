#!/usr/bin/env node
/**
 * Hotel search test with October 2025 dates
 */

import { spawn } from 'child_process';

console.log('🏨 Hotel Search Test - October 2025...\n');

async function octoberHotelSearch() {
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
                                console.log('\n🏨 Top 5 hotels by commission:');
                                const sortedByCommission = content.hotels
                                    .sort((a, b) => b.commissionPercent - a.commissionPercent)
                                    .slice(0, 5);
                                    
                                sortedByCommission.forEach((hotel, i) => {
                                    console.log(`  ${i+1}. ${hotel.name}`);
                                    console.log(`     💰 Price: $${hotel.price}/night`);
                                    console.log(`     ⭐ Rating: ${hotel.rating}⭐`);
                                    console.log(`     💵 Commission: $${hotel.commission} (${hotel.commissionPercent}%)`);
                                    console.log(`     🎯 Max Commission Score: ${hotel.scores?.maxCommission || 'N/A'}`);
                                    console.log('');
                                });
                            }
                            
                            if (content.analytics) {
                                console.log('📈 Market Analytics:');
                                console.log(`   • Price Range: ${content.analytics.priceRange}`);
                                console.log(`   • Commission Range: ${content.analytics.commissionRange}`);
                                console.log(`   • Average Price: $${content.analytics.avgPrice}`);
                                console.log(`   • Average Commission: ${content.analytics.avgCommission}%`);
                                console.log(`   • Total Commission Potential: $${content.analytics.totalCommissionPotential}`);
                            }
                        }
                    } else if (response.result && response.result.isError) {
                        console.log('❌ Error response:', JSON.parse(response.result.content[0].text));
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
            
            // Send search request with October dates
            setTimeout(() => {
                console.log('🔍 Searching hotels in Miami Beach for October 1-4, 2025...');
                const searchRequest = {
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'tools/call',
                    params: {
                        name: 'search_hotels',
                        arguments: {
                            location: 'Miami Beach, FL',
                            check_in_date: '2025-10-01',
                            check_out_date: '2025-10-04',
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

    // If we got results, test the criteria functionality
    if (hotelResults) {
        console.log('\n🔄 Testing get_hotels_by_criteria...');
        
        const criteriaRequest = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
                name: 'get_hotels_by_criteria',
                arguments: {
                    criteria: 'max_commission',
                    limit: 3
                }
            }
        };
        
        serverProcess.stdin.write(JSON.stringify(criteriaRequest) + '\n');
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Cleanup
    serverProcess.kill('SIGTERM');
    
    if (hotelResults) {
        console.log('\n✅ Test completed successfully!');
        console.log('\n🎯 Test Summary:');
        console.log(`   • Search Location: Miami Beach, FL`);
        console.log(`   • Search Dates: October 1-4, 2025`);
        console.log(`   • Total Hotels Found: ${hotelResults.totalHotels}`);
        console.log(`   • Data Source: ${hotelResults.search_metadata?.source}`);
        console.log(`   • Extraction Method: ${hotelResults.search_metadata?.extractionVersion}`);
        console.log(`   • Available Tools: 4 (search_hotels, get_hotel_details, get_hotels_by_criteria, test_browser)`);
        console.log('\n🚀 CPMaxx server is ready for Claude Desktop integration!');
    } else {
        console.log('\n❌ No results received within timeout period');
        console.log('💡 This might be due to:');
        console.log('   • Network connectivity issues');
        console.log('   • CPMaxx site being slow');
        console.log('   • Authentication problems');
        console.log('   • Date/location validation issues');
    }
}

octoberHotelSearch().catch(console.error);
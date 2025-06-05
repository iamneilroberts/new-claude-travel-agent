#!/usr/bin/env node
/**
 * Test script for Local CPMaxx MCP Server
 * Tests real browser automation with actual CPMaxx data
 */

import { spawn } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';

// Test configuration
const TEST_CONFIG = {
  timeout: 120000, // 2 minutes for real browser automation
  debug: true
};

// ANSI colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

function log(message, color = colors.reset) {
  const timestamp = new Date().toISOString().substring(11, 19);
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

function logHeader(message) {
  console.log(`\n${colors.bold}${colors.blue}=== ${message} ===${colors.reset}\n`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.cyan);
}

// Test the local MCP server
async function testLocalMCPServer() {
  logHeader('TESTING LOCAL CPMAXX MCP SERVER');
  
  // Test hotel search with real data
  const hotelSearchTest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'search_hotels',
      arguments: {
        location: 'Cork, Ireland',
        check_in_date: '2025-07-15',
        check_out_date: '2025-07-20',
        rooms: 1,
        adults: 2,
        children: 0,
        filters: {
          star_rating: [4, 5]
        },
        debug_mode: true
      }
    }
  };

  logInfo('Starting local MCP server with real browser automation...');
  logInfo('This will launch a real browser and extract actual data from CPMaxx');
  logInfo('Expected time: 30-60 seconds');
  
  return new Promise((resolve, reject) => {
    // Start the local server
    const serverProcess = spawn('node', ['dist/local-server.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        CPMAXX_LOGIN: process.env.CPMAXX_LOGIN || 'kim.henderson@cruiseplanners.com',
        CPMAXX_PASSWORD: process.env.CPMAXX_PASSWORD || '3!Pineapples'
      }
    });

    let serverOutput = '';
    let responseReceived = false;
    
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      serverOutput += output;
      
      if (TEST_CONFIG.debug) {
        process.stdout.write(colors.dim + output + colors.reset);
      }
      
      // Check if we got a response
      if (output.includes('"status"') && !responseReceived) {
        responseReceived = true;
        
        try {
          // Extract JSON response from output
          const lines = serverOutput.split('\n');
          for (const line of lines) {
            if (line.trim().startsWith('{') && line.includes('"status"')) {
              const response = JSON.parse(line);
              
              logSuccess('Received response from local MCP server!');
              displayHotelResults(response);
              
              serverProcess.kill();
              resolve(response);
              return;
            }
          }
        } catch (error) {
          logError(`Failed to parse server response: ${error.message}`);
        }
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      if (TEST_CONFIG.debug) {
        process.stderr.write(colors.yellow + output + colors.reset);
      }
    });

    serverProcess.on('close', (code) => {
      if (!responseReceived) {
        logError(`Server exited with code ${code} before sending response`);
        reject(new Error(`Server exited with code ${code}`));
      }
    });

    // Set timeout
    setTimeout(() => {
      if (!responseReceived) {
        serverProcess.kill();
        logError('Test timed out waiting for server response');
        reject(new Error('Test timeout'));
      }
    }, TEST_CONFIG.timeout);

    // Wait a moment for server to start, then send request
    setTimeout(() => {
      logInfo('Sending hotel search request to server...');
      serverProcess.stdin.write(JSON.stringify(hotelSearchTest) + '\n');
    }, 2000);
  });
}

// Display hotel results
function displayHotelResults(result) {
  if (!result || !result.content || !result.content[0]) {
    logError('Invalid response format');
    return;
  }

  try {
    const data = JSON.parse(result.content[0].text);
    
    logHeader('REAL CPMAXX HOTEL SEARCH RESULTS');
    
    if (data.search_metadata) {
      logInfo(`Search Location: ${data.search_metadata.location}`);
      logInfo(`Search Dates: ${data.search_metadata.dates}`);
      logInfo(`Guests: ${data.search_metadata.guests}`);
      logInfo(`Source: ${data.search_metadata.source}`);
      console.log();
    }

    if (data.automation_log && data.automation_log.length > 0) {
      logHeader('BROWSER AUTOMATION LOG');
      data.automation_log.forEach(logEntry => {
        log(`  ${logEntry}`, colors.dim);
      });
      console.log();
    }

    if (data.hotels && data.hotels.length > 0) {
      logHeader(`HOTELS FOUND (${data.hotels.length})`);
      
      data.hotels.forEach((hotel, index) => {
        console.log(`${colors.bold}${colors.magenta}Hotel ${index + 1}: ${hotel.name}${colors.reset}`);
        console.log(`${colors.cyan}Address:${colors.reset} ${hotel.address}`);
        console.log(`${colors.cyan}Description:${colors.reset} ${hotel.description}`);
        console.log(`${colors.cyan}Rating:${colors.reset} ${hotel.rating}⭐`);
        console.log(`${colors.cyan}Price:${colors.reset} €${hotel.price}/night`);
        console.log(`${colors.cyan}Commission:${colors.reset} €${hotel.commission} (${hotel.commissionPercent}%)`);
        console.log(`${colors.cyan}Available:${colors.reset} ${hotel.available ? '✅ Yes' : '❌ No'}`);
        
        if (hotel.photos && hotel.photos.featured) {
          console.log(`${colors.cyan}Featured Photo:${colors.reset} ${hotel.photos.featured}`);
          if (hotel.photos.giataId) {
            console.log(`${colors.cyan}Giata ID:${colors.reset} ${hotel.photos.giataId}`);
          }
        }
        
        if (hotel.amenities && hotel.amenities.length > 0) {
          console.log(`${colors.cyan}Amenities:${colors.reset} ${hotel.amenities.join(', ')}`);
        }
        
        console.log();
      });
    } else {
      logError('No hotels found in results');
    }

  } catch (error) {
    logError(`Failed to parse hotel results: ${error.message}`);
    logInfo('Raw response:');
    console.log(result.content[0].text);
  }
}

// Main test runner
async function runLocalTests() {
  console.log(`${colors.bold}${colors.blue}CPMaxx Local MCP Server Test Suite${colors.reset}`);
  console.log(`${colors.cyan}Testing with real browser automation and actual CPMaxx data${colors.reset}`);
  console.log(`${colors.cyan}Timeout: ${TEST_CONFIG.timeout}ms${colors.reset}`);
  console.log();

  try {
    await testLocalMCPServer();
    logSuccess('Local MCP server test completed successfully! 🎉');
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the tests
runLocalTests().catch(error => {
  logError(`Test runner failed: ${error.message}`);
  process.exit(1);
});
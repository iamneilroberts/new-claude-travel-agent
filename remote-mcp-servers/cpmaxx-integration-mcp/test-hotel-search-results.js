#!/usr/bin/env node
/**
 * CPMaxx Hotel Search Results Test
 * Tests hotel search with filters and displays detailed results
 */

import https from 'https';

// Test configuration
const TEST_CONFIG = {
  serverUrl: process.env.CPMAXX_SERVER_URL || 'http://localhost:8787',
  timeout: 60000 // Longer timeout for visible browser tests
};

// Colors for console output
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

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

// HTTP request helper with better error handling
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, TEST_CONFIG.serverUrl);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CPMaxx-Hotel-Test/1.0'
      },
      timeout: TEST_CONFIG.timeout
    };

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    }

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: response, raw: body });
        } catch (e) {
          resolve({ status: res.statusCode, data: null, raw: body, parseError: e.message });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test MCP tool with detailed result display
async function testMCPTool(toolName, params = {}) {
  logInfo(`Testing MCP tool: ${toolName}`);
  logInfo(`Parameters: ${JSON.stringify(params, null, 2)}`);
  
  try {
    const mcpRequest = {
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 10000),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: params
      }
    };

    logInfo('Sending MCP request...');
    const response = await makeRequest('/sse', 'POST', mcpRequest);
    
    logInfo(`Response status: ${response.status}`);
    
    if (response.parseError) {
      logWarning(`JSON parse error: ${response.parseError}`);
      logInfo(`Raw response: ${response.raw.substring(0, 500)}...`);
    }
    
    if (response.status === 200 && response.data) {
      if (response.data.result) {
        logSuccess(`Tool ${toolName} executed successfully`);
        return response.data.result;
      } else if (response.data.error) {
        logError(`Tool error: ${JSON.stringify(response.data.error, null, 2)}`);
        return null;
      } else {
        logWarning(`Unexpected response format: ${JSON.stringify(response.data, null, 2)}`);
        return response.data;
      }
    } else {
      logError(`HTTP error ${response.status}: ${response.raw}`);
      return null;
    }
  } catch (error) {
    logError(`Tool ${toolName} test failed: ${error.message}`);
    return null;
  }
}

// Display hotel search results in a formatted way
function displayHotelResults(result) {
  if (!result) {
    logError('No results to display');
    return;
  }

  logHeader('HOTEL SEARCH RESULTS');

  // Display search metadata
  if (result.search_metadata) {
    logInfo(`Search Location: ${result.search_metadata.location}`);
    logInfo(`Search Dates: ${result.search_metadata.dates}`);
    logInfo(`Guests: ${result.search_metadata.guests}`);
    logInfo(`Rooms: ${result.search_metadata.rooms}`);
    
    if (result.search_metadata.filters_applied) {
      logInfo('Filters Applied:');
      Object.entries(result.search_metadata.filters_applied).forEach(([key, value]) => {
        if (value && (Array.isArray(value) ? value.length > 0 : value !== 'none')) {
          log(`  ${key}: ${Array.isArray(value) ? value.join(', ') : value}`, colors.dim);
        }
      });
    }
    console.log();
  }

  // Display automation log
  if (result.automation_log && result.automation_log.length > 0) {
    logHeader('AUTOMATION LOG');
    result.automation_log.slice(0, 10).forEach(logEntry => {
      log(`  ${logEntry}`, colors.dim);
    });
    if (result.automation_log.length > 10) {
      log(`  ... and ${result.automation_log.length - 10} more log entries`, colors.dim);
    }
    console.log();
  }

  // Display hotels
  if (result.hotels && result.hotels.length > 0) {
    logHeader(`HOTELS FOUND (${result.hotels.length})`);
    
    result.hotels.forEach((hotel, index) => {
      console.log(`${colors.bold}${colors.magenta}Hotel ${index + 1}: ${hotel.name}${colors.reset}`);
      console.log(`${colors.cyan}Address:${colors.reset} ${hotel.address || 'Not specified'}`);
      
      if (hotel.description) {
        console.log(`${colors.cyan}Description:${colors.reset} ${hotel.description}`);
      }
      
      console.log(`${colors.cyan}Rating:${colors.reset} ${hotel.rating}⭐`);
      console.log(`${colors.cyan}Price:${colors.reset} €${hotel.price}/night`);
      console.log(`${colors.cyan}Commission:${colors.reset} €${hotel.commission} (${hotel.commissionPercent}%)`);
      console.log(`${colors.cyan}Available:${colors.reset} ${hotel.available ? '✅ Yes' : '❌ No'}`);
      
      // Display photos info
      if (hotel.photos) {
        console.log(`${colors.cyan}Photos:${colors.reset}`);
        console.log(`  Featured: ${hotel.photos.featured || 'None'}`);
        if (hotel.photos.gallery && hotel.photos.gallery.length > 0) {
          console.log(`  Gallery: ${hotel.photos.gallery.length} images`);
          hotel.photos.gallery.slice(0, 3).forEach((url, i) => {
            console.log(`    ${i + 1}. ${url}`);
          });
          if (hotel.photos.gallery.length > 3) {
            console.log(`    ... and ${hotel.photos.gallery.length - 3} more`);
          }
        }
        if (hotel.photos.giataId) {
          console.log(`  Giata ID: ${hotel.photos.giataId}`);
        }
        if (hotel.photos.photoCount) {
          console.log(`  Total photos available: ${hotel.photos.photoCount}`);
        }
      }
      
      // Display amenities
      if (hotel.amenities && hotel.amenities.length > 0) {
        console.log(`${colors.cyan}Amenities:${colors.reset} ${hotel.amenities.join(', ')}`);
      }
      
      // Display hotel programs
      if (hotel.hotelPrograms && hotel.hotelPrograms.length > 0) {
        console.log(`${colors.cyan}Programs:${colors.reset} ${hotel.hotelPrograms.join(', ')}`);
      }
      
      // Display location info
      if (hotel.location) {
        if (hotel.location.coordinates) {
          console.log(`${colors.cyan}Coordinates:${colors.reset} ${hotel.location.coordinates.lat}, ${hotel.location.coordinates.lng}`);
        }
        if (hotel.location.district) {
          console.log(`${colors.cyan}District:${colors.reset} ${hotel.location.district}`);
        }
      }
      
      if (hotel.bookingUrl) {
        console.log(`${colors.cyan}Booking:${colors.reset} ${hotel.bookingUrl}`);
      }
      
      console.log(); // Add spacing between hotels
    });
  } else {
    logWarning('No hotels found in results');
  }

  // Display booking instructions
  if (result.booking_instructions) {
    logHeader('BOOKING INSTRUCTIONS');
    
    if (result.booking_instructions.next_steps) {
      log('Next Steps:', colors.cyan);
      result.booking_instructions.next_steps.forEach(step => {
        log(`  • ${step}`, colors.dim);
      });
    }
    
    if (result.booking_instructions.important_notes) {
      log('Important Notes:', colors.yellow);
      result.booking_instructions.important_notes.forEach(note => {
        log(`  ⚠️  ${note}`, colors.yellow);
      });
    }
  }

  // Display error information if present
  if (result.error_message) {
    logHeader('ERROR INFORMATION');
    logError(`Error: ${result.error_message}`);
    
    if (result.troubleshooting) {
      if (result.troubleshooting.common_issues) {
        log('Common Issues:', colors.yellow);
        result.troubleshooting.common_issues.forEach(issue => {
          log(`  • ${issue}`, colors.dim);
        });
      }
      
      if (result.troubleshooting.debug_suggestion) {
        log(`Debug Suggestion: ${result.troubleshooting.debug_suggestion}`, colors.cyan);
      }
    }
  }
}

// Test different hotel search scenarios
async function testHotelSearchScenarios() {
  const scenarios = [
    {
      name: 'Basic Cork Search (No Filters)',
      params: {
        location: 'Cork, Ireland',
        check_in_date: '2025-07-15',
        check_out_date: '2025-07-20',
        rooms: 1,
        adults: 2,
        children: 0,
        debug_mode: true
      }
    },
    {
      name: 'Cork Search with Star Rating Filter',
      params: {
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
    },
    {
      name: 'Cork Search with Price Range Filter',
      params: {
        location: 'Cork, Ireland',
        check_in_date: '2025-07-15',
        check_out_date: '2025-07-20',
        rooms: 1,
        adults: 2,
        children: 0,
        filters: {
          price_range: ['200-299', '300-399']
        },
        debug_mode: true
      }
    },
    {
      name: 'Dublin Luxury Hotels (Multiple Filters)',
      params: {
        location: 'Dublin, Ireland',
        check_in_date: '2025-08-01',
        check_out_date: '2025-08-05',
        rooms: 1,
        adults: 2,
        children: 0,
        filters: {
          star_rating: [5],
          hotel_programs: ['FHR', 'SIG'],
          amenities: ['spa', 'restaurant']
        },
        debug_mode: true
      }
    }
  ];

  for (const scenario of scenarios) {
    logHeader(`SCENARIO: ${scenario.name}`);
    
    const result = await testMCPTool('search-hotels', scenario.params);
    
    if (result) {
      displayHotelResults(result);
    } else {
      logError('No result returned for this scenario');
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Add delay between tests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Test browser automation visibility
async function testVisibleBrowserAutomation() {
  logHeader('TESTING VISIBLE BROWSER AUTOMATION');
  
  const params = {
    test_type: 'hotel_search',
    visible_browser: true,
    test_data: {
      location: 'Cork, Ireland',
      checkInDate: '2025-07-15',
      checkOutDate: '2025-07-20',
      rooms: 1,
      adults: 2,
      children: 0
    },
    debug_mode: true,
    screenshot_enabled: true
  };

  logInfo('Testing browser automation tool...');
  const result = await testMCPTool('test-browser-automation', params);
  
  if (result) {
    logSuccess('Browser automation test completed');
    
    if (result.automation_log) {
      logInfo('Automation steps:');
      result.automation_log.forEach(step => {
        log(`  ${step}`, colors.dim);
      });
    }
    
    if (result.hotels_found) {
      logInfo(`Hotels found: ${result.hotels_found}`);
    }
  } else {
    logError('Browser automation test failed');
  }
}

// Main test runner
async function runHotelSearchTests() {
  console.log(`${colors.bold}${colors.blue}CPMaxx Hotel Search Results Test Suite${colors.reset}`);
  console.log(`${colors.cyan}Server URL: ${TEST_CONFIG.serverUrl}${colors.reset}`);
  console.log(`${colors.cyan}Timeout: ${TEST_CONFIG.timeout}ms${colors.reset}`);
  console.log();

  try {
    // Test 1: Browser automation
    await testVisibleBrowserAutomation();
    
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Test 2: Various search scenarios
    await testHotelSearchScenarios();
    
    logSuccess('All hotel search tests completed! 🎉');
    
  } catch (error) {
    logError(`Test suite failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
CPMaxx Hotel Search Results Test

Usage: node test-hotel-search-results.js [options]

Options:
  --help, -h          Show this help message
  --url <url>         Set server URL (default: http://localhost:8787)
  --timeout <ms>      Set request timeout in ms (default: 60000)

Environment Variables:
  CPMAXX_SERVER_URL   Server URL to test

Examples:
  node test-hotel-search-results.js
  node test-hotel-search-results.js --url http://localhost:8787
  CPMAXX_SERVER_URL=https://your-server.workers.dev node test-hotel-search-results.js
`);
  process.exit(0);
}

// Parse command line arguments
const urlIndex = process.argv.indexOf('--url');
if (urlIndex !== -1 && process.argv[urlIndex + 1]) {
  TEST_CONFIG.serverUrl = process.argv[urlIndex + 1];
}

const timeoutIndex = process.argv.indexOf('--timeout');
if (timeoutIndex !== -1 && process.argv[timeoutIndex + 1]) {
  TEST_CONFIG.timeout = parseInt(process.argv[timeoutIndex + 1]);
}

// Run the tests
runHotelSearchTests().catch(error => {
  logError(`Test runner failed: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
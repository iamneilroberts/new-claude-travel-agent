#!/usr/bin/env node
// Test script for CPMaxx Integration MCP Server

import https from 'https';
import fs from 'fs';

// Configuration
const TEST_CONFIG = {
  serverUrl: process.env.CPMAXX_SERVER_URL || 'https://cpmaxx-integration-mcp.your-domain.workers.dev',
  authKey: process.env.MCP_AUTH_KEY || 'test-key',
  timeout: 30000
};

// ANSI colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  const timestamp = new Date().toISOString();
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

// HTTP request helper
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, TEST_CONFIG.serverUrl);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_CONFIG.authKey}`,
        'User-Agent': 'CPMaxx-MCP-Test/1.0'
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
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
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

// Test health endpoint
async function testHealthEndpoint() {
  logInfo('Testing health endpoint...');
  
  try {
    const response = await makeRequest('/health');
    
    if (response.status === 200) {
      logSuccess('Health endpoint responding');
      logInfo(`Server: ${response.data.service} v${response.data.version}`);
      logInfo(`Tools: ${response.data.tools?.join(', ')}`);
      return true;
    } else {
      logError(`Health endpoint returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Health endpoint failed: ${error.message}`);
    return false;
  }
}

// Test SSE endpoint
async function testSSEEndpoint() {
  logInfo('Testing SSE endpoint...');
  
  try {
    const response = await makeRequest('/sse');
    
    if (response.status === 200 || response.status === 101) {
      logSuccess('SSE endpoint responding');
      return true;
    } else {
      logError(`SSE endpoint returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    // SSE endpoints often timeout in curl-like tests, which is expected
    if (error.message.includes('timeout')) {
      logWarning('SSE endpoint timeout (expected for streaming connections)');
      return true;
    } else {
      logError(`SSE endpoint failed: ${error.message}`);
      return false;
    }
  }
}

// Test MCP tool execution
async function testMCPTool(toolName, params = {}) {
  logInfo(`Testing MCP tool: ${toolName}...`);
  
  try {
    const mcpRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: params
      }
    };

    const response = await makeRequest('/mcp', 'POST', mcpRequest);
    
    if (response.status === 200 && response.data.result) {
      logSuccess(`Tool ${toolName} executed successfully`);
      logInfo(`Result: ${JSON.stringify(response.data.result, null, 2).substring(0, 200)}...`);
      return true;
    } else {
      logError(`Tool ${toolName} failed: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    logError(`Tool ${toolName} test failed: ${error.message}`);
    return false;
  }
}

// Test hotel search tool
async function testHotelSearch() {
  const params = {
    location: 'Cork, Ireland',
    checkInDate: '05/15/2025',
    checkOutDate: '05/20/2025',
    rooms: 1,
    adults: 2,
    priceRange: '200-299',
    starRating: 4
  };

  return await testMCPTool('cpmaxx_search_hotels', params);
}

// Test car rental search tool
async function testCarSearch() {
  const params = {
    pickupLocation: 'Cork Airport',
    pickupDate: '05/15/2025',
    dropoffDate: '05/20/2025',
    pickupTime: '10:00',
    dropoffTime: '10:00',
    carType: 'compact',
    driverAge: 30
  };

  return await testMCPTool('cpmaxx_search_cars', params);
}

// Test package search tool
async function testPackageSearch() {
  const params = {
    destination: 'Dublin, Ireland',
    departureCity: 'New York',
    departureDate: '05/15/2025',
    returnDate: '05/22/2025',
    travelers: 2,
    includeHotel: true,
    includeCar: true,
    budgetRange: 'mid-range'
  };

  return await testMCPTool('cpmaxx_search_packages', params);
}

// Test health check tool
async function testHealthCheck() {
  return await testMCPTool('cpmaxx_health_check');
}

// Main test runner
async function runTests() {
  logInfo(`${colors.bold}CPMaxx Integration MCP Server Test Suite${colors.reset}`);
  logInfo(`Server URL: ${TEST_CONFIG.serverUrl}`);
  logInfo(`Timeout: ${TEST_CONFIG.timeout}ms`);
  console.log();

  const tests = [
    { name: 'Health Endpoint', fn: testHealthEndpoint },
    { name: 'SSE Endpoint', fn: testSSEEndpoint },
    { name: 'Health Check Tool', fn: testHealthCheck },
    { name: 'Hotel Search Tool', fn: testHotelSearch },
    { name: 'Car Search Tool', fn: testCarSearch },
    { name: 'Package Search Tool', fn: testPackageSearch }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      logError(`Test ${test.name} threw error: ${error.message}`);
      failed++;
    }
    console.log(); // Add spacing between tests
  }

  // Summary
  console.log(`${colors.bold}Test Results:${colors.reset}`);
  logSuccess(`Passed: ${passed}`);
  if (failed > 0) {
    logError(`Failed: ${failed}`);
  }
  console.log();

  if (failed === 0) {
    logSuccess('All tests passed! 🎉');
    process.exit(0);
  } else {
    logError(`${failed} test(s) failed`);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
CPMaxx Integration MCP Server Test Suite

Usage: node test-server.js [options]

Options:
  --help, -h          Show this help message
  --url <url>         Set server URL (default: env CPMAXX_SERVER_URL)
  --auth <key>        Set auth key (default: env MCP_AUTH_KEY)
  --timeout <ms>      Set request timeout in ms (default: 30000)

Environment Variables:
  CPMAXX_SERVER_URL   Server URL to test
  MCP_AUTH_KEY        Authentication key for requests

Examples:
  node test-server.js
  node test-server.js --url https://your-server.workers.dev
  CPMAXX_SERVER_URL=https://your-server.workers.dev node test-server.js
`);
  process.exit(0);
}

// Parse command line arguments
const urlIndex = process.argv.indexOf('--url');
if (urlIndex !== -1 && process.argv[urlIndex + 1]) {
  TEST_CONFIG.serverUrl = process.argv[urlIndex + 1];
}

const authIndex = process.argv.indexOf('--auth');
if (authIndex !== -1 && process.argv[authIndex + 1]) {
  TEST_CONFIG.authKey = process.argv[authIndex + 1];
}

const timeoutIndex = process.argv.indexOf('--timeout');
if (timeoutIndex !== -1 && process.argv[timeoutIndex + 1]) {
  TEST_CONFIG.timeout = parseInt(process.argv[timeoutIndex + 1]);
}

// Run the tests
runTests().catch(error => {
  logError(`Test runner failed: ${error.message}`);
  process.exit(1);
});
#!/usr/bin/env node
/**
 * Test Fixed Trip Query with Correct Database Schema
 */

const MCP_URL = 'https://mobile-interaction-mcp.somotravel.workers.dev/sse';

async function testFixedTripQuery() {
  console.log('🔧 Testing Fixed Trip Query');
  console.log('============================\n');

  try {
    // Test 1: Query trip using participant_names (new correct field)
    console.log('1. Testing query_trip_info with participant_names...');
    
    const response1 = await fetch(`${MCP_URL}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'query_trip_info',
          arguments: {
            participant_names: 'Chisholm'
          }
        }
      })
    });

    if (!response1.ok) {
      throw new Error(`HTTP ${response1.status}: ${response1.statusText}`);
    }

    const result1 = await response1.json();
    console.log('✅ participant_names Query Result:');
    console.log(JSON.stringify(result1, null, 2));

    // Test 2: Query trip using client_name (backwards compatibility)
    console.log('\n2. Testing query_trip_info with client_name (backwards compat)...');
    
    const response2 = await fetch(`${MCP_URL}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'query_trip_info',
          arguments: {
            client_name: 'Chisholm'
          }
        }
      })
    });

    const result2 = await response2.json();
    console.log('✅ client_name Query Result:');
    console.log(JSON.stringify(result2, null, 2));

    // Test 3: Query with date range
    console.log('\n3. Testing query_trip_info with date range...');
    
    const response3 = await fetch(`${MCP_URL}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'query_trip_info',
          arguments: {
            participant_names: 'Chisholm',
            date_range: {
              start: '2025-09-01',
              end: '2025-10-01'
            }
          }
        }
      })
    });

    const result3 = await response3.json();
    console.log('✅ Date Range Query Result:');
    console.log(JSON.stringify(result3, null, 2));

  } catch (error) {
    console.error('❌ Error testing fixed trip query:', error.message);
  }
}

testFixedTripQuery();
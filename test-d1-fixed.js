#!/usr/bin/env node
/**
 * Test Fixed D1 Database Server
 */

const DB_URL = 'https://clean-d1-mcp.somotravel.workers.dev/sse';

async function testFixedDatabase() {
  console.log('🔧 Testing Fixed D1 Database Server');
  console.log('====================================\n');

  try {
    // Test 1: Get database schema
    console.log('1. Testing get_database_schema...');
    
    const response1 = await fetch(`${DB_URL}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'get_database_schema',
          arguments: {}
        }
      })
    });

    if (!response1.ok) {
      throw new Error(`HTTP ${response1.status}: ${response1.statusText}`);
    }

    const result1 = await response1.json();
    console.log('📊 Schema Result:');
    console.log(JSON.stringify(result1, null, 2));

    // Test 2: Try execute_query with trip search
    console.log('\n2. Testing execute_query with trip search...');
    
    const response2 = await fetch(`${DB_URL}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'execute_query',
          arguments: {
            query: "SELECT * FROM trip_summary_view WHERE participant_names LIKE ? ORDER BY start_date DESC",
            params: ["%Chisholm%"]
          }
        }
      })
    });

    const result2 = await response2.json();
    console.log('🔍 Trip Search Result:');
    console.log(JSON.stringify(result2, null, 2));

    // Test 3: Basic trips table query
    console.log('\n3. Testing basic trips table query...');
    
    const response3 = await fetch(`${DB_URL}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'execute_query',
          arguments: {
            query: "SELECT COUNT(*) as total_trips FROM trips"
          }
        }
      })
    });

    const result3 = await response3.json();
    console.log('📈 Trips Count Result:');
    console.log(JSON.stringify(result3, null, 2));

  } catch (error) {
    console.error('❌ Error testing database:', error.message);
  }
}

testFixedDatabase();
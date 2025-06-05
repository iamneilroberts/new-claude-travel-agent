#!/usr/bin/env node
/**
 * Test Gmail Integration with Fresh Tokens
 */

const MCP_URL = 'https://mobile-interaction-mcp.somotravel.workers.dev/sse';

async function testGmailIntegration() {
  console.log('🧪 Testing Gmail Integration');
  console.log('==============================\n');

  try {
    // Test 1: Check email status
    console.log('1. Testing check_email_status...');
    
    const response = await fetch(`${MCP_URL}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'check_email_status',
          arguments: {
            generate_report: true
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('📧 Email Status Result:');
    console.log(JSON.stringify(result, null, 2));

    // Test 2: Try processing travel emails
    console.log('\n2. Testing process_travel_emails...');
    
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
          name: 'process_travel_emails',
          arguments: {
            mark_as_read: false,
            max_messages: 10
          }
        }
      })
    });

    const result2 = await response2.json();
    console.log('✈️ Process Travel Emails Result:');
    console.log(JSON.stringify(result2, null, 2));

  } catch (error) {
    console.error('❌ Error testing Gmail integration:', error.message);
  }
}

// Also test just connecting to the SSE endpoint
async function testSSEConnection() {
  console.log('\n🔌 Testing SSE Connection...');
  
  try {
    const response = await fetch(MCP_URL, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
      }
    });

    console.log('📡 SSE Response Status:', response.status);
    console.log('📋 Headers:', Object.fromEntries(response.headers.entries()));

    // Read first few bytes to verify SSE format
    const reader = response.body?.getReader();
    if (reader) {
      const { value } = await reader.read();
      const text = new TextDecoder().decode(value);
      console.log('📄 First SSE Data:', text.substring(0, 200));
      reader.releaseLock();
    }

  } catch (error) {
    console.error('❌ SSE Connection Error:', error.message);
  }
}

testSSEConnection().then(() => testGmailIntegration());
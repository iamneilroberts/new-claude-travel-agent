// Test script for Mobile Interaction MCP
// Tests core functionality and platform integrations

console.log('🧪 Testing Mobile Interaction MCP...\n');

const MCP_URL = 'http://localhost:8787'; // Local development URL
const MCP_AUTH_KEY = 'mobile-interaction-mcp-auth-key-2025';

// Test data
const testMessages = [
  {
    platform: 'whatsapp',
    sender_id: '+1234567890',
    message_id: 'test_msg_1',
    content: 'What time is the Rome to Barcelona flight for the Thompson trip?',
    message_type: 'text'
  },
  {
    platform: 'telegram',
    sender_id: '12345',
    message_id: 'test_msg_2',
    content: 'Change the Barcelona flight to 8:30 PM',
    message_type: 'text'
  },
  {
    platform: 'sms',
    sender_id: '+9876543210',
    message_id: 'test_msg_3',
    content: 'Process the attached invoice for Welford trip',
    message_type: 'document',
    attachments: [{
      type: 'document',
      url: 'https://example.com/invoice.pdf',
      filename: 'apple_vacations_invoice.pdf'
    }]
  }
];

// Test MCP connection
async function testMCPConnection() {
  console.log('🔗 Testing MCP connection...');

  try {
    const response = await fetch(`${MCP_URL}/health`);
    const data = await response.json();

    if (data.status === 'healthy') {
      console.log('✅ MCP server is healthy');
      console.log(`   Service: ${data.service}`);
      console.log(`   Version: ${data.version}\n`);
      return true;
    } else {
      console.log('❌ MCP server health check failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Failed to connect to MCP server:', error.message);
    return false;
  }
}

// Test message processing
async function testMessageProcessing(message) {
  console.log(`📱 Testing ${message.platform} message processing...`);
  console.log(`   Content: "${message.content}"`);

  try {
    const response = await fetch(`${MCP_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MCP_AUTH_KEY}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'process_mobile_message',
          arguments: message
        }
      })
    });

    const data = await response.json();

    if (data.result) {
      const result = JSON.parse(data.result.content[0].text);
      console.log('✅ Message processed successfully');
      console.log(`   Intent: ${result.intent.type} (confidence: ${result.intent.confidence})`);
      console.log(`   Response: "${result.response.message}"`);

      if (result.response.requires_confirmation) {
        console.log(`   Requires confirmation: ${result.response.confirmation_options.join(', ')}`);
      }

      return result;
    } else {
      console.log('❌ Message processing failed:', data.error);
      return null;
    }
  } catch (error) {
    console.log('❌ Error processing message:', error.message);
    return null;
  }
}

// Test trip query
async function testTripQuery() {
  console.log('🔍 Testing trip information query...');

  try {
    const response = await fetch(`${MCP_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MCP_AUTH_KEY}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'query_trip_info',
          arguments: {
            client_name: 'Thompson'
          }
        }
      })
    });

    const data = await response.json();

    if (data.result) {
      const result = JSON.parse(data.result.content[0].text);
      console.log('✅ Trip query successful');
      console.log(`   Found ${result.length} trips`);

      if (result.length > 0) {
        console.log(`   First trip: ${result[0].client_name} - ${result[0].destination}`);
      }

      return result;
    } else {
      console.log('❌ Trip query failed:', data.error);
      return null;
    }
  } catch (error) {
    console.log('❌ Error querying trip:', error.message);
    return null;
  }
}

// Test response sending
async function testResponseSending() {
  console.log('📤 Testing mobile response sending...');

  try {
    const response = await fetch(`${MCP_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MCP_AUTH_KEY}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'send_mobile_response',
          arguments: {
            platform: 'telegram',
            recipient_id: '12345',
            message: 'This is a test response from the mobile interaction MCP',
            message_type: 'text'
          }
        }
      })
    });

    const data = await response.json();

    if (data.result) {
      const result = JSON.parse(data.result.content[0].text);
      console.log('✅ Response sending successful');
      console.log(`   Status: ${result.status}`);
      console.log(`   Platform: ${result.platform}`);

      return result;
    } else {
      console.log('❌ Response sending failed:', data.error);
      return null;
    }
  } catch (error) {
    console.log('❌ Error sending response:', error.message);
    return null;
  }
}

// Test webhook endpoints
async function testWebhookEndpoints() {
  console.log('🌐 Testing webhook endpoints...');

  // Test WhatsApp webhook verification
  try {
    const whatsappVerify = await fetch(`${MCP_URL}/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=${MCP_AUTH_KEY}&hub.challenge=test_challenge`);
    const challenge = await whatsappVerify.text();

    if (challenge === 'test_challenge') {
      console.log('✅ WhatsApp webhook verification working');
    } else {
      console.log('❌ WhatsApp webhook verification failed');
    }
  } catch (error) {
    console.log('❌ WhatsApp webhook test failed:', error.message);
  }

  // Test Telegram webhook
  try {
    const telegramResponse = await fetch(`${MCP_URL}/webhook/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          message_id: 123,
          date: Math.floor(Date.now() / 1000),
          chat: { id: 12345 },
          text: 'Test message'
        }
      })
    });

    if (telegramResponse.status === 200) {
      console.log('✅ Telegram webhook endpoint working');
    } else {
      console.log('❌ Telegram webhook endpoint failed');
    }
  } catch (error) {
    console.log('❌ Telegram webhook test failed:', error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Mobile Interaction MCP Test Suite\n');

  // Test MCP connection first
  const isConnected = await testMCPConnection();
  if (!isConnected) {
    console.log('⛔ Cannot proceed with tests - MCP server not available');
    return;
  }

  // Test message processing for each platform
  for (const message of testMessages) {
    await testMessageProcessing(message);
    console.log(''); // Add spacing
  }

  // Test database queries
  await testTripQuery();
  console.log('');

  // Test response sending
  await testResponseSending();
  console.log('');

  // Test webhook endpoints
  await testWebhookEndpoints();
  console.log('');

  console.log('✨ Test suite completed!');
  console.log('\n💡 Next steps:');
  console.log('   1. Deploy to Cloudflare Workers');
  console.log('   2. Configure platform webhooks');
  console.log('   3. Set up environment variables');
  console.log('   4. Test with real mobile messages');
}

// Run the tests
runTests().catch(console.error);

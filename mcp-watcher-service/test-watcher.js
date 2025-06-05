const { EnhancedMCPUseBridge } = require('./dist/mcp-use-bridge');

async function testWatcherService() {
  console.log('🧪 Testing MCP Watcher Service...');

  const bridge = new EnhancedMCPUseBridge();

  try {
    // Initialize the bridge
    await bridge.initialize();

    // Test 1: Check health status
    console.log('\n1️⃣ Testing health status...');
    const health = await bridge.getHealthStatus();
    console.log('Health Status:', JSON.stringify(health, null, 2));

    // Test 2: Test data integrity diagnosis
    console.log('\n2️⃣ Testing data integrity diagnosis...');
    try {
      const diagnosis = await bridge.diagnoseDataIntegrity('Chisholm');
      console.log('Diagnosis Result:', JSON.stringify(diagnosis, null, 2));
    } catch (error) {
      console.log('Diagnosis failed (expected if no data):', error.message);
    }

    // Test 3: Test a simple operation with retry
    console.log('\n3️⃣ Testing tool execution with retry...');
    try {
      const result = await bridge.executeTool('d1-database', 'search_clients', {
        client_name: 'Chisholm'
      });
      console.log('Search Result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.log('Tool execution failed:', error.message);
    }

    console.log('\n✅ Watcher service test completed');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await bridge.shutdown();
  }
}

async function testChunkedOperation() {
  console.log('\n🧪 Testing chunked operations...');

  const bridge = new EnhancedMCPUseBridge();

  try {
    await bridge.initialize();

    // Test chunked client search
    const result = await bridge.executeChunkedOperation(
      'd1-database',
      'search_clients',
      { client_name: 'test' },
      5 // chunk size
    );

    console.log('Chunked result:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Chunked operation test failed:', error);
  } finally {
    await bridge.shutdown();
  }
}

// Run tests
if (require.main === module) {
  const testType = process.argv[2] || 'basic';

  if (testType === 'chunked') {
    testChunkedOperation().catch(console.error);
  } else {
    testWatcherService().catch(console.error);
  }
}

#!/usr/bin/env node

import { MCPWatcherService } from './watcher-service';
import { getConfig } from './config';
import { ClaudeConfigParser } from './claude-config-parser';

const args = process.argv.slice(2);
const command = args[0];

async function showStatus() {
  const config = await getConfig();
  const watcher = new MCPWatcherService(config);
  await watcher.start();

  const statuses = watcher.getServerStatus() as any[];

  console.log('\n📊 MCP Server Status:');
  console.log('━'.repeat(80));

  for (const status of statuses) {
    const statusEmoji = status.status === 'healthy' ? '✅' :
                       status.status === 'degraded' ? '⚠️' : '❌';

    console.log(`${statusEmoji} ${status.name.padEnd(20)} ${status.status.padEnd(10)} ${status.responseTime ? status.responseTime + 'ms' : 'N/A'}`);

    if (status.error) {
      console.log(`   └─ Error: ${status.error}`);
    }
  }

  await watcher.stop();
}

async function testOperation() {
  const serverName = args[1];
  const operation = args[2];
  const payload = args[3] ? JSON.parse(args[3]) : {};

  if (!serverName || !operation) {
    console.error('Usage: npm run cli test <server-name> <operation> [payload-json]');
    process.exit(1);
  }

  const config = await getConfig();
  const watcher = new MCPWatcherService(config);
  await watcher.start();

  try {
    console.log(`🔄 Testing ${serverName}.${operation}...`);
    const result = await watcher.executeWithRetry(serverName, operation, payload);
    console.log('✅ Success:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Failed:', error instanceof Error ? error.message : error);
  }

  await watcher.stop();
}

async function diagnoseData() {
  const clientName = args[1]; // optional client name filter

  const { EnhancedMCPUseBridge } = await import('./mcp-use-bridge');
  const bridge = new EnhancedMCPUseBridge();

  try {
    await bridge.initialize();

    console.log(`🔍 Running data integrity diagnosis...`);
    const diagnosis = await bridge.diagnoseDataIntegrity(clientName);

    console.log('\n📋 Full Analysis:');
    console.log(JSON.stringify(diagnosis, null, 2));

  } catch (error) {
    console.error('❌ Diagnosis failed:', error instanceof Error ? error.message : error);
  } finally {
    await bridge.shutdown();
  }
}

async function showHelp() {
  console.log(`
🔍 MCP Watcher Service CLI

Commands:
  status                                Show status of all MCP servers
  test <server> <operation> [payload]   Test an operation with retry logic
  diagnose [client-name]                Run data integrity analysis (optionally for specific client)
  help                                  Show this help message

Examples:
  npm run cli status
  npm run cli test d1-database search_clients '{"client_name": "Chisholm"}'
  npm run cli test amadeus-api search_hotels '{"city": "Paris", "check_in": "2024-12-01", "check_out": "2024-12-05"}'
  npm run cli diagnose
  npm run cli diagnose Chisholm
`);
}

async function showConfig() {
  try {
    console.log('\n📋 MCP Watcher Configuration:');
    console.log('━'.repeat(80));

    const parser = new ClaudeConfigParser();
    const summary = await parser.getConfigSummary();

    console.log(`🔗 Config Source: ${summary.configPath}`);
    console.log(`📅 Last Modified: ${summary.lastModified.toLocaleString()}`);
    console.log(`🖥️  Server Count: ${summary.serverCount}`);
    console.log('');

    console.log('📋 Configured Servers:');
    summary.servers.forEach((server, index) => {
      console.log(`   ${index + 1}. ${server}`);
    });

    console.log('');
    const config = await getConfig();
    console.log('⚙️  Watcher Settings:');
    console.log(`   • Health Check Interval: ${config.healthCheck.interval}ms`);
    console.log(`   • Health Check Timeout: ${config.healthCheck.timeout}ms`);
    console.log(`   • Auto-Sync Enabled: ${config.autoSync.enabled ? '✅' : '❌'}`);
    console.log(`   • Database Path: ${config.database.path}`);
    console.log(`   • Log Level: ${config.logging.level}`);
    
  } catch (error) {
    console.error('❌ Failed to load configuration:', error);
    process.exit(1);
  }
}

async function main() {
  switch (command) {
    case 'status':
      await showStatus();
      break;
    case 'test':
      await testOperation();
      break;
    case 'diagnose':
      await diagnoseData();
      break;
    case 'config':
      await showConfig();
      break;
    case 'help':
    case undefined:
      await showHelp();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      await showHelp();
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

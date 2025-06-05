#!/usr/bin/env node

import { MCPWatcherService } from './watcher-service';
import { WebDashboard } from './web-dashboard';

async function main() {
  console.log('🔍 Starting MCP Watcher Service...');
  console.log('📋 Configuration will be loaded from Claude Desktop config');

  const watcher = new MCPWatcherService(); // No config - will load dynamically
  const dashboard = new WebDashboard(watcher, 8888);

  try {
    await watcher.start();
    console.log('✅ MCP Watcher Service started successfully');

    await dashboard.start();
    console.log('🌐 Web dashboard available at http://localhost:8888');

    // Handle graceful shutdown
    const shutdown = async () => {
      console.log('\n🛑 Shutting down MCP Watcher Service...');
      await dashboard.stop();
      await watcher.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error('❌ Failed to start MCP Watcher Service:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

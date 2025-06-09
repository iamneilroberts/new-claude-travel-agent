#!/usr/bin/env node

// Test MetaMCP by copying its config to Claude Desktop and testing connectivity
const fs = require('fs');
const path = require('path');

const claudeConfigPath = '/home/neil/.config/Claude/claude_desktop_config.json';
const metamcpConfigPath = './claude_desktop_config_metamcp.json';
const originalConfigPath = '/home/neil/dev/new-claude-travel-agent/config/claude_desktop_config_pure_mcp.json';

async function backupAndReplaceConfig() {
  try {
    // Backup current config
    const currentConfig = fs.readFileSync(claudeConfigPath, 'utf8');
    fs.writeFileSync(claudeConfigPath + '.backup', currentConfig);
    console.log('✅ Backed up current Claude config');
    
    // Copy MetaMCP config
    const metamcpConfig = fs.readFileSync(metamcpConfigPath, 'utf8');
    fs.writeFileSync(claudeConfigPath, metamcpConfig);
    console.log('✅ Installed MetaMCP config for Claude Desktop');
    
    console.log('\n🔄 Restart Claude Desktop to test MetaMCP');
    console.log('💡 Then test with a simple MCP command in Claude Desktop');
    console.log('\n📋 To restore original config:');
    console.log(`   cp "${claudeConfigPath}.backup" "${claudeConfigPath}"`);
    
  } catch (error) {
    console.error('❌ Error configuring Claude Desktop:', error.message);
  }
}

async function restoreOriginalConfig() {
  try {
    const originalConfig = fs.readFileSync(originalConfigPath, 'utf8');
    fs.writeFileSync(claudeConfigPath, originalConfig);
    console.log('✅ Restored original MCP config');
  } catch (error) {
    console.error('❌ Error restoring config:', error.message);
  }
}

const command = process.argv[2];

if (command === 'install') {
  backupAndReplaceConfig();
} else if (command === 'restore') {
  restoreOriginalConfig();
} else {
  console.log('Usage:');
  console.log('  node test-metamcp-claude.js install  - Install MetaMCP config');
  console.log('  node test-metamcp-claude.js restore  - Restore original config');
}
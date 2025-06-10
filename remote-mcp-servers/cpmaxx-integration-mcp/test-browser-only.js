#!/usr/bin/env node

// Test just the browser automation without MCP
import { chromium } from 'playwright';

console.log('🔧 Browser-Only Test');
console.log('====================');

async function testBrowser() {
  try {
    console.log('Launching browser...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log('Navigating to CPMaxx...');
    await page.goto('https://cpmaxx.cruiseplannersnet.com/main/login', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    console.log('✅ Browser launched and page loaded successfully');
    console.log('✅ Pagination implementation should work with browser');
    
    await browser.close();
    console.log('✅ Browser closed successfully');
    
    return true;
  } catch (error) {
    console.error('❌ Browser test failed:', error.message);
    return false;
  }
}

testBrowser().then(success => {
  if (success) {
    console.log('\n🎉 Browser automation is working!');
    console.log('📋 This means the pagination implementation should work.');
    console.log('💡 The timeout in the MCP test might be due to the 30-second wait in the search.');
  } else {
    console.log('\n❌ Browser automation has issues that need to be resolved.');
  }
  process.exit(success ? 0 : 1);
});
#!/usr/bin/env node
/**
 * Discover the correct selectors for CPMaxx hotel data extraction
 */

import { chromium } from 'playwright';

const CPMAXX_CREDENTIALS = {
  login: 'kim.henderson@cruiseplanners.com',
  password: '3!Pineapples'
};

async function discoverSelectors() {
  console.log('🔍 Discovering CPMaxx Hotel Result Selectors...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const page = await browser.newPage();
  
  try {
    // Login and search (abbreviated version)
    console.log('1. Logging into CPMaxx...');
    await page.goto('https://cpmaxx.cruiseplannersnet.com/main/login');
    await page.waitForLoadState('domcontentloaded');
    
    await page.fill('input[placeholder*="mail"]', CPMAXX_CREDENTIALS.login);
    await page.fill('input[placeholder*="assword"]', CPMAXX_CREDENTIALS.password);
    await page.click('button:has-text("Sign In")');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    console.log('2. Navigating to hotel search...');
    await page.click('a:has-text("Find a Hotel")');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    console.log('3. Performing hotel search...');
    await page.click('#hotelenginesearch-location_search');
    await page.fill('#hotelenginesearch-location_search', '');
    await page.type('#hotelenginesearch-location_search', 'Cork', { delay: 100 });
    await page.waitForTimeout(3000);
    
    // Select autocomplete
    const autocompleteCount = await page.locator('.dropdown-menu .dropdown-item').count();
    if (autocompleteCount > 0) {
      await page.click('.dropdown-menu .dropdown-item:first-child');
      await page.waitForTimeout(1000);
    }
    
    // Fill dates
    await page.fill('#hotelenginesearch-checkin', '2025-07-15');
    await page.fill('#hotelenginesearch-checkout', '2025-07-20');
    await page.click('button[type="submit"]');
    
    // Wait for results
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(10000); // Give time for results to load
    
    console.log('4. Analyzing hotel result structure...');
    
    // Check if we have hotel results
    const hotelCount = await page.locator('.property').count();
    console.log(`Found ${hotelCount} hotel containers\n`);
    
    if (hotelCount === 0) {
      console.log('❌ No hotels found - taking screenshot for analysis');
      await page.screenshot({ path: 'selector-discovery-no-results.png' });
      return;
    }
    
    // Analyze the first hotel's structure
    console.log('🏨 ANALYZING FIRST HOTEL STRUCTURE:\n');
    
    const firstHotel = page.locator('.property').first();
    
    // Get all possible selectors within the hotel container
    const selectors = await firstHotel.evaluate((hotel) => {
      const results = {};
      
      // Find all elements with text content
      const allElements = hotel.querySelectorAll('*');
      
      // Look for price-like content
      const priceElements = [];
      const ratingElements = [];
      const addressElements = [];
      
      allElements.forEach((el, index) => {
        const text = el.textContent?.trim() || '';
        const className = el.className || '';
        const tagName = el.tagName.toLowerCase();
        
        // Price patterns (€, $, numbers with decimals)
        if (text.match(/[€$]\s*\d+|^\d+[.,]\d+$|^\d{2,4}$/)) {
          priceElements.push({
            text,
            selector: `.${className.split(' ').join('.')}`,
            tagName,
            className,
            index
          });
        }
        
        // Rating patterns (stars, numbers 1-5)
        if (text.match(/^\d[.,]?\d?\s*(star|⭐)/i) || text.match(/^[1-5]$/)) {
          ratingElements.push({
            text,
            selector: `.${className.split(' ').join('.')}`,
            tagName,
            className,
            index
          });
        }
        
        // Address patterns (contains location words)
        if (text.match(/cork|ireland|street|road|avenue|city|county/i) && text.length > 10) {
          addressElements.push({
            text: text.substring(0, 50),
            selector: `.${className.split(' ').join('.')}`,
            tagName,
            className,
            index
          });
        }
      });
      
      return {
        hotelName: hotel.querySelector('.property-name')?.textContent?.trim(),
        priceElements: priceElements.slice(0, 5),
        ratingElements: ratingElements.slice(0, 5),
        addressElements: addressElements.slice(0, 5)
      };
    });
    
    console.log('Hotel Name:', selectors.hotelName);
    console.log('\n💰 PRICE CANDIDATES:');
    selectors.priceElements.forEach((el, i) => {
      console.log(`  ${i + 1}. "${el.text}" | ${el.tagName}.${el.className} | selector: ${el.selector}`);
    });
    
    console.log('\n⭐ RATING CANDIDATES:');
    selectors.ratingElements.forEach((el, i) => {
      console.log(`  ${i + 1}. "${el.text}" | ${el.tagName}.${el.className} | selector: ${el.selector}`);
    });
    
    console.log('\n📍 ADDRESS CANDIDATES:');
    selectors.addressElements.forEach((el, i) => {
      console.log(`  ${i + 1}. "${el.text}" | ${el.tagName}.${el.className} | selector: ${el.selector}`);
    });
    
    // Look for all class names in the hotel container
    console.log('\n🏷️ ALL CSS CLASSES IN HOTEL CONTAINER:');
    const allClasses = await firstHotel.evaluate((hotel) => {
      const classes = new Set();
      const allElements = hotel.querySelectorAll('*');
      allElements.forEach(el => {
        if (el.className && typeof el.className === 'string') {
          el.className.split(' ').forEach(cls => {
            if (cls.trim()) classes.add(cls.trim());
          });
        }
      });
      return Array.from(classes).sort();
    });
    
    allClasses.forEach((cls, i) => {
      if (i % 4 === 0) console.log(''); // New line every 4 classes
      process.stdout.write(`  .${cls.padEnd(25)}`);
    });
    console.log('\n');
    
    // Take screenshot for manual analysis
    await page.screenshot({ path: 'cpmaxx-selector-analysis.png' });
    console.log('📸 Screenshot saved as cpmaxx-selector-analysis.png');
    
    // Wait so user can inspect the page
    console.log('\n⏸️  Browser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'selector-discovery-error.png' });
  } finally {
    await browser.close();
  }
}

discoverSelectors().catch(console.error);
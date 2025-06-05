#!/usr/bin/env node
/**
 * Simple test to understand the actual DOM structure after organic results load
 */

import { chromium } from 'playwright';

console.log('🔍 CPMaxx DOM Structure Analysis');
console.log('================================');

const CPMAXX_CONFIG = {
  loginUrl: 'https://cpmaxx.cruiseplannersnet.com/main/login',
  credentials: {
    login: process.env.CPMAXX_LOGIN || 'kim.henderson@cruiseplanners.com',
    password: process.env.CPMAXX_PASSWORD || '3!Pineapples'
  }
};

async function analyzeDOMStructure() {
  const browser = await chromium.launch({ 
    headless: false, // Show browser for debugging
    timeout: 60000 
  });
  
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });
  
  try {
    console.log('1. Navigating to CPMaxx login...');
    await page.goto(CPMAXX_CONFIG.loginUrl, { waitUntil: 'domcontentloaded' });
    
    console.log('2. Logging in...');
    await page.fill('input[placeholder*="mail"]', CPMAXX_CONFIG.credentials.login);
    await page.fill('input[placeholder*="assword"]', CPMAXX_CONFIG.credentials.password);
    await page.click('button:has-text("Sign In")');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    console.log('3. Navigating to hotel search...');
    await page.click('text="Find a Hotel"');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    console.log('4. Filling search form...');
    await page.click('#hotelenginesearch-location_search');
    await page.fill('#hotelenginesearch-location_search', '');
    await page.type('#hotelenginesearch-location_search', 'Cork', { delay: 100 });
    await page.waitForTimeout(3000);
    
    // Handle autocomplete
    const autocompleteCount = await page.locator('.dropdown-menu .dropdown-item').count();
    if (autocompleteCount > 0) {
      await page.click('.dropdown-menu .dropdown-item:first-child');
      await page.waitForTimeout(1000);
    }
    
    await page.fill('#hotelenginesearch-checkin', '2025-06-10');
    await page.fill('#hotelenginesearch-checkout', '2025-06-11');
    await page.selectOption('#hotelenginesearch-num_rooms', '1');
    await page.selectOption('#hotelenginesearch-rooms-1-num_adults', '2');
    
    console.log('5. Submitting search...');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('domcontentloaded');
    
    console.log('6. Waiting and analyzing DOM structure...');
    
    // Wait in stages and analyze
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(10000); // Wait 10 seconds between checks
      
      console.log(`\n--- Analysis after ${(i + 1) * 10} seconds ---`);
      
      // Count different types of elements
      const analysis = await page.evaluate(() => {
        return {
          propertyResults: document.querySelectorAll('.property.result').length,
          propertyElements: document.querySelectorAll('.property').length,
          propertyNames: document.querySelectorAll('.property-name').length,
          featuredHotels: document.querySelectorAll('[data-featured="1"]').length,
          checkboxes: document.querySelectorAll('.he-hotel-comparison').length,
          hotelImages: document.querySelectorAll('.property-hotel-image').length,
          
          // Get sample of actual hotel names found
          sampleNames: Array.from(document.querySelectorAll('.property-name'))
            .slice(0, 5)
            .map(el => el.textContent?.trim())
            .filter(Boolean),
            
          // Check for other possible hotel containers
          divElements: document.querySelectorAll('div').length,
          hotelContainers: document.querySelectorAll('[class*="hotel"]').length,
          resultContainers: document.querySelectorAll('[class*="result"]').length,
          
          // Look for data attributes that might indicate hotels
          dataElements: Array.from(document.querySelectorAll('[data-name]'))
            .slice(0, 10)
            .map(el => ({
              dataName: el.getAttribute('data-name'),
              dataPrice: el.getAttribute('data-total-stay'),
              className: el.className
            }))
        };
      });
      
      console.log(`Property.result elements: ${analysis.propertyResults}`);
      console.log(`Property elements total: ${analysis.propertyElements}`);
      console.log(`Property-name elements: ${analysis.propertyNames}`);
      console.log(`Featured hotels: ${analysis.featuredHotels}`);
      console.log(`Hotel checkboxes: ${analysis.checkboxes}`);
      console.log(`Hotel images: ${analysis.hotelImages}`);
      console.log(`Sample hotel names: ${analysis.sampleNames.join(', ')}`);
      
      if (analysis.dataElements.length > 0) {
        console.log('Hotels with data attributes:');
        analysis.dataElements.forEach((hotel, i) => {
          if (hotel.dataName) {
            console.log(`  ${i + 1}. ${hotel.dataName} - $${hotel.dataPrice}`);
          }
        });
      }
      
      // If we found organic results, break early
      if (analysis.propertyResults > 2) {
        console.log(`✅ Found ${analysis.propertyResults} hotels - analyzing structure...`);
        break;
      }
    }
    
    // Final detailed analysis
    console.log('\n--- FINAL DETAILED ANALYSIS ---');
    
    const detailedAnalysis = await page.evaluate(() => {
      const propertyResults = Array.from(document.querySelectorAll('.property.result'));
      
      return propertyResults.map((hotel, index) => {
        const nameEl = hotel.querySelector('.property-name');
        const checkbox = hotel.querySelector('input[data-name]');
        const hasDataAttributes = !!checkbox;
        
        return {
          index: index + 1,
          hasPropertyName: !!nameEl,
          propertyNameText: nameEl?.textContent?.trim() || 'NOT FOUND',
          hasDataAttributes,
          dataName: checkbox?.getAttribute('data-name') || 'NOT FOUND',
          dataPrice: checkbox?.getAttribute('data-total-stay') || 'NOT FOUND',
          className: hotel.className,
          innerHTML: hotel.innerHTML.substring(0, 300) + '...'
        };
      });
    });
    
    console.log('\nDetailed hotel structure:');
    detailedAnalysis.forEach(hotel => {
      console.log(`\nHotel ${hotel.index}:`);
      console.log(`  Property name element: ${hotel.hasPropertyName ? hotel.propertyNameText : 'MISSING'}`);
      console.log(`  Data attributes: ${hotel.hasDataAttributes ? `${hotel.dataName} ($${hotel.dataPrice})` : 'MISSING'}`);
      console.log(`  Class: ${hotel.className}`);
    });
    
    // Save final DOM
    const htmlContent = await page.content();
    require('fs').writeFileSync('debug-final-dom.html', htmlContent);
    console.log('\n📄 Final DOM saved to: debug-final-dom.html');
    
    console.log('\n🎯 CONCLUSION: Now we understand the real DOM structure!');
    
  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
  } finally {
    await browser.close();
  }
}

analyzeDOMStructure();
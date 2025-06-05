/**
 * CPMaxx Photo Discovery Test
 * Tests photo URL extraction capabilities on the real CPMaxx portal
 */

import { chromium } from 'playwright';

const CPMAXX_CREDENTIALS = {
  login: 'kim.henderson@cruiseplanners.com',
  password: '3!Pineapples'
};

const CPMAXX_SELECTORS = {
  login: {
    emailInput: 'input[placeholder="Enter email address"]',
    passwordInput: 'input[placeholder="Enter password"]',
    loginButton: 'button:has-text("Sign In To CP | Central")',
    keepLoggedInCheckbox: 'input[type="checkbox"]'
  },
  navigation: {
    researchHub: 'a:has-text("Research Hub")',
    findHotelLink: 'a:has-text("Find a Hotel")'
  },
  hotelForm: {
    locationInput: '#hotelenginesearch-location_search',
    checkInDate: '#hotelenginesearch-checkin',
    checkOutDate: '#hotelenginesearch-checkout',
    numRooms: '#hotelenginesearch-num_rooms',
    adultsPerRoom: '#hotelenginesearch-rooms-1-num_adults',
    childrenPerRoom: '#hotelenginesearch-rooms-1-num_children',
    submitButton: 'button[type="submit"]'
  },
  results: {
    hotelContainer: '.property',
    hotelImage: '.property-hotel-image.ajax-image-gallery',
    hotelName: '.property-name',
    photoGallery: '.ajax-image-gallery',
    photoData: '[data-background-image]',
    giataId: '[data-giata-id]'
  }
};

async function testPhotoDiscovery() {
  console.log('🔍 Starting CPMaxx Photo Discovery Test...\n');
  
  const browser = await chromium.launch({ 
    headless: false,  // Make visible for debugging
    slowMo: 1000      // Slow down for observation
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  try {
    // Step 1: Login to CPMaxx
    console.log('Step 1: Navigating to CPMaxx login...');
    await page.goto('https://cpmaxx.cruiseplannersnet.com/main/login');
    await page.waitForLoadState('networkidle');
    
    console.log('Step 2: Filling login credentials...');
    await page.fill(CPMAXX_SELECTORS.login.emailInput, CPMAXX_CREDENTIALS.login);
    await page.fill(CPMAXX_SELECTORS.login.passwordInput, CPMAXX_CREDENTIALS.password);
    
    // Click login button
    await page.click(CPMAXX_SELECTORS.login.loginButton);
    console.log('Waiting for login to complete...');
    
    // Wait for navigation after login - be more flexible about the wait
    try {
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    } catch (e) {
      console.log('Network idle timeout, checking current URL...');
    }
    
    const postLoginUrl = page.url();
    console.log(`Post-login URL: ${postLoginUrl}`);
    
    // Take screenshot to see current state
    await page.screenshot({ path: 'cpmaxx-post-login.png' });
    
    console.log('Step 3: Looking for Research Hub...');
    
    // Wait for the page to load and look for Research Hub link
    await page.waitForTimeout(3000);
    
    // Check if Research Hub link exists
    const researchHubExists = await page.locator(CPMAXX_SELECTORS.navigation.researchHub).count() > 0;
    console.log(`Research Hub link found: ${researchHubExists}`);
    
    if (!researchHubExists) {
      // Try alternative selectors
      const alternativeSelectors = [
        'a:has-text("Research")',
        'a[href*="research"]',
        'a[href*="hub"]',
        '.nav a:has-text("Research")'
      ];
      
      for (let selector of alternativeSelectors) {
        const exists = await page.locator(selector).count() > 0;
        console.log(`Alternative selector ${selector}: ${exists}`);
        if (exists) {
          const href = await page.locator(selector).first().getAttribute('href');
          const text = await page.locator(selector).first().textContent();
          console.log(`  - href: ${href}, text: "${text}"`);
        }
      }
      
      // List all navigation links
      const navLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links.slice(0, 20).map(link => ({
          text: link.textContent?.trim(),
          href: link.href
        })).filter(link => link.text && link.text.length > 0);
      });
      
      console.log('Available navigation links:');
      navLinks.forEach((link, i) => {
        console.log(`  ${i + 1}. "${link.text}" -> ${link.href}`);
      });
      
      return; // Exit early to analyze the page
    }
    
    // Skip Research Hub and go directly to Find a Hotel from shortcuts
    console.log('Step 3: Clicking "Find a Hotel" from shortcuts...');
    
    // Look for "Find a Hotel" link in shortcuts
    const findHotelShortcut = await page.locator('a:has-text("Find a Hotel")').count() > 0;
    console.log(`Find a Hotel shortcut found: ${findHotelShortcut}`);
    
    if (findHotelShortcut) {
      await page.click('a:has-text("Find a Hotel")');
    } else {
      // Fallback to Research Hub approach
      await page.click(CPMAXX_SELECTORS.navigation.researchHub);
      await page.waitForTimeout(3000);
      await page.click(CPMAXX_SELECTORS.navigation.findHotelLink);
    }
    
    console.log('Waiting for Hotel Engine to load...');
    await page.waitForTimeout(5000); // Give it time to load
    
    // Step 5: Perform a hotel search
    console.log('Step 5: Performing hotel search for Cork, Ireland...');
    
    // Fill location and handle autocomplete properly
    console.log('Filling location field...');
    await page.click(CPMAXX_SELECTORS.hotelForm.locationInput); // Click to focus
    await page.fill(CPMAXX_SELECTORS.hotelForm.locationInput, ''); // Clear first
    await page.type(CPMAXX_SELECTORS.hotelForm.locationInput, 'Cork', { delay: 100 }); // Type slowly
    await page.waitForTimeout(3000); // Wait longer for autocomplete to appear
    
    // Take screenshot to see autocomplete state
    await page.screenshot({ path: 'cpmaxx-autocomplete.png' });
    
    // Look for various autocomplete patterns
    const autocompleteSelectors = [
      '.pac-container .pac-item', // Google Places autocomplete
      '.ui-menu-item', // jQuery UI autocomplete  
      '.dropdown-menu .dropdown-item', // Bootstrap dropdown
      '.autocomplete-suggestion', // Generic autocomplete
      '.location-suggestion', // Custom location suggestions
      '[role="option"]', // ARIA compliant options
      'li[data-value]', // Data attribute options
      '.typeahead-item' // Typeahead.js
    ];
    
    let autocompleteFound = false;
    let selectedSelector = '';
    
    for (let selector of autocompleteSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`Found ${count} autocomplete items with selector: ${selector}`);
        autocompleteFound = true;
        selectedSelector = selector;
        
        // Get text of available options
        const options = await page.locator(selector).allTextContents();
        console.log('Available autocomplete options:');
        options.slice(0, 5).forEach((option, i) => {
          console.log(`  ${i + 1}. "${option.trim()}"`);
        });
        
        break;
      }
    }
    
    if (autocompleteFound) {
      console.log(`Selecting first option from: ${selectedSelector}`);
      await page.click(`${selectedSelector}:first-child`);
      await page.waitForTimeout(1000);
      
      // Verify selection worked
      const selectedValue = await page.inputValue(CPMAXX_SELECTORS.hotelForm.locationInput);
      console.log(`Location after selection: "${selectedValue}"`);
    } else {
      console.log('No autocomplete dropdown found - checking all visible elements...');
      
      // Debug: Look for any clickable elements that might be autocomplete
      const clickableElements = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        return elements
          .filter(el => el.textContent?.toLowerCase().includes('cork'))
          .slice(0, 10)
          .map(el => ({
            tagName: el.tagName,
            className: el.className,
            text: el.textContent?.trim().substring(0, 50),
            clickable: el.onclick !== null || el.style.cursor === 'pointer'
          }));
      });
      
      console.log('Elements containing "cork":');
      clickableElements.forEach((el, i) => {
        console.log(`  ${i + 1}. ${el.tagName}.${el.className}: "${el.text}" (clickable: ${el.clickable})`);
      });
      
      // Try typing more characters to trigger autocomplete
      await page.type(CPMAXX_SELECTORS.hotelForm.locationInput, ', Ireland', { delay: 100 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'cpmaxx-autocomplete-full.png' });
    }
    
    // Set dates (2 weeks from now)
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 14);
    const checkOut = new Date();
    checkOut.setDate(checkOut.getDate() + 17);
    
    const checkInStr = checkIn.toISOString().split('T')[0];
    const checkOutStr = checkOut.toISOString().split('T')[0];
    
    console.log(`Setting dates: ${checkInStr} to ${checkOutStr}`);
    await page.fill(CPMAXX_SELECTORS.hotelForm.checkInDate, checkInStr);
    await page.fill(CPMAXX_SELECTORS.hotelForm.checkOutDate, checkOutStr);
    
    // Submit search
    console.log('Submitting hotel search...');
    await page.click(CPMAXX_SELECTORS.hotelForm.submitButton);
    console.log('Waiting for search processing...');
    
    // Wait for processing page first
    await page.waitForTimeout(3000);
    let currentUrl = page.url();
    console.log(`Processing URL: ${currentUrl}`);
    
    // If we're on a processing page, wait for it to redirect to results
    if (currentUrl.includes('processor') || currentUrl.includes('processing')) {
      console.log('Search is processing, waiting for results page...');
      
      // Wait for redirect to results page (with longer timeout)
      try {
        await page.waitForURL('**/searchResults/**', { timeout: 60000 });
        console.log('Successfully redirected to search results!');
      } catch (e) {
        console.log('Timeout waiting for results redirect, checking current state...');
      }
      
      currentUrl = page.url();
      console.log(`Final URL: ${currentUrl}`);
    }
    
    // Take screenshot of results page
    await page.screenshot({ path: 'cpmaxx-final-results.png' });
    
    // Give results more time to load
    await page.waitForTimeout(5000);
    
    // Step 6: Analyze photo discovery
    console.log('\\n🔍 PHOTO DISCOVERY ANALYSIS\\n');
    
    // Check if we're on results page
    const finalUrl = page.url();
    console.log(`Current URL: ${finalUrl}`);
    
    // Look for hotel containers
    const hotelContainers = await page.locator(CPMAXX_SELECTORS.results.hotelContainer).count();
    console.log(`Found ${hotelContainers} hotel containers`);
    
    if (hotelContainers === 0) {
      console.log('❌ No hotel results found - analyzing current page...');
      await page.screenshot({ path: 'cpmaxx-no-results.png' });
      
      // Check for error messages or form validation issues
      const errorMessages = await page.evaluate(() => {
        const errors = Array.from(document.querySelectorAll('.error, .alert, .warning, .validation-error'));
        return errors.map(el => el.textContent?.trim()).filter(text => text && text.length > 0);
      });
      
      if (errorMessages.length > 0) {
        console.log('Error messages found:');
        errorMessages.forEach(msg => console.log(`  - ${msg}`));
      }
      
      // Check form field values to see what was actually submitted
      const formValues = await page.evaluate(() => {
        const location = document.querySelector('#hotelenginesearch-location_search')?.value;
        const checkin = document.querySelector('#hotelenginesearch-checkin')?.value;
        const checkout = document.querySelector('#hotelenginesearch-checkout')?.value;
        return { location, checkin, checkout };
      });
      
      console.log('Form values at submission:');
      console.log(`  Location: "${formValues.location}"`);
      console.log(`  Check-in: "${formValues.checkin}"`);
      console.log(`  Check-out: "${formValues.checkout}"`);
      
      // Look for any loading indicators or messages
      const pageText = await page.evaluate(() => document.body.textContent?.substring(0, 500));
      console.log('Page content preview:', pageText);
      
      // Since the autocomplete worked, this may be a timing or selector issue
      console.log('\\nAutocomplete worked, so search should have succeeded.');
      console.log('This may be a timing issue or different results page structure.');
      return;
    }
    
    // Analyze first few hotels
    for (let i = 0; i < Math.min(3, hotelContainers); i++) {
      console.log(`\\n--- Hotel ${i + 1} Photo Analysis ---`);
      
      const hotelContainer = page.locator(CPMAXX_SELECTORS.results.hotelContainer).nth(i);
      
      // Get hotel name
      const hotelName = await hotelContainer.locator(CPMAXX_SELECTORS.results.hotelName).textContent() || 'Unknown Hotel';
      console.log(`Hotel: ${hotelName.trim()}`);
      
      // Check for photo gallery elements
      const hasGallery = await hotelContainer.locator(CPMAXX_SELECTORS.results.photoGallery).count() > 0;
      console.log(`Has photo gallery: ${hasGallery}`);
      
      // Check for data-background-image attributes
      const backgroundImages = await hotelContainer.locator(CPMAXX_SELECTORS.results.photoData).count();
      console.log(`Elements with data-background-image: ${backgroundImages}`);
      
      if (backgroundImages > 0) {
        const bgImageUrl = await hotelContainer.locator(CPMAXX_SELECTORS.results.photoData).first().getAttribute('data-background-image');
        console.log(`Sample background image URL: ${bgImageUrl}`);
      }
      
      // Check for Giata ID
      const giataElements = await hotelContainer.locator(CPMAXX_SELECTORS.results.giataId).count();
      console.log(`Elements with Giata ID: ${giataElements}`);
      
      if (giataElements > 0) {
        const giataId = await hotelContainer.locator(CPMAXX_SELECTORS.results.giataId).first().getAttribute('data-giata-id');
        console.log(`Giata ID: ${giataId}`);
      }
      
      // Look for any img tags within the container
      const imgTags = await hotelContainer.locator('img').count();
      console.log(`IMG tags found: ${imgTags}`);
      
      if (imgTags > 0) {
        const imgSrc = await hotelContainer.locator('img').first().getAttribute('src');
        console.log(`Sample img src: ${imgSrc}`);
      }
      
      // Test clicking on photo gallery if it exists
      if (hasGallery) {
        console.log('Testing gallery click...');
        try {
          await hotelContainer.locator(CPMAXX_SELECTORS.results.photoGallery).first().click();
          await page.waitForTimeout(2000); // Wait for gallery to load
          
          // Check if any modal or overlay appeared
          const modalExists = await page.locator('[role="dialog"], .modal, .gallery-overlay, .photo-modal').count() > 0;
          console.log(`Gallery modal opened: ${modalExists}`);
          
          if (modalExists) {
            // Look for additional photos in the modal
            const modalImages = await page.locator('[role="dialog"] img, .modal img, .gallery-overlay img').count();
            console.log(`Photos in modal: ${modalImages}`);
            
            // Close modal
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);
          }
        } catch (error) {
          console.log(`Gallery click failed: ${error.message}`);
        }
      }
    }
    
    // Take a screenshot of the results page
    await page.screenshot({ path: 'cpmaxx-search-results.png' });
    console.log('\\n📸 Screenshot saved as cpmaxx-search-results.png');
    
    // Step 7: Test different selectors
    console.log('\\n🔧 TESTING ALTERNATIVE SELECTORS\\n');
    
    // Try to find all images on the page
    const allImages = await page.locator('img').count();
    console.log(`Total IMG tags on page: ${allImages}`);
    
    // Look for any elements with background images
    const elementsWithBg = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const withBackground = [];
      
      for (let element of elements) {
        const style = window.getComputedStyle(element);
        if (style.backgroundImage && style.backgroundImage !== 'none') {
          withBackground.push({
            tagName: element.tagName,
            className: element.className,
            backgroundImage: style.backgroundImage
          });
        }
      }
      return withBackground.slice(0, 10); // First 10 elements
    });
    
    console.log(`Elements with background images: ${elementsWithBg.length}`);
    elementsWithBg.forEach((el, i) => {
      console.log(`  ${i + 1}. ${el.tagName}.${el.className}: ${el.backgroundImage.substring(0, 100)}...`);
    });
    
    // Look for data attributes that might contain photo URLs
    const dataAttributes = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const dataAttrs = [];
      
      for (let element of elements) {
        for (let attr of element.attributes) {
          if (attr.name.startsWith('data-') && attr.value.includes('http')) {
            dataAttrs.push({
              selector: `${element.tagName}.${element.className}`,
              attribute: attr.name,
              value: attr.value.substring(0, 100)
            });
          }
        }
      }
      return dataAttrs.slice(0, 10);
    });
    
    console.log(`\\nData attributes with URLs: ${dataAttributes.length}`);
    dataAttributes.forEach((attr, i) => {
      console.log(`  ${i + 1}. ${attr.selector}[${attr.attribute}]: ${attr.value}...`);
    });
    
    console.log('\\n✅ Photo discovery test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'cpmaxx-error.png' });
  } finally {
    await browser.close();
  }
}

// Run the test
testPhotoDiscovery().catch(console.error);
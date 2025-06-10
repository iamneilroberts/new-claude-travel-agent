#!/usr/bin/env node
/**
 * Debug script to inspect CPMaxx login page structure
 * This will help us find the correct selectors
 */

import { chromium } from 'playwright';

async function debugCPMaxxLogin() {
    console.log('🔍 Debugging CPMaxx Login Page Structure...\n');

    const browser = await chromium.launch({ 
        headless: false, // Make it visible
        timeout: 30000 
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('🌐 Navigating to CPMaxx login page...');
        await page.goto('https://cpmaxx.cruiseplannersnet.com/main/login', {
            waitUntil: 'networkidle'
        });
        
        console.log('✅ Page loaded successfully');
        console.log('📄 Page title:', await page.title());
        console.log('🔗 Current URL:', page.url());
        
        // Wait a moment for any dynamic content
        await page.waitForTimeout(3000);
        
        // Look for various input types that could be the email field
        console.log('\n🔍 Searching for email input fields...');
        
        const emailSelectors = [
            'input[placeholder="Email"]',
            'input[type="email"]',
            'input[name="email"]',
            'input[id="email"]',
            '#email',
            '.email',
            'input[placeholder*="email" i]',
            'input[placeholder*="Email" i]',
            'input[name*="login"]',
            'input[name*="username"]',
            'input[type="text"]'
        ];
        
        for (const selector of emailSelectors) {
            try {
                const element = await page.$(selector);
                if (element) {
                    const placeholder = await element.getAttribute('placeholder');
                    const name = await element.getAttribute('name');
                    const id = await element.getAttribute('id');
                    const type = await element.getAttribute('type');
                    
                    console.log(`✅ Found: ${selector}`);
                    console.log(`   - placeholder: "${placeholder}"`);
                    console.log(`   - name: "${name}"`);
                    console.log(`   - id: "${id}"`);
                    console.log(`   - type: "${type}"`);
                    console.log('');
                }
            } catch (e) {
                // Selector not found, continue
            }
        }
        
        // Look for password fields
        console.log('🔍 Searching for password input fields...');
        
        const passwordSelectors = [
            'input[placeholder="Password"]',
            'input[type="password"]',
            'input[name="password"]',
            'input[id="password"]',
            '#password',
            '.password',
            'input[placeholder*="password" i]',
            'input[placeholder*="Password" i]'
        ];
        
        for (const selector of passwordSelectors) {
            try {
                const element = await page.$(selector);
                if (element) {
                    const placeholder = await element.getAttribute('placeholder');
                    const name = await element.getAttribute('name');
                    const id = await element.getAttribute('id');
                    
                    console.log(`✅ Found: ${selector}`);
                    console.log(`   - placeholder: "${placeholder}"`);
                    console.log(`   - name: "${name}"`);
                    console.log(`   - id: "${id}"`);
                    console.log('');
                }
            } catch (e) {
                // Selector not found, continue
            }
        }
        
        // Look for submit buttons
        console.log('🔍 Searching for submit buttons...');
        
        const buttonSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Sign In")',
            'button:has-text("Login")',
            'button:has-text("Sign In To CP")',
            '.submit-button',
            '.login-button',
            '.signin-button'
        ];
        
        for (const selector of buttonSelectors) {
            try {
                const element = await page.$(selector);
                if (element) {
                    const text = await element.textContent();
                    const value = await element.getAttribute('value');
                    const type = await element.getAttribute('type');
                    
                    console.log(`✅ Found: ${selector}`);
                    console.log(`   - text: "${text?.trim()}"`);
                    console.log(`   - value: "${value}"`);
                    console.log(`   - type: "${type}"`);
                    console.log('');
                }
            } catch (e) {
                // Selector not found, continue
            }
        }
        
        // Get all form elements for manual inspection
        console.log('📋 All form elements on page:');
        const formElements = await page.$$eval('form input, form button', elements => {
            return elements.map(el => ({
                tagName: el.tagName,
                type: el.type,
                name: el.name,
                id: el.id,
                placeholder: el.placeholder,
                className: el.className,
                textContent: el.textContent?.trim()
            }));
        });
        
        formElements.forEach((el, index) => {
            console.log(`${index + 1}. ${el.tagName}[type="${el.type}"]`);
            if (el.name) console.log(`   name: "${el.name}"`);
            if (el.id) console.log(`   id: "${el.id}"`);
            if (el.placeholder) console.log(`   placeholder: "${el.placeholder}"`);
            if (el.className) console.log(`   class: "${el.className}"`);
            if (el.textContent) console.log(`   text: "${el.textContent}"`);
            console.log('');
        });
        
        console.log('🖼️ Taking a screenshot for manual inspection...');
        await page.screenshot({ path: 'cpmaxx-login-debug.png', fullPage: true });
        console.log('✅ Screenshot saved as cpmaxx-login-debug.png');
        
        console.log('\n⏳ Browser will stay open for 30 seconds for manual inspection...');
        await page.waitForTimeout(30000);
        
    } catch (error) {
        console.error('❌ Error during debugging:', error.message);
    } finally {
        await browser.close();
        console.log('🧹 Browser closed');
    }
}

// Run the debug
debugCPMaxxLogin().catch(error => {
    console.error('❌ Debug failed:', error.message);
    process.exit(1);
});
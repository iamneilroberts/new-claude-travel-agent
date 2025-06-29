// Navigation Module for CPMaxx Integration
// Handles navigation between different sections of the CPMaxx portal

export interface NavigationConfig {
  baseUrl: string;
  timeout: number;
  debug: boolean;
}

export class CPMaxxNavigator {
  private config: NavigationConfig;

  constructor(config: NavigationConfig) {
    this.config = config;
  }

  private logWithTime(message: string): void {
    if (this.config.debug) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] CPMaxx Navigator: ${message}`);
    }
  }

  /**
   * Navigate to the main dashboard after login
   */
  async navigateToDashboard(page: any): Promise<void> {
    this.logWithTime('Navigating to main dashboard...');
    try {
      await page.goto(`${this.config.baseUrl}/main/dashboard`, { 
        waitUntil: 'networkidle', 
        timeout: this.config.timeout 
      });
      this.logWithTime('Successfully navigated to dashboard');
    } catch (error) {
      this.logWithTime(`Error navigating to dashboard: ${error}`);
      throw new Error(`Dashboard navigation failed: ${error}`);
    }
  }

  /**
   * Navigate to Research Hub (main hub for search tools)
   */
  async navigateToResearchHub(page: any): Promise<void> {
    this.logWithTime('Navigating to Research Hub...');
    try {
      await page.goto(`${this.config.baseUrl}/main/hub/research_hub`, { 
        waitUntil: 'networkidle', 
        timeout: this.config.timeout 
      });
      
      // Wait for the hub to fully load
      await page.waitForSelector('.research-hub-content, .hub-main', { timeout: 15000 });
      this.logWithTime('Successfully navigated to Research Hub');
    } catch (error) {
      this.logWithTime(`Error navigating to Research Hub: ${error}`);
      throw new Error(`Research Hub navigation failed: ${error}`);
    }
  }

  /**
   * Navigate from Research Hub to Hotel Engine
   */
  async navigateToHotelEngine(page: any): Promise<void> {
    this.logWithTime('Navigating to Hotel Engine...');
    try {
      // First ensure we're at the Research Hub
      await this.navigateToResearchHub(page);

      // Look for and click the "Find a Hotel" link
      const hotelLinkSelector = 'a:has-text("Find a Hotel")';
      await page.waitForSelector(hotelLinkSelector, { timeout: 15000 });
      await page.click(hotelLinkSelector);

      // Wait for the Hotel Engine page to load
      await page.waitForURL('**/HotelEngine**', { 
        waitUntil: 'networkidle', 
        timeout: this.config.timeout 
      });
      
      // Wait for the search form to be ready
      await page.waitForSelector('#hotelenginesearch-location_search, .hotel-search-form', { timeout: 15000 });
      this.logWithTime('Successfully navigated to Hotel Engine');
    } catch (error) {
      this.logWithTime(`Error navigating to Hotel Engine: ${error}`);
      throw new Error(`Hotel Engine navigation failed: ${error}`);
    }
  }

  /**
   * Navigate from Research Hub to Car Rental section
   */
  async navigateToCarRental(page: any): Promise<void> {
    this.logWithTime('Navigating to Car Rental section...');
    try {
      // First ensure we're at the Research Hub
      await this.navigateToResearchHub(page);

      // Look for and click the "Find a Car" link
      const carLinkSelector = 'a:has-text("Find a Car")';
      await page.waitForSelector(carLinkSelector, { timeout: 15000 });
      await page.click(carLinkSelector);

      // Wait for the Car Rental page to load
      await page.waitForURL('**/CarRental**', { 
        waitUntil: 'networkidle', 
        timeout: this.config.timeout 
      });
      
      // Wait for the car search form to be ready
      await page.waitForSelector('.car-search-form, #car-rental-form', { timeout: 15000 });
      this.logWithTime('Successfully navigated to Car Rental section');
    } catch (error) {
      this.logWithTime(`Error navigating to Car Rental: ${error}`);
      throw new Error(`Car Rental navigation failed: ${error}`);
    }
  }

  /**
   * Navigate to Vacation Packages section
   */
  async navigateToVacationPackages(page: any): Promise<void> {
    this.logWithTime('Navigating to Vacation Packages...');
    try {
      // First ensure we're at the Research Hub
      await this.navigateToResearchHub(page);

      // Look for and click the vacation packages link
      const packagesLinkSelector = 'a:has-text("Vacation Packages"), a:has-text("Package Deals")';
      await page.waitForSelector(packagesLinkSelector, { timeout: 15000 });
      await page.click(packagesLinkSelector);

      // Wait for the packages page to load
      await page.waitForURL('**/packages**', { 
        waitUntil: 'networkidle', 
        timeout: this.config.timeout 
      });
      
      // Wait for the package search form to be ready
      await page.waitForSelector('.package-search-form, #package-form', { timeout: 15000 });
      this.logWithTime('Successfully navigated to Vacation Packages');
    } catch (error) {
      this.logWithTime(`Error navigating to Vacation Packages: ${error}`);
      throw new Error(`Vacation Packages navigation failed: ${error}`);
    }
  }

  /**
   * Handle login process
   */
  async handleLogin(page: any, username: string, password: string): Promise<void> {
    this.logWithTime('Handling CPMaxx login...');
    try {
      // Navigate to login page
      await page.goto(`${this.config.baseUrl}/login`, { 
        waitUntil: 'networkidle', 
        timeout: this.config.timeout 
      });

      // Wait for login form elements
      await page.waitForSelector('#username, input[name="username"]', { timeout: 10000 });
      await page.waitForSelector('#password, input[name="password"]', { timeout: 10000 });

      // Fill in credentials
      await page.fill('#username, input[name="username"]', username);
      await page.fill('#password, input[name="password"]', password);

      // Submit the form
      await page.click('button[type="submit"], input[type="submit"], .login-button');

      // Wait for successful login (redirect to dashboard)
      await page.waitForURL('**/main/**', { 
        waitUntil: 'networkidle', 
        timeout: this.config.timeout 
      });

      this.logWithTime('Successfully logged into CPMaxx');
    } catch (error) {
      this.logWithTime(`Login failed: ${error}`);
      throw new Error(`CPMaxx login failed: ${error}`);
    }
  }

  /**
   * Check if we're already logged in
   */
  async isLoggedIn(page: any): Promise<boolean> {
    try {
      // Check for elements that indicate we're logged in
      const loggedInIndicators = [
        '.user-menu',
        '.dashboard-content', 
        '.logout-link',
        'a:has-text("Logout")'
      ];

      for (const selector of loggedInIndicators) {
        const exists = await page.isVisible(selector);
        if (exists) {
          this.logWithTime('Already logged in to CPMaxx');
          return true;
        }
      }

      this.logWithTime('Not logged in to CPMaxx');
      return false;
    } catch (error) {
      this.logWithTime(`Error checking login status: ${error}`);
      return false;
    }
  }

  /**
   * Take screenshot for debugging
   */
  async takeScreenshot(page: any, name: string): Promise<void> {
    if (this.config.debug) {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `cpmaxx-${name}-${timestamp}.png`;
        await page.screenshot({ path: filename, fullPage: true });
        this.logWithTime(`Screenshot saved: ${filename}`);
      } catch (error) {
        this.logWithTime(`Failed to take screenshot: ${error}`);
      }
    }
  }

  /**
   * Wait for page to be ready
   */
  async waitForPageReady(page: any): Promise<void> {
    try {
      // Wait for basic page load
      await page.waitForLoadState('networkidle');
      
      // Wait a bit more for dynamic content
      await page.waitForTimeout(2000);
      
      this.logWithTime('Page ready');
    } catch (error) {
      this.logWithTime(`Page ready check failed: ${error}`);
      // Don't throw - this is just a helper
    }
  }
}
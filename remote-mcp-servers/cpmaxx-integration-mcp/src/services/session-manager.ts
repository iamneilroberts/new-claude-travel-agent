// Session Manager for CPMaxx Integration
// Handles browser sessions, authentication, error recovery, and rate limiting

export interface SessionConfig {
  baseUrl: string;
  username: string;
  password: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  rateLimitDelay: number;
  debug: boolean;
  headless: boolean;
  userAgent?: string;
}

export interface SessionState {
  isAuthenticated: boolean;
  lastActivity: Date;
  sessionId?: string;
  errorCount: number;
  lastError?: Error;
}

export class CPMaxxSessionManager {
  private config: SessionConfig;
  private state: SessionState;
  private browser: any;
  private page: any;
  private lastRequestTime: number;

  constructor(config: SessionConfig) {
    this.config = config;
    this.state = {
      isAuthenticated: false,
      lastActivity: new Date(),
      errorCount: 0
    };
    this.lastRequestTime = 0;
  }

  private logWithTime(message: string): void {
    if (this.config.debug) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] CPMaxx SessionManager: ${message}`);
    }
  }

  /**
   * Initialize browser session with proper configuration
   */
  async initializeSession(): Promise<void> {
    this.logWithTime('Initializing browser session...');
    
    try {
      // Note: In Cloudflare Workers environment, we'll need to use a different approach
      // This is a placeholder for the browser automation setup
      // In production, this would use remote browser services or Puppeteer/Playwright
      
      const browserConfig = {
        headless: this.config.headless,
        timeout: this.config.timeout,
        userAgent: this.config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      };

      // TODO: Initialize browser with proper configuration
      // this.browser = await playwright.chromium.launch(browserConfig);
      // this.page = await this.browser.newPage();
      
      this.logWithTime('Browser session initialized successfully');
    } catch (error) {
      this.logWithTime(`Failed to initialize browser session: ${error}`);
      this.state.errorCount++;
      this.state.lastError = error as Error;
      throw new Error(`Session initialization failed: ${error}`);
    }
  }

  /**
   * Authenticate with CPMaxx portal
   */
  async authenticate(): Promise<void> {
    this.logWithTime('Authenticating with CPMaxx...');
    
    try {
      await this.enforceRateLimit();

      // Navigate to login page
      await this.page?.goto(`${this.config.baseUrl}/login`, { 
        waitUntil: 'networkidle',
        timeout: this.config.timeout 
      });

      // Check if already logged in
      const isAlreadyLoggedIn = await this.checkLoginStatus();
      if (isAlreadyLoggedIn) {
        this.logWithTime('Already authenticated with CPMaxx');
        this.state.isAuthenticated = true;
        this.state.lastActivity = new Date();
        return;
      }

      // Fill login form
      await this.page?.waitForSelector('#username, input[name="username"]', { timeout: 10000 });
      await this.page?.fill('#username, input[name="username"]', this.config.username);
      await this.page?.fill('#password, input[name="password"]', this.config.password);

      // Submit login form
      await this.page?.click('button[type="submit"], input[type="submit"], .login-button');

      // Wait for successful login
      await this.page?.waitForURL('**/main/**', { 
        waitUntil: 'networkidle',
        timeout: this.config.timeout 
      });

      // Verify authentication
      const authSuccess = await this.checkLoginStatus();
      if (!authSuccess) {
        throw new Error('Authentication verification failed');
      }

      this.state.isAuthenticated = true;
      this.state.lastActivity = new Date();
      this.state.errorCount = 0; // Reset error count on successful auth
      this.logWithTime('Successfully authenticated with CPMaxx');

    } catch (error) {
      this.logWithTime(`Authentication failed: ${error}`);
      this.state.errorCount++;
      this.state.lastError = error as Error;
      this.state.isAuthenticated = false;
      throw new Error(`CPMaxx authentication failed: ${error}`);
    }
  }

  /**
   * Check if currently logged in to CPMaxx
   */
  async checkLoginStatus(): Promise<boolean> {
    try {
      const loggedInIndicators = [
        '.user-menu',
        '.dashboard-content',
        '.logout-link',
        'a:has-text("Logout")',
        '.main-navigation'
      ];

      for (const selector of loggedInIndicators) {
        const exists = await this.page?.isVisible(selector);
        if (exists) {
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logWithTime(`Error checking login status: ${error}`);
      return false;
    }
  }

  /**
   * Enforce rate limiting between requests
   */
  async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.config.rateLimitDelay) {
      const delay = this.config.rateLimitDelay - timeSinceLastRequest;
      this.logWithTime(`Rate limiting: waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Execute operation with retry logic and error handling
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>, 
    operationName: string
  ): Promise<T> {
    let lastError: Error = new Error('No attempts made');
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        this.logWithTime(`Executing ${operationName} (attempt ${attempt}/${this.config.maxRetries})`);
        
        // Ensure we're authenticated before operation
        if (!this.state.isAuthenticated) {
          await this.authenticate();
        }
        
        await this.enforceRateLimit();
        
        // Execute the operation
        const result = await operation();
        
        // Update state on success
        this.state.lastActivity = new Date();
        this.state.errorCount = 0;
        
        this.logWithTime(`${operationName} completed successfully`);
        return result;
        
      } catch (error) {
        lastError = error as Error;
        this.state.errorCount++;
        this.state.lastError = lastError;
        
        this.logWithTime(`${operationName} failed (attempt ${attempt}): ${error}`);
        
        // Check if it's an authentication error
        if (this.isAuthenticationError(error as Error)) {
          this.logWithTime('Authentication error detected, clearing auth state');
          this.state.isAuthenticated = false;
          
          // Try to re-authenticate on next attempt
          if (attempt < this.config.maxRetries) {
            await this.handleAuthenticationError();
          }
        }
        
        // Check if it's a rate limiting error
        if (this.isRateLimitError(error as Error)) {
          this.logWithTime('Rate limiting detected, increasing delay');
          await this.handleRateLimitError();
        }
        
        // Wait before retry (except on last attempt)
        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelay * attempt; // Exponential backoff
          this.logWithTime(`Waiting ${delay}ms before retry`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retries exhausted
    this.logWithTime(`${operationName} failed after ${this.config.maxRetries} attempts`);
    throw new Error(`${operationName} failed after ${this.config.maxRetries} attempts. Last error: ${lastError.message}`);
  }

  /**
   * Handle authentication errors
   */
  private async handleAuthenticationError(): Promise<void> {
    this.logWithTime('Handling authentication error...');
    
    try {
      // Clear any existing session
      this.state.isAuthenticated = false;
      
      // Take screenshot for debugging
      await this.takeDebugScreenshot('auth-error');
      
      // Try to navigate back to login page
      await this.page?.goto(`${this.config.baseUrl}/login`, { 
        waitUntil: 'networkidle',
        timeout: this.config.timeout 
      });
      
    } catch (error) {
      this.logWithTime(`Error handling authentication error: ${error}`);
    }
  }

  /**
   * Handle rate limiting errors
   */
  private async handleRateLimitError(): Promise<void> {
    this.logWithTime('Handling rate limit error...');
    
    // Increase the rate limit delay for future requests
    this.config.rateLimitDelay = Math.min(this.config.rateLimitDelay * 2, 10000);
    
    // Wait for an extended period
    const extendedDelay = 5000 + (Math.random() * 5000); // 5-10 seconds
    this.logWithTime(`Extended wait for rate limiting: ${extendedDelay}ms`);
    await new Promise(resolve => setTimeout(resolve, extendedDelay));
  }

  /**
   * Check if error is authentication-related
   */
  private isAuthenticationError(error: Error): boolean {
    const authErrorKeywords = [
      'login',
      'authentication',
      'unauthorized',
      'credentials',
      'session expired',
      'access denied'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return authErrorKeywords.some(keyword => errorMessage.includes(keyword));
  }

  /**
   * Check if error is rate limiting-related
   */
  private isRateLimitError(error: Error): boolean {
    const rateLimitKeywords = [
      'rate limit',
      'too many requests',
      'throttled',
      'blocked',
      'suspicious activity',
      '429'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return rateLimitKeywords.some(keyword => errorMessage.includes(keyword));
  }

  /**
   * Take debug screenshot
   */
  private async takeDebugScreenshot(context: string): Promise<void> {
    if (this.config.debug && this.page) {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `cpmaxx-debug-${context}-${timestamp}.png`;
        await this.page.screenshot({ path: filename, fullPage: true });
        this.logWithTime(`Debug screenshot saved: ${filename}`);
      } catch (error) {
        this.logWithTime(`Failed to take debug screenshot: ${error}`);
      }
    }
  }

  /**
   * Handle session timeout
   */
  async handleSessionTimeout(): Promise<void> {
    this.logWithTime('Handling session timeout...');
    
    try {
      // Clear authentication state
      this.state.isAuthenticated = false;
      
      // Navigate to login page to refresh session
      await this.page?.goto(`${this.config.baseUrl}/login`, { 
        waitUntil: 'networkidle',
        timeout: this.config.timeout 
      });
      
      // Re-authenticate
      await this.authenticate();
      
    } catch (error) {
      this.logWithTime(`Error handling session timeout: ${error}`);
      throw error;
    }
  }

  /**
   * Get current session state
   */
  getSessionState(): SessionState {
    return { ...this.state };
  }

  /**
   * Check if session is healthy
   */
  isSessionHealthy(): boolean {
    const maxErrorThreshold = 5;
    const maxIdleTime = 30 * 60 * 1000; // 30 minutes
    
    const now = new Date();
    const idleTime = now.getTime() - this.state.lastActivity.getTime();
    
    return this.state.isAuthenticated && 
           this.state.errorCount < maxErrorThreshold && 
           idleTime < maxIdleTime;
  }

  /**
   * Refresh session if needed
   */
  async refreshSessionIfNeeded(): Promise<void> {
    if (!this.isSessionHealthy()) {
      this.logWithTime('Session needs refresh');
      await this.authenticate();
    }
  }

  /**
   * Cleanup session and close browser
   */
  async cleanup(): Promise<void> {
    this.logWithTime('Cleaning up session...');
    
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      
      this.state.isAuthenticated = false;
      this.logWithTime('Session cleanup completed');
      
    } catch (error) {
      this.logWithTime(`Error during session cleanup: ${error}`);
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): { errorCount: number; lastError?: string; isHealthy: boolean } {
    return {
      errorCount: this.state.errorCount,
      lastError: this.state.lastError?.message,
      isHealthy: this.isSessionHealthy()
    };
  }
}
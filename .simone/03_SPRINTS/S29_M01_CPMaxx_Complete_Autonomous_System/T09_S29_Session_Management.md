# Task T09: Implement Session Management System

## Objective
Build a robust session management system that handles CPMaxx authentication, maintains browser sessions, and manages credentials securely.

## Requirements

### 1. Session Manager Architecture
```typescript
interface SessionManager {
  // Initialize or retrieve existing session
  getSession(): Promise<BrowserSession>;
  
  // Check if authenticated
  isAuthenticated(): Promise<boolean>;
  
  // Perform authentication if needed
  authenticate(): Promise<void>;
  
  // Refresh session before timeout
  refreshSession(): Promise<void>;
  
  // Handle session recovery
  recoverSession(): Promise<void>;
  
  // Clear session data
  clearSession(): Promise<void>;
}

interface BrowserSession {
  sessionId: string;
  cpmaxxAuthenticated: boolean;
  providerSessions: Map<string, ProviderSession>;
  startTime: string;
  lastActivity: string;
  expiresAt: string;
}

interface ProviderSession {
  provider: string;
  authenticated: boolean;
  credentials?: EncryptedCredentials;
  cookies?: any[];
  lastAccess: string;
}
```

### 2. Implementation with Chrome Persistence
```typescript
class CPMaxxSessionManager implements SessionManager {
  private currentSession: BrowserSession | null = null;
  private chromeMcp: any;
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private sessionTimer: NodeJS.Timer | null = null;
  
  async getSession(): Promise<BrowserSession> {
    if (this.currentSession && await this.isSessionValid()) {
      this.updateLastActivity();
      return this.currentSession;
    }
    
    // Try to recover existing session
    const recovered = await this.recoverSession();
    if (recovered) {
      return this.currentSession!;
    }
    
    // Create new session
    return await this.createNewSession();
  }
  
  async isAuthenticated(): Promise<boolean> {
    if (!this.currentSession) return false;
    
    // Check CPMaxx authentication
    const cpmaxxAuth = await this.checkCPMaxxAuth();
    if (!cpmaxxAuth) return false;
    
    // Update session status
    this.currentSession.cpmaxxAuthenticated = true;
    return true;
  }
  
  private async checkCPMaxxAuth(): Promise<boolean> {
    try {
      // Get current page content
      const content = await this.chromeMcp.chrome_get_web_content({
        textContent: true
      });
      
      // Check for login indicators
      const isLoginPage = content.text?.includes('Sign In') || 
                         content.text?.includes('Login');
      const isAuthenticated = content.text?.includes('Welcome') ||
                             content.text?.includes('Partner Hub');
      
      return isAuthenticated && !isLoginPage;
    } catch {
      return false;
    }
  }
  
  async authenticate(): Promise<void> {
    console.log('🔐 Authenticating with CPMaxx...');
    
    // Navigate to CPMaxx
    await this.chromeMcp.chrome_navigate({
      url: 'https://cpmaxx.cruiseplannersnet.com'
    });
    
    await this.wait(2000);
    
    // Check if already authenticated
    if (await this.checkCPMaxxAuth()) {
      console.log('✅ Already authenticated');
      return;
    }
    
    // Get credentials from environment
    const credentials = this.getCredentials();
    
    // Fill login form
    await this.fillLoginForm(credentials);
    
    // Wait for authentication
    await this.waitForAuthentication();
    
    // Start session refresh timer
    this.startSessionTimer();
  }
  
  private async fillLoginForm(credentials: any): Promise<void> {
    // Fill username
    await this.chromeMcp.chrome_fill_or_select({
      selector: '#username, input[name="username"], input[type="email"]',
      value: credentials.username
    });
    
    // Fill password
    await this.chromeMcp.chrome_fill_or_select({
      selector: '#password, input[name="password"], input[type="password"]',
      value: credentials.password
    });
    
    // Click login button
    await this.chromeMcp.chrome_click_element({
      selector: 'button[type="submit"], input[type="submit"], button:contains("Sign In")'
    });
  }
  
  async refreshSession(): Promise<void> {
    if (!this.currentSession) return;
    
    console.log('🔄 Refreshing session...');
    
    // Navigate to a lightweight page to keep session alive
    await this.chromeMcp.chrome_navigate({
      url: 'https://cpmaxx.cruiseplannersnet.com/dashboard'
    });
    
    await this.wait(1000);
    
    // Verify still authenticated
    if (!await this.checkCPMaxxAuth()) {
      // Re-authenticate if needed
      await this.authenticate();
    }
    
    this.updateLastActivity();
  }
  
  private startSessionTimer(): void {
    // Clear existing timer
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
    }
    
    // Refresh session every 20 minutes
    this.sessionTimer = setInterval(async () => {
      await this.refreshSession();
    }, 20 * 60 * 1000);
  }
  
  async recoverSession(): Promise<boolean> {
    try {
      // Check if browser has existing CPMaxx session
      const tabs = await this.chromeMcp.chrome_get_windows_and_tabs();
      
      for (const window of tabs.windows) {
        for (const tab of window.tabs) {
          if (tab.url?.includes('cpmaxx.cruiseplannersnet.com')) {
            // Found existing tab, switch to it
            await this.chromeMcp.chrome_activate_tab({ tabId: tab.id });
            
            // Check authentication
            if (await this.checkCPMaxxAuth()) {
              console.log('✅ Recovered existing session');
              this.currentSession = await this.createSessionFromTab(tab);
              this.startSessionTimer();
              return true;
            }
          }
        }
      }
    } catch (error) {
      console.log('❌ Session recovery failed:', error);
    }
    
    return false;
  }
}
```

### 3. Provider-Specific Session Handling
```typescript
class ProviderSessionManager {
  private sessions: Map<string, ProviderSession> = new Map();
  
  async getProviderSession(provider: string): Promise<ProviderSession> {
    const existing = this.sessions.get(provider);
    
    if (existing && this.isProviderSessionValid(existing)) {
      return existing;
    }
    
    // Create new provider session
    return await this.createProviderSession(provider);
  }
  
  private async createProviderSession(provider: string): Promise<ProviderSession> {
    const session: ProviderSession = {
      provider,
      authenticated: false,
      lastAccess: new Date().toISOString()
    };
    
    // Provider-specific authentication
    switch (provider) {
      case 'delta':
        session.authenticated = await this.authenticateDelta();
        break;
      case 'apple':
        session.authenticated = await this.authenticateApple();
        break;
      // Add other providers
    }
    
    this.sessions.set(provider, session);
    return session;
  }
  
  private async authenticateDelta(): Promise<boolean> {
    // Delta-specific authentication logic
    // This might involve stored credentials or OAuth
    return true;
  }
}
```

### 4. Credential Management
```typescript
class SecureCredentialManager {
  private credentials: Map<string, EncryptedCredentials> = new Map();
  
  async getCredentials(service: string): Promise<any> {
    // First check environment variables
    const envCreds = this.getFromEnvironment(service);
    if (envCreds) return envCreds;
    
    // Then check encrypted storage
    const encrypted = this.credentials.get(service);
    if (encrypted) {
      return this.decrypt(encrypted);
    }
    
    // Prompt for credentials if not found
    throw new Error(`Credentials for ${service} not found`);
  }
  
  private getFromEnvironment(service: string): any {
    switch (service) {
      case 'cpmaxx':
        return {
          username: process.env.CP_CENTRAL_LOGIN,
          password: process.env.CP_CENTRAL_PASSWORD
        };
      case 'delta':
        return {
          agentId: process.env.DELTA_AGENT_ID,
          password: process.env.DELTA_PASSWORD
        };
      default:
        return null;
    }
  }
}
```

### 5. Integration with MCP Server
```typescript
// Add session check to all search tools
async function executeSearch(args: SearchRequest): Promise<SearchResponse> {
  const sessionManager = new CPMaxxSessionManager();
  
  // Ensure authenticated session
  const session = await sessionManager.getSession();
  if (!session.cpmaxxAuthenticated) {
    await sessionManager.authenticate();
  }
  
  // Proceed with search
  return await searchProvider.search(args);
}
```

## Success Metrics
- Authentication handled automatically
- Sessions persist across searches
- Automatic session refresh before timeout
- Provider-specific sessions managed
- Credentials stored securely
- Session recovery from existing tabs
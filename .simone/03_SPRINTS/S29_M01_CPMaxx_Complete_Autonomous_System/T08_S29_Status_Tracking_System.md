# Task T08: Implement Status Tracking System

## Objective
Create a real-time status tracking system that provides updates during long-running searches and allows users to monitor progress.

## Requirements

### 1. Status Architecture
```typescript
interface StatusTracker {
  // Create a new tracking session
  createSession(searchId: string, provider: string): Promise<void>;
  
  // Update status with progress
  updateStatus(searchId: string, update: StatusUpdate): Promise<void>;
  
  // Get current status
  getStatus(searchId: string): Promise<SearchStatus>;
  
  // Stream status updates
  streamStatus(searchId: string): AsyncIterator<StatusUpdate>;
  
  // Mark search complete
  completeSearch(searchId: string, result: 'success' | 'error'): Promise<void>;
}

interface StatusUpdate {
  timestamp: string;
  phase: SearchPhase;
  message: string;
  progress?: number;  // 0-100
  details?: any;
  screenshot?: string;  // Base64 screenshot for key moments
}

enum SearchPhase {
  INITIALIZING = 'initializing',
  AUTHENTICATING = 'authenticating',
  NAVIGATING = 'navigating',
  FILLING_FORM = 'filling_form',
  SEARCHING = 'searching',
  PARSING_RESULTS = 'parsing_results',
  STORING_RESULTS = 'storing_results',
  COMPLETED = 'completed',
  ERROR = 'error'
}
```

### 2. Implementation with Event Emitter
```typescript
class SearchStatusTracker implements StatusTracker {
  private sessions: Map<string, SearchSession> = new Map();
  private eventEmitter = new EventEmitter();
  
  async createSession(searchId: string, provider: string): Promise<void> {
    const session: SearchSession = {
      searchId,
      provider,
      startTime: new Date().toISOString(),
      status: SearchPhase.INITIALIZING,
      updates: [],
      progress: 0
    };
    
    this.sessions.set(searchId, session);
    
    await this.updateStatus(searchId, {
      timestamp: new Date().toISOString(),
      phase: SearchPhase.INITIALIZING,
      message: `Starting ${provider} search`,
      progress: 0
    });
  }
  
  async updateStatus(searchId: string, update: StatusUpdate): Promise<void> {
    const session = this.sessions.get(searchId);
    if (!session) {
      throw new Error(`No session found for searchId: ${searchId}`);
    }
    
    // Update session
    session.status = update.phase;
    session.progress = update.progress || session.progress;
    session.updates.push(update);
    session.lastUpdate = update.timestamp;
    
    // Emit event for real-time updates
    this.eventEmitter.emit(`status:${searchId}`, update);
    
    // Store persistent status
    await this.persistStatus(searchId, session);
    
    // Log for debugging
    console.log(`[${searchId}] ${update.phase}: ${update.message}`);
  }
  
  async *streamStatus(searchId: string): AsyncIterator<StatusUpdate> {
    // Return existing updates
    const session = this.sessions.get(searchId);
    if (session) {
      for (const update of session.updates) {
        yield update;
      }
    }
    
    // Stream new updates
    while (true) {
      const update = await new Promise<StatusUpdate>((resolve) => {
        this.eventEmitter.once(`status:${searchId}`, resolve);
      });
      
      yield update;
      
      if (update.phase === SearchPhase.COMPLETED || 
          update.phase === SearchPhase.ERROR) {
        break;
      }
    }
  }
}
```

### 3. Integration with Search Providers
```typescript
// Enhanced base provider with status tracking
class BaseProvider {
  protected statusTracker: SearchStatusTracker;
  protected searchId: string;
  
  async search(criteria: any): Promise<any> {
    this.searchId = generateSearchId(criteria);
    await this.statusTracker.createSession(this.searchId, this.providerName);
    
    try {
      // Authentication phase
      await this.updateStatus(SearchPhase.AUTHENTICATING, 'Checking authentication', 10);
      await this.ensureAuthenticated();
      
      // Navigation phase
      await this.updateStatus(SearchPhase.NAVIGATING, 'Navigating to search page', 20);
      await this.navigateToSearch();
      
      // Form filling phase
      await this.updateStatus(SearchPhase.FILLING_FORM, 'Filling search criteria', 40);
      await this.fillSearchForm(criteria);
      
      // Search phase
      await this.updateStatus(SearchPhase.SEARCHING, 'Searching for results', 60);
      await this.submitSearch();
      
      // Parsing phase
      await this.updateStatus(SearchPhase.PARSING_RESULTS, 'Processing results', 80);
      const results = await this.parseResults();
      
      // Storage phase
      await this.updateStatus(SearchPhase.STORING_RESULTS, 'Saving results', 95);
      await this.storeResults(results);
      
      // Complete
      await this.updateStatus(SearchPhase.COMPLETED, 'Search completed successfully', 100);
      await this.statusTracker.completeSearch(this.searchId, 'success');
      
      return results;
      
    } catch (error) {
      await this.updateStatus(
        SearchPhase.ERROR,
        `Search failed: ${error.message}`,
        undefined,
        { error: error.toString() }
      );
      await this.statusTracker.completeSearch(this.searchId, 'error');
      throw error;
    }
  }
  
  protected async updateStatus(
    phase: SearchPhase,
    message: string,
    progress?: number,
    details?: any
  ): Promise<void> {
    // Optionally capture screenshot for key moments
    let screenshot;
    if ([SearchPhase.SEARCHING, SearchPhase.ERROR].includes(phase)) {
      screenshot = await this.captureScreenshot();
    }
    
    await this.statusTracker.updateStatus(this.searchId, {
      timestamp: new Date().toISOString(),
      phase,
      message,
      progress,
      details,
      screenshot
    });
  }
}
```

### 4. MCP Status Tool
```typescript
{
  name: "get_search_status",
  description: "Get current status of a search in progress",
  inputSchema: {
    type: "object",
    properties: {
      searchId: { type: "string", description: "Search ID to check status" },
      includeUpdates: { type: "boolean", default: false, description: "Include all status updates" }
    },
    required: ["searchId"]
  }
}

// Tool handler
async function handleGetSearchStatus(args: any) {
  const tracker = new SearchStatusTracker();
  const status = await tracker.getStatus(args.searchId);
  
  if (!status) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'Search not found',
          searchId: args.searchId
        })
      }]
    };
  }
  
  const response: any = {
    searchId: args.searchId,
    provider: status.provider,
    status: status.status,
    progress: status.progress,
    startTime: status.startTime,
    lastUpdate: status.lastUpdate,
    duration: calculateDuration(status.startTime, status.lastUpdate)
  };
  
  if (args.includeUpdates) {
    response.updates = status.updates;
  } else {
    response.latestUpdate = status.updates[status.updates.length - 1];
  }
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(response, null, 2)
    }]
  };
}
```

### 5. Benefits
- Real-time progress visibility
- Detailed phase tracking
- Error diagnosis with screenshots
- Search duration tracking
- Historical status records

## Success Metrics
- Status updates provided in real-time
- All search phases tracked
- Progress percentage accurate
- Screenshots captured at key moments
- Status persists across sessions
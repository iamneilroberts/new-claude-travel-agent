# Task T06: Implement Result Storage and Retrieval System

## Objective
Create a searchId-based storage system that allows MCP server to store search results and Claude Desktop to retrieve them later.

## Requirements

### 1. Storage Architecture
```typescript
interface SearchStorage {
  // Store search request and results
  storeSearch(searchId: string, data: {
    request: SearchRequest;
    status: SearchStatus;
    provider: string;
    timestamp: string;
    results?: any;
    htmlPath?: string;
    error?: string;
  }): Promise<void>;
  
  // Retrieve search by ID
  getSearch(searchId: string): Promise<SearchData | null>;
  
  // Update search status
  updateSearchStatus(searchId: string, status: SearchStatus, data?: any): Promise<void>;
  
  // List recent searches
  listSearches(filters?: {
    provider?: string;
    status?: SearchStatus;
    dateRange?: { start: string; end: string };
  }): Promise<SearchSummary[]>;
}
```

### 2. File-Based Storage Implementation
```typescript
class FileSearchStorage implements SearchStorage {
  private readonly STORAGE_DIR = path.join(
    process.cwd(),
    'search-results',
    'searches'
  );
  
  async storeSearch(searchId: string, data: SearchData): Promise<void> {
    const searchDir = path.join(this.STORAGE_DIR, searchId);
    await fs.mkdir(searchDir, { recursive: true });
    
    // Store metadata
    await fs.writeFile(
      path.join(searchDir, 'metadata.json'),
      JSON.stringify(data, null, 2)
    );
    
    // Store raw results if available
    if (data.results) {
      await fs.writeFile(
        path.join(searchDir, 'results.json'),
        JSON.stringify(data.results, null, 2)
      );
    }
    
    // Update index for quick lookups
    await this.updateSearchIndex(searchId, data);
  }
  
  async getSearch(searchId: string): Promise<SearchData | null> {
    try {
      const metadataPath = path.join(this.STORAGE_DIR, searchId, 'metadata.json');
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
      
      // Load results if available
      const resultsPath = path.join(this.STORAGE_DIR, searchId, 'results.json');
      if (await this.fileExists(resultsPath)) {
        metadata.results = JSON.parse(await fs.readFile(resultsPath, 'utf-8'));
      }
      
      return metadata;
    } catch (error) {
      return null;
    }
  }
  
  private async updateSearchIndex(searchId: string, data: SearchData) {
    const indexPath = path.join(this.STORAGE_DIR, 'index.json');
    let index = {};
    
    try {
      index = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
    } catch {}
    
    index[searchId] = {
      provider: data.provider,
      status: data.status,
      timestamp: data.timestamp,
      destination: data.request.destination,
      dates: {
        departure: data.request.departureDate,
        return: data.request.returnDate
      }
    };
    
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  }
}
```

### 3. New MCP Tools
```typescript
// Tool to retrieve search results
{
  name: "get_search_results",
  description: "Retrieve previously stored search results by searchId",
  inputSchema: {
    type: "object",
    properties: {
      searchId: { type: "string", description: "The search ID to retrieve" }
    },
    required: ["searchId"]
  }
}

// Tool to list recent searches
{
  name: "list_searches",
  description: "List recent searches with optional filters",
  inputSchema: {
    type: "object",
    properties: {
      provider: { type: "string", optional: true },
      status: { type: "string", enum: ["searching", "completed", "error"], optional: true },
      limit: { type: "number", default: 10 }
    }
  }
}
```

### 4. Integration with Existing Tools
```typescript
// Modify search tool to use storage
async function executeSearch(args: SearchRequest): Promise<SearchResponse> {
  const searchId = generateSearchId(args);
  const storage = new FileSearchStorage();
  
  // Store initial search request
  await storage.storeSearch(searchId, {
    request: args,
    status: 'searching',
    provider: args.provider,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Perform search
    const results = await searchProvider.search(args);
    
    // Store results
    await storage.updateSearchStatus(searchId, 'completed', {
      results: results.packages,
      htmlPath: results.htmlPath
    });
    
    return {
      searchId,
      status: 'completed',
      message: `Search completed. Use searchId '${searchId}' to retrieve results.`,
      summary: {
        count: results.packages.length,
        provider: args.provider
      }
    };
    
  } catch (error) {
    await storage.updateSearchStatus(searchId, 'error', {
      error: error.message
    });
    throw error;
  }
}
```

### 5. Benefits
- Claude Desktop can retrieve results anytime using searchId
- Results persist across sessions
- Multiple searches can be compared
- Search history available for analysis
- Supports offline result viewing

## Success Metrics
- Search results stored with unique IDs
- Retrieval by searchId works reliably
- Search index allows filtering and listing
- Storage doesn't impact search performance
- Old searches can be cleaned up automatically
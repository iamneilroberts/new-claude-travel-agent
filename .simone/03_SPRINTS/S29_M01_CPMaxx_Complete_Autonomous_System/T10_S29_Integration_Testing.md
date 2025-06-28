# Task T10: Integration Testing with Claude Desktop

## Objective
Perform comprehensive integration testing of the complete autonomous CPMaxx search system with Claude Desktop in travel agent mode.

## Testing Requirements

### 1. Test Scenarios
```typescript
interface IntegrationTest {
  id: string;
  name: string;
  description: string;
  steps: TestStep[];
  expectedOutcome: string;
  validationCriteria: string[];
}

const INTEGRATION_TESTS: IntegrationTest[] = [
  {
    id: 'IT-001',
    name: 'Complete Package Search Flow',
    description: 'Test full autonomous search across multiple providers',
    steps: [
      { action: 'Claude requests package search', params: { destination: 'Cancun', dates: 'Sept 2025' } },
      { action: 'MCP server performs search', expected: 'Browser automation visible' },
      { action: 'Results stored with searchId', expected: 'SearchId returned to Claude' },
      { action: 'Claude retrieves results', expected: 'Full results available' },
      { action: 'Claude analyzes commissions', expected: 'Commission analysis provided' }
    ],
    expectedOutcome: 'Complete autonomous search with commission analysis',
    validationCriteria: [
      'No Claude intervention during search',
      'Results retrievable by searchId',
      'Commission analysis accurate',
      'User can see browser actions'
    ]
  },
  
  {
    id: 'IT-002',
    name: 'Multi-Provider Comparison',
    description: 'Search and compare across Delta, Apple, and American',
    steps: [
      { action: 'Claude requests "all" provider search', params: { provider: 'all' } },
      { action: 'MCP searches each provider sequentially', expected: 'Status updates for each' },
      { action: 'Results aggregated', expected: 'All providers included' },
      { action: 'Commission comparison', expected: 'Best options identified' }
    ],
    expectedOutcome: 'Comprehensive comparison across providers',
    validationCriteria: [
      'All providers searched',
      'Results properly aggregated',
      'Commission comparison accurate',
      'Clear recommendations provided'
    ]
  },
  
  {
    id: 'IT-003',
    name: 'Session Recovery Test',
    description: 'Test session recovery after interruption',
    steps: [
      { action: 'Start search', params: {} },
      { action: 'Simulate interruption mid-search', expected: 'Error handled gracefully' },
      { action: 'Retry search', expected: 'Session recovered' },
      { action: 'Complete search', expected: 'Results obtained' }
    ],
    expectedOutcome: 'Graceful recovery from interruptions',
    validationCriteria: [
      'Session recovered without re-login',
      'Search completes successfully',
      'No duplicate searches',
      'Status tracking shows recovery'
    ]
  }
];
```

### 2. Test Harness Implementation
```typescript
class IntegrationTestHarness {
  private mcp: any;
  private testResults: Map<string, TestResult> = new Map();
  
  async runAllTests(): Promise<TestSummary> {
    console.log('🧪 Starting Integration Tests...\n');
    
    const summary: TestSummary = {
      total: INTEGRATION_TESTS.length,
      passed: 0,
      failed: 0,
      errors: []
    };
    
    for (const test of INTEGRATION_TESTS) {
      const result = await this.runTest(test);
      this.testResults.set(test.id, result);
      
      if (result.status === 'passed') {
        summary.passed++;
      } else {
        summary.failed++;
        summary.errors.push({
          testId: test.id,
          error: result.error
        });
      }
    }
    
    return summary;
  }
  
  private async runTest(test: IntegrationTest): Promise<TestResult> {
    console.log(`\n📋 Running ${test.id}: ${test.name}`);
    console.log(`   ${test.description}`);
    
    const result: TestResult = {
      testId: test.id,
      testName: test.name,
      startTime: new Date().toISOString(),
      status: 'running',
      steps: []
    };
    
    try {
      for (const step of test.steps) {
        const stepResult = await this.executeStep(step);
        result.steps.push(stepResult);
        
        if (!stepResult.success) {
          throw new Error(`Step failed: ${step.action}`);
        }
      }
      
      // Validate outcomes
      const validation = await this.validateTest(test, result);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
      
      result.status = 'passed';
      console.log(`   ✅ PASSED`);
      
    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      console.log(`   ❌ FAILED: ${error.message}`);
    }
    
    result.endTime = new Date().toISOString();
    result.duration = this.calculateDuration(result.startTime, result.endTime);
    
    return result;
  }
}
```

### 3. Claude Desktop Integration Points
```typescript
// Test Claude Desktop integration
async function testClaudeDesktopIntegration() {
  // 1. Test tool discovery
  const tools = await mcp.listTools();
  assert(tools.includes('search_cpmaxx'));
  assert(tools.includes('get_search_results'));
  assert(tools.includes('analyze_commission'));
  
  // 2. Test search execution
  const searchResult = await mcp.call('search_cpmaxx', {
    provider: 'delta',
    origin: 'ATL',
    destination: 'CUN',
    departureDate: '2025-09-15',
    returnDate: '2025-09-22',
    adults: 2
  });
  
  assert(searchResult.searchId);
  assert(searchResult.status === 'completed');
  
  // 3. Test result retrieval
  const results = await mcp.call('get_search_results', {
    searchId: searchResult.searchId
  });
  
  assert(results.packages.length > 0);
  
  // 4. Test commission analysis
  const commission = await mcp.call('analyze_commission', {
    searchId: searchResult.searchId
  });
  
  assert(commission.summary.averageCommission > 0);
}
```

### 4. Performance Testing
```typescript
interface PerformanceMetrics {
  searchProvider: string;
  averageSearchTime: number;
  successRate: number;
  errorRate: number;
  timeoutRate: number;
}

async function performanceTest(): Promise<PerformanceMetrics[]> {
  const providers = ['delta', 'american', 'cpmaxx-hotel'];
  const metrics: PerformanceMetrics[] = [];
  
  for (const provider of providers) {
    const providerMetrics = await testProviderPerformance(provider);
    metrics.push(providerMetrics);
  }
  
  return metrics;
}
```

### 5. Test Documentation Template
```markdown
## Integration Test Report

### Test Environment
- **Date**: [Test Date]
- **MCP Server Version**: 1.0.0
- **Claude Desktop Version**: [Version]
- **Browser**: Chrome via mcp-chrome

### Test Results Summary
- **Total Tests**: X
- **Passed**: X
- **Failed**: X
- **Success Rate**: X%

### Detailed Results
[Detailed test results here]

### Performance Metrics
- **Average Search Time**: X seconds
- **Session Recovery Time**: X seconds
- **Commission Analysis Time**: X ms

### Issues Found
1. [Issue description]
2. [Issue description]

### Recommendations
1. [Recommendation]
2. [Recommendation]
```

## Success Metrics
- All integration tests pass
- No manual intervention required
- Performance within acceptable limits
- Error handling works correctly
- Session management stable
- Commission analysis accurate
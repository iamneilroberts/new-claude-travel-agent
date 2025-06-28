# Sprint S29 Implementation Roadmap

## Overview
This roadmap provides a structured approach to implementing Sprint S29, which completes the S28 search tools and adds autonomous operation capabilities to the CPMaxx MCP server.

## Phase 1: Complete S28 Tools (Week 1-2)

### Prerequisites
- Ensure mcp-cpmaxx-unified is properly configured in Claude Desktop
- Chrome browser authenticated with CPMaxx
- Development environment set up with TypeScript

### Implementation Order

#### 1. Car Rental Enhancement (T03 Reference)
- **Status**: Partially complete (autocomplete fix done)
- **Next Steps**:
  - Add result parser for all rental companies
  - Implement pricing breakdown extraction
  - Test with various locations and dates

#### 2. Hotel Search Tool (T01)
- **Priority**: High (most commonly used)
- **Key Challenges**:
  - Complex filter interface
  - Multiple result pages
  - Room type variations

#### 3. All-Inclusive Search Tool (T02)  
- **Priority**: High (high commission)
- **Key Challenges**:
  - Resort-specific interfaces
  - Child age handling
  - Inclusion details parsing

#### 4. Tour Search Tool (T04)
- **Priority**: Medium
- **Key Challenges**:
  - Flexible date searches
  - Activity categorization
  - Multi-day itineraries

#### 5. Cruise Search Tool (T03)
- **Priority**: Medium
- **Key Challenges**:
  - Complex itinerary parsing
  - Cabin category matrix
  - Port information extraction

#### 6. Flight Search Stub (T05)
- **Priority**: Low (maintenance mode)
- **Quick Implementation**: Error handling only

## Phase 2: Autonomous Features (Week 3-4)

### Core Infrastructure

#### 1. Result Storage System (T06)
- **First Priority**: Enable result persistence
- **Implementation**:
  ```bash
  1. Create storage directory structure
  2. Implement FileSearchStorage class
  3. Add storage to existing search tools
  4. Test searchId generation and retrieval
  ```

#### 2. Status Tracking System (T08)
- **Second Priority**: Real-time visibility
- **Implementation**:
  ```bash
  1. Create StatusTracker class
  2. Add event emitter for updates
  3. Integrate with BaseProvider
  4. Test status streaming
  ```

#### 3. Session Management (T09)
- **Third Priority**: Authentication handling
- **Implementation**:
  ```bash
  1. Create SessionManager class
  2. Add credential management
  3. Implement session recovery
  4. Test timeout handling
  ```

#### 4. Commission Analysis Engine (T07)
- **Fourth Priority**: Value optimization
- **Implementation**:
  ```bash
  1. Define commission rate tables
  2. Create analysis algorithms
  3. Add comparison tools
  4. Test recommendations
  ```

## Testing Strategy

### Unit Testing
```bash
# Test individual components
npm test src/providers/hotel/hotel-provider.test.ts
npm test src/storage/file-storage.test.ts
npm test src/commission/analyzer.test.ts
```

### Integration Testing
```bash
# Test complete flows
npm run test:integration -- --provider hotel
npm run test:integration -- --provider all-inclusive
```

### End-to-End Testing
1. Start Claude Desktop with mcp-cpmaxx-unified
2. Run test scenarios from T10
3. Verify autonomous operation
4. Check commission calculations

## Development Workflow

### Daily Tasks
1. **Morning**: Review previous day's progress
2. **Implementation**: Focus on one tool/feature at a time
3. **Testing**: Test each component before moving on
4. **Documentation**: Update progress in this roadmap

### Git Workflow
```bash
# Create feature branch for each task
git checkout -b feature/S29-T01-hotel-search

# Commit frequently with clear messages
git commit -m "feat(S29-T01): implement hotel search navigation"

# Push for backup (don't merge until tested)
git push origin feature/S29-T01-hotel-search
```

## Common Patterns

### Navigation Pattern
```typescript
async navigateToModule(module: string) {
  await this.navigateToResearchHub();
  await this.chromeMcp.chrome_click_element({
    selector: `a:contains("${module}")`
  });
  await this.wait(2000);
}
```

### Autocomplete Pattern (from car rental fix)
```typescript
async fillLocationWithAutocomplete(selector: string, location: string) {
  // Use single-script approach
  await this.chromeMcp.chrome_inject_script({
    type: 'MAIN',
    jsScript: `/* autocomplete logic */`
  });
}
```

### Result Parser Pattern
```typescript
async parseResults(): Promise<any[]> {
  const html = await this.chromeMcp.chrome_get_web_content({
    htmlContent: true
  });
  
  const $ = cheerio.load(html.htmlContent);
  const results = [];
  
  $('.result-item').each((i, elem) => {
    results.push(this.parseResultItem($, elem));
  });
  
  return results;
}
```

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Check environment variables
   - Verify CPMaxx session
   - Clear cookies and retry

2. **Navigation Errors**
   - Add longer waits
   - Check selector specificity
   - Use fallback selectors

3. **Parsing Failures**
   - Capture HTML for debugging
   - Update selectors if UI changed
   - Add error recovery

## Success Criteria

### Phase 1 Complete When:
- [ ] All 5 S28 tools implemented
- [ ] Each tool tested with real searches
- [ ] Results parsing verified
- [ ] Basic error handling in place

### Phase 2 Complete When:
- [ ] Results stored and retrievable
- [ ] Status tracking operational
- [ ] Sessions managed automatically
- [ ] Commission analysis accurate
- [ ] Integration tests passing

## Next Steps After S29

1. **Performance Optimization**
   - Parallel searches
   - Caching strategies
   - Result compression

2. **Enhanced Features**
   - Historical tracking
   - Predictive pricing
   - Advanced filtering

3. **Production Readiness**
   - Error monitoring
   - Usage analytics
   - Security hardening
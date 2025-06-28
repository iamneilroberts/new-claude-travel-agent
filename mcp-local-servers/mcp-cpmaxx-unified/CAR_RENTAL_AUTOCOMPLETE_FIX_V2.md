# Car Rental Autocomplete Fix V2 - Single Script Solution

## The Problem
The autocomplete works in standalone tests but fails via MCP because:
1. Browser loses focus when switching between Claude Code and browser
2. Multiple MCP round trips add delays that break the timing
3. The dropdown disappears when the browser window loses focus

## Solution: Single Script Execution

Execute the entire autocomplete sequence in one injected script to avoid focus loss and timing issues.

### Implementation

```typescript
private async fillLocation(type: 'pickup' | 'dropoff', location: string): Promise<void> {
  console.log(`📍 Filling ${type} location: ${location}`);
  
  const selector = '#carsearch-location_search';
  
  // Execute entire sequence in one script to maintain focus
  const result = await this.chromeMcp.chrome_inject_script({
    type: 'MAIN',
    jsScript: `
      (async function() {
        const field = document.querySelector('${selector}');
        if (!field) {
          return JSON.stringify({ success: false, error: 'Field not found' });
        }
        
        // Step 1: Focus and clear
        field.focus();
        field.value = '';
        
        // Step 2: Type each character with natural timing
        const value = '${location.toUpperCase()}';
        for (let i = 0; i < value.length; i++) {
          const char = value[i];
          
          // Set value up to current character
          field.value = value.substring(0, i + 1);
          
          // Dispatch input event
          field.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Dispatch keydown
          field.dispatchEvent(new KeyboardEvent('keydown', {
            key: char,
            code: 'Key' + char,
            keyCode: char.charCodeAt(0),
            which: char.charCodeAt(0),
            bubbles: true
          }));
          
          // Small delay between characters
          await new Promise(r => setTimeout(r, 50));
          
          // Dispatch keyup
          field.dispatchEvent(new KeyboardEvent('keyup', {
            key: char,
            code: 'Key' + char,
            keyCode: char.charCodeAt(0),
            which: char.charCodeAt(0),
            bubbles: true
          }));
        }
        
        // Step 3: Wait for dropdown to appear
        let dropdown = null;
        let attempts = 0;
        
        while (!dropdown && attempts < 20) { // 2 seconds max
          await new Promise(r => setTimeout(r, 100));
          dropdown = document.querySelector('.dropdown-item, li.ui-menu-item, .typeahead-result');
          attempts++;
        }
        
        if (!dropdown) {
          return JSON.stringify({ success: false, error: 'Dropdown did not appear' });
        }
        
        // Step 4: Click first suggestion
        const firstItem = document.querySelector('.dropdown-item:first-child, li.ui-menu-item:first-child');
        if (firstItem) {
          firstItem.click();
          return JSON.stringify({ success: true, message: 'Location selected' });
        } else {
          // Fallback: use arrow keys
          field.focus();
          field.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'ArrowDown',
            code: 'ArrowDown',
            keyCode: 40,
            which: 40,
            bubbles: true
          }));
          
          await new Promise(r => setTimeout(r, 100));
          
          field.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true
          }));
          
          return JSON.stringify({ success: true, message: 'Location selected via keyboard' });
        }
      })();
    `
  });
  
  // Parse result
  try {
    const parsed = JSON.parse(result);
    if (parsed.success) {
      console.log(`✅ ${parsed.message}`);
    } else {
      console.warn(`⚠️ ${parsed.error}`);
      // Fallback: just accept the typed value
      console.log('📝 Accepting typed value without autocomplete');
    }
  } catch (e) {
    console.warn('⚠️ Could not parse autocomplete result');
  }
}
```

## Alternative: Faster Keystroke Method

If the above doesn't work, try this even faster approach:

```typescript
private async fillLocationFast(type: 'pickup' | 'dropoff', location: string): Promise<void> {
  const selector = '#carsearch-location_search';
  
  await this.chromeMcp.chrome_inject_script({
    type: 'MAIN',
    jsScript: `
      (async function() {
        const field = document.querySelector('${selector}');
        if (!field) return;
        
        // Focus and set value
        field.focus();
        field.value = '${location.toUpperCase()}';
        
        // Fire all events rapidly
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new KeyboardEvent('keyup', {
          key: '${location.slice(-1)}',
          bubbles: true
        }));
        
        // Immediately look for dropdown
        setTimeout(() => {
          const firstItem = document.querySelector('.dropdown-item:first-child');
          if (firstItem) firstItem.click();
        }, 500);
      })();
    `
  });
  
  // Single wait after script
  await this.wait(1000);
}
```

## Key Improvements

1. **Single Script Execution**: Everything happens in one browser context
2. **No Focus Loss**: Browser maintains focus throughout
3. **Natural Typing**: Simulates real user typing with proper timing
4. **Built-in Retry**: Polls for dropdown appearance
5. **Fallback Logic**: Uses keyboard navigation if clicking fails

## Testing the Fix

```bash
# Test with various locations
npm run test:car-rental -- --location "SFO"
npm run test:car-rental -- --location "San Francisco"
npm run test:car-rental -- --location "LAX"
```

## Why This Works Better

1. **Atomic Operation**: No chance for focus loss between steps
2. **Consistent Timing**: No network delays between operations
3. **Browser Context**: Runs entirely in the page context
4. **Natural Behavior**: More closely mimics actual user typing

## Additional Optimizations

1. **Pre-focus Strategy**: Focus the field before starting
2. **Visibility Check**: Ensure field is visible and enabled
3. **Error Recovery**: Gracefully handle when autocomplete fails
4. **Location Validation**: Verify the selected location matches intent
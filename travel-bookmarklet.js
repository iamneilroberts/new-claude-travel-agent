// Travel Assistant Bookmarklet
// Add this as a bookmark in your browser with the URL:
// javascript:void(function(){const text='travel mode - initialize travel assistant';navigator.clipboard.writeText(text);alert('Travel mode text copied to clipboard! Paste in Claude.');})()

javascript:void(function(){
  const shortcuts = {
    'Travel Mode': 'travel mode - initialize travel assistant',
    'Mobile Mode': '[MOBILE] new lead processing - autonomous mode',
    'Interactive Mode': 'interactive travel assistant - desktop collaboration',
    'Process Emails': 'process travel emails from claude-travel-agent label',
    'Find Chisholm': 'search for Chisholm European Vacation 2025 trip details'
  };
  
  const choice = prompt('Choose shortcut:\n1. Travel Mode\n2. Mobile Mode\n3. Interactive Mode\n4. Process Emails\n5. Find Chisholm\n\nEnter number:');
  
  const options = ['Travel Mode', 'Mobile Mode', 'Interactive Mode', 'Process Emails', 'Find Chisholm'];
  const selected = options[parseInt(choice) - 1];
  
  if (selected && shortcuts[selected]) {
    navigator.clipboard.writeText(shortcuts[selected]);
    alert(`"${selected}" copied to clipboard! Paste in Claude.`);
  }
})();
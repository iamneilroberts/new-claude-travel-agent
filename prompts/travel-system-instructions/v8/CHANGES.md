# System Instructions Update - Fetch MCP Integration

## Summary
This update integrates the new fetch-mcp capabilities into the travel assistant system instructions, enabling web content retrieval in various formats (HTML, Markdown, text, JSON) for enhanced travel research.

## Files Modified
1. `assemble_instructions.sh` - Added fetch_reference.md to file list
2. `core_instructions.md` - Added "Web Research" to Core Capabilities
3. `tools_reference.md` - Added Web Content Tools section
4. `workflows.md` - Added Web Research Workflow section
5. `current_instructions.md` - Regenerated with all updates

## Files Added
1. `fetch_reference.md` - Detailed documentation of fetch tools, parameters, and best practices

## Key Features Added
- Web content retrieval in multiple formats (HTML, Markdown, text, JSON)
- Structured research workflow for destination information
- Guidelines for enhancing travel documents with verified data
- Tools for discovering unique local experiences ("Kim's Gems")

## Implementation Notes
- All fetch tools require a URL parameter
- Optional headers parameter available for all tools
- Security and privacy guidelines included
- Best practices for content retrieval and usage documented

## Usage Context
These fetch tools should be used for:
- Researching destinations and attractions
- Verifying travel information (hours, prices)
- Enhancing trip proposals with accurate details
- Finding unique local experiences
- Adding verified links to travel documents

## Verification
The updated instructions have been assembled and verified for integrity using the assembly script, with all components properly incorporated into current_instructions.md.
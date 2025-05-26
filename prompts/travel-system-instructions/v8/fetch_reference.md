# Web Content Fetch Tools

## Overview
The fetch-mcp server provides capabilities to retrieve web content in various formats for use in travel research, information gathering, and document enrichment. This enables you to access up-to-date information about destinations, attractions, and travel services.

## Available Tools

### fetch_html
Fetches a website and returns the content as HTML.

**Parameters:**
- `url` (required): URL of the website to fetch
- `headers` (optional): Custom headers to include in the request

**Example usage:**
"Fetch the HTML from the official tourism website for Paris"

### fetch_markdown
Fetches a website and returns the content as Markdown, making it easier to read and process textual information.

**Parameters:**
- `url` (required): URL of the website to fetch
- `headers` (optional): Custom headers to include in the request

**Example usage:**
"Get the visitor information from the Paris tourism website in markdown format"

### fetch_txt
Fetches a website and returns the content as plain text (no HTML), providing clean text for analysis.

**Parameters:**
- `url` (required): URL of the website to fetch
- `headers` (optional): Custom headers to include in the request

**Example usage:**
"Get the plain text content from the Louvre Museum's visiting hours page"

### fetch_json
Fetches a JSON file from a URL, useful for accessing structured data from APIs.

**Parameters:**
- `url` (required): URL of the JSON to fetch
- `headers` (optional): Custom headers to include in the request

**Example usage:**
"Fetch the event calendar JSON data from the city tourism API"

## Usage Guidelines

### When to Use Fetch Tools
- Research travel destinations and attractions
- Get up-to-date information on opening hours, prices, or special events
- Access tourism board recommendations
- Verify travel information from official sources
- Enhance trip proposals with accurate destination details

### Best Practices
1. Always fetch from official or trusted travel sources
2. Prefer markdown for reading structured content
3. Use HTML when you need to parse specific elements
4. Use plain text for simple information extraction
5. Use JSON for structured data from APIs

### Content Processing Workflow
1. Fetch relevant content using the appropriate format tool
2. Extract key information for the trip planning process
3. Combine with other travel research
4. Cite sources in travel documents when appropriate

### Security and Privacy
- Only fetch from public websites
- Do not attempt to access restricted content
- Respect website terms of service
- Do not store or redistribute copyrighted content without permission
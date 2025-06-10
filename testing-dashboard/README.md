# Travel Agent Testing Dashboard

A comprehensive web dashboard for monitoring and analyzing automated testing of the Claude Desktop travel agent system.

## Features

### 🏠 Overview Dashboard
- Real-time statistics (total tests, running tests, completion rate)
- Performance metrics and trends visualization
- Score distribution charts across quality dimensions

### 📊 Test Results
- Sortable and filterable table of all test results
- Search functionality by test ID and scenario
- Detailed test status and quality scores
- Export capabilities for reports

### 💬 Conversation Viewer
- Full conversation transcripts with timestamps
- MCP tool call monitoring with parameters and responses
- Performance timing for each interaction
- Error tracking and success rates

### ▶️ Test Runner
- Execute individual test scenarios
- Random test generation
- Batch testing capabilities (coming soon)
- Configurable test parameters

## Technology Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development Server
The dashboard runs at `http://localhost:3000/` with hot reload enabled.

## API Integration

The dashboard is configured to integrate with the Testing MCP Server:
- **Server URL**: `https://claude-travel-testing-mcp.somotravel.workers.dev`
- **Proxy Configuration**: Vite proxies `/api/*` requests to the MCP server
- **Authentication**: Token-based authentication (configuration needed)

### Available API Endpoints
- `GET /api/test-results` - Fetch all test results
- `GET /api/conversation/{sessionId}` - Get conversation capture data
- `POST /api/run-test` - Execute a test scenario
- `GET /api/scenarios` - List available test scenarios

## Mock Data

Currently using mock data for development and demonstration:
- Sample test results with various statuses and scores
- Mock conversation transcripts and tool calls
- Simulated real-time updates

## Components Architecture

```
src/
├── components/
│   ├── DashboardStats.tsx      # Statistics cards
│   ├── TestResultsTable.tsx    # Results table with filtering
│   ├── ConversationViewer.tsx  # Conversation transcript display
│   ├── PerformanceCharts.tsx   # Charts and visualizations
│   └── TestRunner.tsx          # Test execution interface
├── hooks/
│   └── useTestingAPI.ts        # API integration hook
├── types/
│   └── index.ts                # TypeScript interfaces
└── App.tsx                     # Main application component
```

## Quality Scoring Dimensions

The dashboard tracks 7 quality dimensions:
1. **Accuracy** - Correctness of information and tool usage
2. **Completeness** - Coverage of user requirements
3. **Efficiency** - Speed and resource optimization
4. **Helpfulness** - User satisfaction and value provided
5. **Professionalism** - Communication quality and tone
6. **Responsiveness** - Reaction time and engagement
7. **Context Awareness** - Understanding of conversation context

## Sprint S06 Integration

This dashboard is **Task T05** in Sprint S06 (Automated Testing System):
- Integrates with T01 (Core Testing MCP Server)
- Displays data from T03 (Conversation Capture System)  
- Shows analysis from T04 (Analysis and Scoring Engine)
- Supports T06 (Test Iteration System) workflows

## Deployment

The dashboard can be deployed to:
- **Vercel**: `vercel deploy`
- **Netlify**: `netlify deploy`
- **GitHub Pages**: `npm run build && gh-pages -d dist`
- **Docker**: Dockerfile included for containerized deployment

## Future Enhancements

- Real-time WebSocket connections for live updates
- Advanced filtering and search capabilities
- Custom report generation and scheduling
- Test result comparison and diff views
- Integration with CI/CD pipelines
- Mobile app companion
import express from 'express';
import cors from 'cors';
import path from 'path';
import { MCPWatcherService } from './watcher-service';
import { EnhancedMCPUseBridge } from './mcp-use-bridge';
import { ToolHealthChecker } from './tool-health-checker';
import { ClaudeConfigParser } from './claude-config-parser';

export class WebDashboard {
  private app: express.Application;
  private server: any;
  private watcher: MCPWatcherService;
  private bridge: EnhancedMCPUseBridge;
  private toolHealthChecker: ToolHealthChecker;
  private port: number;

  constructor(watcher: MCPWatcherService, port: number = 8888) {
    this.app = express();
    this.watcher = watcher;
    this.bridge = new EnhancedMCPUseBridge();
    this.toolHealthChecker = new ToolHealthChecker();
    this.port = port;

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../public')));
  }

  private setupRoutes(): void {
    // API Routes
    this.app.get('/api/status', async (req, res) => {
      try {
        const statuses = this.watcher.getServerStatus() as any[];
        const health = await this.bridge.getHealthStatus();

        res.json({
          servers: statuses,
          overall: health.overall,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    this.app.get('/api/operations', async (req, res) => {
      try {
        // Query operations from database
        const operations = await this.getRecentOperations();
        res.json(operations);
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    this.app.post('/api/test/:server/:operation', async (req, res) => {
      try {
        const { server, operation } = req.params;
        const payload = req.body;

        console.log(`🧪 Dashboard: Testing ${server}.${operation} with payload:`, payload);

        // Try direct API call first for real data, fallback to bridge simulation
        let result;
        let isRealData = false;
        
        try {
          console.log(`🌐 Attempting direct API call to ${server}...`);
          result = await this.directServerCall(server, operation, payload);
          isRealData = true;
          console.log(`✅ Direct API call successful to ${server}.${operation}`);
        } catch (directError: any) {
          console.warn(`⚠️ Direct API call failed for ${server}.${operation}:`, directError?.message || directError);
          
          try {
            console.log(`🔄 Falling back to bridge execution...`);
            result = await this.bridge.executeTool(server, operation, payload);
            console.log(`✅ Bridge execution successful (simulated data)`);
          } catch (bridgeError: any) {
            console.error(`❌ Both direct and bridge execution failed:`, bridgeError);
            throw new Error(`All execution methods failed. Direct: ${directError?.message || directError}, Bridge: ${bridgeError?.message || bridgeError}`);
          }
        }

        console.log(`✅ Dashboard: Test result (${isRealData ? 'REAL DATA' : 'SIMULATED'}):`, result);
        
        res.json({ 
          success: true, 
          result,
          dataSource: isRealData ? 'direct_api' : 'simulated',
          server: server,
          operation: operation,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error(`❌ Dashboard: Test failed:`, error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          server: req.params.server,
          operation: req.params.operation,
          timestamp: new Date().toISOString()
        });
      }
    });

    this.app.post('/api/diagnose', async (req, res) => {
      try {
        const { clientName } = req.body;
        const diagnosis = await this.bridge.diagnoseDataIntegrity(clientName);
        res.json(diagnosis);
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    this.app.post('/api/restart/:server', async (req, res) => {
      try {
        const { server } = req.params;
        const result = await this.restartServer(server);
        res.json(result);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // New tool health endpoints
    this.app.get('/api/tool-health', async (req, res) => {
      try {
        const results = await this.toolHealthChecker.checkAllServers();
        res.json({
          timestamp: new Date().toISOString(),
          results
        });
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    this.app.get('/api/tool-health/report', async (req, res) => {
      try {
        const report = await this.toolHealthChecker.getDetailedReport();
        res.json({
          timestamp: new Date().toISOString(),
          report
        });
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    this.app.get('/api/agents-versions', async (req, res) => {
      try {
        const versions = await this.toolHealthChecker.checkAgentsVersions();
        res.json({
          timestamp: new Date().toISOString(),
          versions
        });
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Get available tools for all servers
    this.app.get('/api/tools', async (req, res) => {
      try {
        console.log('🔧 API: Getting tools for all servers...');
        
        // Simple fallback approach - just return the expected tools
        const toolsData = this.getStaticServerTools();
        
        res.json({
          timestamp: new Date().toISOString(),
          tools: toolsData
        });
      } catch (error) {
        console.error('❌ Tools API error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Get tools for a specific server
    this.app.get('/api/tools/:server', async (req, res) => {
      try {
        const { server } = req.params;
        const tools = await this.getServerTools(server);
        res.json({
          timestamp: new Date().toISOString(),
          server,
          tools
        });
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Configuration info endpoint
    this.app.get('/api/config-info', async (req, res) => {
      try {
        const parser = new ClaudeConfigParser();
        const summary = await parser.getConfigSummary();
        res.json({
          timestamp: new Date().toISOString(),
          source: 'Claude Desktop Config',
          ...summary
        });
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Emergency agents package update endpoint
    this.app.post('/api/emergency/update-agents', async (req, res) => {
      try {
        const result = await this.emergencyUpdateAgentsPackage();
        res.json(result);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Serve the dashboard HTML
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });
  }

  // Direct API call to MCP server (fallback when bridge fails)
  private async directServerCall(serverName: string, operation: string, payload: any): Promise<any> {
    const axios = require('axios');
    
    // Server URL mapping
    const serverUrls: {[key: string]: string} = {
      'amadeus-api': 'https://amadeus-api-mcp.somotravel.workers.dev',
      'template-document': 'https://template-document-mcp.somotravel.workers.dev',
      'd1-database': 'https://clean-d1-mcp.somotravel.workers.dev',
      'google-places-api': 'https://google-places-api-mcp.somotravel.workers.dev',
      'r2-storage': 'https://r2-storage-mcp.somotravel.workers.dev',
      'mobile-interaction': 'https://mobile-interaction-mcp.somotravel.workers.dev',
      'prompt-instructions': 'https://prompt-instructions-mcp.somotravel.workers.dev',
      'github-mcp': 'https://github-mcp.somotravel.workers.dev',
      'sequential-thinking': 'https://sequential-thinking-mcp.somotravel.workers.dev',
      'cpmaxx-integration': 'https://cpmaxx-integration-mcp.somotravel.workers.dev'
    };

    // Auth headers
    const authHeaders: {[key: string]: string} = {
      'amadeus-api': 'Bearer amadeus-mcp-auth-key-2025',
      'template-document': 'Bearer template-document-auth-2025',
      'd1-database': 'Bearer clean-d1-auth-2025',
      'google-places-api': 'Bearer google-places-mcp-auth-key-2025',
      'r2-storage': 'Bearer r2-mcp-auth-key-2025',
      'mobile-interaction': 'Bearer mobile-interaction-mcp-auth-key-2025',
      'prompt-instructions': 'Bearer prompt-instructions-auth-2025',
      'github-mcp': 'Bearer github-mcp-auth-key-2025',
      'sequential-thinking': 'Bearer sequential-thinking-auth-2025',
      'cpmaxx-integration': 'Bearer cpmaxx-mcp-auth-1748978086-75d0c'
    };

    const url = serverUrls[serverName];
    const authHeader = authHeaders[serverName];

    if (!url || !authHeader) {
      throw new Error(`Server ${serverName} not configured for direct calls`);
    }

    const sessionId = `watcher-${Date.now()}`;
    console.log(`🌐 Starting MCP session for ${serverName} with session ID: ${sessionId}`);

    try {
      // Step 1: Initialize MCP session
      const initRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {}
          },
          clientInfo: {
            name: "mcp-watcher-service",
            version: "1.0.0"
          }
        }
      };

      console.log(`🔄 Initializing MCP session for ${serverName}`);
      const initResponse = await axios.post(`${url}/mcp`, initRequest, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
          // Note: No Mcp-Session-Id header for initialization
        },
        timeout: 15000
      });

      if (initResponse.data.error) {
        throw new Error(`MCP Init Error: ${initResponse.data.error.message || initResponse.data.error}`);
      }

      console.log(`✅ MCP session initialized for ${serverName}`);
      
      // Extract session ID from response headers if provided
      let actualSessionId = sessionId;
      if (initResponse.headers['mcp-session-id']) {
        actualSessionId = initResponse.headers['mcp-session-id'];
        console.log(`🔗 Using server-provided session ID: ${actualSessionId}`);
      } else {
        console.log(`🔗 Using client-generated session ID: ${actualSessionId}`);
      }

      // Step 2: Send notifications/ready (some servers require this)
      const notifyRequest = {
        jsonrpc: "2.0",
        method: "notifications/initialized"
      };

      await axios.post(`${url}/mcp`, notifyRequest, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'Mcp-Session-Id': actualSessionId
        },
        timeout: 5000
      });

      // Step 3: Call the actual tool
      const toolRequest = {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: operation,
          arguments: payload
        }
      };

      console.log(`🔧 Calling tool ${operation} on ${serverName}`);
      const toolResponse = await axios.post(`${url}/mcp`, toolRequest, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'Mcp-Session-Id': actualSessionId
        },
        timeout: 15000
      });

      // Handle JSON-RPC response
      if (toolResponse.data.error) {
        throw new Error(`MCP Tool Error: ${toolResponse.data.error.message || toolResponse.data.error}`);
      }

      console.log(`✅ Tool ${operation} completed successfully on ${serverName}`);
      console.log(`📋 MCP Response data:`, JSON.stringify(toolResponse.data, null, 2));
      
      // Return the result from the JSON-RPC response
      return toolResponse.data.result;
      
    } catch (error: any) {
      console.error(`❌ MCP session failed for ${serverName}:`, error.message);
      throw error;
    }
  }

  private async getAllServerTools(): Promise<{[serverName: string]: any[]}> {
    const { getConfig } = require('./config');
    const config = await getConfig();
    const allTools: {[serverName: string]: any[]} = {};

    console.log('🔧 Getting tools for servers:', config.mcpServers?.length || 0);

    if (!config.mcpServers || !Array.isArray(config.mcpServers)) {
      console.error('❌ config.mcpServers is not iterable:', typeof config.mcpServers);
      return allTools;
    }

    for (const server of config.mcpServers) {
      try {
        const tools = await this.getServerTools(server.name);
        allTools[server.name] = tools;
        console.log(`✅ Got ${tools.length} tools for ${server.name}`);
      } catch (error) {
        console.error(`Failed to get tools for ${server.name}:`, error);
        allTools[server.name] = [];
      }
    }

    return allTools;
  }

  private async getServerTools(serverName: string): Promise<any[]> {
    try {
      // Use the tool health checker to get tools for a specific server
      const result = await this.toolHealthChecker.checkServerTools(serverName);
      
      console.log(`🔧 Tools for ${serverName}:`, result);
      
      if (result.tools && result.tools.length > 0) {
        return result.tools.map(toolName => ({
          name: toolName,
          description: this.getToolDescription(serverName, toolName)
        }));
      } else {
        console.warn(`Server ${serverName} has no tools. Status: ${result.status}, Expected: ${result.expectedToolCount}`);
        
        // Fallback: return expected tools from our known list
        return this.getExpectedTools(serverName);
      }
    } catch (error) {
      console.error(`Error getting tools for ${serverName}:`, error);
      
      // Fallback: return expected tools from our known list
      return this.getExpectedTools(serverName);
    }
  }

  private getExpectedTools(serverName: string): any[] {
    const expectedTools: {[key: string]: string[]} = {
      'amadeus-api': ['test_connection', 'search_hotels', 'search_hotels_by_city', 'search_flights', 'search_poi', 'city_search', 'search_poi_by_coordinates', 'search_activities_by_coordinates'],
      'template-document': ['generate_itinerary', 'generate_packing_list', 'generate_travel_budget', 'generate_travel_checklist'],
      'd1-database': ['search_clients', 'search_trips', 'create_client', 'log_activity'],
      'google-places-api': ['search_places', 'get_place_details', 'download_place_photos'],
      'r2-storage': ['r2_upload_image', 'r2_list_images', 'r2_delete_image', 'generate_presigned_url', 'create_image_gallery', 'get_gallery_metadata'],
      'mobile-interaction': ['get_messages_by_label', 'send_message', 'get_chat_history', 'process_email'],
      'prompt-instructions': ['get_travel_instructions', 'update_mode', 'get_current_mode', 'search_instructions', 'validate_workflow'],
      'github-mcp': ['search_repositories', 'get_file_content', 'create_issue'],
      'sequential-thinking': ['think_step_by_step'],
      'cpmaxx-integration': ['search_hotels', 'search_cars', 'search_packages', 'download_hotel_photos']
    };

    const tools = expectedTools[serverName] || [];
    return tools.map(toolName => ({
      name: toolName,
      description: this.getToolDescription(serverName, toolName)
    }));
  }

  private getStaticServerTools(): {[serverName: string]: any[]} {
    const serverNames = [
      'amadeus-api', 'd1-database', 'google-places-api', 'r2-storage', 
      'template-document', 'mobile-interaction', 'prompt-instructions', 
      'github-mcp', 'sequential-thinking', 'cpmaxx-integration'
    ];

    const allTools: {[serverName: string]: any[]} = {};
    
    for (const serverName of serverNames) {
      allTools[serverName] = this.getExpectedTools(serverName);
    }

    return allTools;
  }

  private getToolDescription(serverName: string, toolName: string): string {
    // Known tool descriptions based on server type and tool name
    const descriptions: {[key: string]: {[tool: string]: string}} = {
      'amadeus-api': {
        'search_flights': 'Search for flights between airports',
        'search_hotels': 'Search for hotels in a city',
        'search_activities': 'Find activities and attractions',
        'get_hotel_ratings': 'Get hotel ratings and reviews',
        'test_connection': 'Test API connection',
        'search_poi': 'Search points of interest',
        'get_travel_recommendations': 'Get travel recommendations'
      },
      'd1-database': {
        'search_clients': 'Search for clients in the database',
        'search_trips': 'Search for trips',
        'create_client': 'Create a new client',
        'log_activity': 'Log an activity',
        'test_connection': 'Test database connection'
      },
      'google-places-api': {
        'search_places': 'Search for places using Google Places API',
        'get_place_details': 'Get detailed information about a place',
        'download_place_photos': 'Download photos for a place'
      },
      'r2-storage': {
        'r2_upload_image': 'Upload an image to R2 storage',
        'r2_list_images': 'List images in R2 storage',
        'create_image_gallery': 'Create an image gallery',
        'get_presigned_url': 'Get presigned URL for upload'
      },
      'template-document': {
        'generate_itinerary': 'Generate a travel itinerary',
        'generate_packing_list': 'Generate a packing list',
        'generate_travel_budget': 'Generate a travel budget',
        'generate_travel_checklist': 'Generate a travel checklist'
      },
      'mobile-interaction': {
        'get_messages_by_label': 'Get emails by label',
        'send_message': 'Send an email message',
        'process_email': 'Process incoming email',
        'get_contacts': 'Get contact list'
      },
      'prompt-instructions': {
        'get_travel_instructions': 'Get current travel mode instructions',
        'update_mode': 'Update travel agent mode',
        'get_current_mode': 'Get current travel agent mode',
        'get_system_prompt': 'Get system prompt'
      },
      'github-mcp': {
        'search_repositories': 'Search GitHub repositories',
        'get_file_content': 'Get content of a file',
        'create_issue': 'Create a GitHub issue'
      },
      'sequential-thinking': {
        'think_step_by_step': 'Perform step-by-step reasoning'
      },
      'cpmaxx-integration': {
        'search_hotels': 'Search hotels via CPMAXX',
        'search_cars': 'Search car rentals via CPMAXX',
        'search_packages': 'Search travel packages via CPMAXX'
      }
    };

    return descriptions[serverName]?.[toolName] || 'Tool operation';
  }

  private async getRecentOperations(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      // Access the watcher's database to get recent operations
      const db = (this.watcher as any).db;

      db.all(`
        SELECT * FROM operations
        ORDER BY updated_at DESC
        LIMIT 50
      `, (err: any, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => ({
            ...row,
            payload: row.payload ? JSON.parse(row.payload) : null,
            result: row.result ? JSON.parse(row.result) : null
          })));
        }
      });
    });
  }

  private async restartServer(serverName: string): Promise<any> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      // Get server config from watcher
      const config = require('./config').config;
      const server = config.mcpServers.find((s: any) => s.name === serverName);

      if (!server) {
        throw new Error(`Server ${serverName} not found in configuration`);
      }

      console.log(`🔄 Restarting ${serverName}...`);

      // Kill existing process if running
      try {
        const killCmd = `pkill -f "mcp_use.*--server ${serverName}"`;
        await execAsync(killCmd);
        console.log(`🛑 Stopped existing ${serverName} process`);

        // Wait a moment for cleanup
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        // Process might not be running, that's OK
        console.log(`ℹ️  No existing ${serverName} process found to stop`);
      }

      // Start new process
      const startCmd = `cd "${server.processWorkDir}" && nohup "${server.processCommand}" ${server.processArgs.join(' ')} > /tmp/${serverName}_startup.log 2>&1 &`;
      await execAsync(startCmd);

      console.log(`✅ Started ${serverName} process`);

      // Wait and verify multiple times with exponential backoff
      let processRunning = false;
      const maxAttempts = 6;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const waitTime = Math.min(1000 * attempt, 5000); // 1s, 2s, 3s, 4s, 5s, 5s
        await new Promise(resolve => setTimeout(resolve, waitTime));

        try {
          const verifyCmd = `ps aux | grep "mcp_use.*--server ${serverName}" | grep -v grep`;
          const { stdout } = await execAsync(verifyCmd);

          if (stdout.trim()) {
            processRunning = true;
            console.log(`✅ ${serverName} process confirmed running (attempt ${attempt})`);
            break;
          } else {
            console.log(`⏳ ${serverName} not yet running (attempt ${attempt}/${maxAttempts})`);
          }
        } catch (error) {
          console.log(`⏳ ${serverName} verification failed (attempt ${attempt}/${maxAttempts})`);
        }
      }

      if (processRunning) {
        return {
          success: true,
          message: `Server ${serverName} restarted successfully`,
          processRunning: true
        };
      } else {
        // Check startup log for errors
        try {
          const logContent = await execAsync(`tail -20 /tmp/${serverName}_startup.log`);
          console.error(`❌ ${serverName} startup log:`, logContent.stdout);
        } catch (e) {
          // Log file might not exist
        }
        throw new Error(`Process failed to start after ${maxAttempts} verification attempts`);
      }

    } catch (error) {
      console.error(`❌ Failed to restart ${serverName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Failed to restart ${serverName}`
      };
    }
  }

  private async emergencyUpdateAgentsPackage(): Promise<any> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      console.log('🚨 Emergency agents package update initiated...');
      
      const serverDirs = [
        '/home/neil/dev/new-claude-travel-agent/remote-mcp-servers/amadeus-api-mcp',
        '/home/neil/dev/new-claude-travel-agent/remote-mcp-servers/template-document-mcp',
        '/home/neil/dev/new-claude-travel-agent/remote-mcp-servers/d1-database_2',
        '/home/neil/dev/new-claude-travel-agent/remote-mcp-servers/google-places-api-mcp',
        '/home/neil/dev/new-claude-travel-agent/remote-mcp-servers/r2-storage-mcp',
        '/home/neil/dev/new-claude-travel-agent/remote-mcp-servers/mobile-interaction-mcp',
        '/home/neil/dev/new-claude-travel-agent/remote-mcp-servers/prompt-instructions-mcp',
        '/home/neil/dev/new-claude-travel-agent/remote-mcp-servers/github-mcp',
        '/home/neil/dev/new-claude-travel-agent/remote-mcp-servers/sequential-thinking-mcp',
        '/home/neil/dev/new-claude-travel-agent/remote-mcp-servers/cpmaxx-integration-mcp'
      ];

      const results = [];
      
      for (const dir of serverDirs) {
        try {
          console.log(`📦 Updating agents package in ${dir}...`);
          const { stdout, stderr } = await execAsync(`cd "${dir}" && npm install agents@latest`);
          
          results.push({
            directory: dir,
            success: true,
            output: stdout,
            stderr: stderr || null
          });
          
          console.log(`✅ Updated agents package in ${dir}`);
        } catch (error) {
          results.push({
            directory: dir,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          console.error(`❌ Failed to update agents package in ${dir}:`, error);
        }
      }

      // Attempt to redeploy servers
      console.log('🚀 Attempting to redeploy updated servers...');
      const deployResults = [];
      
      for (const dir of serverDirs) {
        try {
          const serverName = dir.split('/').pop();
          console.log(`🚀 Deploying ${serverName}...`);
          
          const { stdout, stderr } = await execAsync(`cd "${dir}" && wrangler deploy`);
          
          deployResults.push({
            server: serverName,
            success: true,
            output: stdout,
            stderr: stderr || null
          });
          
          console.log(`✅ Deployed ${serverName}`);
        } catch (error) {
          deployResults.push({
            server: dir.split('/').pop(),
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          console.error(`❌ Failed to deploy ${dir}:`, error);
        }
      }

      return {
        success: true,
        message: 'Emergency agents package update completed',
        updateResults: results,
        deployResults: deployResults,
        recommendation: 'Restart Claude Desktop to pick up the changes'
      };

    } catch (error) {
      console.error('❌ Emergency update failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Emergency agents package update failed'
      };
    }
  }

  async start(): Promise<void> {
    await this.bridge.initialize();

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, '0.0.0.0', () => {
        console.log(`🌐 MCP Watcher Dashboard running at http://localhost:${this.port}`);
        resolve();
      });

      this.server.on('error', (error: any) => {
        console.error(`❌ Failed to start web server on port ${this.port}:`, error);
        reject(error);
      });
    });
  }

  async stop(): Promise<void> {
    await this.bridge.shutdown();

    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🌐 Dashboard server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

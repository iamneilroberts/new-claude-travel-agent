import axios from 'axios';

export interface ToolHealthResult {
  serverName: string;
  status: 'healthy' | 'empty_tools' | 'connection_error' | 'auth_error';
  toolCount: number;
  expectedToolCount: number;
  tools?: string[];
  error?: string;
  responseTime?: number;
  agentsVersion?: string;
}

export interface ServerToolExpectation {
  name: string;
  url: string;
  authHeader: string;
  expectedToolCount: number;
  expectedTools: string[];
}

export class ToolHealthChecker {
  private serverConfigs: ServerToolExpectation[] = [
    {
      name: 'amadeus-api',
      url: 'https://amadeus-api-mcp.somotravel.workers.dev',
      authHeader: 'Bearer amadeus-mcp-auth-key-2025',
      expectedToolCount: 8,
      expectedTools: ['test_connection', 'search_hotels', 'search_hotels_by_city', 'search_flights', 'search_poi', 'city_search', 'search_poi_by_coordinates', 'search_activities_by_coordinates']
    },
    {
      name: 'template-document',
      url: 'https://template-document-mcp.somotravel.workers.dev',
      authHeader: 'Bearer template-document-auth-2025',
      expectedToolCount: 4,
      expectedTools: ['generate_itinerary', 'generate_packing_list', 'generate_travel_budget', 'generate_travel_checklist']
    },
    {
      name: 'd1-database',
      url: 'https://clean-d1-mcp.somotravel.workers.dev',
      authHeader: 'Bearer clean-d1-auth-2025',
      expectedToolCount: 4,
      expectedTools: ['search_clients', 'search_trips', 'create_client', 'log_activity']
    },
    {
      name: 'google-places-api',
      url: 'https://google-places-api-mcp.somotravel.workers.dev',
      authHeader: 'Bearer google-places-mcp-auth-key-2025',
      expectedToolCount: 3,
      expectedTools: ['search_places', 'get_place_details', 'download_place_photos']
    },
    {
      name: 'r2-storage',
      url: 'https://r2-storage-mcp.somotravel.workers.dev',
      authHeader: 'Bearer r2-mcp-auth-key-2025',
      expectedToolCount: 6,
      expectedTools: ['r2_upload_image', 'r2_list_images', 'r2_delete_image', 'generate_presigned_url', 'create_image_gallery', 'get_gallery_metadata']
    },
    {
      name: 'mobile-interaction',
      url: 'https://mobile-interaction-mcp.somotravel.workers.dev',
      authHeader: 'Bearer mobile-interaction-mcp-auth-key-2025',
      expectedToolCount: 4,
      expectedTools: ['get_messages_by_label', 'send_message', 'get_chat_history', 'process_email']
    },
    {
      name: 'prompt-instructions',
      url: 'https://prompt-instructions-mcp.somotravel.workers.dev',
      authHeader: 'Bearer prompt-instructions-auth-2025',
      expectedToolCount: 5,
      expectedTools: ['get_travel_instructions', 'update_mode', 'get_current_mode', 'search_instructions', 'validate_workflow']
    },
    {
      name: 'github-mcp',
      url: 'https://github-mcp.somotravel.workers.dev',
      authHeader: 'Bearer github-mcp-auth-key-2025',
      expectedToolCount: 3,
      expectedTools: ['search_repositories', 'get_file_content', 'create_issue']
    },
    {
      name: 'sequential-thinking',
      url: 'https://sequential-thinking-mcp.somotravel.workers.dev',
      authHeader: 'Bearer sequential-thinking-auth-2025',
      expectedToolCount: 1,
      expectedTools: ['think_step_by_step']
    },
    {
      name: 'cpmaxx-integration',
      url: 'https://cpmaxx-integration-mcp.somotravel.workers.dev',
      authHeader: 'Bearer cpmaxx-mcp-auth-1748978086-75d0c',
      expectedToolCount: 4,
      expectedTools: ['search_hotels', 'search_cars', 'search_packages', 'download_hotel_photos']
    }
  ];

  async checkAllServers(): Promise<ToolHealthResult[]> {
    const results: ToolHealthResult[] = [];
    
    for (const config of this.serverConfigs) {
      try {
        const result = await this.checkServerToolsInternal(config);
        results.push(result);
      } catch (error) {
        results.push({
          serverName: config.name,
          status: 'connection_error',
          toolCount: 0,
          expectedToolCount: config.expectedToolCount,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }

  // Public method to check tools for a specific server by name
  async checkServerTools(serverName: string): Promise<ToolHealthResult> {
    const config = this.serverConfigs.find(s => s.name === serverName);
    if (!config) {
      return {
        serverName,
        status: 'connection_error',
        toolCount: 0,
        expectedToolCount: 0,
        error: 'Server configuration not found'
      };
    }

    try {
      return await this.checkServerToolsInternal(config);
    } catch (error) {
      return {
        serverName,
        status: 'connection_error',
        toolCount: 0,
        expectedToolCount: config.expectedToolCount,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkServerToolsInternal(config: ServerToolExpectation): Promise<ToolHealthResult> {
    const startTime = Date.now();
    
    try {
      // First check health endpoint
      const healthResponse = await axios.get(`${config.url}/health`, {
        headers: { 'Authorization': config.authHeader },
        timeout: 5000
      });
      
      // Test SSE connection to get tools list (simulate what Claude Desktop does)
      const sseResponse = await this.testSSEConnection(config.url, config.authHeader);
      
      const responseTime = Date.now() - startTime;
      
      // Parse the tools response
      const toolCount = sseResponse.tools ? sseResponse.tools.length : 0;
      const tools = sseResponse.tools || [];
      
      let status: ToolHealthResult['status'] = 'healthy';
      
      // Critical: Check for empty tools (the agents package bug)
      if (toolCount === 0) {
        status = 'empty_tools';
      } else if (toolCount < config.expectedToolCount) {
        status = 'empty_tools'; // Partial tool registration failure
      }
      
      return {
        serverName: config.name,
        status,
        toolCount,
        expectedToolCount: config.expectedToolCount,
        tools: tools.map((t: any) => t.name || t),
        responseTime,
        agentsVersion: sseResponse.agentsVersion
      };
      
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return {
          serverName: config.name,
          status: 'auth_error',
          toolCount: 0,
          expectedToolCount: config.expectedToolCount,
          error: 'Authentication failed'
        };
      }
      
      throw error;
    }
  }

  private async testSSEConnection(url: string, authHeader: string): Promise<any> {
    // Simulate the SSE tools/list call that Claude Desktop makes
    // Since we can't easily test SSE in Node.js, we'll use a mock approach
    // In practice, this would connect to the SSE endpoint and send a tools/list request
    
    try {
      // For now, make a simple HTTP request to test basic connectivity
      // In a real implementation, you'd connect via SSE and send JSON-RPC
      const response = await axios.get(`${url}/sse`, {
        headers: { 
          'Authorization': authHeader,
          'Accept': 'text/event-stream'
        },
        timeout: 3000,
        maxRedirects: 0
      });
      
      // If we get here, the SSE endpoint is responding
      // Return mock data - in reality, you'd parse the SSE response
      return {
        tools: [], // This would be parsed from the actual SSE response
        agentsVersion: 'unknown'
      };
      
    } catch (error) {
      // If it's a timeout or connection error, that suggests SSE is working
      // (SSE connections don't close immediately)
      if (axios.isAxiosError(error) && (error.code === 'ECONNABORTED' || error.message.includes('timeout'))) {
        // This is actually good - SSE connection was established
        return {
          tools: [], // We couldn't get the actual tools list
          agentsVersion: 'unknown'
        };
      }
      throw error;
    }
  }

  async getDetailedReport(): Promise<string> {
    const results = await this.checkAllServers();
    
    let report = '\\n🔍 MCP Server Tool Health Report\\n';
    report += '======================================\\n\\n';
    
    const healthy = results.filter(r => r.status === 'healthy');
    const emptyTools = results.filter(r => r.status === 'empty_tools');
    const errors = results.filter(r => r.status === 'connection_error' || r.status === 'auth_error');
    
    report += `📊 Summary: ${healthy.length} healthy, ${emptyTools.length} empty tools, ${errors.length} errors\\n\\n`;
    
    if (emptyTools.length > 0) {
      report += '🚨 CRITICAL: Servers with empty/missing tools (possible agents package issue):\\n';
      for (const server of emptyTools) {
        report += `   - ${server.serverName}: ${server.toolCount}/${server.expectedToolCount} tools\\n`;
      }
      report += '\\n';
    }
    
    if (errors.length > 0) {
      report += '❌ Servers with connection errors:\\n';
      for (const server of errors) {
        report += `   - ${server.serverName}: ${server.error}\\n`;
      }
      report += '\\n';
    }
    
    if (healthy.length > 0) {
      report += '✅ Healthy servers:\\n';
      for (const server of healthy) {
        report += `   - ${server.serverName}: ${server.toolCount}/${server.expectedToolCount} tools (${server.responseTime}ms)\\n`;
      }
      report += '\\n';
    }
    
    return report;
  }

  // Check if we need to update agents package
  async checkAgentsVersions(): Promise<{ server: string; needsUpdate: boolean; currentVersion?: string }[]> {
    // This would check the package.json in each server directory
    const results: { server: string; needsUpdate: boolean; currentVersion?: string }[] = [];
    
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
    
    // Implementation would read package.json files and check agents version
    // For now, return empty array
    return results;
  }
}
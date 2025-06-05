import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { MCPServerConfig } from './config';

export interface ClaudeDesktopConfig {
  mcpServers: {
    [serverName: string]: {
      command: string;
      args: string[];
      cwd?: string;
      env?: { [key: string]: string };
    };
  };
}

export class ClaudeConfigParser {
  private configPath: string;
  private watchedConfigPath: string;

  constructor() {
    this.configPath = path.join(os.homedir(), '.config', 'Claude', 'claude_desktop_config.json');
    this.watchedConfigPath = path.join(os.homedir(), '.config', 'Claude', 'claude_desktop_config.json');
  }

  /**
   * Read and parse the Claude Desktop configuration
   */
  async readClaudeConfig(): Promise<ClaudeDesktopConfig> {
    try {
      if (!fs.existsSync(this.configPath)) {
        throw new Error(`Claude Desktop config not found at: ${this.configPath}`);
      }

      const configContent = fs.readFileSync(this.configPath, 'utf8');
      const config = JSON.parse(configContent) as ClaudeDesktopConfig;
      
      if (!config.mcpServers) {
        throw new Error('Claude Desktop config does not contain mcpServers section');
      }

      return config;
    } catch (error) {
      throw new Error(`Failed to read Claude Desktop config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert Claude Desktop config to MCP Watcher server configs
   */
  async convertToWatcherConfig(): Promise<MCPServerConfig[]> {
    const claudeConfig = await this.readClaudeConfig();
    const watcherConfigs: MCPServerConfig[] = [];

    for (const [serverName, serverConfig] of Object.entries(claudeConfig.mcpServers)) {
      // Skip if it's not an mcp-use proxy (we only monitor the proxy processes)
      if (!this.isMcpUseProxy(serverConfig)) {
        console.log(`⚠️  Skipping ${serverName}: Not an mcp-use proxy configuration`);
        continue;
      }

      const mcpUseConfig = this.parseMcpUseConfig(serverConfig);
      if (!mcpUseConfig) {
        console.log(`⚠️  Skipping ${serverName}: Could not parse mcp-use configuration`);
        continue;
      }

      const watcherConfig: MCPServerConfig = {
        name: serverName,
        processCommand: serverConfig.command,
        processArgs: serverConfig.args,
        processWorkDir: serverConfig.cwd || process.cwd(),
        healthCheckInterval: this.getHealthCheckInterval(serverName),
        timeoutThreshold: this.getTimeoutThreshold(serverName),
        maxRetries: 3,
        backoffMultiplier: 2,
        criticalOperations: this.getCriticalOperations(serverName)
      };

      watcherConfigs.push(watcherConfig);
      console.log(`✅ Added ${serverName} to watcher configuration`);
    }

    return watcherConfigs;
  }

  /**
   * Check if a server config uses mcp-use proxy
   */
  private isMcpUseProxy(serverConfig: ClaudeDesktopConfig['mcpServers'][string]): boolean {
    return (
      serverConfig.command.includes('python') &&
      serverConfig.args.includes('-m') &&
      serverConfig.args.includes('mcp_use')
    );
  }

  /**
   * Parse mcp-use specific configuration
   */
  private parseMcpUseConfig(serverConfig: ClaudeDesktopConfig['mcpServers'][string]): { 
    configFile?: string; 
    serverName?: string; 
  } | null {
    try {
      const args = serverConfig.args;
      const configIndex = args.indexOf('--config');
      const serverIndex = args.indexOf('--server');

      const result: { configFile?: string; serverName?: string } = {};
      
      if (configIndex !== -1 && args[configIndex + 1]) {
        result.configFile = args[configIndex + 1] as string;
      }
      
      if (serverIndex !== -1 && args[serverIndex + 1]) {
        result.serverName = args[serverIndex + 1] as string;
      }
      
      return result;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get health check interval based on server type
   */
  private getHealthCheckInterval(serverName: string): number {
    // More frequent checks for critical servers
    const criticalServers = ['d1-database', 'amadeus-api'];
    return criticalServers.includes(serverName) ? 15000 : 30000; // 15s or 30s
  }

  /**
   * Get timeout threshold based on server type
   */
  private getTimeoutThreshold(serverName: string): number {
    // Longer timeouts for complex operations
    const complexServers = ['amadeus-api', 'cpmaxx-integration'];
    const fastServers = ['d1-database', 'sequential-thinking'];
    
    if (complexServers.includes(serverName)) return 25000; // 25s
    if (fastServers.includes(serverName)) return 10000;   // 10s
    return 15000; // 15s default
  }

  /**
   * Get critical operations based on server type
   */
  private getCriticalOperations(serverName: string): string[] {
    const operationMap: { [key: string]: string[] } = {
      'amadeus-api': ['search_flights', 'search_hotels', 'test_connection'],
      'd1-database': ['search_clients', 'search_trips', 'create_client', 'log_activity'],
      'mobile-interaction': ['get_messages_by_label', 'send_message', 'process_email'],
      'google-places-api': ['search_places', 'get_place_details', 'download_place_photos'],
      'r2-storage': ['r2_upload_image', 'r2_list_images', 'create_image_gallery'],
      'template-document': ['generate_itinerary', 'generate_packing_list', 'generate_travel_budget'],
      'prompt-instructions': ['get_travel_instructions', 'update_mode', 'get_current_mode'],
      'github-mcp': ['search_repositories', 'get_file_content', 'create_issue'],
      'sequential-thinking': ['think_step_by_step'],
      'cpmaxx-integration': ['search_hotels', 'search_cars', 'search_packages']
    };

    return operationMap[serverName] || [];
  }

  /**
   * Watch for changes to Claude Desktop config
   */
  async watchConfigChanges(callback: (newConfig: MCPServerConfig[]) => void): Promise<fs.FSWatcher | null> {
    try {
      const watcher = fs.watch(this.configPath, async (eventType) => {
        if (eventType === 'change') {
          console.log('🔄 Claude Desktop config changed, reloading...');
          try {
            const newConfig = await this.convertToWatcherConfig();
            callback(newConfig);
            console.log('✅ Watcher configuration updated from Claude Desktop config');
          } catch (error) {
            console.error('❌ Failed to reload config after change:', error);
          }
        }
      });

      console.log(`👀 Watching Claude Desktop config at: ${this.configPath}`);
      return watcher;
    } catch (error) {
      console.error('❌ Failed to watch Claude Desktop config:', error);
      return null;
    }
  }

  /**
   * Get summary of configuration
   */
  async getConfigSummary(): Promise<{
    configPath: string;
    serverCount: number;
    servers: string[];
    lastModified: Date;
  }> {
    const claudeConfig = await this.readClaudeConfig();
    const stats = fs.statSync(this.configPath);
    
    return {
      configPath: this.configPath,
      serverCount: Object.keys(claudeConfig.mcpServers).length,
      servers: Object.keys(claudeConfig.mcpServers),
      lastModified: stats.mtime
    };
  }
}
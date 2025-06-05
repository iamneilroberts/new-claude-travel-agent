export interface MCPServerConfig {
  name: string;
  processCommand: string;
  processArgs: string[];
  processWorkDir: string;
  healthCheckInterval: number; // ms
  timeoutThreshold: number; // ms
  maxRetries: number;
  backoffMultiplier: number;
  criticalOperations: string[]; // tool names that should be chunked
}

export interface WatcherConfig {
  mcpServers: MCPServerConfig[];
  database: {
    path: string;
  };
  healthCheck: {
    interval: number; // ms
    timeout: number; // ms
  };
  recovery: {
    maxRetries: number;
    baseDelay: number; // ms
    maxDelay: number; // ms
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    file?: string;
  };
  autoSync: {
    enabled: boolean;
    claudeConfigPath?: string;
  };
}

// Base configuration with non-server specific settings
export const baseConfig: Omit<WatcherConfig, 'mcpServers'> = {
  database: {
    path: './watcher.db'
  },
  healthCheck: {
    interval: 10000, // 10s
    timeout: 5000 // 5s
  },
  recovery: {
    maxRetries: 3,
    baseDelay: 1000, // 1s
    maxDelay: 30000 // 30s
  },
  logging: {
    level: 'info'
  },
  autoSync: {
    enabled: true
  }
};

// Dynamic configuration loader
import { ClaudeConfigParser } from './claude-config-parser';

let _configCache: WatcherConfig | null = null;

export async function getConfig(): Promise<WatcherConfig> {
  if (_configCache && !baseConfig.autoSync.enabled) {
    return _configCache;
  }

  try {
    const parser = new ClaudeConfigParser();
    const mcpServers = await parser.convertToWatcherConfig();
    
    _configCache = {
      ...baseConfig,
      mcpServers
    };

    console.log(`✅ Loaded configuration with ${mcpServers.length} MCP servers from Claude Desktop config`);
    return _configCache;
  } catch (error) {
    console.error('❌ Failed to load configuration from Claude Desktop config:', error);
    
    // Fallback to empty servers list
    _configCache = {
      ...baseConfig,
      mcpServers: []
    };
    
    return _configCache;
  }
}

export function clearConfigCache(): void {
  _configCache = null;
}

// Legacy export for backward compatibility
export const config = baseConfig;

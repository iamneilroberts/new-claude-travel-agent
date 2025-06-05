import * as cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';
import Database from 'sqlite3';
import { WatcherConfig, MCPServerConfig, getConfig, clearConfigCache } from './config';
import { ClaudeConfigParser } from './claude-config-parser';

const execAsync = promisify(exec);

export interface MCPServerStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: Date;
  lastSuccess: Date;
  consecutiveFailures: number;
  responseTime?: number;
  error?: string;
}

export interface OperationRecord {
  id: string;
  serverName: string;
  operation: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'retrying';
  attempt: number;
  maxAttempts: number;
  createdAt: Date;
  updatedAt: Date;
  payload?: any;
  result?: any;
  error?: string;
  chunks?: OperationChunk[];
}

export interface OperationChunk {
  id: string;
  operationId: string;
  chunkIndex: number;
  status: 'pending' | 'completed' | 'failed';
  payload: any;
  result?: any;
  error?: string;
}

export class MCPWatcherService {
  private config: WatcherConfig;
  private db: Database.Database;
  private serverStatuses: Map<string, MCPServerStatus> = new Map();
  private healthCheckTask?: cron.ScheduledTask;
  private configWatcher?: any;
  private running = false;

  constructor(config?: WatcherConfig) {
    // If no config provided, we'll load it dynamically
    this.config = config || { 
      mcpServers: [], 
      database: { path: './watcher.db' },
      healthCheck: { interval: 10000, timeout: 5000 },
      recovery: { maxRetries: 3, baseDelay: 1000, maxDelay: 30000 },
      logging: { level: 'info' },
      autoSync: { enabled: true }
    };
    this.db = new Database.Database(this.config.database.path);
  }

  async start(): Promise<void> {
    this.running = true;

    // Load configuration from Claude Desktop config
    await this.loadConfiguration();

    // Initialize database
    await this.initializeDatabase();

    // Initialize server statuses
    for (const server of this.config.mcpServers) {
      this.serverStatuses.set(server.name, {
        name: server.name,
        status: 'healthy',
        lastCheck: new Date(),
        lastSuccess: new Date(),
        consecutiveFailures: 0
      });
    }

    // Start health check cron job
    this.healthCheckTask = cron.schedule('*/10 * * * * *', async () => {
      if (this.running) {
        await this.performHealthChecks();
      }
    });

    console.log(`🔍 Monitoring ${this.config.mcpServers.length} MCP servers`);
  }

  async stop(): Promise<void> {
    this.running = false;

    if (this.healthCheckTask) {
      this.healthCheckTask.stop();
    }

    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        }
        resolve();
      });
    });
  }

  private async loadConfiguration(): Promise<void> {
    try {
      console.log('🔄 Loading configuration from Claude Desktop config...');
      this.config = await getConfig();
      
      console.log(`✅ Loaded ${this.config.mcpServers.length} MCP servers from configuration`);
      this.config.mcpServers.forEach(server => {
        console.log(`   - ${server.name}`);
      });

      // Set up config file watching if enabled
      if (this.config.autoSync.enabled) {
        await this.setupConfigWatching();
      }
    } catch (error) {
      console.error('❌ Failed to load configuration:', error);
      throw error;
    }
  }

  private async setupConfigWatching(): Promise<void> {
    try {
      const parser = new ClaudeConfigParser();
      this.configWatcher = await parser.watchConfigChanges(async (newConfig) => {
        console.log('🔄 Claude Desktop config changed, updating watcher...');
        
        // Update our config
        this.config.mcpServers = newConfig;
        clearConfigCache();
        
        // Reinitialize server statuses for new/removed servers
        await this.updateServerStatuses(newConfig);
        
        console.log(`✅ Updated to ${newConfig.length} MCP servers`);
      });
      
      if (this.configWatcher) {
        console.log('👀 Watching Claude Desktop config for changes');
      }
    } catch (error) {
      console.error('⚠️  Failed to set up config watching:', error);
    }
  }

  private async updateServerStatuses(newServers: MCPServerConfig[]): Promise<void> {
    // Remove servers that no longer exist
    const newServerNames = new Set(newServers.map(s => s.name));
    for (const existingName of this.serverStatuses.keys()) {
      if (!newServerNames.has(existingName)) {
        this.serverStatuses.delete(existingName);
        console.log(`🗑️  Removed server: ${existingName}`);
      }
    }

    // Add new servers
    for (const server of newServers) {
      if (!this.serverStatuses.has(server.name)) {
        this.serverStatuses.set(server.name, {
          name: server.name,
          status: 'down',
          lastCheck: new Date(),
          lastSuccess: new Date(),
          consecutiveFailures: 0
        });
        console.log(`➕ Added server: ${server.name}`);
      }
    }
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Server status table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS server_status (
            name TEXT PRIMARY KEY,
            status TEXT NOT NULL,
            last_check DATETIME NOT NULL,
            last_success DATETIME NOT NULL,
            consecutive_failures INTEGER DEFAULT 0,
            response_time INTEGER,
            error TEXT
          )
        `);

        // Operations tracking table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS operations (
            id TEXT PRIMARY KEY,
            server_name TEXT NOT NULL,
            operation TEXT NOT NULL,
            status TEXT NOT NULL,
            attempt INTEGER DEFAULT 1,
            max_attempts INTEGER DEFAULT 3,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            payload TEXT,
            result TEXT,
            error TEXT
          )
        `);

        // Operation chunks table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS operation_chunks (
            id TEXT PRIMARY KEY,
            operation_id TEXT NOT NULL,
            chunk_index INTEGER NOT NULL,
            status TEXT NOT NULL,
            payload TEXT NOT NULL,
            result TEXT,
            error TEXT,
            FOREIGN KEY (operation_id) REFERENCES operations(id)
          )
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  }

  private async performHealthChecks(): Promise<void> {
    const promises = this.config.mcpServers.map(server => this.checkServerHealth(server));
    await Promise.allSettled(promises);

    // Update database with current statuses
    await this.updateServerStatusesInDatabase();

    // Log overall health
    this.logHealthSummary();
  }

  private async checkServerHealth(server: MCPServerConfig): Promise<void> {
    const startTime = Date.now();
    const status = this.serverStatuses.get(server.name)!;

    try {
      // Check if the mcp-use process is running for this server
      const processPattern = `mcp_use.*--server ${server.name}`;
      const { stdout } = await execAsync(`ps aux | grep "${processPattern}" | grep -v grep`);

      const responseTime = Date.now() - startTime;

      if (stdout.trim()) {
        // Process is running
        const processes = stdout.trim().split('\n');
        const processCount = processes.length;

        if (processCount > 0) {
          // Success - process is running
          status.status = responseTime > server.timeoutThreshold ? 'degraded' : 'healthy';
          status.lastSuccess = new Date();
          status.consecutiveFailures = 0;
          status.responseTime = responseTime;
          delete status.error;
        } else {
          throw new Error('No processes found');
        }
      } else {
        throw new Error('MCP process not running');
      }

    } catch (error) {
      // Failure - process not found or error checking
      status.status = 'down';
      status.consecutiveFailures++;
      status.error = error instanceof Error ? error.message : 'Unknown error';

      if (status.consecutiveFailures >= server.maxRetries) {
        console.warn(`🚨 Server ${server.name} is down (${status.consecutiveFailures} consecutive failures)`);
        // Could trigger recovery actions here
      }
    }

    status.lastCheck = new Date();
  }

  private async updateServerStatusesInDatabase(): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO server_status
      (name, status, last_check, last_success, consecutive_failures, response_time, error)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const [name, status] of this.serverStatuses) {
      stmt.run(
        name,
        status.status,
        status.lastCheck.toISOString(),
        status.lastSuccess.toISOString(),
        status.consecutiveFailures,
        status.responseTime || null,
        status.error || null
      );
    }

    stmt.finalize();
  }

  private logHealthSummary(): void {
    const healthy = Array.from(this.serverStatuses.values()).filter(s => s.status === 'healthy').length;
    const degraded = Array.from(this.serverStatuses.values()).filter(s => s.status === 'degraded').length;
    const down = Array.from(this.serverStatuses.values()).filter(s => s.status === 'down').length;

    console.log(`📊 Health Summary: ${healthy} healthy, ${degraded} degraded, ${down} down`);

    if (down > 0) {
      const downServers = Array.from(this.serverStatuses.values())
        .filter(s => s.status === 'down')
        .map(s => `${s.name} (${s.consecutiveFailures} failures)`)
        .join(', ');
      console.warn(`⚠️  Down servers: ${downServers}`);
    }
  }

  // Public API for operation management
  async executeWithRetry(serverName: string, operation: string, payload: any): Promise<any> {
    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check if this is a critical operation that should be chunked
    const server = this.config.mcpServers.find(s => s.name === serverName);
    if (server?.criticalOperations.includes(operation)) {
      return this.executeChunkedOperation(operationId, serverName, operation, payload);
    }

    return this.executeSimpleOperation(operationId, serverName, operation, payload);
  }

  private async executeSimpleOperation(id: string, serverName: string, operation: string, payload: any): Promise<any> {
    const server = this.config.mcpServers.find(s => s.name === serverName);
    if (!server) {
      throw new Error(`Unknown server: ${serverName}`);
    }

    // Store operation record
    await this.storeOperation({
      id,
      serverName,
      operation,
      status: 'pending',
      attempt: 1,
      maxAttempts: server.maxRetries,
      createdAt: new Date(),
      updatedAt: new Date(),
      payload
    });

    return this.retryOperation(id, server, operation, payload);
  }

  private async retryOperation(operationId: string, server: MCPServerConfig, operation: string, payload: any): Promise<any> {
    let attempt = 1;

    while (attempt <= server.maxRetries) {
      try {
        // Update status to in_progress
        await this.updateOperationStatus(operationId, 'in_progress', attempt);

        // For process monitoring, we can't directly execute operations
        // This would require implementing a JSON-RPC client to communicate with the mcp-use processes
        // For now, we'll simulate success if the process is running
        const processPattern = `mcp_use.*--server ${server.name}`;
        const { stdout } = await execAsync(`ps aux | grep "${processPattern}" | grep -v grep`);

        if (stdout.trim()) {
          // Process is running - simulate operation success
          const result = {
            success: true,
            operation,
            message: `Operation ${operation} simulated (process monitoring mode)`,
            processRunning: true
          };

          await this.updateOperationStatus(operationId, 'completed', attempt, result);
          return result;
        } else {
          throw new Error('MCP process not running');
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`⚠️  ${server.name}.${operation} failed (attempt ${attempt}/${server.maxRetries}): ${errorMessage}`);

        if (attempt === server.maxRetries) {
          // Final failure
          await this.updateOperationStatus(operationId, 'failed', attempt, null, errorMessage);
          throw error;
        }

        // Wait before retry
        const delay = this.config.recovery.baseDelay * Math.pow(server.backoffMultiplier, attempt - 1);
        const cappedDelay = Math.min(delay, this.config.recovery.maxDelay);

        await this.updateOperationStatus(operationId, 'retrying', attempt, null, errorMessage);
        await new Promise(resolve => setTimeout(resolve, cappedDelay));

        attempt++;
      }
    }

    throw new Error(`Operation ${operation} failed after ${server.maxRetries} attempts`);
  }

  private async executeChunkedOperation(id: string, serverName: string, operation: string, payload: any): Promise<any> {
    // This is where we'd implement operation chunking logic
    // For now, just delegate to simple operation
    console.log(`🔄 Chunking operation ${operation} for ${serverName} (not yet implemented)`);
    return this.executeSimpleOperation(id, serverName, operation, payload);
  }

  private async storeOperation(operation: OperationRecord): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO operations
        (id, server_name, operation, status, attempt, max_attempts, created_at, updated_at, payload)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        operation.id,
        operation.serverName,
        operation.operation,
        operation.status,
        operation.attempt,
        operation.maxAttempts,
        operation.createdAt.toISOString(),
        operation.updatedAt.toISOString(),
        JSON.stringify(operation.payload),
        (err: any) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );

      stmt.finalize();
    });
  }

  private async updateOperationStatus(
    id: string,
    status: string,
    attempt: number,
    result?: any,
    error?: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        UPDATE operations
        SET status = ?, attempt = ?, updated_at = ?, result = ?, error = ?
        WHERE id = ?
      `);

      stmt.run(
        status,
        attempt,
        new Date().toISOString(),
        result ? JSON.stringify(result) : null,
        error || null,
        id,
        (err: any) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );

      stmt.finalize();
    });
  }

  // Public API to get server status
  getServerStatus(serverName?: string): MCPServerStatus | MCPServerStatus[] {
    if (serverName) {
      const status = this.serverStatuses.get(serverName);
      if (!status) {
        throw new Error(`Unknown server: ${serverName}`);
      }
      return status;
    }

    return Array.from(this.serverStatuses.values());
  }
}

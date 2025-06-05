import axios from 'axios';
import { MCPWatcherService } from './watcher-service';
import { getConfig, WatcherConfig } from './config';

export class EnhancedMCPUseBridge {
  private watcher: MCPWatcherService;
  private originalMcpUse: any;
  private config: WatcherConfig;

  constructor() {
    // Initialize with default config structure
    this.config = {
      mcpServers: [],
      database: { path: './watcher.db' },
      healthCheck: { interval: 30000, timeout: 10000 },
      recovery: { maxRetries: 3, baseDelay: 5000, maxDelay: 30000 },
      logging: { level: 'info', file: './watcher.log' },
      autoSync: { enabled: true }
    };
    this.watcher = new MCPWatcherService(this.config);
  }

  async initialize(): Promise<void> {
    // Load the actual config
    this.config = await getConfig();
    this.watcher = new MCPWatcherService(this.config);
    await this.watcher.start();
    console.log('🔗 Enhanced MCP-Use Bridge initialized with watcher service');
  }

  async shutdown(): Promise<void> {
    await this.watcher.stop();
  }

  // Enhanced tool execution with automatic retry and chunking
  async executeTool(serverName: string, toolName: string, parameters: any): Promise<any> {
    try {
      // Check server health first
      const serverStatus = this.watcher.getServerStatus(serverName) as any;

      if (serverStatus.status === 'down') {
        console.warn(`⚠️  Server ${serverName} is down, attempting direct execution anyway...`);
      }

      // Use watcher service for execution with retry logic
      return await this.watcher.executeWithRetry(serverName, toolName, parameters);

    } catch (error) {
      console.error(`❌ Tool execution failed: ${serverName}.${toolName}`, error);

      // Fallback: try to execute directly (bypass watcher)
      if (this.shouldFallbackToDirect(serverName, toolName)) {
        console.log(`🔄 Attempting direct execution as fallback...`);
        return await this.directToolExecution(serverName, toolName, parameters);
      }

      throw error;
    }
  }

  private shouldFallbackToDirect(serverName: string, toolName: string): boolean {
    // Only fallback for non-critical operations
    const server = this.config.mcpServers.find((s: any) => s.name === serverName);
    return !server?.criticalOperations.includes(toolName);
  }

  private async directToolExecution(serverName: string, toolName: string, parameters: any): Promise<any> {
    const server = this.config.mcpServers.find((s: any) => s.name === serverName);
    if (!server) {
      throw new Error(`Unknown server: ${serverName}`);
    }

    // For process monitoring mode, we can't do direct execution
    // This would require implementing a JSON-RPC client to communicate with mcp-use processes
    console.log(`⚠️ Direct execution not available in process monitoring mode: ${serverName}.${toolName}`);

    return {
      success: false,
      error: 'Direct execution not available in process monitoring mode',
      suggestion: 'Use Claude Desktop or implement JSON-RPC client for mcp-use processes'
    };
  }

  // Operation chunking for large datasets
  async executeChunkedOperation(
    serverName: string,
    operation: string,
    payload: any,
    chunkSize: number = 10
  ): Promise<any[]> {

    // Determine how to chunk based on operation type
    const chunks = this.createChunks(operation, payload, chunkSize);
    const results: any[] = [];

    console.log(`🔄 Executing ${operation} in ${chunks.length} chunks...`);

    for (let i = 0; i < chunks.length; i++) {
      try {
        const chunkResult = await this.executeTool(serverName, operation, chunks[i]);
        results.push(chunkResult);
        console.log(`✅ Chunk ${i + 1}/${chunks.length} completed`);

        // Small delay between chunks to avoid overwhelming the worker
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        console.error(`❌ Chunk ${i + 1}/${chunks.length} failed:`, error);

        // Decide whether to continue or abort
        if (this.isCriticalChunk(operation, i)) {
          throw error;
        }

        // Continue with null result for non-critical chunks
        results.push(null);
      }
    }

    return this.mergeChunkResults(operation, results);
  }

  private createChunks(operation: string, payload: any, chunkSize: number): any[] {
    switch (operation) {
      case 'search_clients':
        // For client search, we can't really chunk the search itself
        // but we could limit results per request
        return [{ ...payload, limit: chunkSize }];

      case 'search_trips':
        // Similar to client search
        return [{ ...payload, limit: chunkSize }];

      case 'search_flights':
        // For flight search, we might chunk by different date ranges
        // For now, just pass through
        return [payload];

      case 'search_hotels':
        // For hotel search, we could search different areas or price ranges
        // For now, just pass through
        return [payload];

      default:
        // Default: no chunking, just return original payload
        return [payload];
    }
  }

  private isCriticalChunk(operation: string, chunkIndex: number): boolean {
    // First chunk is usually critical
    return chunkIndex === 0;
  }

  private mergeChunkResults(operation: string, results: any[]): any {
    const validResults = results.filter(r => r !== null);

    if (validResults.length === 0) {
      throw new Error('All chunks failed');
    }

    switch (operation) {
      case 'search_clients':
      case 'search_trips':
        // Merge arrays of results
        return {
          results: validResults.flatMap(r => r.results || []),
          total: validResults.reduce((sum, r) => sum + (r.total || 0), 0),
          chunked: true
        };

      default:
        // For single-result operations, return the first valid result
        return validResults[0];
    }
  }

  // Health monitoring integration
  async getHealthStatus(): Promise<any> {
    const statuses = this.watcher.getServerStatus() as any[];

    return {
      overall: statuses.every(s => s.status === 'healthy') ? 'healthy' :
               statuses.some(s => s.status === 'down') ? 'degraded' : 'warning',
      servers: statuses,
      timestamp: new Date().toISOString()
    };
  }

  // Generic diagnostic operations for database integrity
  async diagnoseDataIntegrity(clientName?: string): Promise<any> {
    console.log(`🔍 Diagnosing data integrity${clientName ? ` for ${clientName}` : ''}...`);

    try {
      const searchParams = clientName ? { client_name: clientName } : {};
      const clients = await this.executeTool('d1-database', 'search_clients', searchParams);

      console.log(`Found ${clients.results?.length || 0} client records`);

      const analysis = {
        clients: [] as any[],
        potentialIssues: [] as any[],
        summary: {
          totalClients: clients.results?.length || 0,
          totalTrips: 0,
          incompleteTrips: 0,
          duplicateTrips: 0
        }
      };

      if (clients.results?.length > 0) {
        for (const client of clients.results) {
          const trips = await this.executeTool('d1-database', 'search_trips', {
            client_id: client.id
          });

          const clientAnalysis = {
            id: client.id,
            name: `${client.first_name} ${client.last_name}`,
            email: client.email,
            trips: trips.results || [],
            tripCount: trips.results?.length || 0,
            issues: [] as any[]
          };

          analysis.summary.totalTrips += clientAnalysis.tripCount;

          // Check for incomplete trips (missing essential data)
          for (const trip of trips.results || []) {
            if (!trip.destination || !trip.start_date || trip.status === 'incomplete') {
              clientAnalysis.issues.push({
                type: 'incomplete_trip',
                tripId: trip.id,
                description: `Trip missing ${!trip.destination ? 'destination' : !trip.start_date ? 'start_date' : 'marked as incomplete'}`
              });
              analysis.summary.incompleteTrips++;
            }
          }

          // Check for potential duplicate trips (same destination and dates)
          const tripsByKey = new Map();
          for (const trip of trips.results || []) {
            if (trip.destination && trip.start_date) {
              const key = `${trip.destination}_${trip.start_date}_${trip.end_date || 'no_end'}`;
              if (tripsByKey.has(key)) {
                clientAnalysis.issues.push({
                  type: 'potential_duplicate',
                  tripIds: [tripsByKey.get(key), trip.id],
                  description: `Potential duplicate trips to ${trip.destination} on ${trip.start_date}`
                });
                analysis.summary.duplicateTrips++;
              } else {
                tripsByKey.set(key, trip.id);
              }
            }
          }

          analysis.clients.push(clientAnalysis);

          if (clientAnalysis.issues.length > 0) {
            analysis.potentialIssues.push(...clientAnalysis.issues);
          }
        }
      }

      // Summary report
      console.log(`📊 Analysis Summary:`);
      console.log(`   - ${analysis.summary.totalClients} clients analyzed`);
      console.log(`   - ${analysis.summary.totalTrips} trips found`);
      console.log(`   - ${analysis.summary.incompleteTrips} incomplete trips`);
      console.log(`   - ${analysis.summary.duplicateTrips} potential duplicates`);

      if (analysis.potentialIssues.length > 0) {
        console.log(`⚠️  ${analysis.potentialIssues.length} potential issues found`);
      } else {
        console.log(`✅ No data integrity issues detected`);
      }

      return {
        ...analysis,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Diagnosis failed:', error);
      throw error;
    }
  }

  // Specific method for investigating failed operations
  async investigateFailedOperations(timeWindow: string = '1 hour'): Promise<any> {
    console.log(`🔍 Investigating failed operations in the last ${timeWindow}...`);

    // This would query the watcher service's operation log
    // For now, return a placeholder
    return {
      message: 'Operation investigation not yet implemented',
      suggestion: 'Check watcher.db operations table for failed operations',
      timestamp: new Date().toISOString()
    };
  }
}

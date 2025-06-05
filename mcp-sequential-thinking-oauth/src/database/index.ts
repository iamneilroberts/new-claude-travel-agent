// Re-export everything from D1 service for compatibility
export * from './d1-service';
export { D1DatabaseService as DatabaseService } from './d1-service';

// Keep this function for backward compatibility but it's not used with D1
export function getDatabaseConnectionString(): string {
  return 'using-d1-database';
}
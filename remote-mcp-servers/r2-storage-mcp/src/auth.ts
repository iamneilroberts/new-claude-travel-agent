import { Env } from './r2-context';

/**
 * Authentication utilities for R2 Storage MCP
 */

// Scopes required for R2 operations
export const R2StorageScopes = {
  'account:read': 'See your account info such as account details and memberships.',
  'storage:write': 'Create, read, write and delete R2 storage buckets and objects.',
} as const;

// Headers for API token mode
const API_TOKEN_HEADER = 'X-API-Token';

/**
 * Check if a request is using API token authentication
 */
export function isApiTokenRequest(req: Request, env: Env): boolean {
  const apiToken = req.headers.get(API_TOKEN_HEADER);
  return !!apiToken && apiToken === env.MCP_AUTH_KEY;
}

/**
 * Validate API token
 */
export function validateApiToken(token: string | null, env: Env): boolean {
  return !!token && token === env.MCP_AUTH_KEY;
}
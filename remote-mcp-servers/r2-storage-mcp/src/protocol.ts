import { Env } from './r2-context';

/**
 * JSON-RPC 2.0 protocol implementation for MCP
 */

// Error codes for JSON-RPC responses
export const ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR: -32000,
  UNAUTHORIZED: 401,
};

// Basic JSON-RPC request structure
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: any;
}

// JSON-RPC success response
export interface JsonRpcSuccessResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result: any;
}

// JSON-RPC error response
export interface JsonRpcErrorResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: any;
  };
}

// Union type for all JSON-RPC responses
export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

// Tool registry for MCP tools
export class MCPToolRegistry {
  public tools: Array<{
    name: string;
    description: string;
    inputSchema: object;
  }> = [];
  
  public handlers: Map<string, (params: any, env: Env) => Promise<any>> = new Map();

  constructor() {}

  // Register a new tool
  registerTool(
    name: string,
    description: string,
    inputSchema: object,
    handler: (params: any, env: Env) => Promise<any>
  ) {
    this.tools.push({
      name,
      description,
      inputSchema,
    });
    
    this.handlers.set(name, handler);
  }

  // Get a tool handler by name
  getHandler(name: string): ((params: any, env: Env) => Promise<any>) | undefined {
    return this.handlers.get(name);
  }
}

// Success response helper
export function createSuccessResponse(id: string | number | null, result: any): JsonRpcSuccessResponse {
  return {
    jsonrpc: '2.0',
    id,
    result,
  };
}

// Error response helper
export function createErrorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data?: any
): JsonRpcErrorResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      data,
    },
  };
}
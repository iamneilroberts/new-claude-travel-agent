export interface ToolSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: ToolSchema;
}

export interface ToolRegistry {
  tools: Tool[];
  handlers: Map<string, (params: any, env: any) => Promise<any>>;
  amadeus?: any;
}

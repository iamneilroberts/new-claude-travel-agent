import { zodToJsonSchema } from "zod-to-json-schema";
import { listBucketsTool, listObjectsTool } from "./r2-bucket-tools.js";
import { getObjectTool, uploadImageTool, deleteObjectTool } from "./r2-object-tools.js";

export interface ToolRegistry {
  tools: Array<{
    name: string;
    description: string;
    inputSchema: any;
  }>;
  handlers: Map<string, (params: any, env: any) => Promise<any>>;
}

export async function initializeTools(env: any): Promise<ToolRegistry> {
  const registry: ToolRegistry = {
    tools: [],
    handlers: new Map(),
  };

  // All R2 storage tools
  const tools = [
    listBucketsTool,
    listObjectsTool,
    getObjectTool,
    uploadImageTool,
    deleteObjectTool
  ];

  // Register each tool
  tools.forEach(tool => {
    registry.tools.push({
      name: tool.name,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.schema)
    });

    registry.handlers.set(tool.name, async (params, handlerEnv) => {
      try {
        return await tool.execute(params, handlerEnv || env);
      } catch (error) {
        console.error(`Error executing ${tool.name}:`, error);
        return {
          content: [{
            type: "text",
            text: `Error executing ${tool.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    });
  });

  console.log(`Registered ${tools.length} R2 storage tools`);
  return registry;
}

// Export individual tools for direct use if needed
export {
  listBucketsTool,
  listObjectsTool,
  getObjectTool,
  uploadImageTool,
  deleteObjectTool
};

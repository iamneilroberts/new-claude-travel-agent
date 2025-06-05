import { zodToJsonSchema } from "zod-to-json-schema";
import { generateItineraryTool } from "./generate-itinerary.js";
import { generatePackingListTool } from "./generate-packing-list.js";
import { generateTravelBudgetTool } from "./generate-travel-budget.js";
import { generateTravelChecklistTool } from "./generate-travel-checklist.js";

export interface ToolRegistry {
  tools: Array<{
    name: string;
    description: string;
    inputSchema: any;
  }>;
  handlers: Map<string, (params: any) => Promise<any>>;
}

export async function initializeTools(): Promise<ToolRegistry> {
  const registry: ToolRegistry = {
    tools: [],
    handlers: new Map(),
  };

  // All template document generation tools
  const tools = [
    generateItineraryTool,
    generatePackingListTool,
    generateTravelBudgetTool,
    generateTravelChecklistTool
  ];

  // Register each tool
  tools.forEach(tool => {
    registry.tools.push({
      name: tool.name,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.schema)
    });

    registry.handlers.set(tool.name, async (params) => {
      try {
        return await tool.execute(params);
      } catch (error) {
        console.error(`Error executing ${tool.name}:`, error);
        return {
          content: [{
            type: "text",
            text: `Error generating ${tool.name.replace('_', ' ')}: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    });
  });

  console.log(`Registered ${tools.length} template document tools`);

  return registry;
}

// Export individual tools for direct use if needed
export {
  generateItineraryTool,
  generatePackingListTool,
  generateTravelBudgetTool,
  generateTravelChecklistTool
};

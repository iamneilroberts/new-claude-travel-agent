import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

interface Env {
  MCP_AUTH_KEY: string;
  // Add database binding when needed
  // D1: D1Database;
}

// Test scenario schema
const TestScenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  complexity: z.enum(["simple", "intermediate", "complex"]),
  category: z.enum(["flight", "hotel", "activity", "workflow", "edge_case"]),
  prompt: z.string(),
  expectedOutcomes: z.array(z.string()),
  requiredTools: z.array(z.string()),
  maxDuration: z.number().optional(),
});

// Conversation analysis schema
const ConversationAnalysisSchema = z.object({
  testId: z.string(),
  transcript: z.string(),
  toolCalls: z.array(z.object({
    tool: z.string(),
    parameters: z.record(z.any()),
    response: z.string(),
    timestamp: z.string(),
    success: z.boolean(),
  })),
  startTime: z.string(),
  endTime: z.string().optional(),
});

export class TravelTestingMCP extends McpAgent {
  server = new McpServer({
    name: "Claude Travel Testing MCP",
    version: "1.0.0",
  });

  async init() {
    const env = (this as any).env as Env;

    // MCP protocol handlers are handled automatically by McpAgent

    try {
      console.log("Initializing Claude Travel Testing MCP server...");

      // Tool 1: Execute Test Scenario
      this.server.tool(
        'execute_test_scenario',
        {
          scenarioId: z.string().describe('ID of the test scenario to execute'),
          generateVariation: z.boolean().optional().describe('Generate a variation of the scenario'),
        },
        async (params) => {
          try {
            const scenario = await this.getTestScenario(params.scenarioId, params.generateVariation);
            
            const result = {
              testId: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              scenario: scenario,
              instructions: [
                "A test scenario has been loaded. Please execute the following travel planning request:",
                "",
                `**Test Scenario:** ${scenario.title}`,
                `**Complexity:** ${scenario.complexity}`,
                `**Category:** ${scenario.category}`,
                "",
                `**Your Task:** ${scenario.prompt}`,
                "",
                "Please process this request using your available travel tools and provide a complete response.",
                "The testing system will monitor your tool usage and analyze the conversation quality."
              ].join("\n"),
              metadata: {
                expectedOutcomes: scenario.expectedOutcomes,
                requiredTools: scenario.requiredTools,
                startTime: new Date().toISOString(),
              }
            };
            
            return {
              content: [{
                type: "text",
                text: JSON.stringify(result, null, 2)
              }]
            };
          } catch (error) {
            console.error(`Error in 'execute_test_scenario':`, error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ 
                  status: "error", 
                  message: error instanceof Error ? error.message : 'Unknown error' 
                })
              }]
            };
          }
        }
      );

      // Tool 2: Analyze Conversation Quality
      this.server.tool(
        'analyze_conversation_quality',
        {
          testId: z.string().describe('Test ID to analyze'),
          transcript: z.string().describe('Full conversation transcript'),
          toolCalls: z.array(z.object({
            tool: z.string(),
            parameters: z.record(z.any()),
            response: z.string(),
            timestamp: z.string(),
            success: z.boolean(),
          })).describe('Array of MCP tool calls made during the conversation'),
        },
        async (params) => {
          try {
            const analysis = await this.analyzeConversationQuality({
              testId: params.testId,
              transcript: params.transcript,
              toolCalls: params.toolCalls,
              startTime: new Date().toISOString(),
            });
            
            return {
              content: [{
                type: "text",
                text: JSON.stringify(analysis, null, 2)
              }]
            };
          } catch (error) {
            console.error(`Error in 'analyze_conversation_quality':`, error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ 
                  status: "error", 
                  message: error instanceof Error ? error.message : 'Unknown error' 
                })
              }]
            };
          }
        }
      );

      // Tool 3: Generate Test Report
      this.server.tool(
        'generate_test_report',
        {
          testIds: z.array(z.string()).describe('Array of test IDs to include in report'),
          format: z.enum(["summary", "detailed", "json"]).optional().describe('Report format'),
        },
        async (params) => {
          try {
            const report = await this.generateTestReport(params.testIds, params.format || "summary");
            
            return {
              content: [{
                type: "text",
                text: JSON.stringify(report, null, 2)
              }]
            };
          } catch (error) {
            console.error(`Error in 'generate_test_report':`, error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ 
                  status: "error", 
                  message: error instanceof Error ? error.message : 'Unknown error' 
                })
              }]
            };
          }
        }
      );

      // Tool 4: List Available Test Scenarios
      this.server.tool(
        'list_test_scenarios',
        {
          category: z.enum(["flight", "hotel", "activity", "workflow", "edge_case", "all"]).optional().describe('Filter by category'),
          complexity: z.enum(["simple", "intermediate", "complex", "all"]).optional().describe('Filter by complexity'),
        },
        async (params) => {
          try {
            const scenarios = await this.listTestScenarios(params.category, params.complexity);
            
            return {
              content: [{
                type: "text",
                text: JSON.stringify(scenarios, null, 2)
              }]
            };
          } catch (error) {
            console.error(`Error in 'list_test_scenarios':`, error);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ 
                  status: "error", 
                  message: error instanceof Error ? error.message : 'Unknown error' 
                })
              }]
            };
          }
        }
      );

      // Health check tool
      this.server.tool(
        'health_check',
        {},
        async () => {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "healthy",
                service: "Claude Travel Testing MCP",
                version: "1.0.0",
                timestamp: new Date().toISOString(),
                capabilities: [
                  "Test scenario execution",
                  "Conversation quality analysis", 
                  "Test report generation",
                  "Scenario management"
                ],
                environment: {
                  authKeyConfigured: !!env.MCP_AUTH_KEY
                }
              }, null, 2)
            }]
          };
        }
      );

      console.log("Claude Travel Testing MCP server initialized with all tools");
    } catch (error) {
      console.error("Failed to initialize MCP server:", error);
      
      // Fallback health check tool if initialization fails
      this.server.tool("error_check", {}, async () => ({
        content: [{
          type: "text",
          text: `Claude Travel Testing MCP server is running but tool initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      }));
      
      throw error;
    }
  }

  // Helper method: Get test scenario
  private async getTestScenario(scenarioId: string, generateVariation?: boolean) {
    // Sample test scenarios - in production, these would come from database
    const scenarios = [
      {
        id: "flight_simple_001",
        title: "Basic Flight Search",
        description: "Simple one-way flight search between major cities",
        complexity: "simple" as const,
        category: "flight" as const,
        prompt: "Search for flights from New York (JFK) to London (LHR) on December 15, 2025 for 1 passenger",
        expectedOutcomes: [
          "Flight search results displayed",
          "Multiple airline options shown", 
          "Prices and times included"
        ],
        requiredTools: ["search_flights"],
        maxDuration: 30
      },
      {
        id: "hotel_intermediate_001", 
        title: "Hotel Search with Preferences",
        description: "Hotel search with specific preferences and filters",
        complexity: "intermediate" as const,
        category: "hotel" as const,
        prompt: "Find 4-star hotels in Paris near the Eiffel Tower for 2 adults, checking in March 10, 2025 and checking out March 13, 2025. Budget is $200-300 per night.",
        expectedOutcomes: [
          "Hotel search results near Eiffel Tower",
          "4-star rating filter applied",
          "Price range respected",
          "Guest count accommodated"
        ],
        requiredTools: ["search_hotels", "get_hotel_ratings"],
        maxDuration: 45
      },
      {
        id: "workflow_complex_001",
        title: "Complete Trip Planning Workflow", 
        description: "Multi-step trip planning including flights, hotels, and activities",
        complexity: "complex" as const,
        category: "workflow" as const,
        prompt: "Plan a 4-day business trip to Tokyo for 1 person departing from San Francisco on February 20, 2025 and returning February 24, 2025. Find flights, business hotel near Tokyo Station, and recommend 2-3 professional activities or cultural experiences.",
        expectedOutcomes: [
          "Round-trip flight options presented",
          "Business hotel near Tokyo Station found",
          "Professional/cultural activities recommended",
          "Complete itinerary provided"
        ],
        requiredTools: ["search_flights", "search_hotels", "search_activities"],
        maxDuration: 120
      }
    ];

    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) {
      throw new Error(`Test scenario '${scenarioId}' not found`);
    }

    // Generate variation if requested
    if (generateVariation) {
      return {
        ...scenario,
        id: `${scenario.id}_var_${Date.now()}`,
        title: `${scenario.title} (Variation)`,
        // Add slight variations to the prompt
        prompt: scenario.prompt.replace(/\d{4}/, "2026") // Change year as simple variation
      };
    }

    return scenario;
  }

  // Helper method: Analyze conversation quality
  private async analyzeConversationQuality(data: z.infer<typeof ConversationAnalysisSchema>) {
    const analysis = {
      testId: data.testId,
      timestamp: new Date().toISOString(),
      scores: {
        accuracy: this.calculateAccuracyScore(data),
        completeness: this.calculateCompletenessScore(data),
        efficiency: this.calculateEfficiencyScore(data),
        helpfulness: this.calculateHelpfulnessScore(data),
        professionalism: this.calculateProfessionalismScore(data),
        overall: 0
      },
      metrics: {
        totalToolCalls: data.toolCalls.length,
        successfulToolCalls: data.toolCalls.filter(tc => tc.success).length,
        failedToolCalls: data.toolCalls.filter(tc => !tc.success).length,
        responseLength: data.transcript.length,
        conversationDuration: "N/A", // Would calculate from timestamps
      },
      feedback: {
        strengths: [],
        weaknesses: [],
        suggestions: []
      },
      toolUsage: this.analyzeToolUsage(data.toolCalls)
    };

    // Calculate overall score as weighted average
    analysis.scores.overall = Math.round(
      (analysis.scores.accuracy * 0.25 +
       analysis.scores.completeness * 0.25 + 
       analysis.scores.efficiency * 0.2 +
       analysis.scores.helpfulness * 0.2 +
       analysis.scores.professionalism * 0.1) * 10
    ) / 10;

    return analysis;
  }

  // Scoring helper methods
  private calculateAccuracyScore(data: z.infer<typeof ConversationAnalysisSchema>): number {
    // Basic accuracy scoring based on successful tool calls
    const successRate = data.toolCalls.length > 0 
      ? data.toolCalls.filter(tc => tc.success).length / data.toolCalls.length
      : 0;
    return Math.round(successRate * 10 * 10) / 10; // Scale to 10
  }

  private calculateCompletenessScore(data: z.infer<typeof ConversationAnalysisSchema>): number {
    // Basic completeness scoring - would be more sophisticated in production
    const hasToolCalls = data.toolCalls.length > 0;
    const hasSubstantialResponse = data.transcript.length > 200;
    return hasToolCalls && hasSubstantialResponse ? 8.5 : 6.0;
  }

  private calculateEfficiencyScore(data: z.infer<typeof ConversationAnalysisSchema>): number {
    // Efficiency based on tool call count vs results
    const toolCallCount = data.toolCalls.length;
    if (toolCallCount === 0) return 5.0;
    if (toolCallCount <= 3) return 9.0;
    if (toolCallCount <= 5) return 7.5;
    return 6.0;
  }

  private calculateHelpfulnessScore(data: z.infer<typeof ConversationAnalysisSchema>): number {
    // Basic helpfulness scoring - would use AI analysis in production
    return 8.0; // Placeholder
  }

  private calculateProfessionalismScore(data: z.infer<typeof ConversationAnalysisSchema>): number {
    // Basic professionalism scoring
    return 8.5; // Placeholder
  }

  private analyzeToolUsage(toolCalls: any[]) {
    const toolCount: Record<string, number> = {};
    const toolSuccess: Record<string, number> = {};
    
    toolCalls.forEach(tc => {
      toolCount[tc.tool] = (toolCount[tc.tool] || 0) + 1;
      if (tc.success) {
        toolSuccess[tc.tool] = (toolSuccess[tc.tool] || 0) + 1;
      }
    });

    const tools = Object.keys(toolCount);
    const mostUsedTool = tools.length > 0 
      ? tools.reduce((a, b) => toolCount[a] > toolCount[b] ? a : b)
      : "";

    return {
      toolCount,
      toolSuccess,
      mostUsedTool,
      totalUniqueTools: tools.length
    };
  }

  // Helper method: Generate test report
  private async generateTestReport(testIds: string[], format: string) {
    return {
      reportId: `report_${Date.now()}`,
      format,
      testCount: testIds.length,
      generatedAt: new Date().toISOString(),
      summary: `Report generated for ${testIds.length} test(s)`,
      // In production, would aggregate actual test data
      placeholder: "Full report generation would aggregate data from stored test results"
    };
  }

  // Helper method: List test scenarios
  private async listTestScenarios(category?: string, complexity?: string) {
    // Sample scenarios - would come from database in production
    const allScenarios = [
      { id: "flight_simple_001", title: "Basic Flight Search", category: "flight", complexity: "simple" },
      { id: "hotel_intermediate_001", title: "Hotel Search with Preferences", category: "hotel", complexity: "intermediate" },
      { id: "workflow_complex_001", title: "Complete Trip Planning Workflow", category: "workflow", complexity: "complex" }
    ];

    let filtered = allScenarios;
    
    if (category && category !== "all") {
      filtered = filtered.filter(s => s.category === category);
    }
    
    if (complexity && complexity !== "all") {
      filtered = filtered.filter(s => s.complexity === complexity);
    }

    return {
      scenarios: filtered,
      total: filtered.length,
      filters: { category: category || "all", complexity: complexity || "all" }
    };
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'Claude Travel Testing MCP',
        version: '1.0.0',
        tools: [
          'execute_test_scenario',
          'analyze_conversation_quality', 
          'generate_test_report',
          'list_test_scenarios',
          'health_check'
        ],
        endpoints: ['/health', '/sse', '/mcp'],
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // SSE endpoints (primary - used by mcp-use bridge)
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return TravelTestingMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    // MCP endpoint (fallback - direct MCP protocol)
    if (url.pathname === "/mcp") {
      return TravelTestingMCP.serve("/mcp").fetch(request, env, ctx);
    }

    // Default 404 response
    return new Response(JSON.stringify({
      error: "Not found",
      available_endpoints: ["/health", "/sse", "/mcp"],
      service: "Claude Travel Testing MCP",
      version: "1.0.0"
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  },
};
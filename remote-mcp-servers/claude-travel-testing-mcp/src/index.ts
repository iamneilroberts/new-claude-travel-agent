import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ScenarioGenerator, TestScenario } from "./scenario-generator.js";

interface Env {
  MCP_AUTH_KEY: string;
  // Add database binding when needed
  // D1: D1Database;
}

// Conversation analysis interface
interface ConversationAnalysis {
  testId: string;
  transcript: string;
  toolCalls: Array<{
    tool: string;
    parameters: Record<string, any>;
    response: string;
    timestamp: string;
    success: boolean;
  }>;
  startTime: string;
  endTime?: string;
}

export class TravelTestingMCP extends McpAgent {
  server = new McpServer({
    name: "Claude Travel Testing MCP",
    version: "1.0.0",
  });

  private scenarioGenerator = new ScenarioGenerator();

  async init() {
    const env = (this as any).env as Env;

    // MCP protocol handlers are handled automatically by McpAgent

    try {
      console.log("Initializing Claude Travel Testing MCP server...");

      // Tool 1: Execute Test Scenario
      this.server.tool(
        'execute_test_scenario',
        {
          scenarioId: {
            type: "string",
            description: "ID of the test scenario to execute (e.g., 'flight_simple_001', 'hotel_intermediate_001', 'workflow_complex_001'). Use list_test_scenarios to see available scenarios."
          },
          generateVariation: {
            type: "boolean",
            description: "Generate a variation of the scenario",
            required: false
          }
        },
        async (params) => {
          try {
            // Check if scenarioId is provided
            if (!params.scenarioId) {
              const availableScenarios = await this.listTestScenarios();
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    status: "error",
                    message: "Missing required parameter 'scenarioId'. Please specify a scenario ID to execute.",
                    availableScenarios: availableScenarios.scenarios,
                    usage: "Call this tool with: {\"scenarioId\": \"flight_simple_001\"}"
                  }, null, 2)
                }]
              };
            }

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
          testId: {
            type: "string",
            description: "Test ID to analyze"
          },
          transcript: {
            type: "string", 
            description: "Full conversation transcript"
          },
          toolCalls: {
            type: "array",
            description: "Array of MCP tool calls made during the conversation",
            items: {
              type: "object",
              properties: {
                tool: { type: "string" },
                parameters: { type: "object" },
                response: { type: "string" },
                timestamp: { type: "string" },
                success: { type: "boolean" }
              }
            }
          }
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
          testIds: {
            type: "array",
            description: "Array of test IDs to include in report",
            items: { type: "string" }
          },
          format: {
            type: "string",
            description: "Report format",
            enum: ["summary", "detailed", "json"],
            required: false
          }
        },
        async (params) => {
          try {
            if (!params.testIds || !Array.isArray(params.testIds) || params.testIds.length === 0) {
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    status: "error",
                    message: "Missing required parameter 'testIds'. Please provide an array of test IDs to include in the report.",
                    usage: "Call this tool with: {\"testIds\": [\"test_123\", \"test_456\"], \"format\": \"summary\"}"
                  }, null, 2)
                }]
              };
            }

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
          category: {
            type: "string",
            description: "Filter by category",
            enum: ["flight", "hotel", "activity", "workflow", "edge_case", "all"],
            required: false
          },
          complexity: {
            type: "string", 
            description: "Filter by complexity",
            enum: ["simple", "intermediate", "complex", "all"],
            required: false
          }
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

      // Tool 5: Generate New Test Scenarios
      this.server.tool(
        'generate_test_scenarios',
        {
          count: {
            type: "number",
            description: "Number of scenarios to generate",
            required: false
          },
          complexity: {
            type: "string",
            description: "Complexity level to generate",
            enum: ["simple", "intermediate", "complex", "mixed"],
            required: false
          },
          category: {
            type: "string",
            description: "Category to focus on",
            enum: ["flight", "hotel", "activity", "workflow", "edge_case", "mixed"],
            required: false
          },
          seed: {
            type: "string",
            description: "Seed for reproducible generation",
            required: false
          }
        },
        async (params) => {
          try {
            const generator = new ScenarioGenerator(params.seed);
            let scenarios: TestScenario[] = [];

            const count = params.count || 10;
            const complexity = params.complexity || "mixed";
            const category = params.category || "mixed";

            if (complexity === "mixed" && category === "mixed") {
              scenarios = generator.generateAllScenarios().slice(0, count);
            } else if (complexity === "simple") {
              scenarios = generator.generateSimpleScenarios(count);
            } else if (complexity === "intermediate") {
              scenarios = generator.generateIntermediateScenarios(count);
            } else if (complexity === "complex") {
              scenarios = generator.generateComplexScenarios(count);
            } else {
              // Generate mixed complexity for specific category
              scenarios = generator.generateAllScenarios()
                .filter(s => category === "mixed" || s.category === category)
                .slice(0, count);
            }

            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  scenarios,
                  count: scenarios.length,
                  parameters: {
                    requestedCount: count,
                    complexity,
                    category,
                    seed: params.seed
                  },
                  summary: `Generated ${scenarios.length} test scenarios`
                }, null, 2)
              }]
            };
          } catch (error) {
            console.error(`Error in 'generate_test_scenarios':`, error);
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

      // Tool 6: Create Scenario Variation
      this.server.tool(
        'create_scenario_variation',
        {
          scenarioId: {
            type: "string",
            description: "ID of the base scenario to create variation from"
          },
          variationType: {
            type: "string",
            description: "Type of variation to create",
            enum: ["date_shift", "budget_increase", "traveler_increase", "destination_swap"]
          }
        },
        async (params) => {
          try {
            const baseScenario = await this.getTestScenario(params.scenarioId);
            const variation = this.scenarioGenerator.createVariation(baseScenario, params.variationType);

            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  variation,
                  baseScenario: {
                    id: baseScenario.id,
                    title: baseScenario.title
                  },
                  variationType: params.variationType,
                  summary: `Created ${params.variationType} variation of scenario ${params.scenarioId}`
                }, null, 2)
              }]
            };
          } catch (error) {
            console.error(`Error in 'create_scenario_variation':`, error);
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
                  "Scenario management",
                  "Automated scenario generation",
                  "Scenario variation creation"
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
  private async getTestScenario(scenarioId: string, generateVariation?: boolean): Promise<TestScenario> {
    // Generate all available scenarios from the generator
    const allScenarios = this.scenarioGenerator.generateAllScenarios();
    
    // Add some static scenarios for backwards compatibility
    const staticScenarios: TestScenario[] = [
      {
        id: "flight_simple_001",
        title: "Basic Flight Search",
        description: "Simple one-way flight search between major cities",
        complexity: "simple",
        category: "flight",
        travelType: "business",
        prompt: "Search for flights from New York (JFK) to London (LHR) on 2025-08-15 for 1 passenger",
        expectedOutcomes: [
          "Flight search results displayed",
          "Multiple airline options shown", 
          "Prices and times included"
        ],
        requiredTools: ["search_flights"],
        maxDuration: 30,
        metadata: {
          destinations: ["New York", "London"],
          travelers: 1
        }
      },
      {
        id: "hotel_intermediate_001", 
        title: "Hotel Search with Preferences",
        description: "Hotel search with specific preferences and filters",
        complexity: "intermediate",
        category: "hotel",
        travelType: "leisure",
        prompt: "Find 4-star hotels in Paris near the Eiffel Tower for 2 adults, checking in 2025-09-10 and checking out 2025-09-13. Budget is $200-300 per night.",
        expectedOutcomes: [
          "Hotel search results near Eiffel Tower",
          "4-star rating filter applied",
          "Price range respected",
          "Guest count accommodated"
        ],
        requiredTools: ["search_hotels", "get_hotel_ratings"],
        maxDuration: 45,
        metadata: {
          destinations: ["Paris"],
          travelers: 2,
          duration: 3,
          budget: {
            min: 600,
            max: 900,
            currency: "USD"
          }
        }
      },
      {
        id: "workflow_complex_001",
        title: "Complete Trip Planning Workflow", 
        description: "Multi-step trip planning including flights, hotels, and activities",
        complexity: "complex",
        category: "workflow",
        travelType: "business",
        prompt: "Plan a 4-day business trip to Tokyo for 1 person departing from San Francisco on 2025-10-20 and returning 2025-10-24. Find flights, business hotel near Tokyo Station, and recommend 2-3 professional activities or cultural experiences.",
        expectedOutcomes: [
          "Round-trip flight options presented",
          "Business hotel near Tokyo Station found",
          "Professional/cultural activities recommended",
          "Complete itinerary provided"
        ],
        requiredTools: ["search_flights", "search_hotels", "search_activities"],
        maxDuration: 120,
        metadata: {
          destinations: ["San Francisco", "Tokyo"],
          travelers: 1,
          duration: 4,
          specialRequirements: ["business_center", "wifi", "early_checkin"]
        }
      }
    ];

    // Combine static and generated scenarios
    const allAvailableScenarios = [...staticScenarios, ...allScenarios];
    
    const scenario = allAvailableScenarios.find(s => s.id === scenarioId);
    if (!scenario) {
      const availableIds = allAvailableScenarios.map(s => s.id).slice(0, 10); // Show first 10
      throw new Error(`Test scenario '${scenarioId}' not found. Available scenarios include: ${availableIds.join(', ')}`);
    }

    // Generate variation if requested
    if (generateVariation) {
      return this.scenarioGenerator.createVariation(scenario, "date_shift");
    }

    return scenario;
  }

  // Helper method: Analyze conversation quality
  private async analyzeConversationQuality(data: ConversationAnalysis) {
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
  private calculateAccuracyScore(data: ConversationAnalysis): number {
    // Basic accuracy scoring based on successful tool calls
    const successRate = data.toolCalls.length > 0 
      ? data.toolCalls.filter(tc => tc.success).length / data.toolCalls.length
      : 0;
    return Math.round(successRate * 10 * 10) / 10; // Scale to 10
  }

  private calculateCompletenessScore(data: ConversationAnalysis): number {
    // Basic completeness scoring - would be more sophisticated in production
    const hasToolCalls = data.toolCalls.length > 0;
    const hasSubstantialResponse = data.transcript.length > 200;
    return hasToolCalls && hasSubstantialResponse ? 8.5 : 6.0;
  }

  private calculateEfficiencyScore(data: ConversationAnalysis): number {
    // Efficiency based on tool call count vs results
    const toolCallCount = data.toolCalls.length;
    if (toolCallCount === 0) return 5.0;
    if (toolCallCount <= 3) return 9.0;
    if (toolCallCount <= 5) return 7.5;
    return 6.0;
  }

  private calculateHelpfulnessScore(data: ConversationAnalysis): number {
    // Basic helpfulness scoring - would use AI analysis in production
    return 8.0; // Placeholder
  }

  private calculateProfessionalismScore(data: ConversationAnalysis): number {
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
    // Get all scenarios (static + generated)
    const generatedScenarios = this.scenarioGenerator.generateAllScenarios();
    
    const staticScenarios = [
      { id: "flight_simple_001", title: "Basic Flight Search", category: "flight", complexity: "simple" },
      { id: "hotel_intermediate_001", title: "Hotel Search with Preferences", category: "hotel", complexity: "intermediate" },
      { id: "workflow_complex_001", title: "Complete Trip Planning Workflow", category: "workflow", complexity: "complex" }
    ];

    // Convert generated scenarios to summary format
    const generatedSummaries = generatedScenarios.map(s => ({
      id: s.id,
      title: s.title,
      category: s.category,
      complexity: s.complexity
    }));

    const allScenarios = [...staticScenarios, ...generatedSummaries];

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
      filters: { category: category || "all", complexity: complexity || "all" },
      categories: ["flight", "hotel", "activity", "workflow", "edge_case"],
      complexities: ["simple", "intermediate", "complex"]
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
          'generate_test_scenarios',
          'create_scenario_variation',
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
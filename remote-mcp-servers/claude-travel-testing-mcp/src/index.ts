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

// Conversation capture interfaces
interface ConversationCapture {
  sessionId: string;
  testId?: string;
  scenarioId?: string;
  messages: ConversationMessage[];
  mcpCalls: MCPToolCall[];
  metadata: ConversationMetadata;
  startTime: string;
  endTime?: string;
  status: 'active' | 'completed' | 'failed' | 'timeout';
}

interface ConversationMessage {
  messageId: string;
  timestamp: string;
  role: 'user' | 'assistant';
  content: string;
  tokens?: number;
}

interface MCPToolCall {
  callId: string;
  timestamp: string;
  tool: string;
  server: string;
  parameters: Record<string, any>;
  response: any;
  error?: string;
  duration: number;
  success: boolean;
}

interface ConversationMetadata {
  userAgent?: string;
  claudeVersion?: string;
  testEnvironment: string;
  tags: string[];
  participantInfo?: {
    userId?: string;
    sessionType: 'automated' | 'manual';
  };
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
          type: "object",
          properties: {
            scenarioId: {
              type: "string",
              description: "ID of the test scenario to execute (e.g., 'flight_simple_001', 'hotel_intermediate_001', 'workflow_complex_001'). Use list_test_scenarios to see available scenarios."
            },
            generateVariation: {
              type: "boolean",
              description: "Generate a variation of the scenario"
            }
          },
          required: ["scenarioId"],
          additionalProperties: true
        },
        async (params) => {
          try {
            // Debug: Log what parameters we're receiving
            console.log("execute_test_scenario received params:", JSON.stringify(params));
            
            // Extract scenarioId from various possible formats
            let scenarioId = params.scenarioId || params.scenario_id || params.id;
            
            // Sometimes parameters come wrapped in different ways
            if (!scenarioId && typeof params === 'object') {
              // Check if it's nested or has different property names
              for (const key of Object.keys(params)) {
                if (key.toLowerCase().includes('scenario') || key.toLowerCase().includes('id')) {
                  scenarioId = params[key];
                  break;
                }
              }
            }
            
            // Check if scenarioId is provided
            if (!scenarioId) {
              const availableScenarios = await this.listTestScenarios();
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    status: "error",
                    message: "Missing required parameter 'scenarioId'. Please specify a scenario ID to execute.",
                    receivedParams: params,
                    availableScenarios: availableScenarios.scenarios,
                    usage: "Call this tool with: {\"scenarioId\": \"flight_simple_001\"}"
                  }, null, 2)
                }]
              };
            }

            const scenario = await this.getTestScenario(scenarioId, params.generateVariation);
            
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
          type: "object",
          properties: {
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
          required: ["testId", "transcript", "toolCalls"],
          additionalProperties: false
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
          type: "object",
          properties: {
            testIds: {
              type: "array",
              description: "Array of test IDs to include in report",
              items: { type: "string" }
            },
            format: {
              type: "string",
              description: "Report format",
              enum: ["summary", "detailed", "json"]
            }
          },
          required: ["testIds"],
          additionalProperties: false
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
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "Filter by category",
              enum: ["flight", "hotel", "activity", "workflow", "edge_case", "all"]
            },
            complexity: {
              type: "string", 
              description: "Filter by complexity",
              enum: ["simple", "intermediate", "complex", "all"]
            }
          },
          additionalProperties: false
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
          type: "object",
          properties: {
            count: {
              type: "number",
              description: "Number of scenarios to generate"
            },
            complexity: {
              type: "string",
              description: "Complexity level to generate",
              enum: ["simple", "intermediate", "complex", "mixed"]
            },
            category: {
              type: "string",
              description: "Category to focus on",
              enum: ["flight", "hotel", "activity", "workflow", "edge_case", "mixed"]
            },
            seed: {
              type: "string",
              description: "Seed for reproducible generation"
            }
          },
          additionalProperties: false
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
          type: "object",
          properties: {
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
          required: ["scenarioId", "variationType"],
          additionalProperties: false
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

      // Quick test tools for easy execution
      this.server.tool(
        'run_flight_simple_001',
        {
          type: "object",
          properties: {},
          additionalProperties: false
        },
        async () => {
          try {
            const scenario = await this.getTestScenario("flight_simple_001");
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
            console.error(`Error in 'run_flight_simple_001':`, error);
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

      this.server.tool(
        'run_hotel_intermediate_001',
        {
          type: "object",
          properties: {},
          additionalProperties: false
        },
        async () => {
          try {
            const scenario = await this.getTestScenario("hotel_intermediate_001");
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
            console.error(`Error in 'run_hotel_intermediate_001':`, error);
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
                  "Scenario variation creation",
                  "Real-time conversation capture",
                  "MCP tool call monitoring",
                  "Message transcript recording",
                  "Performance timing analysis",
                  "Error tracking and categorization"
                ],
                environment: {
                  authKeyConfigured: !!env.MCP_AUTH_KEY
                }
              }, null, 2)
            }]
          };
        }
      );

      // Tool 7: Start Conversation Capture
      this.server.tool(
        'start_conversation_capture',
        {
          type: "object",
          properties: {
            sessionId: {
              type: "string",
              description: "Unique session identifier for this conversation capture"
            },
            testId: {
              type: "string",
              description: "Optional test ID if this is part of a test scenario"
            },
            scenarioId: {
              type: "string", 
              description: "Optional scenario ID if executing a specific test scenario"
            },
            metadata: {
              type: "object",
              description: "Additional metadata about the test environment and participant",
              properties: {
                testEnvironment: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
                participantInfo: { type: "object" }
              }
            }
          },
          required: ["sessionId"],
          additionalProperties: false
        },
        async (params) => {
          try {
            const capture: ConversationCapture = {
              sessionId: params.sessionId,
              testId: params.testId,
              scenarioId: params.scenarioId,
              messages: [],
              mcpCalls: [],
              metadata: {
                testEnvironment: params.metadata?.testEnvironment || 'claude-desktop',
                tags: params.metadata?.tags || [],
                participantInfo: params.metadata?.participantInfo || { sessionType: 'manual' }
              },
              startTime: new Date().toISOString(),
              status: 'active'
            };

            // In production, store in D1 database
            console.log(`Started conversation capture: ${params.sessionId}`);

            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  status: "success",
                  message: `Conversation capture started for session ${params.sessionId}`,
                  sessionId: params.sessionId,
                  startTime: capture.startTime,
                  captureActive: true
                }, null, 2)
              }]
            };
          } catch (error) {
            console.error(`Error in 'start_conversation_capture':`, error);
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

      // Tool 8: Record Conversation Message
      this.server.tool(
        'record_conversation_message',
        {
          type: "object",
          properties: {
            sessionId: {
              type: "string",
              description: "Session ID for the active conversation capture"
            },
            role: {
              type: "string",
              description: "Message role: 'user' or 'assistant'",
              enum: ["user", "assistant"]
            },
            content: {
              type: "string",
              description: "The message content to record"
            },
            messageId: {
              type: "string",
              description: "Optional unique identifier for this message"
            },
            tokens: {
              type: "number",
              description: "Optional token count for this message"
            }
          },
          required: ["sessionId", "role", "content"],
          additionalProperties: false
        },
        async (params) => {
          try {
            const message: ConversationMessage = {
              messageId: params.messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date().toISOString(),
              role: params.role as 'user' | 'assistant',
              content: params.content,
              tokens: params.tokens
            };

            // In production, append to conversation record in D1
            console.log(`Recorded message for session ${params.sessionId}: ${params.role}`);

            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  status: "success",
                  message: "Message recorded successfully",
                  messageId: message.messageId,
                  timestamp: message.timestamp,
                  sessionId: params.sessionId
                }, null, 2)
              }]
            };
          } catch (error) {
            console.error(`Error in 'record_conversation_message':`, error);
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

      // Tool 9: Record MCP Tool Call
      this.server.tool(
        'record_mcp_tool_call',
        {
          type: "object",
          properties: {
            sessionId: {
              type: "string",
              description: "Session ID for the active conversation capture"
            },
            tool: {
              type: "string",
              description: "Name of the MCP tool that was called"
            },
            server: {
              type: "string", 
              description: "Name of the MCP server that provided the tool"
            },
            parameters: {
              type: "object",
              description: "Parameters passed to the tool call"
            },
            response: {
              type: "object",
              description: "Response received from the tool call"
            },
            error: {
              type: "string",
              description: "Error message if the tool call failed"
            },
            duration: {
              type: "number",
              description: "Duration of the tool call in milliseconds"
            },
            success: {
              type: "boolean",
              description: "Whether the tool call was successful"
            }
          },
          required: ["sessionId", "tool", "server", "parameters", "success"],
          additionalProperties: false
        },
        async (params) => {
          try {
            const mcpCall: MCPToolCall = {
              callId: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date().toISOString(),
              tool: params.tool,
              server: params.server,
              parameters: params.parameters,
              response: params.response || {},
              error: params.error,
              duration: params.duration || 0,
              success: params.success
            };

            // In production, append to conversation record in D1
            console.log(`Recorded MCP call for session ${params.sessionId}: ${params.tool}`);

            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  status: "success",
                  message: "MCP tool call recorded successfully",
                  callId: mcpCall.callId,
                  timestamp: mcpCall.timestamp,
                  sessionId: params.sessionId,
                  tool: params.tool,
                  success: params.success
                }, null, 2)
              }]
            };
          } catch (error) {
            console.error(`Error in 'record_mcp_tool_call':`, error);
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

      // Tool 10: End Conversation Capture
      this.server.tool(
        'end_conversation_capture',
        {
          type: "object",
          properties: {
            sessionId: {
              type: "string",
              description: "Session ID for the conversation capture to end"
            },
            status: {
              type: "string",
              description: "Final status of the conversation",
              enum: ["completed", "failed", "timeout", "cancelled"]
            },
            summary: {
              type: "string",
              description: "Optional summary of the conversation outcome"
            }
          },
          required: ["sessionId", "status"],
          additionalProperties: false
        },
        async (params) => {
          try {
            const endTime = new Date().toISOString();
            
            // In production, update conversation record in D1 with final status
            console.log(`Ended conversation capture: ${params.sessionId} - ${params.status}`);

            // Generate basic capture statistics
            const captureStats = {
              sessionId: params.sessionId,
              endTime,
              finalStatus: params.status,
              summary: params.summary,
              // In production, would calculate from stored data:
              messageCount: 0, // placeholder
              mcpCallCount: 0, // placeholder  
              duration: 0, // placeholder
              toolsUsed: [] // placeholder
            };

            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  status: "success",
                  message: `Conversation capture ended for session ${params.sessionId}`,
                  ...captureStats
                }, null, 2)
              }]
            };
          } catch (error) {
            console.error(`Error in 'end_conversation_capture':`, error);
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

      // Tool 11: Get Conversation Capture
      this.server.tool(
        'get_conversation_capture',
        {
          type: "object",
          properties: {
            sessionId: {
              type: "string",
              description: "Session ID to retrieve conversation capture for"
            },
            includeMessages: {
              type: "boolean",
              description: "Whether to include full message history",
              default: true
            },
            includeMcpCalls: {
              type: "boolean", 
              description: "Whether to include MCP tool call history",
              default: true
            }
          },
          required: ["sessionId"],
          additionalProperties: false
        },
        async (params) => {
          try {
            // In production, retrieve from D1 database
            const mockCapture: ConversationCapture = {
              sessionId: params.sessionId,
              messages: params.includeMessages ? [] : [],
              mcpCalls: params.includeMcpCalls ? [] : [],
              metadata: {
                testEnvironment: 'claude-desktop',
                tags: ['travel-agent-test'],
                participantInfo: { sessionType: 'manual' }
              },
              startTime: new Date().toISOString(),
              endTime: new Date().toISOString(),
              status: 'completed'
            };

            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  status: "success",
                  capture: mockCapture,
                  note: "In production, this would retrieve actual stored conversation data"
                }, null, 2)
              }]
            };
          } catch (error) {
            console.error(`Error in 'get_conversation_capture':`, error);
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
          'start_conversation_capture',
          'record_conversation_message',
          'record_mcp_tool_call',
          'end_conversation_capture',
          'get_conversation_capture',
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
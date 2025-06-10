// Types for the testing dashboard
export interface TestResult {
  id: string;
  sessionId: string;
  testId: string;
  scenarioId: string;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  startTime: string;
  endTime?: string;
  duration?: number;
  scores: QualityScores;
  conversationCapture?: ConversationCapture;
}

export interface QualityScores {
  overall: number;
  accuracy: number;
  completeness: number;
  efficiency: number;
  helpfulness: number;
  professionalism: number;
  responsiveness: number;
  contextAwareness: number;
}

export interface ConversationCapture {
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

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    responseTime?: number;
  };
}

export interface MCPToolCall {
  id: string;
  toolName: string;
  parameters: Record<string, any>;
  response: any;
  duration: number;
  success: boolean;
  error?: string;
  timestamp: string;
}

export interface ConversationMetadata {
  testEnvironment: string;
  tags: string[];
  participantInfo: {
    role: string;
    experience: string;
  };
  testPurpose: string;
}

export interface TestScenario {
  id: string;
  title: string;
  description: string;
  category: 'flight' | 'hotel' | 'activity' | 'workflow' | 'edge_case';
  complexity: 'simple' | 'intermediate' | 'complex';
  tags: string[];
  expectedOutcome: string;
  estimatedDuration: number;
}

export interface DashboardStats {
  totalTests: number;
  runningTests: number;
  completedTests: number;
  failedTests: number;
  averageScore: number;
  averageDuration: number;
}

export interface ChartData {
  timestamp: string;
  value: number;
  label?: string;
}
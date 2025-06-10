import { useState, useEffect, useCallback } from 'react';
import { TestResult, DashboardStats, TestScenario } from '../types';

// Mock data for development - replace with real API calls
const mockStats: DashboardStats = {
  totalTests: 156,
  runningTests: 3,
  completedTests: 142,
  failedTests: 11,
  averageScore: 0.847,
  averageDuration: 45000
};

const mockTestResults: TestResult[] = [
  {
    id: '1',
    sessionId: 'session-001',
    testId: 'test-001',
    scenarioId: 'flight-search-basic',
    status: 'completed',
    startTime: new Date(Date.now() - 3600000).toISOString(),
    endTime: new Date(Date.now() - 3000000).toISOString(),
    duration: 600000,
    scores: {
      overall: 0.92,
      accuracy: 0.95,
      completeness: 0.88,
      efficiency: 0.91,
      helpfulness: 0.94,
      professionalism: 0.89,
      responsiveness: 0.96,
      contextAwareness: 0.87
    }
  },
  {
    id: '2',
    sessionId: 'session-002',
    testId: 'test-002',
    scenarioId: 'hotel-search-complex',
    status: 'failed',
    startTime: new Date(Date.now() - 7200000).toISOString(),
    endTime: new Date(Date.now() - 6600000).toISOString(),
    duration: 600000,
    scores: {
      overall: 0.34,
      accuracy: 0.45,
      completeness: 0.23,
      efficiency: 0.56,
      helpfulness: 0.28,
      professionalism: 0.67,
      responsiveness: 0.78,
      contextAwareness: 0.31
    }
  },
  {
    id: '3',
    sessionId: 'session-003',
    testId: 'test-003',
    scenarioId: 'activity-booking-workflow',
    status: 'running',
    startTime: new Date(Date.now() - 300000).toISOString(),
    scores: {
      overall: 0,
      accuracy: 0,
      completeness: 0,
      efficiency: 0,
      helpfulness: 0,
      professionalism: 0,
      responsiveness: 0,
      contextAwareness: 0
    }
  }
];

export const useTestingAPI = () => {
  const [stats, setStats] = useState<DashboardStats>(mockStats);
  const [testResults, setTestResults] = useState<TestResult[]>(mockTestResults);
  const [scenarios, setScenarios] = useState<TestScenario[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with real API calls to the testing MCP server
      // const response = await fetch('/api/test-results');
      // const data = await response.json();
      
      // For now, simulate API delay and return mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update mock data to simulate real-time changes
      const updatedStats = {
        ...mockStats,
        totalTests: mockStats.totalTests + Math.floor(Math.random() * 3),
        runningTests: Math.floor(Math.random() * 5)
      };
      
      setStats(updatedStats);
      setTestResults(mockTestResults);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const runTest = useCallback(async (scenarioId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with real API call to start test
      // const response = await fetch('/api/run-test', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ scenarioId })
      // });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate test creation
      const newTest: TestResult = {
        id: `test-${Date.now()}`,
        sessionId: `session-${Date.now()}`,
        testId: `test-${Date.now()}`,
        scenarioId,
        status: 'running',
        startTime: new Date().toISOString(),
        scores: {
          overall: 0,
          accuracy: 0,
          completeness: 0,
          efficiency: 0,
          helpfulness: 0,
          professionalism: 0,
          responsiveness: 0,
          contextAwareness: 0
        }
      };
      
      setTestResults(prev => [newTest, ...prev]);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run test');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getConversationCapture = useCallback(async (sessionId: string) => {
    try {
      // TODO: Replace with real API call
      // const response = await fetch(`/api/conversation/${sessionId}`);
      // return await response.json();
      
      return null; // Mock: no conversation data yet
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch conversation');
      return null;
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    stats,
    testResults,
    scenarios,
    isLoading,
    error,
    refreshData: fetchData,
    runTest,
    getConversationCapture
  };
};
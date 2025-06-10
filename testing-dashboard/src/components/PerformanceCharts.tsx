import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TestResult } from '../types';

interface PerformanceChartsProps {
  testResults: TestResult[];
}

const PerformanceCharts: React.FC<PerformanceChartsProps> = ({ testResults }) => {
  // Process data for charts
  const completedTests = testResults.filter(test => test.status === 'completed');
  
  // Score trends over time
  const scoreData = completedTests
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .map((test, index) => ({
      test: `T${index + 1}`,
      score: Math.round(test.scores.overall * 100),
      accuracy: Math.round(test.scores.accuracy * 100),
      efficiency: Math.round(test.scores.efficiency * 100),
      helpfulness: Math.round(test.scores.helpfulness * 100)
    }));

  // Score distribution by dimension
  const avgScores = completedTests.reduce((acc, test) => {
    Object.keys(test.scores).forEach(key => {
      if (key !== 'overall') {
        acc[key] = (acc[key] || 0) + test.scores[key as keyof typeof test.scores];
      }
    });
    return acc;
  }, {} as Record<string, number>);

  const scoreDistribution = Object.keys(avgScores).map(key => ({
    dimension: key.charAt(0).toUpperCase() + key.slice(1),
    score: Math.round((avgScores[key] / completedTests.length) * 100)
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Score Trends */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Score Trends</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="test" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => [`${value}%`, '']} />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Overall Score"
              />
              <Line 
                type="monotone" 
                dataKey="accuracy" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Accuracy"
              />
              <Line 
                type="monotone" 
                dataKey="efficiency" 
                stroke="#f59e0b" 
                strokeWidth={2}
                name="Efficiency"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Score Distribution */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Average Scores by Dimension</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="dimension" 
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => [`${value}%`, 'Score']} />
              <Bar 
                dataKey="score" 
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Test Success Rate */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Test Success Rate</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {Math.round((completedTests.length / testResults.length) * 100)}%
            </div>
            <div className="text-sm text-gray-500">Completion Rate</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {completedTests.length > 0 ? Math.round(completedTests.reduce((sum, test) => sum + test.scores.overall, 0) / completedTests.length * 100) : 0}%
            </div>
            <div className="text-sm text-gray-500">Average Score</div>
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Completed: {completedTests.length}</span>
            <span>Failed: {testResults.filter(t => t.status === 'failed').length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full" 
              style={{ 
                width: `${(completedTests.length / testResults.length) * 100}%` 
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
        <div className="space-y-4">
          {completedTests.length > 0 && (
            <>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Average Duration</span>
                <span className="text-sm font-medium">
                  {Math.round(completedTests.reduce((sum, test) => sum + (test.duration || 0), 0) / completedTests.length / 1000)}s
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Fastest Test</span>
                <span className="text-sm font-medium">
                  {Math.round(Math.min(...completedTests.map(test => test.duration || 0)) / 1000)}s
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Slowest Test</span>
                <span className="text-sm font-medium">
                  {Math.round(Math.max(...completedTests.map(test => test.duration || 0)) / 1000)}s
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Total Test Time</span>
                <span className="text-sm font-medium">
                  {Math.round(completedTests.reduce((sum, test) => sum + (test.duration || 0), 0) / 60000)}m
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceCharts;
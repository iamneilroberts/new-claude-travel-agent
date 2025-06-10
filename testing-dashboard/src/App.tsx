import React, { useState, useEffect } from 'react';
import { Play, BarChart3, Clock, CheckCircle, XCircle, Activity } from 'lucide-react';
import DashboardStats from './components/DashboardStats';
import TestResultsTable from './components/TestResultsTable';
import ConversationViewer from './components/ConversationViewer';
import TestRunner from './components/TestRunner';
import PerformanceCharts from './components/PerformanceCharts';
import { TestResult, DashboardStats as DashboardStatsType } from './types';
import { useTestingAPI } from './hooks/useTestingAPI';

function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'tests' | 'conversations' | 'runner'>('overview');
  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);
  const { stats, testResults, isLoading, refreshData } = useTestingAPI();

  useEffect(() => {
    // Refresh data every 30 seconds
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'tests', label: 'Test Results', icon: CheckCircle },
    { id: 'conversations', label: 'Conversations', icon: Activity },
    { id: 'runner', label: 'Run Tests', icon: Play },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-8 w-8 text-primary-600" />
                <h1 className="text-2xl font-bold text-gray-900">Travel Agent Testing Dashboard</h1>
              </div>
              {isLoading && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                  <span>Loading...</span>
                </div>
              )}
            </div>
            <button
              onClick={refreshData}
              className="btn-secondary"
              disabled={isLoading}
            >
              Refresh Data
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <DashboardStats stats={stats} />
            <PerformanceCharts testResults={testResults} />
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Test Results</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>Last updated: {new Date().toLocaleTimeString()}</span>
              </div>
            </div>
            <TestResultsTable 
              testResults={testResults} 
              onSelectTest={setSelectedTest}
            />
          </div>
        )}

        {activeTab === 'conversations' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Conversation Viewer</h2>
            <ConversationViewer selectedTest={selectedTest} />
          </div>
        )}

        {activeTab === 'runner' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Test Runner</h2>
            <TestRunner onTestComplete={refreshData} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
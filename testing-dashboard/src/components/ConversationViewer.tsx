import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { MessageCircle, Tool, Clock, CheckCircle, XCircle } from 'lucide-react';
import { TestResult, ConversationCapture, ConversationMessage, MCPToolCall } from '../types';
import { useTestingAPI } from '../hooks/useTestingAPI';

interface ConversationViewerProps {
  selectedTest: TestResult | null;
}

const ConversationViewer: React.FC<ConversationViewerProps> = ({ selectedTest }) => {
  const [conversationData, setConversationData] = useState<ConversationCapture | null>(null);
  const [activeTab, setActiveTab] = useState<'messages' | 'tools'>('messages');
  const { getConversationCapture } = useTestingAPI();

  useEffect(() => {
    if (selectedTest?.sessionId) {
      getConversationCapture(selectedTest.sessionId).then(setConversationData);
    }
  }, [selectedTest, getConversationCapture]);

  if (!selectedTest) {
    return (
      <div className="card text-center py-12">
        <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Test Selected</h3>
        <p className="text-gray-500">Select a test from the Test Results tab to view its conversation details.</p>
      </div>
    );
  }

  // Mock conversation data since API isn't implemented yet
  const mockMessages: ConversationMessage[] = [
    {
      id: '1',
      role: 'user',
      content: 'I need to find flights from New York to London for next week.',
      timestamp: selectedTest.startTime,
      metadata: {
        tokensUsed: 15,
        responseTime: 100
      }
    },
    {
      id: '2',
      role: 'assistant',
      content: 'I\'d be happy to help you find flights from New York to London for next week. To provide you with the best options, I\'ll need a few more details: Which specific dates are you looking to travel? Do you have a preferred departure and return date?',
      timestamp: new Date(Date.parse(selectedTest.startTime) + 2000).toISOString(),
      metadata: {
        model: 'claude-3.5-sonnet',
        tokensUsed: 45,
        responseTime: 1500
      }
    }
  ];

  const mockToolCalls: MCPToolCall[] = [
    {
      id: '1',
      toolName: 'search_flights',
      parameters: {
        origin: 'JFK',
        destination: 'LHR',
        departureDate: '2024-06-17',
        returnDate: '2024-06-24',
        passengers: 1
      },
      response: {
        flights: [
          { airline: 'British Airways', price: 650, duration: '7h 15m' },
          { airline: 'Virgin Atlantic', price: 675, duration: '7h 30m' }
        ]
      },
      duration: 2300,
      success: true,
      timestamp: new Date(Date.parse(selectedTest.startTime) + 5000).toISOString()
    }
  ];

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Test Header */}
      <div className="card">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Test: {selectedTest.testId}</h3>
            <p className="text-sm text-gray-500 mt-1">Scenario: {selectedTest.scenarioId}</p>
            <p className="text-sm text-gray-500">Started: {format(new Date(selectedTest.startTime), 'MMM dd, yyyy HH:mm:ss')}</p>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              selectedTest.status === 'completed' ? 'bg-green-100 text-green-800' :
              selectedTest.status === 'failed' ? 'bg-red-100 text-red-800' :
              selectedTest.status === 'running' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {selectedTest.status}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Score: {Math.round(selectedTest.scores.overall * 100)}%
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="card">
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'messages', label: 'Messages', icon: MessageCircle, count: mockMessages.length },
              { id: 'tools', label: 'Tool Calls', icon: Tool, count: mockToolCalls.length }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="space-y-4">
            {mockMessages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-3xl px-4 py-3 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className="text-sm mb-2">{message.content}</div>
                  <div className={`text-xs opacity-75 flex items-center space-x-2 ${
                    message.role === 'user' ? 'text-primary-100' : 'text-gray-500'
                  }`}>
                    <Clock className="h-3 w-3" />
                    <span>{format(new Date(message.timestamp), 'HH:mm:ss')}</span>
                    {message.metadata?.tokensUsed && (
                      <span>• {message.metadata.tokensUsed} tokens</span>
                    )}
                    {message.metadata?.responseTime && (
                      <span>• {formatDuration(message.metadata.responseTime)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tool Calls Tab */}
        {activeTab === 'tools' && (
          <div className="space-y-4">
            {mockToolCalls.map((toolCall) => (
              <div key={toolCall.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Tool className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-900">{toolCall.toolName}</span>
                    {toolCall.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {format(new Date(toolCall.timestamp), 'HH:mm:ss')} • {formatDuration(toolCall.duration)}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Parameters</h4>
                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(toolCall.parameters, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Response</h4>
                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(toolCall.response, null, 2)}
                    </pre>
                  </div>
                </div>

                {toolCall.error && (
                  <div className="mt-3 p-2 bg-red-50 rounded text-sm text-red-700">
                    Error: {toolCall.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationViewer;
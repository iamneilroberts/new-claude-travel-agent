import React, { useState } from 'react';
import { Play, Settings, Clock, Target } from 'lucide-react';
import { useTestingAPI } from '../hooks/useTestingAPI';

interface TestRunnerProps {
  onTestComplete: () => void;
}

const TestRunner: React.FC<TestRunnerProps> = ({ onTestComplete }) => {
  const [selectedScenario, setSelectedScenario] = useState('');
  const [testCount, setTestCount] = useState(1);
  const [complexity, setComplexity] = useState<'simple' | 'intermediate' | 'complex'>('simple');
  const [category, setCategory] = useState<'flight' | 'hotel' | 'activity' | 'workflow' | 'edge_case'>('flight');
  const { runTest, isLoading } = useTestingAPI();

  // Mock scenarios for the demo
  const mockScenarios = [
    { id: 'flight-search-basic', title: 'Basic Flight Search', category: 'flight', complexity: 'simple', description: 'Search for round-trip flights between two cities' },
    { id: 'hotel-search-filters', title: 'Hotel Search with Filters', category: 'hotel', complexity: 'intermediate', description: 'Find hotels with specific amenities and price range' },
    { id: 'activity-booking-workflow', title: 'Complete Activity Booking', category: 'workflow', complexity: 'complex', description: 'Full workflow from search to booking confirmation' },
    { id: 'multi-city-planning', title: 'Multi-City Trip Planning', category: 'workflow', complexity: 'complex', description: 'Plan a complex multi-destination trip' },
    { id: 'last-minute-booking', title: 'Last-Minute Booking', category: 'edge_case', complexity: 'intermediate', description: 'Handle urgent booking requests with limited options' }
  ];

  const filteredScenarios = mockScenarios.filter(scenario => 
    category === 'workflow' || scenario.category === category
  );

  const handleRunTest = async () => {
    if (!selectedScenario) return;
    
    try {
      await runTest(selectedScenario);
      onTestComplete();
    } catch (error) {
      console.error('Failed to run test:', error);
    }
  };

  const generateRandomTest = async () => {
    const randomScenario = filteredScenarios[Math.floor(Math.random() * filteredScenarios.length)];
    setSelectedScenario(randomScenario.id);
    await runTest(randomScenario.id);
    onTestComplete();
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="text-center">
            <Target className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Run Single Test</h3>
            <p className="text-sm text-gray-500 mb-4">Execute a specific test scenario</p>
            <button
              onClick={handleRunTest}
              disabled={!selectedScenario || isLoading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Running...' : 'Run Test'}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="text-center">
            <Settings className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Generate Random</h3>
            <p className="text-sm text-gray-500 mb-4">Run a randomly selected scenario</p>
            <button
              onClick={generateRandomTest}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors w-full disabled:opacity-50"
            >
              {isLoading ? 'Running...' : 'Random Test'}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="text-center">
            <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Batch Testing</h3>
            <p className="text-sm text-gray-500 mb-4">Run multiple tests in sequence</p>
            <button
              disabled={isLoading}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md font-medium transition-colors w-full disabled:opacity-50"
            >
              Coming Soon
            </button>
          </div>
        </div>
      </div>

      {/* Test Configuration */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Test Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Filters */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="flight">Flight Search</option>
                <option value="hotel">Hotel Search</option>
                <option value="activity">Activity Booking</option>
                <option value="workflow">Complete Workflows</option>
                <option value="edge_case">Edge Cases</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Complexity</label>
              <select
                value={complexity}
                onChange={(e) => setComplexity(e.target.value as any)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="simple">Simple (Single tool)</option>
                <option value="intermediate">Intermediate (Multi-parameter)</option>
                <option value="complex">Complex (Multi-step)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Test Count</label>
              <select
                value={testCount}
                onChange={(e) => setTestCount(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value={1}>1 Test</option>
                <option value={3}>3 Tests</option>
                <option value={5}>5 Tests</option>
                <option value={10}>10 Tests</option>
              </select>
            </div>
          </div>

          {/* Scenario Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Scenario</label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredScenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className={`p-3 border rounded-md cursor-pointer transition-colors ${
                    selectedScenario === scenario.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedScenario(scenario.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{scenario.title}</h4>
                      <p className="text-sm text-gray-500 mt-1">{scenario.description}</p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        scenario.complexity === 'simple' ? 'bg-green-100 text-green-800' :
                        scenario.complexity === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {scenario.complexity}
                      </span>
                      <span className="text-xs text-gray-400 capitalize">{scenario.category}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Test History */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Test Runs</h3>
        <div className="text-sm text-gray-500">
          <p>Recent test executions will appear here once the API integration is complete.</p>
          <p className="mt-2">Current status: Using mock data for demonstration</p>
        </div>
      </div>
    </div>
  );
};

export default TestRunner;
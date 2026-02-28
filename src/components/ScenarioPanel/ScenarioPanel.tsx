import React, { useState } from 'react';

interface ScenarioPanelProps {
  onSimulate: (scenario: string) => void;
  isLoading: boolean;
  disabled: boolean;
  isConnected?: boolean;
  isCorrectNetwork?: boolean;
}

const SCENARIO_CHIPS = [
  'What if Germany won World War II?',
  'What if the Ottoman Empire never fell?',
  'What if Alexander the Great lived longer?',
  'What if the Black Death never happened?',
  'What if China discovered America first?',
  'What if the Roman Empire never fell?',
  'What if Napoleon won at Waterloo?',
  'What if the Library of Alexandria survived?'
];

const ScenarioPanel: React.FC<ScenarioPanelProps> = ({ 
  onSimulate, 
  isLoading, 
  disabled,
  isConnected = false,
  isCorrectNetwork = false
}) => {
  const [scenario, setScenario] = useState('');
  const [selectedChip, setSelectedChip] = useState<string | null>(null);

  const handleChipClick = (chipScenario: string) => {
    setScenario(chipScenario);
    setSelectedChip(chipScenario);
  };

  const handleSubmit = () => {
    if (scenario.trim()) {
      onSimulate(scenario.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  return (
    <div className="h-full panel p-6 flex flex-col space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-title text-2xl text-glow mb-2 tracking-wider">
          ✍ Alter History
        </h2>
        <p className="text-dim text-sm mb-2">
          Choose a historical turning point and let AI predict alternative timelines
        </p>
        <div className={`text-xs px-3 py-2 rounded border ${isConnected && isCorrectNetwork 
          ? 'border-green bg-green bg-opacity-10 text-green' 
          : 'border-gold bg-gold bg-opacity-10 text-gold'
        }`}>
          {isConnected && isCorrectNetwork 
            ? '✓ Network Connected' 
            : '⚛ Network Connection Required'
          }
        </div>
      </div>

      {/* Quick Scenario Chips */}
      <div>
        <h3 className="text-subtitle text-lg mb-4" style={{color: '#a67c28'}}>Popular Scenarios</h3>
        <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
          {SCENARIO_CHIPS.map((chipScenario, index) => (
            <button
              key={index}
              onClick={() => handleChipClick(chipScenario)}
              disabled={disabled}
              className={`text-left p-3 rounded border transition-all ${
                selectedChip === chipScenario
                  ? 'border-glow bg-glow bg-opacity-10 text-glow'
                  : 'border-border hover:border-glow hover:bg-glow hover:bg-opacity-5'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className="text-ui-light text-sm">{chipScenario}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Scenario Input */}
      <div className="flex-1">
        <h3 className="text-subtitle text-lg mb-4" style={{color: '#a67c28'}}>Custom Scenario</h3>
        <div className="relative">
          <textarea
            value={scenario}
            onChange={(e) => {
              setScenario(e.target.value);
              setSelectedChip(null);
            }}
            onKeyPress={handleKeyPress}
            placeholder="What if...? Describe your alternate history scenario here..."
            disabled={disabled}
            className={`w-full h-32 p-4 bg-void border border-border rounded resize-none text-ui-light placeholder-dim focus:border-glow focus:outline-none transition-colors ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          />
          <div className="absolute bottom-2 right-2 text-xs text-dim">
            Ctrl+Enter to simulate
          </div>
        </div>
      </div>

      {/* Character Counter */}
      <div className="text-xs text-dim text-right">
        {scenario.length}/500 characters
      </div>

      {/* Simulate Button */}
      <button
        onClick={handleSubmit}
        disabled={!scenario.trim() || disabled || isLoading || !isConnected || !isCorrectNetwork}
        className={`btn-primary w-full py-4 text-lg font-semibold ${
          (!scenario.trim() || disabled || isLoading || !isConnected || !isCorrectNetwork) 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:scale-105'
        } transition-all duration-200`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin w-5 h-5 border-2 border-void border-t-transparent rounded-full"></div>
            <span>Generating...</span>
          </div>
        ) : !isConnected ? (
          'Connect Wallet First'
        ) : !isCorrectNetwork ? (
          'Switch Network'
        ) : (
          'SIMULATE — ASK THE AIs'
        )}
      </button>

      {/* Instructions */}
      <div className="text-xs text-dim bg-panel border border-border rounded p-3">
        <p className="mb-2 font-semibold text-glow">✍ Monad Testnet Instructions:</p>
        <ul className="space-y-1">
          <li>• Connect MetaMask to Monad Testnet</li>
          <li>• Write a clear "What if" historical scenario</li>
          <li>• AI models will predict alternate outcomes</li>
          <li>• Vote for the best prediction with 1 MON</li>
          <li>• Winners share the pool + continue history</li>
        </ul>
        
        {(!isConnected || !isCorrectNetwork) && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-gold font-semibold mb-2">Need test tokens?</p>
            <a 
              href="https://faucet.monad.xyz" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gold hover:underline text-xs"
            >
              → Get free test tokens
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScenarioPanel;
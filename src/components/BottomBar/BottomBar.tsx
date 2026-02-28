import React from 'react';

interface GameState {
  scenario: string;
  predictions: Record<string, string>;
  votes: Record<string, number>;
  pool: number;
  round: number;
  isActive: boolean;
  winner: string | null;
}

interface MetaMaskState {
  address: string | null;
  balance: number;
  isConnected: boolean;
  isCorrectNetwork: boolean;
}

interface BottomBarProps {
  gameState: GameState;
  metamask: MetaMaskState;
}

const BottomBar: React.FC<BottomBarProps> = ({ gameState, metamask }) => {
  const totalVotes = Object.values(gameState.votes).reduce((sum, count) => sum + count, 0);
  
  // Find current leading AI
  const leadingAI = Object.entries(gameState.votes).reduce((leader, [aiId, votes]) => {
    return votes > leader.votes ? { aiId, votes } : leader;
  }, { aiId: '', votes: 0 });

  return (
    <div className="h-16 border-t border-border panel px-8 flex items-center justify-between">
      {/* Left - Game Stats */}
      <div className="flex items-center space-x-8">
        <div className="text-ui-light">
          <span className="text-dim">Round:</span>{' '}
          <span className="text-glow font-semibold">#{gameState.round}</span>
        </div>
        
        <div className="text-ui-light">
          <span className="text-dim">Pool:</span>{' '}
          <span className="text-gold font-semibold">{gameState.pool.toFixed(2)} MON</span>
        </div>
        
        <div className="text-ui-light">
          <span className="text-dim">Votes:</span>{' '}
          <span className="text-purple font-semibold">{totalVotes}</span>
        </div>

        {leadingAI.votes > 0 && (
          <div className="text-ui-light">
            <span className="text-dim">Leading:</span>{' '}
            <span className="text-green font-semibold">
              {leadingAI.aiId.toUpperCase()} ({leadingAI.votes})
            </span>
          </div>
        )}
      </div>

      {/* Center - Current Scenario (if any) */}
      {gameState.scenario ? (
        <div className="flex-1 mx-8 text-center">
          <p className="text-ui-light text-sm truncate">
            <span className="text-dim">Scenario:</span>{' '}
            {gameState.scenario}
          </p>
        </div>
      ) : (
        <div className="flex-1 mx-8 text-center">
          <div className="text-sm font-semibold" style={{color: '#8b5e3c'}}>
            ⛓ Ultra-Fast Network
          </div>
          <div className="text-dim text-xs">
            10,000 TPS • 400ms Blocks • 800ms Finality
          </div>
        </div>
      )}

      {/* Right - Status & Links */}
      <div className="flex items-center space-x-6">
        {/* Network Status */}
        <div className={`flex items-center space-x-2 ${
          metamask.isConnected && metamask.isCorrectNetwork 
            ? 'text-green' 
            : 'text-red'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            metamask.isConnected && metamask.isCorrectNetwork 
              ? 'bg-green animate-pulse' 
              : 'bg-red'
          }`}></div>
          <span className="text-xs">
            {metamask.isConnected 
              ? metamask.isCorrectNetwork 
                ? 'MON Connected' 
                : 'Wrong Network'
              : 'Disconnected'
            }
          </span>
        </div>

        {/* Links */}
        <div className="flex items-center space-x-4 text-xs">
          <a 
            href="https://testnet.monadscan.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-glow hover:underline"
          >
            🔍 Explorer
          </a>
          
          <a 
            href="https://faucet.monad.xyz" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gold hover:underline"
          >
            🚠 Faucet
          </a>
          
          <a 
            href="https://docs.monad.xyz" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:underline" style={{color: '#8b5e3c'}}
          >
            📚 Docs
          </a>
          
          <div className="text-dim">
            v0.1.0
          </div>
        </div>

        {/* Hackathon Badge */}
        <div className="text-xs bg-opacity-20 border rounded px-3 py-1" style={{backgroundColor: 'rgba(139,94,60,0.2)', borderColor: '#8b5e3c'}}>
          <span className="font-semibold" style={{color: '#8b5e3c'}}>🏆 Blitz İstanbul</span>
        </div>
      </div>
    </div>
  );
};

export default BottomBar;
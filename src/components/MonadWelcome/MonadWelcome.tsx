import React, { useState } from 'react';
import { MONAD_TESTNET } from '../../lib/monadClient';

interface MonadWelcomeProps {
  metamask: {
    address: string | null;
    balance: number;
    isConnected: boolean;
    isCorrectNetwork: boolean;
    chainId: string | null;
  };
  onConnect: () => void;
  onSwitchNetwork: () => void;
}

const MonadWelcome: React.FC<MonadWelcomeProps> = ({ metamask, onConnect, onSwitchNetwork }) => {
  const [isAddingNetwork, setIsAddingNetwork] = useState(false);

  const addMonadNetwork = async () => {
    if (!window.ethereum) {
      alert('MetaMask not detected! Please install MetaMask extension.');
      return;
    }

    setIsAddingNetwork(true);
    
    try {
      // Add the network
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [MONAD_TESTNET]
      });
      
      // Then switch to it
      await onSwitchNetwork();
      
    } catch (error: any) {
      console.error('Error adding Monad Testnet:', error);
      if (error.code === 4001) {
        alert('User rejected network addition');
      } else {
        alert('Failed to add Monad Testnet: ' + error.message);
      }
    } finally {
      setIsAddingNetwork(false);
    }
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center" style={{background: 'linear-gradient(135deg, #0d0805 0%, rgba(22,14,8,0.97) 50%, #0d0805 100%)'}}>
      <div className="max-w-2xl mx-auto text-center panel p-8 rounded-lg border" style={{borderColor: '#8b5e3c'}}>
        {/* Logo/Title */}
        <div className="mb-8">
          <h1 className="text-title text-5xl text-glow mb-4 glow-text tracking-wider">
            HISTOVERSE
          </h1>
          <div className="text-xl mb-2" style={{color: '#c4a265'}}>
            Alternate History Simulator
          </div>
          <p className="text-dim text-lg">
            Create alternative timelines with AI predictions
          </p>
        </div>

        {/* Connection Status */}
        <div className="mb-8 space-y-4">
          {/* MetaMask Status */}
          <div className={`p-4 rounded border ${
            typeof window !== 'undefined' && window.ethereum 
              ? 'border-green bg-green bg-opacity-10' 
              : 'border-red bg-red bg-opacity-10'
          }`}>
            <div className="flex items-center justify-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                typeof window !== 'undefined' && window.ethereum ? 'bg-green' : 'bg-red'
              }`}></div>
              <span className="text-ui font-semibold">
                {typeof window !== 'undefined' && window.ethereum 
                  ? '✓ MetaMask Detected' 
                  : '✗ MetaMask Required'
                }
              </span>
            </div>
          </div>

          {/* Wallet Connection Status */}
          {window.ethereum && (
            <div className={`p-4 rounded border ${
              metamask.isConnected 
                ? 'border-green bg-green bg-opacity-10' 
                : 'border-gold bg-gold bg-opacity-10'
            }`}>
              <div className="flex items-center justify-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  metamask.isConnected ? 'bg-green' : 'bg-gold'
                }`}></div>
                <span className="text-ui font-semibold">
                  {metamask.isConnected 
                    ? `✓ Wallet Connected (${metamask.address?.slice(0, 6)}...${metamask.address?.slice(-4)})` 
                    : 'Wallet Connection Needed'
                  }
                </span>
              </div>
            </div>
          )}

          {/* Network Status */}
          {metamask.isConnected && (
            <div className={`p-4 rounded border ${
              metamask.isCorrectNetwork 
                ? 'border-green bg-green bg-opacity-10' 
                : 'border-red bg-red bg-opacity-10'
            }`}>
              <div className="flex items-center justify-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  metamask.isCorrectNetwork ? 'bg-green' : 'bg-red'
                }`}></div>
                <span className="text-ui font-semibold">
                  {metamask.isCorrectNetwork 
                    ? '✓ Connected to Network' 
                    : `✗ Wrong Network (${metamask.chainId ? parseInt(metamask.chainId, 16) : 'Unknown'})`
                  }
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 mb-8">
          {!window.ethereum ? (
            <div className="text-center">
              <p className="text-dim mb-4">Please install MetaMask to continue</p>
              <a 
                href="https://metamask.io/download/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-primary inline-block px-8 py-3 text-lg"
              >
                Install MetaMask
              </a>
            </div>
          ) : !metamask.isConnected ? (
            <button
              onClick={onConnect}
              className="btn-primary w-full py-4 text-lg font-bold"
            >
              Connect Wallet
            </button>
          ) : !metamask.isCorrectNetwork ? (
            <div className="space-y-3">
              <button
                onClick={onSwitchNetwork}
                className="btn-danger w-full py-4 text-lg font-bold"
              >
                Switch to Correct Network
              </button>
              <button
                onClick={addMonadNetwork}
                disabled={isAddingNetwork}
                className="btn-gold w-full py-3"
              >
                {isAddingNetwork ? 'Adding Network...' : 'Add Network to MetaMask'}
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-green text-lg font-semibold mb-2">
                🚀 Ready to Simulate History!
              </div>
              <p className="text-dim">
                You're connected and ready. Start by writing a "What if..." scenario.
              </p>
            </div>
          )}
        </div>

        {/* Monad Testnet Info */}
        <div className="bg-void border border-border rounded p-4 text-left">
          <h4 className="text-subtitle mb-3" style={{color: '#8b5e3c'}}>Network Details:</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-dim">Network Name:</span>
              <br />
              <span className="text-ui font-mono">Custom Network</span>
            </div>
            <div>
              <span className="text-dim">Chain ID:</span>
              <br />
              <span className="text-ui font-mono">10143 (0x279F)</span>
            </div>
            <div>
              <span className="text-dim">Currency:</span>
              <br />
              <span className="text-ui font-mono">MON</span>
            </div>
            <div>
              <span className="text-dim">Status:</span>
              <br />
              <span className="text-ui font-mono">EVM Compatible</span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex justify-center space-x-4 mt-6 text-sm">
          <a 
            href="https://faucet.monad.xyz" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gold hover:underline"
          >
            🚰 Get Test Tokens
          </a>
          <a 
            href="https://testnet.monadscan.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-glow hover:underline"
          >
            🔍 Explorer
          </a>
        </div>

        {/* Hackathon Badge */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="text-xs bg-opacity-20 border rounded-full px-4 py-2 inline-block" style={{backgroundColor: 'rgba(139,94,60,0.2)', borderColor: '#8b5e3c'}}>
            <span className="font-semibold" style={{color: '#8b5e3c'}}>🏆 Blitz İstanbul 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonadWelcome;
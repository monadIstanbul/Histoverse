import React from 'react';

interface NetworkDebugProps {
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

const NetworkDebug: React.FC<NetworkDebugProps> = ({ metamask, onConnect, onSwitchNetwork }) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="panel p-4 m-4 border border-glow">
      <h3 className="text-title text-lg text-glow mb-4">🔧 Network Debug Panel</h3>
      
      <div className="space-y-3 text-sm">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-dim">MetaMask Detected:</span>
          <span className={`font-semibold ${
            typeof window !== 'undefined' && window.ethereum 
              ? 'text-green' : 'text-red'
          }`}>
            {typeof window !== 'undefined' && window.ethereum ? '✓ Yes' : '✗ No'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-dim">Wallet Connected:</span>
          <span className={`font-semibold ${metamask.isConnected ? 'text-green' : 'text-red'}`}>
            {metamask.isConnected ? '✓ Connected' : '✗ Disconnected'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-dim">Current Network:</span>
          <span className="font-semibold text-glow">
            {metamask.chainId ? `${parseInt(metamask.chainId, 16)} (${metamask.chainId})` : 'Unknown'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-dim">Correct Network:</span>
          <span className={`font-semibold ${metamask.isCorrectNetwork ? 'text-green' : 'text-red'}`}>
            {metamask.isCorrectNetwork ? '✓ Network Connected' : '✗ Wrong Network'}
          </span>
        </div>

        {metamask.address && (
          <div className="flex items-center justify-between">
            <span className="text-dim">Address:</span>
            <button
              onClick={() => copyToClipboard(metamask.address!)}
              className="font-mono text-xs text-glow hover:text-gold transition-colors"
            >
              {metamask.address.slice(0, 10)}...{metamask.address.slice(-8)}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-dim">Balance:</span>
          <span className="font-semibold text-gold">
            {metamask.balance.toFixed(4)} MON
          </span>
        </div>
      </div>

      {/* Expected Configuration */}
      <div className="mt-4 pt-4 border-t border-border">
        <h4 className="text-subtitle text-purple mb-2">Expected Network:</h4>
        <div className="text-xs text-dim space-y-1">
          <div>Chain ID: 10143 (0x279F)</div>
          <div>RPC: https://rpc.testnet.monad.xyz</div>
          <div>Explorer: https://testnet.monadscan.com</div>
          <div>Faucet: https://faucet.monad.xyz</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 space-y-2">
        {!metamask.isConnected && (
          <button
            onClick={onConnect}
            className="btn-primary w-full py-2 text-sm"
          >
            Connect Wallet
          </button>
        )}

        {metamask.isConnected && !metamask.isCorrectNetwork && (
          <button
            onClick={onSwitchNetwork}
            className="btn-danger w-full py-2 text-sm"
          >
            Switch Network
          </button>
        )}

        {/* Quick Links */}
        <div className="flex space-x-2 text-xs">
          <a 
            href="https://faucet.monad.xyz" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-gold py-1 px-3 text-xs"
          >
            Get Testnet MON
          </a>
          <a 
            href="https://testnet.monadscan.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-primary py-1 px-3 text-xs"
          >
            Explorer
          </a>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 text-xs text-dim bg-panel border border-border rounded p-2">
        <p className="font-semibold text-purple mb-1">Debug Steps:</p>
        <ol className="space-y-1">
          <li>1. Install MetaMask extension</li>
          <li>2. Click "Connect Wallet"</li>
          <li>3. If wrong network, click "Switch Network"</li>
          <li>4. Get test tokens from faucet</li>
          <li>5. Ready to vote! 🚀</li>
        </ol>
      </div>
    </div>
  );
};

export default NetworkDebug;
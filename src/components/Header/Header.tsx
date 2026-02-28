import React from 'react';

interface MetaMaskState {
  address: string | null;
  balance: number;
  isConnected: boolean;
  isLoading: boolean;
  isCorrectNetwork: boolean;
  switchToMonad?: () => Promise<boolean>;
}

interface HeaderProps {
  metamask: MetaMaskState;
  onConnect: () => void;
}

const Header: React.FC<HeaderProps> = ({ metamask, onConnect }) => {
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="h-20 border-b border-border panel flex items-center justify-between px-8 relative z-10">
      {/* Logo */}
      <div className="flex items-center space-x-4">
        <div className="text-title text-3xl text-glow glow-text tracking-wider">
          HISTOVERSE
        </div>
        <div className="text-left">
          <div className="text-sepia text-sm font-semibold font-cinzel tracking-wide" style={{color: '#a67c28'}}>
            Blockchain Chronicle
          </div>
          <div className="text-dim text-xs">
            Alternate History Simulator
          </div>
        </div>
      </div>

      {/* Center - Network Status */}
      <div className="flex items-center space-x-6">
        {/* Monad Network Indicator */}
        <div className={`flex items-center space-x-3 px-4 py-2 rounded-full border ${
          metamask.isConnected && metamask.isCorrectNetwork 
            ? 'border-green text-green bg-green bg-opacity-10' 
            : 'border-red text-red bg-red bg-opacity-10'
        }`}>
          <div className={`w-3 h-3 rounded-full ${
            metamask.isConnected && metamask.isCorrectNetwork ? 'bg-green animate-pulse-glow' : 'bg-red animate-pulse'
          }`}></div>
          <div className="text-left">
            <div className="text-ui text-sm font-semibold">
              {metamask.isConnected && metamask.isCorrectNetwork ? 'Connected' : 'Not Connected'}
            </div>
            <div className="text-xs opacity-75">
              {metamask.isConnected && metamask.isCorrectNetwork 
                ? 'Chain ID: 10143' 
                : 'Connect to continue'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Section */}
      <div className="flex items-center space-x-4">
        {metamask.isConnected ? (
          <div className="flex items-center space-x-4">
            {/* Balance */}
            <div className="text-ui">
              <span className="text-dim">Balance:</span>{' '}
              <span className="text-gold font-semibold">
                {metamask.balance.toFixed(4)} MON
              </span>
            </div>

            {/* Address */}
            <div className="px-4 py-2 border border-glow rounded-lg glow-border">
              <span className="text-ui text-glow">
                {formatAddress(metamask.address!)}
              </span>
            </div>

            {/* Switch Network Button (if needed) */}
            {!metamask.isCorrectNetwork && (
              <button 
                className="btn-danger text-sm px-4 py-2"
                onClick={async () => {
                  try {
                    // Call switchToMonad function from the hook
                    const switchResult = await (metamask as any).switchToMonad();
                    if (!switchResult) {
                      console.error('Failed to switch to Monad Testnet');
                    }
                  } catch (error: any) {
                    console.error('Error switching network:', error.message);
                  }
                }}
              >
                Switch to Monad
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={onConnect}
            disabled={metamask.isLoading}
            className={`btn-primary ${metamask.isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {metamask.isLoading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
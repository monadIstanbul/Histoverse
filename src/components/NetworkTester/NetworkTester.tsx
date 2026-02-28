import React, { useState } from 'react';
import { MONAD_TESTNET } from '../../lib/monadClient';

const NetworkTester: React.FC = () => {
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);

  const runNetworkTests = async () => {
    setIsLoading(true);
    const results: Record<string, any> = {};

    try {
      // Test 1: MetaMask Detection
      results.metamaskDetected = !!window.ethereum;
      
      // Test 2: RPC Connection
      try {
        const response = await fetch('https://rpc.testnet.monad.xyz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: 1,
            jsonrpc: '2.0',
            method: 'eth_chainId',
            params: []
          })
        });
        const data = await response.json();
        results.rpcResponse = data;
        results.rpcWorking = !!data.result;
        results.chainIdFromRPC = data.result;
      } catch (error) {
        results.rpcError = error;
        results.rpcWorking = false;
      }

      // Test 3: Current Network
      if (window.ethereum) {
        try {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          results.currentChainId = chainId;
          results.isMonadTestnet = chainId === MONAD_TESTNET.chainId;
        } catch (error) {
          results.networkError = error;
        }
      }

      // Test 4: Account Access
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          results.hasConnectedAccounts = accounts.length > 0;
          results.accounts = accounts;
        } catch (error) {
          results.accountError = error;
        }
      }

    } catch (error) {
      results.generalError = error;
    }

    setTestResults(results);
    setIsLoading(false);
  };

  const addMonadNetwork = async () => {
    if (!window.ethereum) {
      alert('MetaMask not detected');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [MONAD_TESTNET]
      });
      alert('Monad Testnet added successfully!');
    } catch (error: any) {
      alert('Error adding network: ' + error.message);
    }
  };

  const switchToMonad = async () => {
    if (!window.ethereum) {
      alert('MetaMask not detected');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MONAD_TESTNET.chainId }]
      });
      alert('Switched to Monad Testnet!');
    } catch (error: any) {
      if (error.code === 4902) {
        // Network not added yet
        await addMonadNetwork();
      } else {
        alert('Error switching network: ' + error.message);
      }
    }
  };

  return (
    <div className="panel p-4 m-4 border border-purple">
      <h3 className="text-title text-lg text-purple mb-4">Network Connection Tester</h3>
      
      <div className="space-y-3 mb-4">
        <button 
          onClick={runNetworkTests}
          disabled={isLoading}
          className="btn-primary w-full py-2"
        >
          {isLoading ? 'Testing...' : 'Run Network Tests'}
        </button>

        <div className="flex space-x-2">
          <button onClick={addMonadNetwork} className="btn-gold flex-1 py-2 text-sm">
            Add Monad Network
          </button>
          <button onClick={switchToMonad} className="btn-danger flex-1 py-2 text-sm">
            Switch to Monad
          </button>
        </div>
      </div>

      {Object.keys(testResults).length > 0 && (
        <div className="bg-void border border-border rounded p-3">
          <h4 className="text-subtitle text-glow mb-2">Test Results:</h4>
          <pre className="text-xs text-dim overflow-auto max-h-40">
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-4 text-xs text-dim">
        <p className="mb-2"><strong>Expected Values:</strong></p>
        <ul className="space-y-1">
          <li>Chain ID: 0x279F (10143 decimal)</li>
          <li>RPC: https://rpc.testnet.monad.xyz</li>
          <li>MetaMask detected: true</li>
          <li>RPC working: true</li>
        </ul>
      </div>
    </div>
  );
};

export default NetworkTester;
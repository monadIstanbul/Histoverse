import { useState, useCallback, useEffect } from 'react';
import { 
  MONAD_TESTNET, 
  VOTE_COST_WEI,
  VOTE_COST_MON,
  ERROR_MESSAGES, 
  isMonadTestnet
} from '../lib/monadClient';

// Extended Window interface for MetaMask
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (args: any) => void) => void;
      removeListener: (event: string, callback: (args: any) => void) => void;
      isMetaMask?: boolean;
    };
  }
}

interface MetaMaskState {
  address: string | null;
  balance: number;
  isConnected: boolean;
  isLoading: boolean;
  chainId: string | null;
  isCorrectNetwork: boolean;
}

interface MetaMaskHook extends MetaMaskState {
  connect: () => Promise<string | null>;
  disconnect: () => void;
  switchToMonad: () => Promise<boolean>;
  sendVote: (contractAddress: string, data?: string) => Promise<string>;
  refreshBalance: () => Promise<void>;
  addMonadNetwork: () => Promise<boolean>;
}

export function useMetaMask(): MetaMaskHook {
  const [state, setState] = useState<MetaMaskState>({
    address: null,
    balance: 0,
    isConnected: false,
    isLoading: false,
    chainId: null,
    isCorrectNetwork: false
  });

  // Check if MetaMask is available
  const isMetaMaskAvailable = useCallback(() => {
    return typeof window !== 'undefined' && window.ethereum?.isMetaMask;
  }, []);

  // Update connection state
  const updateState = useCallback((updates: Partial<MetaMaskState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Get current account and network
  const getCurrentAccount = useCallback(async () => {
    if (!isMetaMaskAvailable()) return null;

    try {
      console.log('🔍 Getting current MetaMask account...');
      const accounts = await window.ethereum!.request({
        method: 'eth_accounts'
      });

      const chainId = await window.ethereum!.request({
        method: 'eth_chainId'
      });

      console.log('📱 Current accounts:', accounts);
      console.log('🌐 Current chainId:', chainId, '(decimal:', parseInt(chainId, 16), ')');

      const address = accounts[0] || null;
      const isCorrectNetwork = isMonadTestnet(chainId);

      console.log('✅ Address extracted:', address);
      console.log('🎯 Is Monad Testnet?', isCorrectNetwork);

      updateState({
        address,
        chainId,
        isConnected: !!address,
        isCorrectNetwork
      });

      if (address) {
        await refreshBalance(address);
      }

      return address;
    } catch (error) {
      console.error('❌ Error getting current account:', error);
      return null;
    }
  }, [isMetaMaskAvailable, updateState]);

  // Get balance for address
  const refreshBalance = useCallback(async (address?: string) => {
    if (!isMetaMaskAvailable()) return;

    const targetAddress = address || state.address;
    if (!targetAddress) return;

    try {
      const balanceHex = await window.ethereum!.request({
        method: 'eth_getBalance',
        params: [targetAddress, 'latest']
      });

      const balanceWei = parseInt(balanceHex, 16);
      const balanceMON = balanceWei / 1e18;

      updateState({ balance: balanceMON });
    } catch (error) {
      console.error('Error getting balance:', error);
    }
  }, [isMetaMaskAvailable, state.address, updateState]);

  // Add Monad Network to MetaMask
  const addMonadNetwork = useCallback(async (): Promise<boolean> => {
    if (!isMetaMaskAvailable()) {
      throw new Error(ERROR_MESSAGES.NO_METAMASK);
    }

    try {
      await window.ethereum!.request({
        method: 'wallet_addEthereumChain',
        params: [MONAD_TESTNET]
      });

      // Check if switch was successful
      const newChainId = await window.ethereum!.request({
        method: 'eth_chainId'
      });

      const success = isMonadTestnet(newChainId);
      updateState({ 
        chainId: newChainId, 
        isCorrectNetwork: success 
      });

      return success;
    } catch (error: any) {
      console.error('Error adding Monad network:', error);
      if (error.code === 4001) {
        throw new Error(ERROR_MESSAGES.USER_REJECTED);
      }
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    }
  }, [isMetaMaskAvailable, updateState]);

  // Switch to Monad Testnet
  const switchToMonad = useCallback(async (): Promise<boolean> => {
    // console.log('🔄 Switching to Monad Testnet...');
    
    if (!isMetaMaskAvailable()) {
      console.error('❌ MetaMask not available for network switch');
      throw new Error(ERROR_MESSAGES.NO_METAMASK);
    }

    try {
      // console.log('📡 Requesting network switch to chainId:', MONAD_TESTNET.chainId);
      // First try to switch
      await window.ethereum!.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MONAD_TESTNET.chainId }]
      });

      // console.log('✅ Network switch successful!');
      updateState({ 
        chainId: MONAD_TESTNET.chainId, 
        isCorrectNetwork: true 
      });
      return true;
    } catch (switchError: any) {
      // console.log('⚠️ Network switch error:', switchError.code, switchError.message);
      
      // If the network doesn't exist (error code 4902), add it
      if (switchError.code === 4902) {
        // console.log('➕ Network not found, adding Monad Testnet...');
        return await addMonadNetwork();
      }

      // If user rejected the switch (error code 4001)
      if (switchError.code === 4001) {
        // console.log('❌ User rejected network switch');
        throw new Error(ERROR_MESSAGES.USER_REJECTED);
      }

      console.error('❌ Network switch failed:', switchError);
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    }
  }, [isMetaMaskAvailable, addMonadNetwork, updateState]);

  // Connect to MetaMask
  const connect = useCallback(async (): Promise<string | null> => {
    // console.log('🚀 Starting MetaMask connection...');
    
    if (!isMetaMaskAvailable()) {
      console.error('❌ MetaMask not available');
      throw new Error(ERROR_MESSAGES.NO_METAMASK);
    }

    updateState({ isLoading: true });

    try {
      // console.log('📞 Requesting account access...');
      // Request account access
      const accounts = await window.ethereum!.request({
        method: 'eth_requestAccounts'
      });

      // console.log('📱 Received accounts:', accounts);
      const address = accounts[0];
      if (!address) {
        throw new Error('No accounts found');
      }

      // Check current network
      // console.log('🌐 Checking current network...');
      const chainId = await window.ethereum!.request({
        method: 'eth_chainId'
      });

      // console.log('🔗 Current chainId:', chainId, '(decimal:', parseInt(chainId, 16), ')');
      const isCorrectNetwork = isMonadTestnet(chainId);
      // console.log('🎯 Is correct network (Monad Testnet)?', isCorrectNetwork);

      updateState({
        address,
        chainId,
        isConnected: true,
        isCorrectNetwork,
        isLoading: false
      });

      // Get balance
      // console.log('💰 Getting balance...');
      await refreshBalance(address);

      // console.log('✅ MetaMask connection successful!');
      return address;
    } catch (error: any) {
      console.error('❌ MetaMask connection failed:', error);
      updateState({ isLoading: false });
      
      if (error.code === 4001) {
        throw new Error(ERROR_MESSAGES.USER_REJECTED);
      }

      console.error('Error connecting to MetaMask:', error);
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    }
  }, [isMetaMaskAvailable, switchToMonad, refreshBalance, updateState]);

  // Disconnect (clear state)
  const disconnect = useCallback(() => {
    updateState({
      address: null,
      balance: 0,
      isConnected: false,
      chainId: null,
      isCorrectNetwork: false
    });
  }, [updateState]);

  // Send a vote transaction
  const sendVote = useCallback(async (contractAddress: string, data: string = '0x'): Promise<string> => {
    if (!isMetaMaskAvailable()) {
      throw new Error(ERROR_MESSAGES.NO_METAMASK);
    }

    if (!state.isConnected || !state.address) {
      throw new Error('Please connect your wallet first');
    }

    if (!state.isCorrectNetwork) {
      throw new Error(ERROR_MESSAGES.WRONG_NETWORK);
    }

    if (state.balance < VOTE_COST_MON) {
      throw new Error(`Insufficient balance: need at least ${VOTE_COST_MON} MON to vote`);
    }

    try {
      const txHash = await window.ethereum!.request({
        method: 'eth_sendTransaction',
        params: [{
          from: state.address,
          to: contractAddress,
          value: VOTE_COST_WEI,
          data: data,
          gas: '0x15F90' // 90000 in hex
        }]
      });

      // Refresh balance after transaction
      setTimeout(() => {
        refreshBalance();
      }, 2000);

      return txHash;
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error(ERROR_MESSAGES.USER_REJECTED);
      }

      console.error('Error sending transaction:', error);
      throw new Error(error.message || ERROR_MESSAGES.CONTRACT_ERROR);
    }
  }, [isMetaMaskAvailable, state, refreshBalance]);

  // Handle account and network changes
  useEffect(() => {
    if (!isMetaMaskAvailable()) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        const newAddress = accounts[0];
        updateState({ address: newAddress, isConnected: true });
        refreshBalance(newAddress);
      }
    };

    const handleChainChanged = (chainId: string) => {
      const isCorrectNetwork = isMonadTestnet(chainId);
      updateState({ chainId, isCorrectNetwork });
      
      // Refresh balance when network changes
      if (state.address) {
        refreshBalance();
      }
    };

    // Add event listeners
    window.ethereum!.on('accountsChanged', handleAccountsChanged);
    window.ethereum!.on('chainChanged', handleChainChanged);

    // Get current state on mount
    getCurrentAccount();

    // Cleanup
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [isMetaMaskAvailable, disconnect, updateState, refreshBalance, getCurrentAccount]);

  return {
    ...state,
    connect,
    disconnect,
    switchToMonad,
    sendVote,
    refreshBalance: () => refreshBalance(),
    addMonadNetwork
  };
}
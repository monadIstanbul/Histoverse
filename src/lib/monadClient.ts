// Monad Testnet Configuration
export const MONAD_TESTNET = {
  chainId: '0x279F',        // 10143 decimal
  chainName: 'Monad Testnet',
  nativeCurrency: {
    name: 'MON',
    symbol: 'MON',
    decimals: 18
  },
  rpcUrls: ['https://rpc.testnet.monad.xyz'],
  blockExplorerUrls: ['https://testnet.monadscan.com']
};

// Constants
export const VOTE_COST_MON = 1; // 1 MON per vote
export const VOTE_COST_WEI = '0xDE0B6B3A7640000'; // 1 MON in wei (1e18) hex

// Environment variables
export const SERVER_TREASURY = import.meta.env.VITE_SERVER_TREASURY || '0x1d101a131D5aa01A709110cF516e17265b7B86D3';
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x1d101a131D5aa01A709110cF516e17265b7B86D3';
export const MONAD_RPC = import.meta.env.VITE_MONAD_RPC || 'https://rpc.testnet.monad.xyz';
export const CHAIN_ID = parseInt(import.meta.env.VITE_CHAIN_ID || '10143');

// Utility functions
export function formatMON(wei: string | number): string {
  const ethValue = typeof wei === 'string' ? parseInt(wei) : wei;
  return (ethValue / 1e18).toFixed(4);
}

export function toWei(mon: number): string {
  return (mon * 1e18).toString();
}

export function hexToDecimal(hex: string): number {
  return parseInt(hex, 16);
}

export function decimalToHex(decimal: number): string {
  return '0x' + decimal.toString(16);
}

// Error messages
export const ERROR_MESSAGES = {
  NO_METAMASK: 'MetaMask not found. Please install MetaMask to continue.',
  WRONG_NETWORK: 'Please switch to Monad Testnet',
  INSUFFICIENT_FUNDS: 'Insufficient MON balance for voting',
  USER_REJECTED: 'Transaction rejected by user',
  NETWORK_ERROR: 'Network error. Please try again.',
  CONTRACT_ERROR: 'Smart contract error'
};

// Helper to check if we're on Monad Testnet
export function isMonadTestnet(chainId: string): boolean {
  return chainId === MONAD_TESTNET.chainId || parseInt(chainId, 16) === CHAIN_ID;
}
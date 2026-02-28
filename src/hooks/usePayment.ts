import { useState, useCallback, useEffect } from 'react';
import { VOTE_COST_WEI } from '../lib/monadClient';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export type TxStatus = 'pending' | 'confirmed' | 'failed';

export interface PaymentRecord {
  txHash: string;
  aiId: string;
  amount: number;        // in MON
  timestamp: number;
  status: TxStatus;
  from: string;
  roundId: number;
}

interface PaymentHook {
  history: PaymentRecord[];
  isPaying: boolean;
  /**
   * Sends 1 MON to `treasury`, encodes the voted AI in tx data,
   * then polls for receipt in the background.
   * Resolves with the transaction hash as soon as it is broadcast.
   */
  payForVote: (
    aiId: string,
    fromAddress: string,
    treasury: string,
    roundId: number
  ) => Promise<string>;
  clearHistory: () => void;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Encode a string as a 0x-prefixed hex string without Buffer */
function encodeToHex(str: string): string {
  const bytes = new TextEncoder().encode(str);
  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return '0x' + hex;
}

const STORAGE_KEY = 'histoverse_payment_history';

function loadHistory(): PaymentRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PaymentRecord[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(records: PaymentRecord[]): void {
  try {
    // Keep last 50 records only
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 50)));
  } catch {
    // ignore quota errors
  }
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────
export function usePayment(): PaymentHook {
  const [history, setHistory] = useState<PaymentRecord[]>(loadHistory);
  const [isPaying, setIsPaying] = useState(false);

  // Persist history whenever it changes
  useEffect(() => {
    saveHistory(history);
  }, [history]);

  // ── Receipt polling ──────────────────────────
  const waitForReceipt = useCallback(
    async (txHash: string): Promise<boolean> => {
      const MAX_ATTEMPTS = 40;
      const POLL_MS = 2_000;

      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        await new Promise(r => setTimeout(r, POLL_MS));
        try {
          const receipt = await window.ethereum!.request({
            method: 'eth_getTransactionReceipt',
            params: [txHash],
          });
          if (receipt !== null) {
            // status: '0x1' = success, '0x0' = revert
            return receipt.status === '0x1';
          }
        } catch {
          // network hiccup — keep polling
        }
      }
      return false; // timed-out: treat as unconfirmed
    },
    []
  );

  // ── Core payment function ────────────────────
  const payForVote = useCallback(
    async (
      aiId: string,
      fromAddress: string,
      treasury: string,
      roundId: number
    ): Promise<string> => {
      if (!window.ethereum) throw new Error('MetaMask not found');

      setIsPaying(true);

      // Encode which AI was voted for in the tx data
      // e.g. "vote:gpt" → hex string
      const voteData = encodeToHex(`vote:${aiId}`);

      try {
        const txHash: string = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [
            {
              from: fromAddress,
              to: treasury,
              value: VOTE_COST_WEI,
              data: voteData,
              gas: '0x15F90', // 90 000
            },
          ],
        });

        const record: PaymentRecord = {
          txHash,
          aiId,
          amount: 1,
          timestamp: Date.now(),
          status: 'pending',
          from: fromAddress,
          roundId,
        };

        setHistory(prev => [record, ...prev]);

        // Poll for receipt in background — don't block the caller
        waitForReceipt(txHash).then(success => {
          setHistory(prev =>
            prev.map(r =>
              r.txHash === txHash
                ? { ...r, status: success ? 'confirmed' : 'failed' }
                : r
            )
          );
        });

        return txHash;
      } catch (error: any) {
        if (error.code === 4001) throw new Error('Transaction rejected by user');
        throw new Error(error.message || 'Payment failed');
      } finally {
        setIsPaying(false);
      }
    },
    [waitForReceipt]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { history, isPaying, payForVote, clearHistory };
}

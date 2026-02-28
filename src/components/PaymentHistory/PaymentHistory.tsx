import React, { useState } from 'react';
import { PaymentRecord, TxStatus } from '../../hooks/usePayment';

interface PaymentHistoryProps {
  history: PaymentRecord[];
  onClear: () => void;
  explorerBase?: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const AI_LABELS: Record<string, string> = {
  gpt: '🔮 GPT-4',
  gemini: '💎 Gemini',
  claude: '🧠 Claude',
  deepseek: '🔍 DeepSeek',
};

function statusColor(status: TxStatus): string {
  switch (status) {
    case 'confirmed': return '#7a9e4a';
    case 'failed':    return '#c0392b';
    default:          return '#a67c28';
  }
}

function statusLabel(status: TxStatus): string {
  switch (status) {
    case 'confirmed': return '✓ Confirmed';
    case 'failed':    return '✗ Failed';
    default:          return '⏳ Pending';
  }
}

function shortHash(hash: string): string {
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
const PaymentHistory: React.FC<PaymentHistoryProps> = ({
  history,
  onClear,
  explorerBase = 'https://testnet.monadscan.com',
}) => {
  const [collapsed, setCollapsed] = useState(false);

  if (history.length === 0) return null;

  const totalMON = history.reduce((sum, r) => sum + r.amount, 0);
  const confirmed = history.filter(r => r.status === 'confirmed').length;

  return (
    <div className="panel p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCollapsed(v => !v)}
          className="flex items-center gap-2 text-left focus:outline-none"
        >
          <span className="text-subtitle text-sm" style={{ color: '#8b5e3c' }}>
            Payment History
          </span>
          <span className="text-xs text-dim">
            ({confirmed}/{history.length} confirmed · {totalMON} MON)
          </span>
          <span className="text-dim text-xs ml-1">
            {collapsed ? '▼' : '▲'}
          </span>
        </button>

        <button
          onClick={onClear}
          className="text-xs text-dim hover:text-red transition-colors px-2 py-1 rounded hover:bg-red hover:bg-opacity-10"
          title="Clear history"
        >
          Clear
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {history.map(record => (
            <div
              key={record.txHash}
              className="flex items-start justify-between text-xs border border-border rounded p-2 gap-2"
            >
              {/* Left: AI + round */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-ui-light">
                    {AI_LABELS[record.aiId] ?? record.aiId}
                  </span>
                  <span className="text-dim">· Round #{record.roundId}</span>
                </div>

                {/* Tx hash link */}
                <a
                  href={`${explorerBase}/tx/${record.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-glow hover:underline font-mono"
                  title={record.txHash}
                >
                  {shortHash(record.txHash)}
                </a>

                <span className="text-dim ml-2">{formatTime(record.timestamp)}</span>
              </div>

              {/* Right: amount + status */}
              <div className="text-right flex-shrink-0">
                <div className="text-gold font-semibold">{record.amount} MON</div>
                <div style={{ color: statusColor(record.status) }}>
                  {statusLabel(record.status)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;

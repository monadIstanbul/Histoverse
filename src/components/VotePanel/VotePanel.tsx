import React, { useState, useEffect } from 'react';

interface VotePanelProps {
  pool: number;
  totalVotes: number;
  round: number;
  isConnected: boolean;
  hasVoted?: boolean;
  pendingVote: string | null;
  pendingVoteName: string | null;
  onVote: () => void;      // confirm the pendingVote
  onFinalize?: () => void;
}

const VotePanel: React.FC<VotePanelProps> = ({
  pool,
  totalVotes,
  round,
  isConnected,
  hasVoted = false,
  pendingVote,
  pendingVoteName,
  onVote,
  onFinalize,
}) => {
  const [timeLeft, setTimeLeft] = useState(300);
  const [isActive, setIsActive] = useState(false);
  const [canFinalize, setCanFinalize] = useState(false);

  // Start timer on first vote
  useEffect(() => {
    if (totalVotes > 0 && !isActive) {
      setIsActive(true);
      setTimeLeft(300);
    }
  }, [totalVotes, isActive]);

  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { setIsActive(false); setCanFinalize(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  const canVote = !!pendingVote && !hasVoted && isConnected;
  const showFinalize = (canFinalize || (hasVoted && totalVotes > 0)) && !!onFinalize && !canVote;

  return (
    <div
      className="flex-shrink-0 border-t px-4 py-4 space-y-4"
      style={{ borderColor: 'rgba(180,145,85,0.15)', background: 'rgba(13,8,5,0.95)' }}
    >
      {/* ── Section header ── */}
      <div className="flex items-center gap-2">
        <span style={{ color: '#d4a520' }}>⚡</span>
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#c4a265', letterSpacing: '0.15em' }}>
          Cast Your Vote
        </span>
      </div>

      {/* ── Prize pool ── */}
      <div className="text-center">
        <div className="text-3xl font-bold" style={{ color: '#d4a520', fontFamily: "'Cinzel', serif" }}>
          {pool.toFixed(0)} MON
        </div>
        <div className="text-xs mt-0.5 tracking-widest uppercase" style={{ color: '#6b5a45' }}>
          Total Prize Pool
        </div>
      </div>

      {/* ── Distribution boxes ── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { pct: '70%', label: 'CREATOR', color: '#d4a520' },
          { pct: '20%', label: 'WINNERS', color: '#7a9e4a' },
          { pct: '10%', label: 'SERVER',  color: '#8b5e3c' },
        ].map(({ pct, label, color }) => (
          <div
            key={label}
            className="flex flex-col items-center py-2 rounded border"
            style={{ borderColor: `${color}30`, background: `${color}08` }}
          >
            <span className="text-base font-bold" style={{ color, fontFamily: "'Cinzel', serif" }}>{pct}</span>
            <span className="text-xs tracking-widest" style={{ color: `${color}80`, fontSize: 9 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Timer & vote cost row ── */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="uppercase tracking-wider" style={{ color: '#6b5a45' }}>Round Closes In</span>
          <span
            className={`font-bold tabular-nums ${timeLeft < 60 && isActive ? 'animate-pulse' : ''}`}
            style={{ color: timeLeft < 60 && isActive ? '#a83232' : '#c4a265', fontFamily: 'monospace' }}
          >
            {isActive ? formatTime(timeLeft) : hasVoted || totalVotes > 0 ? formatTime(timeLeft) : '—'}
          </span>
        </div>
        {/* Timer bar */}
        <div className="w-full h-0.5 rounded-full" style={{ background: 'rgba(107,90,69,0.2)' }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${(timeLeft / 300) * 100}%`,
              background: timeLeft < 60 ? '#a83232' : '#d4a520',
            }}
          />
        </div>
        <div className="flex items-center justify-between text-xs mt-1">
          <span className="uppercase tracking-wider" style={{ color: '#6b5a45' }}>Vote Cost</span>
          <span className="font-bold" style={{ color: '#d4a520' }}>1 MON</span>
        </div>
      </div>

      {/* ── Vote button ── */}
      <button
        onClick={onVote}
        disabled={!canVote}
        className="w-full py-3 rounded text-xs font-bold tracking-wider uppercase transition-all"
        style={{
          background: canVote ? 'transparent' : 'transparent',
          border: `1px solid ${canVote ? '#7a9e4a' : 'rgba(107,90,69,0.25)'}`,
          color: canVote ? '#7a9e4a' : '#4a3a2a',
          cursor: canVote ? 'pointer' : 'not-allowed',
          boxShadow: canVote ? '0 0 8px rgba(122,158,74,0.2) inset' : 'none',
        }}
      >
        {hasVoted
          ? '✓ Oyunuz Gönderildi'
          : pendingVoteName
          ? `📋 ${pendingVoteName} İçin Oy Ver`
          : '📋 Vote For Selected Prediction'}
      </button>

      {/* ── Finalize button ── */}
      {showFinalize && (
        <button
          onClick={onFinalize}
          className="w-full py-3 rounded text-xs font-bold tracking-wider uppercase transition-all hover:scale-[1.02]"
          style={{
            background: 'rgba(168,50,50,0.15)',
            border: '1px solid rgba(168,50,50,0.5)',
            color: '#ef6060',
            cursor: 'pointer',
          }}
        >
          🔒 Finalize Round &amp; Distribute
        </button>
      )}

      {/* ── Round info ── */}
      <div className="flex items-center justify-between text-xs" style={{ color: '#4a3a2a' }}>
        <span>Round #{round}</span>
        <span>{totalVotes} votes cast</span>
        <span className={isConnected ? '' : ''} style={{ color: isConnected ? '#7a9e4a' : '#a83232' }}>
          {isConnected ? '● Connected' : '● Disconnected'}
        </span>
      </div>
    </div>
  );
};

export default VotePanel;

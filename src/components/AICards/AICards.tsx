import React, { useCallback } from 'react';
import { AI_MODELS } from '../../lib/aiService';

interface AICardsProps {
  predictions: Record<string, string>;
  predictionStatus: Record<string, 'pending' | 'loading' | 'success' | 'error'>;
  votes: Record<string, number>;
  selectedAI: string | null;       // voted (locked in)
  pendingVote: string | null;      // selected but not yet voted
  declaredWinner: string | null;
  onSelectForVoting: (aiId: string) => void;
  onNewRound: () => void;
}

const AICards: React.FC<AICardsProps> = ({
  predictions,
  predictionStatus,
  votes,
  selectedAI,
  pendingVote,
  declaredWinner,
  onSelectForVoting,
  onNewRound,
}) => {
  const totalVotes = Object.values(votes).reduce((sum, n) => sum + n, 0);
  const hasVoted = selectedAI !== null;

  const allStatuses = Object.values(predictionStatus);
  const isLoadingAny = allStatuses.some((s) => s === 'loading');
  const allReady = allStatuses.every((s) => s === 'success');

  const handleCardClick = useCallback(
    (aiId: string) => {
      if (hasVoted || declaredWinner) return;
      if (predictionStatus[aiId] !== 'success') return;
      onSelectForVoting(aiId);
    },
    [hasVoted, declaredWinner, predictionStatus, onSelectForVoting]
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* ── Header ── */}
      <div
        className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: 'rgba(180,145,85,0.15)' }}
      >
        <span style={{ color: '#d4a520', fontSize: 13 }}>◈</span>
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#c4a265', letterSpacing: '0.15em' }}>
          AI Timeline Predictions
        </span>
        {isLoadingAny && (
          <div className="ml-auto animate-spin w-3 h-3 border border-t-transparent rounded-full"
            style={{ borderColor: '#c4a265', borderTopColor: 'transparent' }} />
        )}
        {allReady && !isLoadingAny && (
          <span className="ml-auto text-xs" style={{ color: '#7a9e4a' }}>● {Object.keys(predictions).length} ready</span>
        )}
      </div>

      {/* ── Winner banner ── */}
      {declaredWinner && (() => {
        const wAI = AI_MODELS.find((m) => m.id === declaredWinner);
        const userWon = selectedAI === declaredWinner;
        return wAI ? (
          <div className="flex-shrink-0 mx-3 mt-2 px-4 py-3 rounded border text-center"
            style={{
              borderColor: userWon ? '#ef4444' : '#d4a520',
              background: userWon ? 'rgba(239,68,68,0.07)' : 'rgba(212,165,32,0.07)',
            }}>
            <p className="text-sm font-bold tracking-wide" style={{ color: userWon ? '#ef4444' : '#d4a520' }}>
              ⚡ {wAI.name} · YENİ DÜNYA DÜZENİ
            </p>
            <p className="text-xs mt-1" style={{ color: '#6b5a45' }}>
              {userWon
                ? '⚔ 1 MON kurban edildi — tarihi sen yönlendirdin.'
                : '1 MON iade edilecek — bu sefer tarih seni beklemedi.'}
            </p>
            <button onClick={onNewRound}
              className="mt-2 px-4 py-1.5 rounded text-xs font-bold transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg,#d4a520,#a67c28)', color: '#0d0805' }}>
              ↺ Yeni Senaryo
            </button>
          </div>
        ) : null;
      })()}

      {/* ── Cards list ── */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {AI_MODELS.map((ai) => {
          const prediction = predictions[ai.id];
          const status = predictionStatus[ai.id] ?? 'pending';
          const voteCount = votes[ai.id] ?? 0;
          const votePct = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;

          const isSelected = selectedAI === ai.id;
          const isPending = pendingVote === ai.id && !hasVoted;
          const isDeclaredWinner = declaredWinner === ai.id;
          const isLoser = hasVoted && !isSelected && !isDeclaredWinner;
          const isClickable = status === 'success' && !hasVoted && !declaredWinner;

          let borderColor = 'rgba(180,145,85,0.15)';
          let bgColor = 'rgba(13,8,5,0.7)';
          if (isDeclaredWinner)            { borderColor = ai.color;    bgColor = `${ai.color}14`; }
          else if (isSelected)             { borderColor = '#d4a520';   bgColor = 'rgba(212,165,32,0.07)'; }
          else if (isPending)              { borderColor = ai.color;    bgColor = `${ai.color}10`; }

          return (
            <div key={ai.id}
              className="rounded-lg overflow-hidden transition-all duration-200"
              style={{
                border: `1px solid ${borderColor}`,
                background: bgColor,
                opacity: isLoser ? 0.4 : 1,
                cursor: isClickable ? 'pointer' : 'default',
                transform: isPending ? 'scale(1.01)' : 'scale(1)',
                boxShadow: isPending ? `0 0 12px ${ai.color}30` : 'none',
              }}
              onClick={() => isClickable && handleCardClick(ai.id)}
            >
              {/* Card header row */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{
                      background: (isDeclaredWinner || isPending || isSelected) ? ai.color : `${ai.color}55`,
                      boxShadow: (isDeclaredWinner || isPending) ? `0 0 6px ${ai.color}80` : 'none',
                    }} />
                  <span className="text-sm font-bold tracking-wider"
                    style={{
                      fontFamily: "'Cinzel', serif",
                      color: isDeclaredWinner ? ai.color : isPending ? ai.color : isSelected ? '#d4a520' : '#c4a265',
                    }}>
                    {ai.name}
                  </span>
                  {isDeclaredWinner && <span className="text-xs font-bold" style={{ color: ai.color }}>⚡</span>}
                  {isSelected && !isDeclaredWinner && <span className="text-xs" style={{ color: '#d4a520' }}>✓</span>}
                  {isPending && !isSelected && <span className="text-xs" style={{ color: ai.color }}>◉</span>}
                </div>

                {status === 'loading' ? (
                  <span className="text-xs px-2 py-0.5 rounded animate-pulse"
                    style={{ background: 'rgba(196,162,101,0.08)', color: '#6b5a45' }}>
                    analiz…
                  </span>
                ) : totalVotes > 0 ? (
                  <span className="text-xs font-bold px-2.5 py-1 rounded"
                    style={{
                      background: isDeclaredWinner ? `${ai.color}25` : 'rgba(180,145,85,0.10)',
                      color: isDeclaredWinner ? ai.color : '#c4a265',
                      border: `1px solid ${isDeclaredWinner ? ai.color + '45' : 'rgba(180,145,85,0.18)'}`,
                    }}>
                    {voteCount} votes
                  </span>
                ) : null}
              </div>

              {/* Prediction text */}
              <div className="px-4 pb-3">
                {status === 'loading' ? (
                  <div className="space-y-1.5 py-2">
                    {[100, 90, 82, 65].map((w, i) => (
                      <div key={i} className="h-2 rounded animate-pulse"
                        style={{ width: `${w}%`, background: `${ai.color}18`, animationDelay: `${i * 120}ms` }} />
                    ))}
                  </div>
                ) : status === 'error' ? (
                  <p className="text-xs py-2" style={{ color: '#a83232' }}>⚠ Tahmin alınamadı.</p>
                ) : prediction ? (
                  <p className="text-xs leading-relaxed"
                    style={{ color: isLoser ? '#4a3a28' : '#b0956a', whiteSpace: 'pre-line' }}>
                    {prediction}
                  </p>
                ) : (
                  <p className="text-xs py-2 italic" style={{ color: '#3a2a1a' }}>Senaryo bekleniyor…</p>
                )}
              </div>

              {/* Slim progress bar at card bottom */}
              {totalVotes > 0 && status === 'success' && (
                <div className="h-0.5 w-full" style={{ background: 'rgba(107,90,69,0.12)' }}>
                  <div className="h-full transition-all duration-700"
                    style={{
                      width: `${votePct}%`,
                      background: isDeclaredWinner ? ai.color : `linear-gradient(90deg, ${ai.color}50, ${ai.color})`,
                    }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AICards;


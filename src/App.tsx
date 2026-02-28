import { useState, useRef, useCallback, useEffect } from 'react';
import { useMetaMask } from './hooks/useMetaMask';
import { usePayment } from './hooks/usePayment';
import { CONTRACT_ADDRESS } from './lib/monadClient';
import { generatePredictions, AI_MODELS } from './lib/aiService';
import Header from './components/Header/Header';
import ScenarioPanel from './components/ScenarioPanel/ScenarioPanel';
import Globe from './components/Globe/Globe';
import AICards from './components/AICards/AICards';
import VotePanel from './components/VotePanel/VotePanel';
import BottomBar from './components/BottomBar/BottomBar';
import Toast from './components/Toast/Toast';

// Types
interface GameState {
  scenario: string;
  predictions: Record<string, string>;
  predictionStatus: Record<string, 'pending' | 'loading' | 'success' | 'error'>;
  votes: Record<string, number>;
  pool: number;
  round: number;
  isActive: boolean;
  winner: string | null;
}

function App() {
  const metamask = useMetaMask();
  const payment = usePayment();
  
  // Game state
  const [gameState, setGameState] = useState<GameState>({
    scenario: '',
    predictions: {},
    predictionStatus: {
      gpt: 'pending',
      gemini: 'pending',
      claude: 'pending',
      deepseek: 'pending',
    },
    votes: { gpt: 0, gemini: 0, claude: 0, deepseek: 0 },
    pool: 0,
    round: 0,
    isActive: false,
    winner: null
  });

  const [selectedAI, setSelectedAI] = useState<string | null>(null);
  const [pendingVote, setPendingVote] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-connect MetaMask on page load — intentionally runs once on mount only
  useEffect(() => {
    if (!metamask.isConnected && window.ethereum?.isMetaMask) {
      metamask.connect().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show toast with proper cleanup
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // Clear any existing timeout
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    
    setToast({ message, type });
    
    // Set new timeout
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 4000);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Handle new round — reset everything for a fresh scenario
  const handleNewRound = useCallback(() => {
    setSelectedAI(null);
    setPendingVote(null);
    setGameState({
      scenario: '',
      predictions: {},
      predictionStatus: {
        gpt: 'pending',
        gemini: 'pending',
        claude: 'pending',
        deepseek: 'pending',
      },
      votes: { gpt: 0, gemini: 0, claude: 0, deepseek: 0 },
      pool: 0,
      round: 0,
      isActive: false,
      winner: null,
    });
  }, []);

  // Handle scenario simulation
  const handleSimulate = useCallback(async (scenario: string) => {
    setIsLoading(true);

    // Reset game for new round
    setSelectedAI(null);
    setGameState(prev => ({
      ...prev,
      scenario,
      predictions: {},
      predictionStatus: {
        gpt: 'loading',
        gemini: 'loading',
        claude: 'loading',
        deepseek: 'loading',
      },
      votes: { gpt: 0, gemini: 0, claude: 0, deepseek: 0 },
      pool: 0,
      isActive: true,
      winner: null,
      round: prev.round + 1,
    }));

    showToast('Querying 4 AI models — this may take a moment...', 'info');

    try {
      await generatePredictions(scenario, (id, result) => {
        setGameState(prev => ({
          ...prev,
          predictions: result.prediction
            ? { ...prev.predictions, [id]: result.prediction }
            : prev.predictions,
          predictionStatus: {
            ...prev.predictionStatus,
            [id]: result.status ?? prev.predictionStatus[id],
          },
        }));
      });

      showToast('All 4 AI predictions ready — cast your vote!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to generate predictions', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Handle voting
  const handleVote = useCallback(async (aiId: string) => {
    // Prevent multiple concurrent votes
    if (isLoading || payment.isPaying || selectedAI) return;

    if (!metamask.isConnected) {
      showToast('Please connect your wallet first', 'error');
      return;
    }

    if (!metamask.isCorrectNetwork) {
      showToast('Please switch to the correct network first', 'error');
      return;
    }

    if (metamask.balance < 1) {
      showToast(`Insufficient balance: ${metamask.balance.toFixed(4)} MON (need 1 MON)`, 'error');
      return;
    }

    if (!metamask.address) {
      showToast('Wallet address not found', 'error');
      return;
    }

    setIsLoading(true);

    try {
      showToast('Sending 1 MON to treasury...', 'info');

      const txHash = await payment.payForVote(
        aiId,
        metamask.address,
        CONTRACT_ADDRESS,
        gameState.round
      );

      setSelectedAI(aiId);
      setGameState(prev => ({
        ...prev,
        votes: { ...prev.votes, [aiId]: prev.votes[aiId] + 1 },
        pool: prev.pool + 1,
      }));

      showToast(`✅ Vote broadcast! TX: ${txHash.slice(0, 10)}... (${aiId.toUpperCase()})`, 'success');

      // Refresh balance once tx is likely mined
      setTimeout(() => metamask.refreshBalance(), 4_000);
    } catch (error: any) {
      showToast(error.message || 'Vote failed', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, payment, selectedAI, metamask, gameState.round, showToast]);

  // Select AI for pending vote (two-step: select → confirm)
  const handleSelectForVoting = useCallback((aiId: string) => {
    if (!selectedAI) setPendingVote(aiId);
  }, [selectedAI]);

  // Confirm the pending vote and submit on-chain
  const handleConfirmVote = useCallback(async () => {
    if (!pendingVote) return;
    const id = pendingVote;
    setPendingVote(null);
    await handleVote(id);
  }, [pendingVote, handleVote]);

  // Stable close handler — prevents Toast's internal timer from resetting
  const handleCloseToast = useCallback(() => setToast(null), []);

  // Simulate other users' votes trickling in after user votes
  useEffect(() => {
    if (!selectedAI || gameState.winner) return;

    const aiIds = ['gpt', 'gemini', 'claude', 'deepseek'];
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    // Add 2-5 simulated voters per AI, arriving at random times 3-25 seconds
    aiIds.forEach(id => {
      const count = Math.floor(Math.random() * 4) + 2;
      for (let i = 0; i < count; i++) {
        const delay = Math.random() * 22_000 + 3_000;
        const t = setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            votes: { ...prev.votes, [id]: prev.votes[id] + 1 },
            pool: prev.pool + 1,
          }));
        }, delay);
        timeouts.push(t);
      }
    });

    return () => timeouts.forEach(clearTimeout);
  }, [selectedAI]); // eslint-disable-line react-hooks/exhaustive-deps

  // Declare winner: highest vote AI wins
  const handleFinalize = useCallback(() => {
    const aiIds = ['gpt', 'gemini', 'claude', 'deepseek'];
    const winnerAIId = aiIds.reduce((best, id) =>
      gameState.votes[id] > gameState.votes[best] ? id : best, aiIds[0]);
    
    const winnerModel = AI_MODELS.find(m => m.id === winnerAIId);

    setGameState(prev => ({ ...prev, winner: winnerAIId }));
    showToast(
      `⚡ Yeni Dünya Düzeni: ${winnerModel?.name ?? winnerAIId} kazandı! Kazananlara fedakarlık tebriği.`,
      'success'
    );
  }, [gameState.votes, showToast]);

  return (
    <div className="min-h-screen bg-void text-text overflow-hidden relative">
      {/* Scanlines effect */}
      <div className="scanlines"></div>
      
      {/* Header */}
      <Header 
        metamask={{...metamask, switchToMonad: metamask.switchToMonad}} 
        onConnect={() => metamask.connect()}
      />

      {/* Main layout */}
      <div className="flex h-[calc(100vh-144px)]">
        {/* Left Panel - Scenario Input */}
        <div className="w-96 flex-shrink-0">
          <ScenarioPanel 
            onSimulate={handleSimulate}
            isLoading={isLoading}
            disabled={isLoading}
            isConnected={metamask.isConnected}
            isCorrectNetwork={metamask.isCorrectNetwork}
          />
        </div>

        {/* Center - Globe */}
        <div className="flex-1 relative">
          {(() => {
            const winnerModel = gameState.winner
              ? AI_MODELS.find(m => m.id === gameState.winner)
              : null;
            return (
              <Globe 
                scenario={gameState.scenario}
                isLoading={isLoading}
                isConnected={metamask.isConnected}
                isCorrectNetwork={metamask.isCorrectNetwork}
                winner={gameState.winner}
                winnerName={winnerModel?.name ?? null}
                winnerColor={winnerModel?.color ?? null}
                winnerPrediction={gameState.winner ? (gameState.predictions[gameState.winner] ?? null) : null}
              />
            );
          })()}
        </div>

        {/* Right Panel - AI Cards & Voting */}
        {gameState.isActive && (
          <div className="w-96 flex-shrink-0 flex flex-col overflow-hidden">
            <>
                <AICards 
                  predictions={gameState.predictions}
                  predictionStatus={gameState.predictionStatus}
                  votes={gameState.votes}
                  selectedAI={selectedAI}
                  pendingVote={pendingVote}
                  declaredWinner={gameState.winner}
                  onSelectForVoting={handleSelectForVoting}
                  onNewRound={handleNewRound}
                />
                
                <VotePanel 
                  pool={gameState.pool}
                  totalVotes={Object.values(gameState.votes).reduce((a, b) => a + b, 0)}
                  round={gameState.round}
                  isConnected={metamask.isConnected}
                  hasVoted={!!selectedAI}
                  pendingVote={pendingVote}
                  pendingVoteName={pendingVote ? (AI_MODELS.find(m => m.id === pendingVote)?.name ?? null) : null}
                  onVote={handleConfirmVote}
                  onFinalize={selectedAI && !gameState.winner ? handleFinalize : undefined}
                />


            </>
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <BottomBar 
        gameState={gameState}
        metamask={metamask}
      />

      {/* Toast notifications */}
      {toast && (
        <Toast 
          message={toast.message}
          type={toast.type}
          onClose={handleCloseToast}
        />
      )}
    </div>
  );
}

export default App;
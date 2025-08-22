import { useState, useEffect, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from 'convex-api';
import type { Id } from 'convex-types';
import { PokerTableHorseshoeView } from './PokerTableHorseshoeView';
import type { Card } from '../../blackjack/types';
import type { PokerTableState } from '../../poker/types';

interface HandReplayProps {
  handId: Id<'hands'>;
  onClose?: () => void;
}

interface GameStateSnapshot {
  _id: string;
  timestamp: number;
  gameState: {
    status: string;
    street?: string;
    currentToAct?: number;
    pot: {
      main: number;
      sidePots?: Array<{ amount: number; eligibleSeats: number[] }>;
    };
    seats: Array<{
      seatIndex: number;
      stack: number;
      committedThisStreet: number;
      totalCommitted: number;
      hasFolded: boolean;
      isAllIn: boolean;
      hole: string[];
    }>;
    community: string[];
    buttonIndex: number;
    lastAggressorIndex?: number;
    betToCall: number;
    lastRaiseAmount: number;
  };
  trigger?: string;
  actionId?: string;
}

export function HandReplay({ handId, onClose }: HandReplayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000); // ms between steps

  // Fetch the complete hand replay data
  const handReplay = useQuery(api.history.getHandReplay, { handId });
  
  // Extract snapshots and sort by timestamp
  const snapshots = useMemo(() => {
    if (!handReplay?.gameStateSnapshots) return [];
    return [...handReplay.gameStateSnapshots].sort((a, b) => a.timestamp - b.timestamp);
  }, [handReplay?.gameStateSnapshots]);

  // Get current snapshot
  const currentSnapshot = snapshots[currentStep];
  
  // Convert string cards back to Card objects for the poker table
  const convertStringToCard = (cardString: string): Card => {
    // Safety check for undefined/null/empty card strings
    if (!cardString || cardString.length < 2) {
      return { rank: 'A', suit: 'Spades' }; // Default fallback card
    }
    
    const rank = cardString.slice(0, -1) as any;
    const suit = cardString.slice(-1);
    const suitMap: Record<string, any> = {
      'h': 'Hearts',
      'd': 'Diamonds', 
      'c': 'Clubs',
      's': 'Spades'
    };
    
    // Return fallback if suit mapping fails
    const mappedSuit = suitMap[suit.toLowerCase()];
    return { 
      rank: rank || 'A', 
      suit: mappedSuit || 'Spades' 
    };
  };

  // Convert snapshot to proper PokerTableState for the horseshoe view
  const currentPokerState = useMemo((): PokerTableState | null => {
    if (!currentSnapshot) return null;

    const snapshot = currentSnapshot.gameState;
    return {
      handId: snapshot.buttonIndex, // Use button index as hand ID for display
      deck: [], // We don't need the actual deck for replay
      community: (snapshot.community || []).filter((card: any) => card && card.length >= 2).map(convertStringToCard),
      seats: (snapshot.seats || []).map((seat: any) => ({
        seatIndex: seat.seatIndex,
        isCPU: false, // We'll determine this based on whether they have actions
        hole: (seat.hole || []).filter((card: any) => card && card.length >= 2).map(convertStringToCard),
        stack: seat.stack,
        committedThisStreet: seat.committedThisStreet,
        totalCommitted: seat.totalCommitted,
        hasFolded: seat.hasFolded,
        isAllIn: seat.isAllIn,
      })),
      buttonIndex: snapshot.buttonIndex,
      street: (snapshot.street as any) || 'preflop',
      status: snapshot.status as any,
      currentToAct: snapshot.currentToAct || null,
      lastAggressorIndex: snapshot.lastAggressorIndex || null,
      betToCall: snapshot.betToCall,
      lastRaiseAmount: snapshot.lastRaiseAmount,
      pot: { main: snapshot.pot.main },
      rules: { smallBlind: 25, bigBlind: 50 }, // Default rules
      gameOver: snapshot.status === 'hand_over',
    };
  }, [currentSnapshot]);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying || !snapshots.length) return;

    const timer = setTimeout(() => {
      if (currentStep < snapshots.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        setIsPlaying(false);
      }
    }, playbackSpeed);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, snapshots.length, playbackSpeed]);

  // Navigation functions
  const goToStep = (step: number) => {
    setCurrentStep(Math.max(0, Math.min(step, snapshots.length - 1)));
  };

  const goToStart = () => goToStep(0);
  const goToEnd = () => goToStep(snapshots.length - 1);
  const goBack = () => goToStep(currentStep - 1);
  const goForward = () => goToStep(currentStep + 1);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (currentStep === snapshots.length - 1) {
        setCurrentStep(0); // Reset to start if at end
      }
      setIsPlaying(true);
    }
  };

  // Previously used to render start/end timestamps under the progress bar
  // Removed from UI to reduce clutter but keeping utility around if needed in future.

  const getStepDescription = (snapshot: GameStateSnapshot) => {
    const trigger = snapshot.trigger || 'state_change';
    const street = snapshot.gameState.street || 'preflop';
    
    switch (trigger) {
      case 'hand_ended':
        return 'Hand completed';
      case 'street_change':
        return `Dealing ${street}`;
      case 'status_change':
        return `Status: ${snapshot.gameState.status}`;
      case 'player_turn_change':
        return `Player ${snapshot.gameState.currentToAct}'s turn`;
      case 'action_processed':
        return 'Action processed';
      default:
        return `State change: ${trigger}`;
    }
  };

  if (!handReplay) {
    return (
      <div className="flex items-center justify-center h-64" style={{ 
        background: 'var(--color-poker-table)',
        borderRadius: '12px',
        border: '1px solid var(--color-poker-table-border)'
      }}>
        <div className="text-lg" style={{ color: 'var(--color-neutral-200)' }}>Loading hand replay...</div>
      </div>
    );
  }

  if (!snapshots.length) {
    return (
      <div className="flex items-center justify-center h-64" style={{ 
        background: 'var(--color-poker-table)',
        borderRadius: '12px',
        border: '1px solid var(--color-poker-table-border)'
      }}>
        <div className="text-lg" style={{ color: 'var(--color-neutral-200)' }}>No replay data available for this hand</div>
      </div>
    );
  }

  return (
    <div id="replay-root" className="flex flex-col" style={{ 
      background: 'transparent',
      borderRadius: 0,
      border: 'none'
    }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4" style={{
        background: 'var(--color-poker-wood)',
        border: '1px solid var(--color-poker-table-border)',
        borderRadius: 12,
        color: 'var(--color-neutral-50)'
      }}>
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-neutral-50)' }}>Hand Replay</h2>
          <p className="text-sm" style={{ color: 'var(--color-neutral-200)' }}>
            Step {currentStep + 1} of {snapshots.length} • {getStepDescription(currentSnapshot)}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button className="as-button" onClick={goToStart} disabled={currentStep === 0}>
            ⏮️ Start
          </button>
          <button className="as-button" onClick={goBack} disabled={currentStep === 0}>
            ⏪ Previous
          </button>
          <button className="as-button" onClick={togglePlay}>
            {isPlaying ? "⏸️ Pause" : "▶️ Play"}
          </button>
          <button className="as-button" onClick={goForward} disabled={currentStep === snapshots.length - 1}>
            ⏩ Next
          </button>
          <button className="as-button" onClick={goToEnd} disabled={currentStep === snapshots.length - 1}>
            ⏭️ End
          </button>
          <div className="ml-4" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <label className="text-sm" style={{ color: 'var(--color-neutral-200)' }}>Speed:</label>
            <select 
              value={playbackSpeed} 
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="text-sm border rounded px-2 py-1"
              style={{
                background: 'var(--color-poker-table-light)',
                border: '1px solid var(--color-poker-table-border)',
                color: 'var(--color-neutral-200)'
              }}
            >
              <option value={500}>0.5s</option>
              <option value={1000}>1s</option>
              <option value={2000}>2s</option>
              <option value={3000}>3s</option>
            </select>
          </div>
          {onClose && (
            <button className="as-button" onClick={onClose}>
              Close Replay
            </button>
          )}
        </div>
      </div>

      {/* Replay Controls (moved to header) */}

      {/* Progress Bar removed for cleaner UI */}

      {/* Poker Table */}
      <div id="replay-table" className="p-4" style={{ 
        background: 'var(--color-poker-table-light)'
      }}>
        {currentPokerState ? (
          <PokerTableHorseshoeView 
            table={currentPokerState}
            revealed={{ 
              holeCounts: currentPokerState.seats.map(() => 2), 
              boardCount: currentPokerState.community.length 
            }}
            hideHoleCardsUntilShowdown={false}
            editLayoutMode={false}
            onSitHere={undefined}
            mySeatIndex={null}
            playerNames={[]}
            winnersSet={undefined}
            highlightSet={undefined}
            showdownText=""
            equity={null}
            available={[]}
            onFold={() => {}}
            onCheck={() => {}}
            onCall={() => {}}
            onBet={() => {}}
            onRaise={() => {}}
          />
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-lg" style={{ color: 'var(--color-neutral-200)' }}>Loading game state...</div>
          </div>
        )}
      </div>

      {/* Step Details */}
      <div id="replay-details" className="p-4 border-t rounded-b-lg" style={{
        background: 'var(--color-poker-wood)',
        borderTop: '1px solid var(--color-poker-table-border)',
        color: 'var(--color-neutral-200)'
      }}>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Current Street:</strong> {currentSnapshot?.gameState.street || 'preflop'}
          </div>
          <div>
            <strong>Pot:</strong> {currentSnapshot?.gameState.pot.main || 0}
          </div>
          <div>
            <strong>Status:</strong> {currentSnapshot?.gameState.status || 'unknown'}
          </div>
          <div>
            <strong>Active Player:</strong> {currentSnapshot?.gameState.currentToAct !== null ? `Seat ${currentSnapshot.gameState.currentToAct}` : 'None'}
          </div>
        </div>
      </div>
    </div>
  );
}

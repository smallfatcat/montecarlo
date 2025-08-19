import { useState, useEffect, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from 'app-convex/_generated/api';
import type { Id } from 'app-convex/_generated/dataModel';
import { PokerTableHorseshoeView } from './PokerTableHorseshoeView';
import { Button } from '../components/Button';
import type { Card } from '../../blackjack/types';
import type { PokerTableState } from '../../poker/types';

interface HandReplayProps {
  handId: Id<'hands'>;
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

export function HandReplay({ handId }: HandReplayProps) {
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

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

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
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading hand replay...</div>
      </div>
    );
  }

  if (!snapshots.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">No replay data available for this hand</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Hand Replay</h2>
          <p className="text-sm text-gray-600">
            Step {currentStep + 1} of {snapshots.length} • {getStepDescription(currentSnapshot)}
          </p>
        </div>
      </div>

      {/* Replay Controls */}
      <div className="flex items-center justify-center gap-2 p-4 border-b bg-gray-50">
        <Button onClick={goToStart} disabled={currentStep === 0} variant="outline" size="sm">
          ⏮️ Start
        </Button>
        <Button onClick={goBack} disabled={currentStep === 0} variant="outline" size="sm">
          ⏪ Previous
        </Button>
        
        <Button onClick={togglePlay} variant={isPlaying ? "danger" : "primary"} size="sm">
          {isPlaying ? "⏸️ Pause" : "▶️ Play"}
        </Button>
        
        <Button onClick={goForward} disabled={currentStep === snapshots.length - 1} variant="outline" size="sm">
          ⏩ Next
        </Button>
        <Button onClick={goToEnd} disabled={currentStep === snapshots.length - 1} variant="outline" size="sm">
          ⏭️ End
        </Button>

        <div className="ml-4 flex items-center gap-2">
          <label className="text-sm">Speed:</label>
          <select 
            value={playbackSpeed} 
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="text-sm border rounded px-2 py-1"
          >
            <option value={500}>0.5s</option>
            <option value={1000}>1s</option>
            <option value={2000}>2s</option>
            <option value={3000}>3s</option>
          </select>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-2 bg-gray-50">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / snapshots.length) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>{formatTimestamp(snapshots[0]?.timestamp || 0)}</span>
          <span>{formatTimestamp(snapshots[snapshots.length - 1]?.timestamp || 0)}</span>
        </div>
      </div>

      {/* Poker Table */}
      <div className="p-4">
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
            <div className="text-lg">Loading game state...</div>
          </div>
        )}
      </div>

      {/* Step Details */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
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

import type { HandHistory, HistoryEvent } from '../history';

/**
 * Interface for seat configuration in predefined hands
 */
export interface PredefinedSeat {
  stack: number;
  committedThisStreet: number;
  totalCommitted: number;
  hasFolded: boolean;
  isAllIn: boolean;
  hole: string[]; // Card strings like 'AC', 'AS'
}

/**
 * Interface for predefined hand configuration
 */
export interface PredefinedHandConfig {
  handId: number;
  buttonIndex: number;
  smallBlind: number;
  bigBlind: number;
  seats: PredefinedSeat[];
  flop?: string[];
  turn?: string[];
  river?: string[];
}

/**
 * Create a predefined hand history from configuration
 */
export function createPredefinedHand(config: PredefinedHandConfig): HandHistory {
  const { handId, buttonIndex, smallBlind, bigBlind, seats, flop, turn, river } = config;
  const ts = Date.now();
  
  const events: HistoryEvent[] = [
    { 
      ts, 
      type: 'hand_start', 
      handId, 
      buttonIndex, 
      smallBlind, 
      bigBlind 
    },
    {
      ts,
      type: 'hand_setup',
      handId,
      buttonIndex,
      rules: { smallBlind, bigBlind },
      deck: [],
      deckRemaining: 0,
      deckTotal: 0,
      seats: seats as any,
    } as any,
  ];

  // Add community card events
  if (flop) {
    events.push({ ts, type: 'deal_flop', cards: flop });
  }
  
  if (turn) {
    events.push({ ts, type: 'deal_turn', cards: turn });
  }
  
  if (river) {
    events.push({ ts, type: 'deal_river', cards: river });
  }

  return { handId, events };
}

/**
 * Create a side pot scenario hand
 */
export function createSidePotHand(): HandHistory {
  return createPredefinedHand({
    handId: 900001,
    buttonIndex: 0,
    smallBlind: 1,
    bigBlind: 2,
    seats: [
      { stack: 0, committedThisStreet: 0, totalCommitted: 100, hasFolded: false, isAllIn: true, hole: ['AC','AS'] },
      { stack: 0, committedThisStreet: 0, totalCommitted: 50, hasFolded: false, isAllIn: true, hole: ['KC','KS'] },
      { stack: 0, committedThisStreet: 0, totalCommitted: 10, hasFolded: false, isAllIn: true, hole: ['QC','QS'] },
    ],
    flop: ['2H','3H','4H'],
    turn: ['5H'],
    river: ['9S']
  });
}

/**
 * Create a side pot tie scenario hand
 */
export function createSidePotTieHand(): HandHistory {
  return createPredefinedHand({
    handId: 900002,
    buttonIndex: 0,
    smallBlind: 1,
    bigBlind: 2,
    seats: [
      { stack: 0, committedThisStreet: 0, totalCommitted: 30, hasFolded: false, isAllIn: true, hole: ['AC','3S'] },
      { stack: 0, committedThisStreet: 0, totalCommitted: 30, hasFolded: false, isAllIn: true, hole: ['AD','4S'] },
      { stack: 0, committedThisStreet: 0, totalCommitted: 30, hasFolded: false, isAllIn: true, hole: ['AH','2S'] },
      { stack: 0, committedThisStreet: 0, totalCommitted: 31, hasFolded: false, isAllIn: true, hole: ['QC','8H'] },
    ],
    flop: ['2C','5D','9S'],
    turn: ['JH'],
    river: ['KC']
  });
}

/**
 * Create a folded contributor scenario hand
 */
export function createFoldedContributorHand(): HandHistory {
  return createPredefinedHand({
    handId: 900003,
    buttonIndex: 1,
    smallBlind: 1,
    bigBlind: 2,
    seats: [
      { stack: 0, committedThisStreet: 0, totalCommitted: 50, hasFolded: false, isAllIn: true, hole: ['KS','KD'] },
      { stack: 0, committedThisStreet: 0, totalCommitted: 15, hasFolded: false, isAllIn: true, hole: ['QS','QD'] },
      { stack: 0, committedThisStreet: 0, totalCommitted: 15, hasFolded: true, isAllIn: false, hole: ['JH','JC'] },
    ],
    flop: ['7C','2D','3S'],
    turn: ['9D'],
    river: ['AS']
  });
}

/**
 * Create a heads-up tie scenario hand
 */
export function createHeadsUpTieHand(): HandHistory {
  return createPredefinedHand({
    handId: 900004,
    buttonIndex: 0,
    smallBlind: 1,
    bigBlind: 2,
    seats: [
      { stack: 0, committedThisStreet: 0, totalCommitted: 10, hasFolded: false, isAllIn: true, hole: ['2C','3C'] },
      { stack: 0, committedThisStreet: 0, totalCommitted: 10, hasFolded: false, isAllIn: true, hole: ['2H','3H'] },
    ],
    flop: ['AC','KD','QC'],
    turn: ['JD'],
    river: ['10S']
  });
}

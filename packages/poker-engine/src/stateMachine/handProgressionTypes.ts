/**
 * Hand Progression State Machine Types
 * Detailed states and events for poker hand progression through streets
 */

import type { BettingAction, Street } from '../types.js'

// Hand progression states
export type HandProgressionState = 
  | { type: 'hand_starting'; stage: 'dealing_cards' }
  | { type: 'betting_round'; street: Street; currentPlayer: number; betToCall: number; lastRaiseAmount: number }
  | { type: 'street_complete'; street: Street; nextStreet: Street | 'showdown' }
  | { type: 'dealing_community'; street: 'flop' | 'turn' | 'river'; cardsToAdd: number }
  | { type: 'hand_complete'; result: 'showdown' | 'fold_out' }

// Hand progression events
export type HandProgressionEvent =
  | { type: 'cards_dealt'; playersCount: number }
  | { type: 'player_action'; playerId: number; action: BettingAction; amount?: number }
  | { type: 'betting_complete'; allPlayersMatched: boolean; activePlayersCount: number }
  | { type: 'community_dealt'; street: Street; cards: string[] }
  | { type: 'advance_street'; fromStreet: Street; toStreet: Street | 'showdown' }
  | { type: 'hand_ended'; reason: 'showdown' | 'fold_out'; winner?: number }

// Betting round context
export interface BettingRoundContext {
  street: Street
  currentPlayer: number
  betToCall: number
  lastRaiseAmount: number
  playersInHand: number[]
  activePlayers: number[]
  playerChips: { [playerId: number]: number }
  playerCommittedThisStreet: { [playerId: number]: number }
  pot: number
  communityCards: string[]
}

// Action validation result
export interface ActionValidationResult {
  valid: boolean
  error?: string
  allowedActions?: BettingAction['type'][]
}

// Hand progression context
export interface HandProgressionContext {
  handId: number
  street: Street | null
  currentPlayer: number | null
  betToCall: number
  lastRaiseAmount: number
  playersInHand: Set<number>
  activePlayers: Set<number>
  playerStacks: Map<number, number>
  playerCommitted: Map<number, number>
  playerCommittedThisStreet: Map<number, number>
  pot: number
  communityCards: string[]
  bettingComplete: boolean
  handComplete: boolean
  lastAction?: {
    playerId: number
    action: BettingAction
    timestamp: number
  }
}

// Street configuration
export interface StreetConfig {
  name: Street
  communityCardsToAdd: number
  allowsBetting: boolean
  requiresAction: boolean
}

export const STREET_CONFIGS: Record<Street, StreetConfig> = {
  preflop: {
    name: 'preflop',
    communityCardsToAdd: 0,
    allowsBetting: true,
    requiresAction: true
  },
  flop: {
    name: 'flop',
    communityCardsToAdd: 3,
    allowsBetting: true,
    requiresAction: true
  },
  turn: {
    name: 'turn',
    communityCardsToAdd: 1,
    allowsBetting: true,
    requiresAction: true
  },
  river: {
    name: 'river',
    communityCardsToAdd: 1,
    allowsBetting: true,
    requiresAction: true
  },
  showdown: {
    name: 'showdown',
    communityCardsToAdd: 0,
    allowsBetting: false,
    requiresAction: false
  }
}

// Street progression order
export const STREET_ORDER: Street[] = ['preflop', 'flop', 'turn', 'river', 'showdown']

export function getNextStreet(currentStreet: Street): Street | null {
  const currentIndex = STREET_ORDER.indexOf(currentStreet)
  if (currentIndex === -1 || currentIndex === STREET_ORDER.length - 1) {
    return null
  }
  return STREET_ORDER[currentIndex + 1]
}

export function isValidStreetTransition(from: Street, to: Street): boolean {
  const fromIndex = STREET_ORDER.indexOf(from)
  const toIndex = STREET_ORDER.indexOf(to)
  return fromIndex !== -1 && toIndex !== -1 && toIndex === fromIndex + 1
}

// Betting rules interface
export interface BettingRules {
  bigBlind: number
  smallBlind: number
  minRaise?: number
  maxBet?: number
  allowCheckRaise: boolean
  allowStringBets: boolean
}

import type { BettingAction, BettingActionType } from '../types.js'

// Core game states
export type GameState = 
  | { type: 'idle' }
  | { type: 'waiting_for_players' }
  | { type: 'hand_in_progress' }
  | { type: 'hand_complete' }
  | { type: 'game_over' }

// Hand progression states
export type HandState = 
  | { type: 'preflop'; currentPlayer: number; actionRequired: boolean }
  | { type: 'flop'; currentPlayer: number; actionRequired: boolean }
  | { type: 'turn'; currentPlayer: number; actionRequired: boolean }
  | { type: 'river'; currentPlayer: number; actionRequired: boolean }
  | { type: 'showdown' }
  | { type: 'hand_settled' }

// Player action states
export type PlayerState = 
  | { type: 'waiting_for_action'; playerIndex: number; validActions: BettingActionType[] }
  | { type: 'action_in_progress'; playerIndex: number; action: BettingAction }
  | { type: 'action_complete'; playerIndex: number; result: ActionResult }

// Game events that trigger state transitions
export type GameEvent = 
  | { type: 'PLAYERS_READY' }
  | { type: 'START_HAND' }
  | { type: 'HAND_COMPLETE' }
  | { type: 'GAME_OVER' }
  | { type: 'PLAYER_ACTION'; playerIndex: number; action: BettingAction }
  | { type: 'ROUND_COMPLETE' }
  | { type: 'ADVANCE_STREET' }
  | { type: 'SETTLE_HAND' }
  | { type: 'START_NEXT_HAND' }

// Hand events
export type HandEvent = 
  | { type: 'PLAYER_ACTION'; playerIndex: number; action: BettingAction }
  | { type: 'ROUND_COMPLETE' }
  | { type: 'ADVANCE_STREET' }
  | { type: 'SETTLE_HAND' }

// Player action events
export type PlayerEvent = 
  | { type: 'ACTION_COMPLETE'; playerIndex: number; result: ActionResult }
  | { type: 'TIMEOUT'; playerIndex: number }
  | { type: 'AUTO_ACTION'; playerIndex: number; action: BettingAction }

// Action result types
export type ActionResult = 
  | { type: 'success'; action: BettingAction }
  | { type: 'error'; message: string; code: string }
  | { type: 'timeout'; defaultAction: BettingAction }

// State machine context
export interface PokerContext {
  players: Array<{
    id: number
    isCPU: boolean
    stack: number
    committedThisStreet: number
    totalCommitted: number
    hasFolded: boolean
    isAllIn: boolean
    hole: string[]
  }>
  currentHand: {
    id: number
    buttonIndex: number
    smallBlind: number
    bigBlind: number
  } | null
  pot: number
  deck: string[]
  community: string[]
  betToCall: number
  lastRaiseAmount: number
  lastAggressorIndex: number | null
}

// Transition rules
export interface TransitionRule {
  from: GameState['type']
  event: GameEvent['type']
  to: GameState['type']
  condition?: (context: PokerContext, event: GameEvent) => boolean
  action?: (context: PokerContext, event: GameEvent) => void
}

// State machine configuration
export interface StateMachineConfig {
  initial: GameState['type']
  states: Record<GameState['type'], {
    on?: Record<GameEvent['type'], {
      target: GameState['type']
      cond?: string
      actions?: string[]
    }>
    entry?: string[]
    exit?: string[]
  }>
  context: PokerContext
}

/**
 * Hand Progression State Machine Examples
 * Demonstrates complete poker hand flows through all streets
 */

import { HandProgressionStateMachine } from './handProgressionMachine.js'
import { ActionValidator } from './actionValidator.js'
import type { HandProgressionEvent, BettingRoundContext } from './handProgressionTypes.js'
import type { BettingAction } from '../types.js'

/**
 * Example 1: Simple heads-up hand that goes to showdown
 */
export function exampleHeadsUpShowdown() {
  console.log('\n=== EXAMPLE 1: Heads-Up Hand to Showdown ===')
  
  // Initialize hand with two players
  const playerStacks = new Map([
    [0, 1000], // Player 0: 1000 chips
    [1, 1000]  // Player 1: 1000 chips
  ])
  
  const machine = new HandProgressionStateMachine(1, [0, 1], playerStacks, 2)
  
  console.log('Initial state:', machine.getCurrentState())
  console.log('Initial context:', {
    activePlayers: Array.from(machine.getContext().activePlayers),
    playerStacks: Object.fromEntries(machine.getContext().playerStacks)
  })
  
  // Start hand - deal cards
  console.log('\n--- Dealing Cards ---')
  const cardsDealt: HandProgressionEvent = { type: 'cards_dealt', playersCount: 2 }
  machine.processEvent(cardsDealt)
  console.log('After cards dealt:', machine.getCurrentState())
  
  // Preflop betting round
  console.log('\n--- Preflop Betting ---')
  let context = machine.getBettingRoundContext()!
  console.log('Betting context:', context)
  
  // Player 0 calls
  let action: BettingAction = { type: 'call' }
  let validation = machine.validateAction(0, action)
  console.log(`Player 0 ${action.type}:`, validation)
  if (validation.valid) {
    machine.processEvent({ type: 'player_action', playerId: 0, action })
    console.log('State after P0 call:', machine.getCurrentState())
  }
  
  // Player 1 checks
  action = { type: 'check' }
  validation = machine.validateAction(1, action)
  console.log(`Player 1 ${action.type}:`, validation)
  if (validation.valid) {
    machine.processEvent({ type: 'player_action', playerId: 1, action })
    console.log('State after P1 check:', machine.getCurrentState())
  }
  
  // Advance to flop
  console.log('\n--- Advancing to Flop ---')
  machine.processEvent({ type: 'advance_street', fromStreet: 'preflop', toStreet: 'flop' })
  console.log('After street advance:', machine.getCurrentState())
  
  // Deal flop
  machine.processEvent({ 
    type: 'community_dealt', 
    street: 'flop', 
    cards: ['Ah', 'Kh', '7s'] 
  })
  console.log('After flop dealt:', machine.getCurrentState())
  
  // Flop betting
  console.log('\n--- Flop Betting ---')
  context = machine.getBettingRoundContext()!
  
  // Player 0 bets
  action = { type: 'bet', amount: 50 }
  validation = machine.validateAction(0, action)
  console.log(`Player 0 ${action.type} ${action.amount}:`, validation)
  if (validation.valid) {
    machine.processEvent({ type: 'player_action', playerId: 0, action, amount: action.amount })
    console.log('State after P0 bet:', machine.getCurrentState())
  }
  
  // Player 1 calls
  action = { type: 'call' }
  validation = machine.validateAction(1, action)
  console.log(`Player 1 ${action.type}:`, validation)
  if (validation.valid) {
    machine.processEvent({ type: 'player_action', playerId: 1, action })
    console.log('State after P1 call:', machine.getCurrentState())
  }
  
  // Continue through turn and river...
  console.log('\n--- Turn ---')
  machine.processEvent({ type: 'advance_street', fromStreet: 'flop', toStreet: 'turn' })
  machine.processEvent({ type: 'community_dealt', street: 'turn', cards: ['Qc'] })
  
  // Quick turn betting (both check)
  machine.processEvent({ type: 'player_action', playerId: 0, action: { type: 'check' } })
  machine.processEvent({ type: 'player_action', playerId: 1, action: { type: 'check' } })
  
  console.log('\n--- River ---')
  machine.processEvent({ type: 'advance_street', fromStreet: 'turn', toStreet: 'river' })
  machine.processEvent({ type: 'community_dealt', street: 'river', cards: ['2d'] })
  
  // River betting (both check)
  machine.processEvent({ type: 'player_action', playerId: 0, action: { type: 'check' } })
  machine.processEvent({ type: 'player_action', playerId: 1, action: { type: 'check' } })
  
  console.log('\n--- Showdown ---')
  machine.processEvent({ type: 'advance_street', fromStreet: 'river', toStreet: 'showdown' })
  machine.processEvent({ type: 'hand_ended', reason: 'showdown' })
  
  console.log('Final state:', machine.getCurrentState())
  console.log('Final context:', {
    pot: machine.getContext().pot,
    communityCards: machine.getContext().communityCards,
    activePlayers: Array.from(machine.getContext().activePlayers)
  })
}

/**
 * Example 2: Multi-player hand with fold-out
 */
export function exampleMultiPlayerFoldOut() {
  console.log('\n=== EXAMPLE 2: Multi-Player Hand with Fold-Out ===')
  
  // Initialize hand with three players
  const playerStacks = new Map([
    [0, 500],  // Player 0: 500 chips
    [1, 750],  // Player 1: 750 chips
    [2, 1200]  // Player 2: 1200 chips
  ])
  
  const machine = new HandProgressionStateMachine(2, [0, 1, 2], playerStacks, 4)
  
  console.log('Initial state:', machine.getCurrentState())
  
  // Deal cards
  machine.processEvent({ type: 'cards_dealt', playersCount: 3 })
  console.log('After cards dealt:', machine.getCurrentState())
  
  // Preflop action
  console.log('\n--- Preflop Action ---')
  
  // Player 0 raises
  let action: BettingAction = { type: 'bet', amount: 20 }
  machine.processEvent({ type: 'player_action', playerId: 0, action, amount: 20 })
  console.log('P0 bets 20, state:', machine.getCurrentState())
  
  // Player 1 calls
  action = { type: 'call' }
  machine.processEvent({ type: 'player_action', playerId: 1, action })
  console.log('P1 calls, state:', machine.getCurrentState())
  
  // Player 2 folds
  action = { type: 'fold' }
  machine.processEvent({ type: 'player_action', playerId: 2, action })
  console.log('P2 folds, state:', machine.getCurrentState())
  console.log('Active players:', Array.from(machine.getContext().activePlayers))
  
  // Continue to flop with remaining players
  console.log('\n--- Flop ---')
  machine.processEvent({ type: 'advance_street', fromStreet: 'preflop', toStreet: 'flop' })
  machine.processEvent({ type: 'community_dealt', street: 'flop', cards: ['Js', 'Ts', '9h'] })
  
  // Flop action - Player 1 folds to a big bet
  machine.processEvent({ type: 'player_action', playerId: 0, action: { type: 'bet', amount: 100 }, amount: 100 })
  console.log('P0 bets 100')
  
  machine.processEvent({ type: 'player_action', playerId: 1, action: { type: 'fold' } })
  console.log('P1 folds - hand should end')
  
  console.log('Final state:', machine.getCurrentState())
  console.log('Final context:', {
    pot: machine.getContext().pot,
    activePlayers: Array.from(machine.getContext().activePlayers),
    handComplete: machine.getContext().handComplete
  })
}

/**
 * Example 3: Action validation showcase
 */
export function exampleActionValidation() {
  console.log('\n=== EXAMPLE 3: Action Validation Showcase ===')
  
  const playerStacks = new Map([
    [0, 100],  // Short stack
    [1, 1000]  // Big stack
  ])
  
  const machine = new HandProgressionStateMachine(3, [0, 1], playerStacks, 2)
  machine.processEvent({ type: 'cards_dealt', playersCount: 2 })
  
  const context = machine.getBettingRoundContext()!
  console.log('Betting context:', context)
  
  // Test various actions
  const testActions: BettingAction[] = [
    { type: 'check' },
    { type: 'call' },
    { type: 'bet', amount: 50 },
    { type: 'bet', amount: 1 },      // Too small
    { type: 'bet', amount: 200 },    // More than short stack has
    { type: 'raise', amount: 100 },  // No bet to raise
    { type: 'fold' }
  ]
  
  console.log('\n--- Testing Actions for Player 0 (short stack) ---')
  testActions.forEach(action => {
    const validation = machine.validateAction(0, action)
    console.log(`${action.type}${action.amount ? ` ${action.amount}` : ''}:`, 
      validation.valid ? '✓ Valid' : `✗ ${validation.error}`,
      validation.allowedActions ? `(Allowed: ${validation.allowedActions.join(', ')})` : ''
    )
  })
  
  // Create a betting scenario
  console.log('\n--- After Player 0 bets 50 ---')
  machine.processEvent({ type: 'player_action', playerId: 0, action: { type: 'bet', amount: 50 }, amount: 50 })
  
  const testActionsWithBet: BettingAction[] = [
    { type: 'check' },     // Invalid - there's a bet
    { type: 'call' },      // Valid
    { type: 'raise', amount: 100 }, // Valid
    { type: 'raise', amount: 60 },  // Too small
    { type: 'fold' }       // Valid
  ]
  
  console.log('\n--- Testing Actions for Player 1 (facing 50 bet) ---')
  testActionsWithBet.forEach(action => {
    const validation = machine.validateAction(1, action)
    console.log(`${action.type}${action.amount ? ` ${action.amount}` : ''}:`, 
      validation.valid ? '✓ Valid' : `✗ ${validation.error}`
    )
  })
  
  // Test action validator utility
  console.log('\n--- Using ActionValidator Utility ---')
  const bettingContext = machine.getBettingRoundContext()!
  const availableActions = ActionValidator.getAvailableActions(1, bettingContext)
  console.log('Available actions for Player 1:', availableActions)
  
  const limits = ActionValidator.getBettingLimits(1, bettingContext)
  console.log('Betting limits for Player 1:', limits)
}

/**
 * Example 4: Complete hand flow with detailed logging
 */
export function exampleCompleteHandFlow() {
  console.log('\n=== EXAMPLE 4: Complete Hand Flow with Detailed Logging ===')
  
  const playerStacks = new Map([
    [0, 800],
    [1, 1200]
  ])
  
  const machine = new HandProgressionStateMachine(4, [0, 1], playerStacks, 5)
  
  function logCurrentState() {
    const state = machine.getCurrentState()
    const context = machine.getContext()
    console.log(`State: ${state.type}${(state as any).street ? ` (${(state as any).street})` : ''}`)
    console.log(`  Current Player: ${context.currentPlayer}`)
    console.log(`  Bet to Call: ${context.betToCall}`)
    console.log(`  Pot: ${context.pot}`)
    console.log(`  Active Players: [${Array.from(context.activePlayers).join(', ')}]`)
    if (context.communityCards.length > 0) {
      console.log(`  Community: [${context.communityCards.join(', ')}]`)
    }
    console.log('')
  }
  
  // Start hand
  console.log('Starting hand...')
  machine.processEvent({ type: 'cards_dealt', playersCount: 2 })
  logCurrentState()
  
  // Preflop: Player 0 raises, Player 1 calls
  console.log('Preflop: P0 raises to 25')
  machine.processEvent({ type: 'player_action', playerId: 0, action: { type: 'bet', amount: 25 }, amount: 25 })
  logCurrentState()
  
  console.log('Preflop: P1 calls')
  machine.processEvent({ type: 'player_action', playerId: 1, action: { type: 'call' } })
  logCurrentState()
  
  // Flop
  console.log('Dealing flop...')
  machine.processEvent({ type: 'advance_street', fromStreet: 'preflop', toStreet: 'flop' })
  machine.processEvent({ type: 'community_dealt', street: 'flop', cards: ['As', 'Kd', 'Qh'] })
  logCurrentState()
  
  console.log('Flop: P0 checks')
  machine.processEvent({ type: 'player_action', playerId: 0, action: { type: 'check' } })
  logCurrentState()
  
  console.log('Flop: P1 bets 75')
  machine.processEvent({ type: 'player_action', playerId: 1, action: { type: 'bet', amount: 75 }, amount: 75 })
  logCurrentState()
  
  console.log('Flop: P0 calls')
  machine.processEvent({ type: 'player_action', playerId: 0, action: { type: 'call' } })
  logCurrentState()
  
  // Turn
  console.log('Dealing turn...')
  machine.processEvent({ type: 'advance_street', fromStreet: 'flop', toStreet: 'turn' })
  machine.processEvent({ type: 'community_dealt', street: 'turn', cards: ['Jc'] })
  logCurrentState()
  
  console.log('Turn: P0 bets 150')
  machine.processEvent({ type: 'player_action', playerId: 0, action: { type: 'bet', amount: 150 }, amount: 150 })
  logCurrentState()
  
  console.log('Turn: P1 raises to 400')
  machine.processEvent({ type: 'player_action', playerId: 1, action: { type: 'raise', amount: 400 }, amount: 400 })
  logCurrentState()
  
  console.log('Turn: P0 calls')
  machine.processEvent({ type: 'player_action', playerId: 0, action: { type: 'call' } })
  logCurrentState()
  
  // River
  console.log('Dealing river...')
  machine.processEvent({ type: 'advance_street', fromStreet: 'turn', toStreet: 'river' })
  machine.processEvent({ type: 'community_dealt', street: 'river', cards: ['Th'] })
  logCurrentState()
  
  console.log('River: Both players check')
  machine.processEvent({ type: 'player_action', playerId: 0, action: { type: 'check' } })
  logCurrentState()
  machine.processEvent({ type: 'player_action', playerId: 1, action: { type: 'check' } })
  logCurrentState()
  
  // Showdown
  console.log('Going to showdown...')
  machine.processEvent({ type: 'advance_street', fromStreet: 'river', toStreet: 'showdown' })
  machine.processEvent({ type: 'hand_ended', reason: 'showdown' })
  logCurrentState()
  
  const finalContext = machine.getContext()
  console.log('Final pot:', finalContext.pot)
  console.log('Player stacks after hand:')
  finalContext.playerStacks.forEach((stack, playerId) => {
    console.log(`  Player ${playerId}: ${stack} chips`)
  })
}

// Run all examples
if (typeof process !== 'undefined' && process.argv[1]?.includes('handProgressionExample')) {
  exampleHeadsUpShowdown()
  exampleMultiPlayerFoldOut()
  exampleActionValidation()
  exampleCompleteHandFlow()
}

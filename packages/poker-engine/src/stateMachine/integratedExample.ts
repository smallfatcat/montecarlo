/**
 * Integrated Poker State Machine Example
 * Demonstrates the complete poker game flow using the integrated state machine
 */

import { IntegratedPokerStateMachine, type IntegratedActionResult } from './integratedPokerMachine.js'
import type { BettingAction } from '../types.js'

/**
 * Complete poker game example with integrated state machine
 */
export function integratedPokerGameExample() {
  console.log('\n=== INTEGRATED POKER STATE MACHINE EXAMPLE ===')
  
  // Create game with 3 players
  const playerStacks = new Map([
    [0, 1000], // Player 0: 1000 chips
    [1, 1500], // Player 1: 1500 chips  
    [2, 800]   // Player 2: 800 chips
  ])
  
  const machine = new IntegratedPokerStateMachine(
    [0, 1, 2], 
    playerStacks,
    { bigBlind: 10, smallBlind: 5 }
  )
  
  console.log('Initial game state:', machine.getGameSummary())
  
  // Start the game
  console.log('\n--- Starting Game ---')
  machine.processGameEvent({ type: 'PLAYERS_READY' })
  console.log('After start game:', machine.getGameSummary())
  
  // Start first hand
  console.log('\n--- Starting Hand 1 ---')
  machine.processGameEvent({ type: 'START_HAND' })
  console.log('After start hand:', machine.getGameSummary())
  
  // Preflop action
  console.log('\n--- Preflop Betting ---')
  logCurrentSituation(machine)
  
  // Player 0 calls
  let result = machine.processPlayerAction(0, { type: 'call' })
  console.log('P0 calls:', result.success ? '✓' : `✗ ${result.error}`)
  if (result.success) logCurrentSituation(machine)
  
  // Player 1 raises
  result = machine.processPlayerAction(1, { type: 'raise', amount: 30 })
  console.log('P1 raises to 30:', result.success ? '✓' : `✗ ${result.error}`)
  if (result.success) logCurrentSituation(machine)
  
  // Player 2 folds
  result = machine.processPlayerAction(2, { type: 'fold' })
  console.log('P2 folds:', result.success ? '✓' : `✗ ${result.error}`)
  if (result.success) logCurrentSituation(machine)
  
  // Player 0 calls the raise
  result = machine.processPlayerAction(0, { type: 'call' })
  console.log('P0 calls:', result.success ? '✓' : `✗ ${result.error}`)
  if (result.success) logCurrentSituation(machine)
  
  // Advance to flop
  console.log('\n--- Advancing to Flop ---')
  result = machine.advanceStreet()
  console.log('Advance street result:', result.success ? '✓' : `✗ ${result.error}`)
  
  // Deal flop cards  
  result = machine.dealCommunityCards(['Ah', 'Ks', 'Qd'])
  console.log('Deal flop:', result.success ? '✓' : `✗ ${result.error}`)
  if (result.success) logCurrentSituation(machine)
  
  // Flop betting
  console.log('\n--- Flop Betting ---')
  
  // Player 0 checks
  result = machine.processPlayerAction(0, { type: 'check' })
  console.log('P0 checks:', result.success ? '✓' : `✗ ${result.error}`)
  if (result.success) logCurrentSituation(machine)
  
  // Player 1 bets
  result = machine.processPlayerAction(1, { type: 'bet', amount: 50 })
  console.log('P1 bets 50:', result.success ? '✓' : `✗ ${result.error}`)
  if (result.success) logCurrentSituation(machine)
  
  // Player 0 calls
  result = machine.processPlayerAction(0, { type: 'call' })
  console.log('P0 calls:', result.success ? '✓' : `✗ ${result.error}`)
  if (result.success) logCurrentSituation(machine)
  
  // Continue through turn and river
  console.log('\n--- Turn ---')
  machine.advanceStreet()
  machine.dealCommunityCards(['Jh'])
  logCurrentSituation(machine)
  
  // Turn betting - both check
  machine.processPlayerAction(0, { type: 'check' })
  console.log('P0 checks')
  machine.processPlayerAction(1, { type: 'check' })
  console.log('P1 checks')
  logCurrentSituation(machine)
  
  // River
  console.log('\n--- River ---')
  machine.advanceStreet()
  machine.dealCommunityCards(['Tc'])
  logCurrentSituation(machine)
  
  // River betting - Player 0 bets, Player 1 calls
  machine.processPlayerAction(0, { type: 'bet', amount: 100 })
  console.log('P0 bets 100')
  logCurrentSituation(machine)
  
  machine.processPlayerAction(1, { type: 'call' })
  console.log('P1 calls')
  logCurrentSituation(machine)
  
  console.log('\n--- Final Game Summary ---')
  console.log(machine.getGameSummary())
}

/**
 * Example showing action validation and available actions
 */
export function actionValidationExample() {
  console.log('\n=== ACTION VALIDATION EXAMPLE ===')
  
  const playerStacks = new Map([
    [0, 50],   // Short stack
    [1, 1000]  // Big stack
  ])
  
  const machine = new IntegratedPokerStateMachine([0, 1], playerStacks, { bigBlind: 20, smallBlind: 10 })
  
  // Start game and hand
  machine.processGameEvent({ type: 'PLAYERS_READY' })
  machine.processGameEvent({ type: 'START_HAND' })
  
  console.log('Initial situation:')
  logCurrentSituation(machine)
  
  // Show available actions for each player
  console.log('\n--- Available Actions ---')
  for (const playerId of [0, 1]) {
    const actions = machine.getAvailableActions(playerId)
    const limits = machine.getBettingLimits(playerId)
    console.log(`Player ${playerId}:`)
    console.log(`  Available actions: [${actions.join(', ')}]`)
    console.log(`  Betting limits:`, limits)
  }
  
  // Test invalid actions
  console.log('\n--- Testing Invalid Actions ---')
  
  // Wrong player tries to act
  let result = machine.processPlayerAction(1, { type: 'check' })
  console.log('P1 tries to act out of turn:', result.success ? '✓' : `✗ ${result.error}`)
  
  // Current player tries invalid action
  result = machine.processPlayerAction(0, { type: 'check' }) // Can't check with bet to call
  console.log('P0 tries to check with bet to call:', result.success ? '✓' : `✗ ${result.error}`)
  
  // Bet too much
  result = machine.processPlayerAction(0, { type: 'raise', amount: 100 }) // More than stack
  console.log('P0 tries to bet more than stack:', result.success ? '✓' : `✗ ${result.error}`)
  
  // Valid action
  result = machine.processPlayerAction(0, { type: 'call' })
  console.log('P0 calls (valid):', result.success ? '✓' : `✗ ${result.error}`)
}

/**
 * Example showing multiple hands in a game
 */
export function multiHandGameExample() {
  console.log('\n=== MULTI-HAND GAME EXAMPLE ===')
  
  const playerStacks = new Map([
    [0, 200],
    [1, 200],
    [2, 200]
  ])
  
  const machine = new IntegratedPokerStateMachine([0, 1, 2], playerStacks)
  
  // Start game
  machine.processGameEvent({ type: 'PLAYERS_READY' })
  console.log('Game started')
  
  // Play multiple hands
  for (let handNum = 1; handNum <= 3; handNum++) {
    console.log(`\n--- Hand ${handNum} ---`)
    
    // Start hand
    machine.processGameEvent({ type: 'START_HAND' })
    console.log('Hand started:', machine.getGameSummary())
    
    // Quick preflop action (all call)
    machine.processPlayerAction(0, { type: 'call' })
    machine.processPlayerAction(1, { type: 'call' })
    machine.processPlayerAction(2, { type: 'check' })
    
    // Quick flop
    machine.advanceStreet()
    machine.dealCommunityCards(['7h', '8s', '9c'])
    
    // Player 0 bets, others fold
    machine.processPlayerAction(0, { type: 'bet', amount: 20 })
    machine.processPlayerAction(1, { type: 'fold' })
    machine.processPlayerAction(2, { type: 'fold' })
    
    console.log(`Hand ${handNum} complete:`, machine.getGameSummary())
  }
  
  console.log('\n--- Game History ---')
  const context = machine.getContext()
  console.log(`Total hands played: ${context.handHistory.length}`)
  context.handHistory.forEach((hand, index) => {
    console.log(`Hand ${index + 1}: ${hand.players.length} players, pot: ${hand.finalPot}, result: ${hand.result}`)
  })
}

function logCurrentSituation(machine: IntegratedPokerStateMachine) {
  const summary = machine.getGameSummary()
  console.log(`  Game: ${summary.gameState}, Hand: ${summary.handState}`)
  console.log(`  Street: ${summary.street}, Pot: ${summary.pot}, To Call: ${summary.betToCall}`)
  console.log(`  Current Player: ${summary.currentPlayer}`)
  console.log(`  Community: [${summary.communityCards.join(', ')}]`)
  console.log(`  Stacks: P0=${summary.playerStacks[0]}, P1=${summary.playerStacks[1]}, P2=${summary.playerStacks[2] || 'N/A'}`)
  console.log('')
}

// Run examples if called directly
if (typeof process !== 'undefined' && process.argv[1]?.includes('integratedExample')) {
  integratedPokerGameExample()
  actionValidationExample()  
  multiHandGameExample()
}
